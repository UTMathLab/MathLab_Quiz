<template>
  <div>
    <a-background />
    <t-menu v-if="displayState === 'menu'" @select="onLevelSelected" :Levels=Levels></t-menu>
    
    <t-question v-else-if="displayState === 'question'" 
      :count="count - incorrectCount*5" 
      :correctIndex="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].answer" 
      :quizIndex="quizIndex" 
      :quizNumber=shuffledNumber[quizLevel][quizIndex] 
      :correctNumber="correctCount" 
      :answerDisplay="answerDisplay" 
      :correctDisplay="correctDisplay" 
      :incorrectDisplay="incorrectDisplay" 
      :question="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].question" 
      :options="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].options" 
      :fontSize="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].fontSize" 
      :answer="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].options[quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].answer]" 
      @select="onSelected" 
      @timeout="timeout" 
      @quit="onQuit" />
      
    <t-result v-else-if="displayState === 'result'" 
      :correct-count="correctCount" 
      :ranking="ranking_view" 
      :is-loading="isLoadingRanking" 
      @select="playAgain" />
  </div>
</template>
<!-- pages/index.vue の <script setup> の中身を、以下で丸ごと置き換え -->

<script setup lang="ts">
  import { ref, onMounted } from 'vue' 
  import { getRandomArray } from "../composables/utils";
  import { quizData } from "../composables/quizData";
  import { getRankingFromSheet, setRankingToSheet } from '~/composables/ranking'

  type DisplayState = "question" | "result" | "menu";
  const displayState = ref<DisplayState>("menu");

  // ★ ランキング読み込み中の状態
  const isLoadingRanking = ref(false);

  const randomIndex = quizData.map(qs => Array.from({ length: qs.length }, (_, i) => i));
  const shuffledNumber = ref(randomIndex.map(arr => getRandomArray(arr, arr.length)));

  const quizLevel= ref(0);
  const Levels = [["6級", "小中学生初級", "制限時間：60秒"],["5級","小中学生上級","制限時間：60秒"],["4級","高校生初級","制限時間：60秒"],["3級", "高校生上級", "制限時間：60秒"],["2級","大学生初級","制限時間：60秒"],["1級","大学生上級","制限時間：60秒"]];
  const ranking=ref<any[]>([]);
  const ranking_view=ref<any[]>([]);
  
  const onLevelSelected = (level:number) => {
    quizLevel.value = level;
    displayState.value = "question";
    shuffledNumber.value = randomIndex.map(arr => getRandomArray(arr, arr.length));
    count.value = 60; 
    questionTime.value = Date.now();
    ranking.value = [];
    ranking_view.value = [];
  }

  const quizIndex = ref(0);
  const correctCount = ref(0);
  const incorrectCount = ref(0);
  const answerState = ref<"正解！" | "不正解" >(null as any);
  const count = ref(60);
  let timerId: any = null;

  // -----------------------------------------------------------------
  // ★ handleGameEnd (ローディング制御版)
  // -----------------------------------------------------------------
  const handleGameEnd = () => {
    // 1. 【ロック】
    if (displayState.value !== "question") return; 

    // 2. ★★★
    //    画面遷移とタイマー停止を「即時」実行
    //    同時に「ローディング開始」
    // ★★★
    displayState.value = "result";
    isLoadingRanking.value = true; // ★ ローディング開始
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    count.value = 60;

    // 3. ★ 自分のスコアの「仮表示」は削除
    // ranking_view.value = [userResult]; // ← 削除

    // 4. 通信処理（書き込みと読み込み）をバックグラウンドで実行
    const updateRankingInBackground = async () => {
      try {
        const playtime = new Date();
        const userResult = {
          level: quizLevel.value,
          score: correctCount.value, 
          when: createWhenObject(playtime),
          color: "red",
        };

        await setRankingToSheet(userResult.level, userResult.score);
        const sheetRanking = await getRankingFromSheet(userResult.level);
        
        ranking.value = sheetRanking; 
        
        ranking.value.sort((a,b) => {
          if (a.score !== b.score) return b.score - a.score;
          return b.when.sortdata - a.when.sortdata;
        });
        ranking_view.value = ranking.value.slice(0, 6).map(r => ({
          score: r.score,
          when: r.when,
          color: (r.when.sortdata === userResult.when.sortdata && r.score === userResult.score) 
                 ? "red" 
                 : "black"
        }));
        
      } catch (error) {
        console.error("handleGameEnd background task failed:", error);
        ranking_view.value = []; // ★ エラー時は空にする
        
      } finally {
        // 5. ★★★
        //    通信が成功しても失敗しても、ローディングを終了
        // ★★★
        isLoadingRanking.value = false; // ★ ローディング終了
      }
    };

    updateRankingInBackground();
  }

  // (createWhenObject ヘルパー関数)
  const createWhenObject = (playtime: Date) => {
    const year = playtime.getFullYear();
    const month = playtime.getMonth() + 1;
    const day = playtime.getDate();
    const hour = playtime.getHours();
    const minute = playtime.getMinutes();
    const sortdata = year * 100000000 + month * 1000000 + day * 10000 + hour * 100 + minute;
    return { year, month, day, hour, minute, sortdata };
  };

  // (countdown 関数)
  const countdown = () => {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (displayState.value !== "question") return;
      if (count.value <= incorrectCount.value * 5){
        if (displayState.value === "question") handleGameEnd();
        return;
      }
      if (count.value > 0) count.value--;
    }, 1000);
  };

  onMounted(() => {
    countdown();
  })

  // (answerDisplay などの ref)
  const answerDisplay = ref(false);
  const correctDisplay = ref(false);
  const incorrectDisplay = ref(false);
  const questionTime = ref(0);
  const answerTime = ref(0);

  // (onSelected 関数)
  const onSelected = (isCorrect: boolean) => {
    if (answerDisplay.value === true || count.value <= incorrectCount.value * 5 || displayState.value !== 'question') {
      return;
    }
    answerTime.value = Date.now();
    answerDisplay.value = true;
    if (isCorrect) {
      correctCount.value++;
      answerState.value = "正解！";
      correctDisplay.value = true;
    } else {
      incorrectCount.value++;
      answerState.value = "不正解";
      incorrectDisplay.value = true;
      if (count.value <= incorrectCount.value * 5){
          if (displayState.value === "question") handleGameEnd();
        return; 
      };
    }
    if (answerTime.value < questionTime.value + 2000) {
      setTimeout(() => {
        quizIndex.value++;
        questionTime.value = Date.now();
        answerDisplay.value = false;
        correctDisplay.value = false;
        incorrectDisplay.value = false;
      }, 3000 + questionTime.value - answerTime.value);
    } else {
      setTimeout(() => {
        quizIndex.value++;
        questionTime.value = Date.now();
        answerDisplay.value = false;
        correctDisplay.value = false;
        incorrectDisplay.value = false;
      }, 1000);
    };
  };

  // (playAgain と onQuit 関数)
  const playAgain = () => {
    if (timerId) clearInterval(timerId);
    timerId = null;
    displayState.value = "menu";
    quizIndex.value = 0;
    correctCount.value = 0;
    incorrectCount.value = 0;
    shuffledNumber.value = randomIndex.map(arr => getRandomArray(arr, arr.length));
    ranking.value=[];
    ranking_view.value=[];
    isLoadingRanking.value = false; // ★ ローディングをリセット
    countdown(); 
  };

  const onQuit = () => {
    if (timerId) clearInterval(timerId);
    timerId = null;
    displayState.value = "menu";
    quizIndex.value = 0;
    correctCount.value = 0;
    incorrectCount.value = 0;
    shuffledNumber.value = randomIndex.map(arr => getRandomArray(arr, arr.length));
    isLoadingRanking.value = false; // ★ ローディングをリセット
    countdown();
  };
</script>