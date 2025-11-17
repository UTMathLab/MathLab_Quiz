<template>
    <div>
      <div class="score">
        <span class="correct">最終結果：</span>
        <span class="bunshi"><span class="correctcount">{{ correctCount }}</span>問正解</span>
      </div>
      <div class="ranking">
        <div class="ranking-wrap">
          <div class="rank-head">今日の高得点</div>
            <div v-if="isLoading" class="loading-message">
              ランキングを読み込み中...
            </div>     
            <div v-else>
              <div v-if="!ranking || ranking.length === 0" class="no-ranking">
                ランキングデータがありません
              </div>
              <table v-else>
                <tr class="green">
                  <th style="width:15vw">スコア</th><th style="width:35vw">プレイ時刻</th>
                </tr>
                <tr v-for="rankings in ranking" v-bind:key="rankings" :class="rankings.color">
                  <th>{{rankings.score}}</th><th>{{rankings.when.month}}月{{rankings.when.day}}日　{{rankings.when.hour}}:{{Math.floor(rankings.when.minute/10)? '':'0'}}{{rankings.when.minute}}</th>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
  </template>
  
  <script setup lang="ts">
    type Props = {
      correctCount: number;
      ranking: ranking_view[];
      isLoading: Boolean
    };
    type ranking_view={
        when: {
          year:number,
          month:number,
          day:number,
          hour:number,
          minute:number,
        },
        score: number,
        color: string,
    }
    const props = defineProps<Props>();
  </script>
  
  <style scoped lang="scss">
    .score{
      display:flex;
      font-size:45px;
      padding:20px;
      justify-content: center;
    }
    .red{
      color:red
    }
    .rank-head{
      font-size:30px;
    }
    .ranking{
      display:flex;
      flex-direction: column;
      font-size:25px;
      align-items: center;
    }
    .ranking-wrap{
      border:5px,solid,#519935;
      width:60vw;
      display: grid;
      justify-items: center;
    }
    .rank-head{
      color:white;
      background-color: #519935;
      width:100%;
      text-align:center;
    }
  </style>