<script setup lang="ts">
import Chessboard from 'chessboard/src/Chessboard.vue';
import type {ChessGame} from "@/chesscomtypes.ts";
import {onMounted, onUnmounted, ref, useTemplateRef, watch} from "vue";
import { parse as pgnParse } from '@mliebelt/pgn-parser'
const props = defineProps<{game: ChessGame}>()

const parsed = ref<any>(undefined)
const isHovering = ref(false)

const chessboard = useTemplateRef<typeof Chessboard>('chessboard')

const timerId = ref<number|null>(null)

onMounted(() => {
  parsed.value = pgnParse(props.game.pgn, {startRule: 'game'})
})
const currentMoveIndex = ref(0)

const clearTimer = () => {
  if (timerId.value != null) {
    clearInterval(timerId.value)
    timerId.value = null
  }

  chessboard.value!.chess.reset()
  chessboard.value!.chess.load(props.game.fen)
  chessboard.value?.updateBoard()
}

watch(isHovering, () => {
  if (isHovering.value) {
    currentMoveIndex.value = 0
    chessboard.value!.chess.reset()
    chessboard.value?.updateBoard()
    const moves = parsed.value.moves.map((m: any) => m.notation.notation)
    timerId.value = setInterval(() => {
      if (!isHovering.value) {
        clearTimer()
      }
      if (!chessboard.value) return
      chessboard.value!.move(moves[currentMoveIndex.value++])
    }, 400)
  } else {
    clearTimer()
  }
})

onUnmounted(() => {
  if (timerId.value) {
    clearInterval(timerId.value)
    timerId.value = null
  }
})
</script>
<template>
  <button
    class="flex gap-2 items-center cursor-pointer"
    @mouseover="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="relative">
      <Chessboard ref="chessboard" assets-path="/assets/piece/kiwen-suwi/" readonly width="100px" :fen="game.fen" />

      <div class="absolute bottom-1 right-1 flex gap-1 items-center bg-neutral-100/40 backdrop-blur-sm rounded-sm p-0.5 px-2 text-xs" v-if="parsed?.tags?.Result">
        <span>{{parsed?.tags?.Result}}</span>
      </div>
    </div>
    <div>
      <div class="flex flex-wrap gap-1 mb-2">
        <div v-if="game.time_control" class="flex gap-1 items-center bg-neutral-100 dark:bg-neutral-700 rounded-full p-0.5 px-2 text-sm">
          <i class="ti ti-clock" />
          <span>{{ Number(game.time_control) / 60 }} min</span>
        </div>
        <div class="flex gap-1 items-center bg-neutral-100 dark:bg-neutral-700 rounded-full p-0.5 px-2 text-sm" v-if="parsed?.tags?.UTCDate?.value">
          <i class="ti ti-calendar-event" />
          <span>{{parsed?.tags?.UTCDate?.value}}</span>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex gap-1 items-center">
          <i :class="{'text-green-800': game.white.result === 'win', 'text-red-800': game.white.result === 'checkmated'}" class="ti ti-chess-king" />
          <span class="text-sm">{{game.white.username}}</span>
          <span class="text-sm opacity-40">{{game.white.rating}}</span>
        </div>
        <div class="flex gap-1 items-center">
          <i  :class="{'text-green-800': game.black.result === 'win', 'text-red-800': game.black.result === 'checkmated'}" class="ti ti-chess-king" />
          <span class="text-sm">{{game.black.username}}</span>
          <span class="text-sm opacity-40">{{game.black.rating}}</span>
        </div>
      </div>
    </div>
  </button>
</template>