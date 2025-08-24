<script setup lang="ts">
import Chessboard from 'chessboard/src/Chessboard.vue';
import {onMounted, ref, useTemplateRef, watch} from "vue";
import ChessWebAPI from 'chess-web-api';
import GameEvaluation, {type Marker} from "@/components/GameEvaluation.vue";
import type {ChessGame} from "@/chesscomtypes.ts";
import { parse as pgnParse } from '@mliebelt/pgn-parser'
import {onKeyStroke, useDebounceFn, useStorage} from "@vueuse/core";
import {Chess} from "chess.js";
import {
  parseStockfishLine,
  type Cp,
  type Mate,
  initStockfish,
  sf,
  sfWaitFor,
  stockfishLoaded, cpToPercent
} from "@/helper/stockfish.ts";
import {evaluateMove, type MoveEvaluation} from "@/helper/evaluation.ts";

const moves = ref<string[]>([])
const clockTimes = ref<string[]>([])
const whitePlayer = ref({username: 'white', time: '10', rating: 1500, avatar: 'https://accounts.interaapps.de/avatars/Q.png'})
const blackPlayer = ref({username: 'black', time: '10', rating: 1500, avatar: 'https://accounts.interaapps.de/avatars/Q.png'})

const positionEvaluations = ref<(Cp|Mate)[]>([])
const moveEvaluations = ref<(MoveEvaluation|null)[]>([])

const games = ref<ChessGame[]>([])

const chessComUsername = useStorage('chesscomusername', 'juliangjn', localStorage)

onMounted(async () => {
  await loadUser()
  loadGame(games.value[0])
  initStockfish()
})

const loadUser = useDebounceFn(async () => {
  let chessAPI = new ChessWebAPI();
  games.value = (await chessAPI.getPlayerCompleteMonthlyArchives(chessComUsername.value, 2025, 8)).body.games.reverse()
}, 1000)

watch(chessComUsername, () => loadUser())


const getEvalForPos = async (fen: string, invertNumbers: boolean) => {
  let depth = 12
  sf.postMessage('ucinewgame')
  sf.postMessage(`position fen ${fen}`)

  return parseStockfishLine(await sfWaitFor(`go depth ${depth}`, m => m.startsWith(`info depth ${depth}`)), invertNumbers)
}

const analyzeCompleteGame = async () => {
  await stockfishLoaded.promise
  const chessInstance = new Chess()
  let a = false
  positionEvaluations.value = []
  moveEvaluations.value = []

  let i = 0;
  for (const move of moves.value.slice(0, moves.value.length-1)) {
    const out = chessInstance.move(move)
    const evaluation = await getEvalForPos(chessInstance.fen(), a)
    positionEvaluations.value.push(evaluation!)

    if (i > 0) {
      const ev = evaluateMove(positionEvaluations.value[i-1].cp, evaluation!.cp, a, chessInstance.fen())
      moveEvaluations.value.push(ev)
    }
    i++;
    a = !a
  }
}

const chessboard = useTemplateRef<typeof Chessboard>('chessboard')

const currentMoveIndex = ref(0)
const loadGame = (game: ChessGame) => {
  const parsed = pgnParse(game.pgn, {startRule: 'game'}) as any

  moves.value = parsed.moves.map((m: any) => m.notation.notation)
  clockTimes.value = parsed.moves.map((m: any) => m.commentDiag.clk)

  chessboard.value!.chess.load(game.fen)
  chessboard.value!.updateBoard()

  currentMoveIndex.value = parsed.moves.length - 1

  whitePlayer.value = {
    username: game.white.username,
    rating: game.white.rating,
    avatar: 'https://accounts.interaapps.de/avatars/Q.png',
    time: clockTimes.value[clockTimes.value.length - 1] || '10:00'
  }
  blackPlayer.value = {
    username: game.black.username,
    rating: game.black.rating,
    avatar: 'https://accounts.interaapps.de/avatars/Q.png',
    time: clockTimes.value[clockTimes.value.length - 1] || '10:00'
  }

  analyzeCompleteGame()
}

const setMove = (index: number) => {
  chessboard.value!.chess.reset()
  chessboard.value!.updateBoard()

  if (index === -1) {
    currentMoveIndex.value = -1
    whitePlayer.value.time = clockTimes.value[0] || '10:00'
    blackPlayer.value.time = clockTimes.value[0] || '10:00'
    return
  }

  for (let i = 0; i <= index; i++) {
    const m = chessboard.value!.move(moves.value[i])
    if (moveEvaluations.value[i-1]) {
      chessboard.value!.addEvaluationMark(m.to, moveEvaluations.value[i-1])
    }
    if (clockTimes.value[i]) {
      if ((i % 2) === 0) {
        whitePlayer.value.time = clockTimes.value[i]
      } else {
        blackPlayer.value.time = clockTimes.value[i]
      }
    }
  }
  currentMoveIndex.value = index
}


