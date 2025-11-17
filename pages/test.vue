<template>
  <div>
    <div v-if="isQuizLoading" class="loading-quiz-overlay">
      クイズデータを読み込んでいます...
    </div>

    <div v-else class="test-container">
      
      <div class="controls">
        
        <div class="control-group">
          <label for="level-select">レベル:</label>
          <select id="level-select" v-model.number="selectedLevel">
            <option v-for="(name, index) in levels" :value="index" :key="index">
              {{ name }} ({{ (quizData || [])[index]?.length || 0 }} 問)
            </option>
          </select>
        </div>

        <div class="control-group">
          <label for="question-index">問題番号 (0-{{ maxQuestionIndex }}):</label>
          <button @click="prevQuestion" :disabled="questionIndex <= 0">◀</button>
          <input 
            id="question-index"
            type="number" 
            v-model.number="questionIndex" 
            min="0"
            :max="maxQuestionIndex"
            class="index-input"
          />
          <button @click="nextQuestion" :disabled="questionIndex >= maxQuestionIndex">▶</button>
        </div>
      </div>

      <div class="wrapper">
        <div class="question-wrapper">
          <template v-if="currentQuestionData">
            <a-question-text 
              :question="currentQuestionData.question"
              class="text" 
            />
            
            <o-question-options 
              :options="currentQuestionData.options" 
              :fontSize="currentQuestionData.fontSize"
              :correctIndex="currentQuestionData.answer"
              @select="() => {}"
              class="option"
            />
          </template>
          
          <div v-else class="no-data">
            指定された問題データがありません。(レベル: {{ selectedLevel }}, 番号: {{ questionIndex }})
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
  // ★ 必要なものを import
  import { ref, onMounted, computed, watch } from 'vue'
  
  // ★ Firebase関連を import
  import { initializeApp } from "firebase/app";
  import { getFirestore, getDoc, doc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

  // ★ クイズの「型」を定義
  type Quiz = {
    quizNumber: number;
    question: string;
    options: string[];
    answer: number;
    fontSize: string;
  };
  
  // ★ あなたの "firebaseConfig"
  const firebaseConfig = {
    apiKey: "AIzaSyCNCFq6bjmPkrNjnNy-pm4JTyoIIIb7G6I",
    authDomain: "mathlab-quiz.firebaseapp.com",
    projectId: "mathlab-quiz",
    storageBucket: "mathlab-quiz.firebasestorage.app",
    messagingSenderId: "15973731988",
    appId: "1:15973731988:web:02e3f5fd0848dfb784ae81",
    measurementId: "G-4XGRENY9QF"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);


  // ★ ページの状態
  const quizData = ref<Quiz[][]>([])
  const isQuizLoading = ref(true) // デフォルトを true (読み込み中) に

  // ★ onMounted で Firestore からデータを読み込む (GAS不使用)
  onMounted(async () => {
    isQuizLoading.value = true;
    try {
      // 1. 読み込むドキュメントの「参照」を配列として作成
      const levels = ["level-0", "level-1", "level-2", "level-3", "level-4", "level-5"];
      const levelPromises = levels.map(levelId => {
        return getDoc(doc(db, "quizzes", levelId));
      });
      
      // 2. 6レベルのデータを「並行して」読み込む
      const levelSnapshots = await Promise.all(levelPromises);
      
      // 3. データを quizData.value に整形
      const allQuizData: Quiz[][] = [];
      levelSnapshots.forEach(snapshot => {
        if (snapshot.exists()) {
          allQuizData.push(snapshot.data().data as Quiz[]); 
        } else {
          console.error(`Error: Document ${snapshot.id} not found!`);
          allQuizData.push([]);
        }
      });
      quizData.value = allQuizData;

    } catch (error) {
      console.error("Failed to fetch quiz data from Firestore:", error);
    } finally {
      isQuizLoading.value = false;
    }
  });


  // ★ ページの状態 (レベル選択)
  const levels = ref(["中学生簡単", "中学生難しい", "高校生簡単", "高校生難しい", "大学生簡単", "大学生難しい"]);
  const selectedLevel = ref(0); 
  const questionIndex = ref(0); 

  // ★ 「現在の問題データ」を算出
  const currentQuestionData = computed(() => {
    if (isQuizLoading.value || !quizData.value) {
      return null;
    }
    const levelData = quizData.value[selectedLevel.value];
    if (!levelData) {
      return null;
    }
    return levelData[questionIndex.value] || null;
  });

  // ★ 「現在のレベルの最大問題数」を算出
  const maxQuestionIndex = computed(() => {
    if (isQuizLoading.value || !quizData.value) {
      return 0;
    }
    const levelData = quizData.value[selectedLevel.value];
    if (!levelData || levelData.length === 0) {
      return 0;
    }
    return levelData.length - 1;
  });

  // ★ 矢印ボタンのロジック
  const prevQuestion = () => {
    if (questionIndex.value > 0) {
      questionIndex.value--;
    }
  };
  const nextQuestion = () => {
    if (questionIndex.value < maxQuestionIndex.value) {
      questionIndex.value++;
    }
  };

  // ★ レベルを変更したら、問題番号を0にリセット
  watch(selectedLevel, () => {
    questionIndex.value = 0;
  });
</script>

<style>
/* グローバルなローディングスタイル */
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

<style scoped lang="scss">
/* test.vue 専用のスタイル */
.test-container {
  padding: 20px;
  background-color: #333;
  min-height: 100vh;
}
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #444;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 5px;
}
.control-group label {
  font-weight: bold;
}
.control-group select, .control-group input, .control-group button {
  padding: 8px;
  font-size: 1em;
  border-radius: 4px;
  border: none;
}
.control-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.index-input {
  width: 60px;
  text-align: center;
}
.question-wrapper {
        width:600px;
      height:75vh;
      margin-top:5vh;
      margin-bottom:5vh;
      display:flex;
      flex-direction:column;
      position: relative;
      padding-right:150px;
      margin-left:auto;
      margin-right:auto;
}
.option{
      width:100%;
    }
.no-data {
  color: #ff8080;
  font-size: 1.2em;
  text-align: center;
  padding: 40px;
}
</style>