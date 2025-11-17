<template>
  <div>
    <a-background />
    
    <t-menu v-if="displayState === 'menu'" @select="onLevelSelected" :Levels="Levels"></t-menu>
    
    <t-question v-else-if="displayState === 'question' && quizData.length > 0" 
      :count="count - incorrectCount*5" 
      :correctIndex="quizData[quizLevel][shuffledNumber[quizLevel][quizIndex]].answer" 
      :quizIndex="quizIndex" 
      :quizNumber="shuffledNumber[quizLevel][quizIndex]" 
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
    
    <div v-if="isQuizLoading" class="loading-quiz-overlay">
      クイズデータを読み込んでいます...
    </div>
  </div>
</template>

<style>
.loading-quiz-overlay {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  height: 100vh !important;
  width: 100vw !important;
  color: white !important;
  font-size: 2em !important;
  font-weight: bold !important;
  position: fixed !important; 
  top: 0 !important;
  left: 0 !important;
  z-index: 9999 !important;
  background: rgba(0,0,0,0.7) !important;
  cursor: wait !important;
}
</style>

<!-- pages/index.vue の <script setup> の中身を、以下で丸ごと置き換え -->

<script setup lang="ts">
  // ★ "onUnmounted" を import に追加
  import { ref, onMounted, onUnmounted} from 'vue' 
  import { getRandomArray } from "../composables/utils";
  
  import { initializeApp } from "firebase/app";
  import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";

  type Quiz = {
    quizNumber: number;
    question: string;
    options: string[];
    answer: number;
    fontSize: string;
  };

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
  const isQuizLoading = ref(true);
  const isLoadingRanking = ref(false);
  
  const quizData = ref<Quiz[][]>([]);
  const shuffledNumber = ref<number[][]>([]);

  const config = useRuntimeConfig();
  const quizDataUrl = config.public.quizDataUrl as string;
  
  // ★ timerId を script のトップレベルで定義
  let timerId: any = null;

  // ★ onMounted (クイズデータ取得 と タイマー開始)
  onMounted(() => {
    // 1. タイマーを開始
    countdown(); 

    // 2. クイズデータをロード
    useFetch<Quiz[][]>(quizDataUrl, {
      onResponse({ response }) {
        const data = response._data;
        quizData.value = data; 
        const randomIndex = data.map((qs: Quiz[]) => Array.from({ length: qs.length }, (_, i) => i));
        shuffledNumber.value = randomIndex.map((arr: number[]) => getRandomArray(arr, arr.length));
        isQuizLoading.value = false;
      },
      onError(error) {
        console.error("Failed to fetch quiz data:", error);
        isQuizLoading.value = false;
      }
    });
  });

  // ★★★
  // 修正点 1： onUnmounted フックを追加
  // (開発リロード時やページ移動時にタイマーを停止する)
  // ★★★
  onUnmounted(() => {
    if (timerId) {
      clearInterval(timerId);
    }
  });

  // (createWhenObject, fetchRanking, handleGameEnd は 20:38 のコードから変更なし)
  // ... (createWhenObject, fetchRanking, handleGameEnd のコード) ...
  
  const createWhenObject = (playtime: Date) => {
    const year = playtime.getFullYear();
    const month = playtime.getMonth() + 1;
    const day = playtime.getDate();
    const hour = playtime.getHours();
    const minute = playtime.getMinutes();
    const second = playtime.getSeconds(); 
    const sortdata = year * 10000000000 +
                     month * 100000000 +
                     day * 1000000 +
                     hour * 10000 +
                     minute * 100 + 
                     second;
    return { year, month, day, hour, minute, sortdata: sortdata };
  };

  const quizLevel= ref(0);
  const Levels = [["6級", "小中学生初級", "制限時間：60秒"],["5級","小中学生上級","制限時間：60秒"],["4級","高校生初級","制限時間：60秒"],["3級", "高校生上級", "制限時間：60秒"],["2級","大学生初級","制限時間：60秒"],["1級","大学生上級","制限時間：60秒"]];
  const ranking_view=ref<any[]>([]);
  
  const fetchRanking = async (level: number, userResult: any | null = null) => {
    isLoadingRanking.value = true;
    ranking_view.value = []; 
    try {
      const q = query(
        collection(db, "kf75"), 
        where('level', '==', level),
        orderBy('score', 'desc'),
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
      isLoadingRanking.value = false;
    }
  };
  
  const handleGameEnd = async () => {
    if (displayState.value !== "question") return; 

    // ★★★
    // 修正点 2： handleGameEnd でもタイマーを停止
    // ★★★
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    
    displayState.value = "result";
    count.value = 60;
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
      await fetchRanking(newScoreData.level, newScoreData);
    }
  };

  // (onLevelSelected は変更なし)
 const onLevelSelected = (level:number) => {
    if (isQuizLoading.value || quizData.value.length === 0) {
      return; 
    }
    quizLevel.value = level;
    displayState.value = "question";
    const randomIndex = quizData.value.map((qs: Quiz[]) => Array.from({ length: qs.length }, (_, i) => i));
    shuffledNumber.value = randomIndex.map((arr: number[]) => getRandomArray(arr, arr.length));
    count.value = 60; 
    questionTime.value = Date.now();
    fetchRanking(quizLevel.value);
  }

  const quizIndex = ref(0);
  const correctCount = ref(0);
  const incorrectCount = ref(0);
  const answerState = ref<"正解！" | "不正解" >(null as any);
  const count = ref(60);
  const answerDisplay = ref(false);
  const correctDisplay = ref(false);
  const incorrectDisplay = ref(false);
  const questionTime = ref(0);
  const answerTime = ref(0);
  
  // (countdown は変更なし)
  const countdown = () => {
    // ★ timerId に格納する
    timerId = setInterval(() => {
      if (displayState.value === "question") {
        if (count.value <= incorrectCount.value * 5){
          if (displayState.value === "question") { 
            handleGameEnd();
          }
          return;
        }
        if (count.value > 0) {
          count.value--;
        };
      }
    }, 1000);
  };
  // (onMounted は countdown() と useFetch() を 1つにまとめた)

  // (onSelected は変更なし)
  const onSelected = (isCorrect: boolean) => {
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
      if (count.value <= incorrectCount.value * 5){
          if (displayState.value === "question") { 
            handleGameEnd();
          }
        return; 
      };
    }
    const timeoutCallback = () => {
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

  // ★★★
  // 修正点 3： playAgain / onQuit でタイマーを停止・再開
  // ★★★
  const playAgain = () => {
    if (timerId) clearInterval(timerId); // ★ 停止

    displayState.value = "menu";
    quizIndex.value = 0;
    correctCount.value = 0;
    incorrectCount.value = 0;
    const randomIndex = quizData.value.map((qs: Quiz[]) => Array.from({ length: qs.length }, (_, i) => i));
    shuffledNumber.value = randomIndex.map((arr: number[]) => getRandomArray(arr, arr.length));
    ranking_view.value=[];
    answerDisplay.value = false;
    correctDisplay.value = false;
    incorrectDisplay.value = false;

    countdown(); // ★ 再開
  };

  const onQuit = () => {
    if (timerId) clearInterval(timerId); // ★ 停止

    displayState.value = "menu";
    quizIndex.value = 0;
    correctCount.value = 0;
    incorrectCount.value = 0;
    const randomIndex = quizData.value.map((qs: Quiz[]) => Array.from({ length: qs.length }, (_, i) => i));
    shuffledNumber.value = randomIndex.map((arr: number[]) => getRandomArray(arr, arr.length));
    ranking_view.value=[];
    answerDisplay.value = false;
    correctDisplay.value = false;
    incorrectDisplay.value = false;

    countdown(); // ★ 再開
  };
</script>