onKeyStroke('ArrowLeft', () => {
  if (currentMoveIndex.value > 0) {
    setMove(currentMoveIndex.value - 1)
  }
})
onKeyStroke('ArrowRight', () => {
  if (currentMoveIndex.value < moves.value.length - 1) {
    setMove(currentMoveIndex.value + 1)
  }
})
onKeyStroke('ArrowDown', () => {
  if (currentMoveIndex.value < moves.value.length - 1) {
    setMove(moves.value.length - 1)
  }
})
onKeyStroke('ArrowUp', () => {
  if (currentMoveIndex.value > 0) {
    setMove(-1)
  }
})

</script>

<template>
  <main class="h-full w-full">
    <div class="flex justify-center w-full h-full gap-3">
      <div class="border border-neutral-200 rounded-xl h-full overflow-auto p-2">
        <div class="flex flex-col gap-5">
          <input v-model="chessComUsername" class="p-2 px-3 border border-neutral-200 rounded-md" />
          <button @click="loadGame(game)" v-for="game of games.slice(0, 10)" class="flex gap-2 items-center cursor-pointer">
            <Chessboard assets-path="/assets/piece/kiwen-suwi/" readonly width="100px" :fen="game.fen" />
            <div>
              <div class="flex flex-wrap gap-1 mb-2">
                <div class="flex gap-1 items-center bg-neutral-100 rounded-full p-0.5 px-2 text-sm">
                  <i class="ti ti-clock" />
                  <span>{{ Number(game.time_control) / 60 }} min</span>
                </div>
                <div class="flex gap-1 items-center bg-neutral-100 rounded-full p-0.5 px-2 text-sm">
                  <i class="ti ti-calendar-event" />
                  <span></span>
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
        </div>

      </div>
      <div class="w-4  h-full border border-neutral-200 rounded-full relative">
        <div
          class="w-full bg-neutral-700 rounded-full transition-all"
          :style="{
            height: `${cpToPercent(positionEvaluations[currentMoveIndex]?.cp||0)}%`
          }"
        />
        <div v-if="positionEvaluations[currentMoveIndex]?.type === 'mate'" class="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bg-neutral-800 border border-neutral-700 text-white px-1.5 rounded-full text-sm text-nowrap">
          M{{
            // Why is typescript failing here???
            // @ts-ignore
            Math.abs(positionEvaluations[currentMoveIndex].mate)
          }}
        </div>
      </div>
      <div class="flex gap-2 flex-col justify-between">
        <div class="flex justify-between">
          <div class="flex gap-2">
            <div class="w-[2.5rem] aspect-square rounded-full border border-neutral-200 flex items-center justify-center">
              <span>{{blackPlayer.username[0]}}</span>
            </div>
            <span class="flex gap-2">
              <span>{{blackPlayer.username}}</span>
              <span class="opacity-50">{{blackPlayer.rating}}</span>
            </span>
          </div>
          <div class="border border-neutral-200 rounded-md px-3 flex items-center justify-center"  :class="{'bg-neutral-800 text-white': currentMoveIndex % 2 === 1}">
            <span>{{blackPlayer.time}}</span>
          </div>
        </div>

        <Chessboard ref="chessboard" assets-path="/assets/piece/maestro/" width="700px" />


        <div class="flex justify-between">
          <div class="flex gap-2">
            <div class="w-[2.5rem] aspect-square rounded-full border border-neutral-200 flex items-center justify-center">
              <span>{{whitePlayer.username[0]}}</span>
            </div>
            <span class="flex gap-2">
              <span>{{whitePlayer.username}}</span>
              <span class="opacity-50">{{blackPlayer.rating}}</span>
            </span>
          </div>
          <div class="border border-neutral-200 rounded-md px-3 flex items-center justify-center" :class="{'bg-neutral-800 text-white': currentMoveIndex % 2 === 0}">
            <span>{{whitePlayer.time}}</span>
          </div>
        </div>
      </div>

      <div class="border border-neutral-200 rounded-xl h-full overflow-auto">
        <div>
          <GameEvaluation
            :data="positionEvaluations.map(e => -e.cp)"
            :currentIndex="currentMoveIndex"
            :corner="10"
            :markers="moveEvaluations.map((type, i) => ({
              i: i+1, type
            })).filter(e => e.type) as Marker[]"
            width="300px"
          />
        </div>

        <div class="grid grid-cols-4 px-3">
          <template v-for="(move, index) of moves" >
            <div v-if="(index % 2) === 0" class="pr-2 text-left">
              <span class="opacity-50">{{Math.floor(index / 2) + 1}}.</span>
            </div>
            <button class="flex items-center px-1" @click="setMove(index)" :class="{'bg-blue-100 rounded-md': index === currentMoveIndex}">
              <span>{{move}}</span>
            </button>
            <div v-if="(index % 2) === 0" class="pr-2 text-left" />
          </template>
        </div>
      </div>
    </div>
  </main>
</template>
