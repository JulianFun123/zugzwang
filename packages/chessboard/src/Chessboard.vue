<script lang="ts" setup>
import {Chess, Move, type Square} from "chess.js";
import {computed, onMounted, ref, useTemplateRef, watch} from "vue";

const props = defineProps<{
  width: string;
  fen?: string;
  assetsPath?: string;
  readonly?: boolean;
}>()

const chess = new Chess()

const pieceIds = new Map<string, string>()

const board = ref(chess.board())

const availableMoves = ref<Move[]>([])
const selectPiece = (square: Square) => {
  availableMoves.value = chess.moves({square, verbose: true})
}

const squareClicked = (rowI: number, squareI: number, square?: Square) => {
  if (props.readonly) return;
  const squareStr = getSquareByIndexes(rowI, squareI)
  if (availableMoves.value.find(m => m.to === squareStr)) {
    pieceIds.set(squareStr, pieceIds.get(availableMoves.value[0].from)!)
    pieceIds.delete(availableMoves.value[0].from)
    move({from: availableMoves.value[0].from, to: squareStr})
    board.value = chess.board()
    availableMoves.value = []
  } else if (square) {
    selectPiece(square)
  } else {
    availableMoves.value = []
  }
  turn.value = chess.turn()
}

const getSquareByIndexes = (row: number, col: number): Square => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  return `${files[col]}${8 - row}` as Square
}

const getIndexesBySquare = (square: Square): [number, number] => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const file = square[0]
  const rank = parseInt(square[1])
  return [8 - rank, files.indexOf(file)]
}

// --- Drag state ---
const currentDrag = ref<null | {
  from: Square,
  img: string,
  x: number,
  y: number
}>(null)

let dragStart = {x: 0, y: 0}
let didMove = false
const dragThreshold = 5

// Mouse down → start dragging
const pieceMouseDown = (e: MouseEvent, square: {square: Square, color: string, type: string}) => {
  if (props.readonly) return;
  if (!square?.square) return

  // Only allow dragging for the current player
  if (square.color !== chess.turn()) return

  e.preventDefault()

  const img = `${props.assetsPath}${square.color}${square.type.toUpperCase()}.svg`

  currentDrag.value = {
    from: square.square,
    img,
    x: e.clientX,
    y: e.clientY,
  }

  selectPiece(square.square)

  window.addEventListener("mousemove", onMouseMove)
  window.addEventListener("mouseup", onMouseUp)
}

const onMouseMove = (e: MouseEvent) => {
  if (props.readonly) return;
  if (currentDrag.value) {
    currentDrag.value.x = e.clientX
    currentDrag.value.y = e.clientY
  }
}

const chessboardEl = useTemplateRef<HTMLElement | null>('chessboardEl')

// Mouse up → drop piece or clear selection
const onMouseUp = (e: MouseEvent) => {
  if (props.readonly) return;
  if (!currentDrag.value) return

  const boardEl = chessboardEl.value!
  if (!boardEl) return

  const rect = boardEl.getBoundingClientRect()
  const col = Math.floor(((e.clientX - rect.left) / rect.width) * 8)
  const row = Math.floor(((e.clientY - rect.top) / rect.height) * 8)

  if (col >= 0 && col < 8 && row >= 0 && row < 8) {
    const to = getSquareByIndexes(row, col)
    if (availableMoves.value.find(m => m.to === to)) {
      move({from: currentDrag.value.from, to})
      pieceIds.set(to, pieceIds.get(currentDrag.value.from)!)
      pieceIds.delete(currentDrag.value.from)
      board.value = chess.board()
      turn.value = chess.turn()
    }
  }

  // Reset drag state
  currentDrag.value = null
  availableMoves.value = []

  // Remove event listeners
  window.removeEventListener("mousemove", onMouseMove)
  window.removeEventListener("mouseup", onMouseUp)
}

onMounted(() => {
  if (props.fen) {
    chess.load(props.fen)
    board.value = chess.board()
  }


  let i = 0;
  for (let boardElement of chess.board()) {
    for (let boardElementElement of boardElement) {
      if (boardElementElement) {
        pieceIds.set(boardElementElement.square, String(++i))
      }
    }
  }
})

const updateBoard = (clearIds?: boolean) => {
  board.value = chess.board()
  availableMoves.value = []
  pieceIds.clear()
  evaluationMark.value = undefined
  let i = 0;
  for (let boardElement of chess.board()) {
    for (let boardElementElement of boardElement) {
      if (boardElementElement) {
        pieceIds.set(boardElementElement.square, String(++i))
      }
    }
  }
  turn.value = chess.turn()
}

const turn = ref(chess.turn())

const move = (notation: string | {
  from: string;
  to: string;
  promotion?: string;
} | null) => {
  const m = chess.move(notation)
  if (m) {
    pieceIds.set(m.to, pieceIds.get(m.from)!)
    pieceIds.delete(m.from)
    board.value = chess.board()
    availableMoves.value = []
    turn.value = chess.turn()
    evaluationMark.value = undefined
  }
  return m
}

