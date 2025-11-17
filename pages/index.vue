<template>
  <div>
    <a-background />
    <t-menu v-if="displayState === 'menu'" @select="onLevelSelected" :Levels=Levels></t-menu>
    <t-question v-else-if="displayState === 'question'" :count="count - incorrectCount*5" :correctIndex="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].answer" :quizIndex="quizIndex" :quizNumber=shuffledNumber[quizLevel][quizIndex] :correctNumber="correctCount" :answerDisplay="answerDisplay" :correctDisplay="correctDisplay" :incorrectDisplay="incorrectDisplay" :question="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].question" :options="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].options" :fontSize="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].fontSize" :answer="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].options[quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].answer]" @select="onSelected" @timeout="timeout" @quit="onQuit" />
    <t-result v-else-if="displayState === 'result'" :correct-count="correctCount" :ranking="ranking_view" @select="playAgain" />
  </div>
</template>

<!-- pages/index.vue の <script setup> の中身を、以下で丸ごと置き換え -->

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { getRandomArray } from "../composables/utils";
  import { quizData } from "../composables/quizData";
  
  import { initializeApp } from "firebase/app";
  import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCNCFq6bjmPkrNjnNy-pm4JTyoIIIb7G6I",
    authDomain: "mathlab-quiz.firebaseapp.com",
    projectId: "mathlab-quiz",
    storageBucket: "mathlab-quiz.firebasestorage.app",
    messagingSenderId: "15973731988",
    appId: "1:15973731988:web:02e3f5fd0848dfb784ae81",
    measurementId: "G-4XGRENY9QF"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  type DisplayState = "question" | "result" | "menu";
  const displayState = ref<DisplayState>("menu");
  const isLoadingRanking = ref(false);
  
  const createWhenObject = (playtime: Date) => {
    const year = playtime.getFullYear();
    const month = playtime.getMonth() + 1;
    const day = playtime.getDate();
    const hour = playtime.getHours();
    const minute = playtime.getMinutes();
    
    // ★★★
    // 修正点：秒 (getSeconds) を追加
    // ★★★
    const second = playtime.getSeconds(); 
    
    // ★ sortdata の計算に「*100 + second」を追加
    const sortdata = year * 10000000000 + // (0を2つ追加)
                     month * 100000000 +  // (0を2つ追加)
                     day * 1000000 +    // (0を2つ追加)
                     hour * 10000 +     // (0を2つ追加)
                     minute * 100 + 
                     second; // ★ 秒を追加
                     
    return { year, month, day, hour, minute, 
             // ★ second も返すが、sortdata があれば不要
             sortdata: sortdata 
           };
  };

  const randomIndex = quizData.map(qs => Array.from({ length: qs.length }, (_, i) => i));
  const shuffledNumber = ref(randomIndex.map(arr => getRandomArray(arr, arr.length)));

  const quizLevel= ref(0);
  const Levels = [["6級", "小中学生初級", "制限時間：60秒"],["5級","小中学生上級","制限時間：60秒"],["4級","高校生初級","制限時間：60秒"],["3級", "高校生上級", "制限時間：60秒"],["2級","大学生初級","制限時間：60秒"],["1級","大学生上級","制限時間：60秒"]];
  const ranking_view=ref<any[]>([]);
  
  // -----------------------------------------------------------------
  // ★ 1. ランキング取得 (Firebase)
  // -----------------------------------------------------------------
  const fetchRanking = async (level: number, userResult: any | null = null) => {
    // isLoadingRanking.value = true; // (もし isLoading を使う場合は、ここを有効化)
    
    try {
      const q = query(
        collection(db, "kf75"), 
        where('level', '==', level),
        orderBy('score', 'desc'), // 第1キー：スコア（降順）
        
        // ★★★
        // 修正点：第2キーとして「達成日時(sortdata)」の「昇順(asc)」を追加
        // これで、達成日時が古い方（時間が遅い方）が上になります
        // ★★★
        orderBy('when.sortdata', 'asc'), 
        
        limit(6)
      );
      
      const querySnapshot = await getDocs(q);
      
      const newRankingView: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let color = "black";
        if (userResult && 
            data.when.sortdata === userResult.when.sortdata &&
            data.score === userResult.score) {
          color = "red";
        }
        newRankingView.push({ score: data.score, when: data.when, color: color });
      });
      
      ranking_view.value = newRankingView;
      
    } catch (error) {
      console.error("Firebaseの読み込みエラー:", error);
      ranking_view.value = [];
    } finally {
      // isLoadingRanking.value = false; // (もし isLoading を使う場合は、ここを有効化)
    }
  };

  // -----------------------------------------------------------------
  // ★ 2. ゲーム終了処理 (Firebase)
  // -----------------------------------------------------------------
  const handleGameEnd = async () => {
    if (displayState.value !== "question") return; 

    displayState.value = "result";
    // (タイマー停止は、setInterval 側が displayState を見て自動で停止する)
    count.value = 60; // カウントリセット
    
    const playtime = new Date();
    const newScoreData = {
      level: quizLevel.value,
      score: correctCount.value, 
      when: createWhenObject(playtime)
    };

    try {
      await addDoc(collection(db, "kf75"), newScoreData);
    } catch (error) {
      console.error("Firebaseへの書き込みエラー:", error);
    } finally {
      // 書き込み後、最新ランキングを読み込む
      await fetchRanking(newScoreData.level, newScoreData);
    }
  };

  // -----------------------------------------------------------------
  // ★ 3. onLevelSelected
  // -----------------------------------------------------------------
  const onLevelSelected = (level:number) => {
    quizLevel.value = level;
    displayState.value = "question";
    shuffledNumber.value = randomIndex.map(arr => getRandomArray(arr, arr.length));
    count.value = 60; 
    questionTime.value = Date.now();
    
    // (ゲーム開始時は、ランキングを読み込まない)
    // (Firebaseの「リアルタイム更新」を使わない限り、
    //  ここで読んでも "今" のランキングは取れないため)
    ranking_view.value = [];
  }

  const quizIndex = ref(0);
  const correctCount = ref(0);
  const incorrectCount = ref(0);
  const answerState = ref<"正解！" | "不正解" >(null as any);
  const count = ref(60);
  
  // (タイマーIDは不要)
  
  // -----------------------------------------------------------------
  // ★ 4. countdown (元の「正しい」ロジックに戻す)
  // -----------------------------------------------------------------
  const countdown = () => {
    setInterval(() => {
      // ★ 門番： "question" 画面で、かつ "result" 処理中でない時だけ動く
      if (displayState.value === "question") {
        
        // タイムアップ判定
        if (count.value <= incorrectCount.value * 5){
          if (displayState.value === "question") { 
            handleGameEnd();
          }
          return;
        }
        
        // カウントダウン
        if (count.value > 0) {
          count.value--;
        };
      }
    }, 1000);
  };

  // ★ 元のコード通り onMounted で「1回だけ」呼び出す
  onMounted(() => {
    countdown();
  })

  // (answerDisplay などの ref)
  const answerDisplay = ref(false);
  const correctDisplay = ref(false);
  const incorrectDisplay = ref(false);
  const questionTime = ref(0);
  const answerTime = ref(0);

  // -----------------------------------------------------------------
  // ★ 5. onSelected
  // -----------------------------------------------------------------
  const onSelected = (isCorrect: boolean) => {
    // ★ 門番を修正 (displayState が "question" でないなら即終了)
    if (answerDisplay.value === true || displayState.value !== 'question') {
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
      
      // タイムアップ判定
      if (count.value <= incorrectCount.value * 5){
          if (displayState.value === "question") { 
            handleGameEnd();
          }
        return; 
      };
    }
    
    // (setTimeout ロジック)
    const timeoutCallback = () => {
        // ★ ゾンビタイマー対策: 
        //    コールバックが実行された時に、
        //    まだ "question" 画面か？ (リセットされてないか？) を確認
        if (displayState.value === 'question' && answerDisplay.value === true) {
            quizIndex.value++;
            questionTime.value = Date.now();
            answerDisplay.value = false;
            correctDisplay.value = false;
            incorrectDisplay.value = false;
        }
    };
      
    if (answerTime.value < questionTime.value + 2000) {
      setTimeout(timeoutCallback, 3000 + questionTime.value - answerTime.value);
    } else {
      setTimeout(timeoutCallback, 1000);
    };
  };

  // -----------------------------------------------------------------
  // ★ 6. playAgain / onQuit (UIリセットを追加)
  // -----------------------------------------------------------------
  const playAgain = () => {
    // (countdown() の呼び出しは削除)
    displayState.value = "menu";
    quizIndex.value = 0;
    correctCount.value = 0;
    incorrectCount.value = 0;
    shuffledNumber.value = randomIndex.map(arr => getRandomArray(arr, arr.length));
    ranking_view.value=[];
    
    // ★ 不足していたUIリセット
    answerDisplay.value = false;
    correctDisplay.value = false;
    incorrectDisplay.value = false;
  };

  const onQuit = () => {
    // (countdown() の呼び出しは削除)
    displayState.value = "menu";
    quizIndex.value = 0;
    correctCount.value = 0;
    incorrectCount.value = 0;
    shuffledNumber.value = randomIndex.map(arr => getRandomArray(arr, arr.length));
    
    // ★ 不足していたUIリセット
    answerDisplay.value = false;
    correctDisplay.value = false;
    incorrectDisplay.value = false;
  };
</script>