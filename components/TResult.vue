<template>
    <o-popup>
      <a-result-header class="a-head"/>
      <a-result-detail :correct-count="correctCount" :ranking="ranking" :is-loading="isLoading" />
      <o-result-buttons :correct-count="correctCount" @select="emit('select')" />
    </o-popup>
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
    type Emit = {
      (event: "select"): void;
    };
    const emit = defineEmits<Emit>();
  </script>
  
  <style scoped lang="scss">
    .a-head{
      display: flex;
      justify-content: space-around;
      height:12vh;
      background-color: #10503F;
      color:white;
      font-size: 40px;
      align-items: center;
    }
  </style>
  