const evaluationMark = ref<{
  positionColumn: number,
  positionSquare: number,
  type: string,

}|undefined>(undefined)
const addEvaluationMark = (pos: string, e: string) => {
  const [row, col] = getIndexesBySquare(pos as Square)
  evaluationMark.value = {
    positionColumn: col,
    positionSquare: row,
    type: e
  }
}

defineExpose({
  chess,
  updateBoard,
  move,
  addEvaluationMark
})
</script>
<template>
  <div>
    <div class="chessboard" ref="chessboardEl" :style="{ width: props.width, height: props.width }">
      <div class="chessboard-bg">
        <div v-for="(row, rowI) in board" :key="rowI" class="chessboard-row">
          <div v-for="(square, squareI) in row"
               @click="squareClicked(rowI, squareI, square?.square)"
               :key="squareI"
               class="chessboard-square"
          >
            <div v-if="availableMoves.find(m => m.to === getSquareByIndexes(rowI, squareI))" class="chessboard-square-draggable-indicator" />
          </div>
        </div>
      </div>

      <div class="chessboard-pieces">
        <img
          v-for="square of board.flat().filter(s => s).sort((a, b) => Number(pieceIds.get(a!.square!)!) - Number(pieceIds.get(b!.square!)!))"
          @click="squareClicked(getIndexesBySquare(square?.square!)[0], getIndexesBySquare(square?.square!)[1], square?.square)"
          :key="'piece-'+pieceIds.get(square?.square!)"
          class="chessboard-piece"
          :style="{
            opacity: currentDrag && currentDrag.from === square!.square ? 0 : 1,
            transition: currentDrag && currentDrag.from === square!.square ? 'none' : '0.3s ease',
            left: (getIndexesBySquare(square?.square!)[1] * 12.5) + '%',
            top: (getIndexesBySquare(square?.square!)[0] * 12.5) + '%',
            cursor: readonly ? 'default' : (square!.color === chess.turn() ? 'grab' : 'default'),
          }"
          draggable="false"
          @mousedown="e => pieceMouseDown(e, square!)"
          :src="`${assetsPath}${square!.color}${square!.type.toUpperCase()}.svg`"
        />
      </div>
      <img
        v-if="currentDrag"
        class="dragging-piece"
        :src="currentDrag.img"
        :style="{
          left: currentDrag.x + 'px',
          top: currentDrag.y + 'px',
        }"
      />
      <div v-if="evaluationMark" class="chessboard-evaluation-mark" :style="{
        position: 'absolute',
        left: (evaluationMark.positionColumn * 12.5) + '%',
        top: (evaluationMark.positionSquare * 12.5) + '%',
        background: {
          excellent: '#34c759',
          good: '#34c759',
          okay: '#34c759',
          inaccuracy: '#f7c948',
          mistake: '#f59f00',
          blunder: '#e03131',
          book: '#8e8e93'
        }[evaluationMark.type]
      }"
      >
        <i :class="`ti ti-${
          {
            excellent: 'star',
            good: 'thumb-up',
            okay: 'check',
            inaccuracy: 'alert-circle',
            mistake: 'alert-triangle',
            blunder: 'skull',
            book: 'book'
          }[evaluationMark.type]
          }
        }`" />
        </div>
    </div>
  </div>
</template>
<style>
.chessboard {
  position: relative;
  background: #FFF;
  border: 1px solid #E4E4E4;
  border-radius: 10px;


  @media (prefers-color-scheme: dark) {
    background: #cacaca;
    border-color: #404040;
  }

  .chessboard-evaluation-mark {
    width: 28px;
    aspect-ratio: 1 / 1;
    transform: translate(-20%, -20%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFF;
    border-radius: 100%;
    font-size: 22px;
  }
  .chessboard-pieces {
    user-select: none;
    pointer-events: none;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    .chessboard-piece {
      pointer-events: all;
      cursor: grab;
      position: absolute;
      width: 12.5%;
      height: 12.5%;
      object-fit: cover;
    }
  }


  .dragging-piece {
    position: fixed;
    width: 80px;
    height: 80px;
    pointer-events: none;
    transform: translate(-50%, -50%); /* centers under cursor */
    z-index: 1000;
  }

  .chessboard-bg {
    display: grid;
    grid-template-rows: repeat(8, 1fr);
    width: 100%;
    height: 100%;
    .chessboard-row {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      width: 100%;

      .chessboard-square {
        position: relative;

        img {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .chessboard-square-draggable-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 30%;
          transform: translate(-50%, -50%);
          height: 30%;
          background: #66666655;
          border-radius: 100%;

          @media (prefers-color-scheme: dark) {
            background: #EEEEEE66;
          }
        }
      }

      &:first-child .chessboard-square:last-child {
        border-radius: 0 9px 0 0;
      }

      &:last-child .chessboard-square:first-child {
        border-radius: 0 0 0 9px;
      }

      &:nth-child(odd) .chessboard-square:nth-child(even),
      &:nth-child(even) .chessboard-square:nth-child(odd) {
        background: #E4E4E4;
        @media (prefers-color-scheme: dark) {
          background: #5c5c5c;
        }
      }
    }
  }
}
</style>