<script setup lang="ts">
import Chessboard from 'chessboard/src/Chessboard.vue';
import {useTemplateRef} from "vue";
import {useInterval, useIntervalFn} from "@vueuse/core";
const chessboard = useTemplateRef<typeof Chessboard>('chessboard')

useIntervalFn(() => {
  if (!chessboard.value) return
  const chess = chessboard.value!.chess
  if (!chess.isGameOver()) {
    const moves = chess.moves()
    const move = moves[Math.floor(Math.random() * moves.length)]
    chessboard.value!.move(move)
  }
}, 250)
</script>
<template>
  <div class="flex flex-col gap-2 w-full justify-center items-center">
    <Chessboard ref="chessboard" assets-path="/assets/piece/kiwen-suwi/" width="120px" />
    <span class="text-sm animate-pulse">Loading</span>
  </div>
</template>