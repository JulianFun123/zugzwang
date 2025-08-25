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
  stockfishLoaded
} from "@/helper/stockfish.ts";
import {evaluateMove, type MoveEvaluation} from "@/helper/evaluation.ts";
import BoardUser from "@/components/BoardUser.vue";
import EvalBar from "@/components/icons/EvalBar.vue";
import GameEntry from "@/components/icons/GameEntry.vue";
import LoadingContainer from "@/components/LoadingContainer.vue";

const moves = ref<string[]>([])
const clockTimes = ref<string[]>([])
const whitePlayer = ref({username: 'white', time: '10', rating: 1500, avatar: 'https://accounts.interaapps.de/avatars/Q.png'})
const blackPlayer = ref({username: 'black', time: '10', rating: 1500, avatar: 'https://accounts.interaapps.de/avatars/Q.png'})

const providers = ['chess.com', 'lichess', 'pgn'] as const
type Provider = (typeof providers)[number]
const provider = useStorage<Provider>('provider', 'chess.com', localStorage)

const positionEvaluations = ref<(Cp|Mate)[]>([])
const moveEvaluations = ref<(MoveEvaluation|null)[]>([])

const games = ref<ChessGame[]>([])

const username = useStorage('username', 'juliangjn', localStorage)

onMounted(async () => {
  await loadUser()
  loadGame(games.value[0])
  initStockfish()
})
const loadingGames = ref(false)
const loadUser = useDebounceFn(async () => {
  loadingGames.value = true
  if (provider.value === 'chess.com') {
    let chessAPI = new ChessWebAPI();
    const g = (await chessAPI.getPlayerCompleteMonthlyArchives(username.value, 2025, 8)).body.games
    g.reverse()
    games.value = g.slice(0,15)
  } else if (provider.value === 'lichess') {
    const res = await fetch(`https://lichess.org/api/games/user/${username.value}?&max=10&pgnInJson=true&sort=dateDesc&clocks=true`, {
      headers: {
        'Accept': 'application/json'
      }
    })

    games.value = []
    for (const game of (await res.text()).split("\n").filter(a => a).map(r => JSON.parse(r))) {
      const chessInstance = new Chess()
      chessInstance.loadPgn(game.pgn)
      games.value.push({
        pgn: game.pgn,
        black: {
          username: game.players.black.user?.name || 'Anonymous',
          rating: game.players.black.rating,
          result: game.winner === 'black' ? 'win' : (game.status === 'draw' ? 'draw' : 'checkmated')
        },
        white: {
          username: game.players.white.user?.name || 'Anonymous',
          rating: game.players.white.rating,
          result: game.winner === 'white' ? 'win' : (game.status === 'draw' ? 'draw' : 'checkmated')
        },
        rated: game.rated,
        fen: chessInstance.fen()
      })
    }
  } else if (provider.value === 'pgn') {
    games.value = localGames.value
  }
  loadingGames.value = false
}, 1000)

const localGames = useStorage<ChessGame[]>('localgames', [], localStorage)

watch(localGames, () => {
  if (provider.value === 'pgn') {
    games.value = localGames.value
  }
})

const localPgn = ref('')
const addLocalGame = () => {
  if (!localPgn.value) return
  const chessInstance = new Chess()
  chessInstance.loadPgn(localPgn.value)
  const parsed = pgnParse(localPgn.value, {startRule: 'game'}) as any
  localGames.value.unshift({
    pgn: localPgn.value,
    black: {
      username: parsed?.tags?.Black || 'Black',
      rating: parsed?.tags?.BlackElo || 0,
      result: parsed?.tags?.Result === '0-1' ? 'win' : (parsed?.tags?.Result === '1-0' ? 'checkmated' : 'draw')
    },
    white: {
      username: parsed?.tags?.White || 'Black',
      rating: parsed?.tags?.WhiteElo || 0,
      result: parsed?.tags?.Result === '1-0' ? 'win' : (parsed?.tags?.Result === '0-1' ? 'checkmated' : 'draw')
    },
    rated: false,
    fen: chessInstance.fen()
  })
  localPgn.value = ''
}

watch(username, () => loadUser())
watch(provider, () => loadUser())


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

    if (i > 0 && (positionEvaluations.value[i-1]?.cp ?? false) && (evaluation?.cp ?? false)) {
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
  clockTimes.value = parsed.moves.map((m: any) => m.commentDiag?.clk)

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
      <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl h-full overflow-auto p-2">
        <div class="flex flex-col gap-5">
          <div class="flex gap-2">
            <input v-if="provider !== 'pgn'" v-model="username" class="p-2 px-3 border border-neutral-200 dark:border-neutral-700 rounded-md" placeholder="Chess.com Username" />
            <select v-model="provider" class="p-2 px-2 border border-neutral-200 dark:border-neutral-700 rounded-md" :class="{'w-full': provider === 'pgn'}">
              <option v-for="p of providers" :key="p" :value="p">{{p}}</option>
            </select>
          </div>
          <template v-if="provider === 'pgn'">
            <textarea v-model="localPgn" class="p-2 px-3 border border-neutral-200 dark:border-neutral-800 rounded-md" placeholder="PGN" />
            <button @click="addLocalGame" class="p-2 bg-black text-white dark:bg-white dark:text-black w-full rounded-md">Add</button>
          </template>
          <LoadingContainer v-if="loadingGames" />
          <GameEntry v-for="game of games" :game @click="loadGame(game)" />
        </div>

      </div>
      <EvalBar :evaluation="positionEvaluations[currentMoveIndex]" />
      <div class="flex gap-2 flex-col justify-between">
        <BoardUser :player="blackPlayer" :is-turn="currentMoveIndex % 2 === 0" />
        <Chessboard ref="chessboard" assets-path="/assets/piece/maestro/" width="700px" />
        <BoardUser :player="whitePlayer" :is-turn="currentMoveIndex % 2 === 1" />
      </div>

      <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl h-full overflow-auto">
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
            <button class="flex items-center px-1" @click="setMove(index)" :class="{'bg-blue-100 dark:text-black rounded-md': index === currentMoveIndex}">
              <span>{{move}}</span>
            </button>
            <div v-if="(index % 2) === 0" class="pr-2 text-left" />
          </template>
        </div>
      </div>
    </div>
  </main>
</template>
