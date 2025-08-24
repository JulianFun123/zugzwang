<template>
  <div class="eval-timeline" :style="{ width: toPx(width), height: toPx(height) }" :aria-label="ariaLabel">
    <svg :viewBox="`0 0 ${innerW} ${innerH}`" :width="innerW" :height="innerH" class="svg-root">
      <defs>
        <clipPath :id="clipId">
          <rect :x="pad" :y="pad" :width="plotW" :height="plotH" :rx="corner" :ry="corner" />
        </clipPath>
      </defs>

      <!-- Background rounded card -->
      <rect :x="pad" :y="pad" :width="plotW" :height="plotH" :rx="corner" :ry="corner" :fill="colors.bg" />

      <!-- Midline (50%) -->
      <line :x1="pad" :x2="pad + plotW" :y1="pad + plotH/2" :y2="pad + plotH/2" :stroke="colors.midline" stroke-width="1" stroke-linecap="round"/>

      <!-- Area under the curve (white advantage area by default) -->
      <g :clip-path="`url(#${clipId})`">
        <path :d="areaPath" :fill="colors.area" :opacity="0.98"/>
        <path :d="linePath" :stroke="colors.line" stroke-width="2" fill="none" stroke-linecap="round"/>

        <!-- Optional dots/markers -->
        <template v-if="showDots">
          <circle v-for="(p, idx) in pts" :key="idx" :cx="p.x" :cy="p.y" :r="dotR" :fill="dotColor(idx)" :opacity="dotOpacity(idx)" />
        </template>

        <!-- Current-move marker -->
        <line v-if="currentIndex != null" :x1="xAt(currentIndex)" :x2="xAt(currentIndex)" :y1="pad" :y2="pad + plotH" :stroke="colors.marker" stroke-width="3"/>
      </g>

      <!-- Rounded overlay stroke to match card edges -->
      <rect :x="pad" :y="pad" :width="plotW" :height="plotH" :rx="corner" :ry="corner" fill="none" :stroke="colors.border" stroke-width="1" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Marker {
  i: number
  type?: string
  opacity?: number
}

interface Props {
  data: number[]
  currentIndex?: number | null
  min?: number
  max?: number
  width?: number | string
  height?: number | string
  padding?: number
  corner?: number
  showDots?: boolean
  markers?: Marker[]
  invert?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  currentIndex: null,
  min: -1000,
  max: 1000,
  width: 900,
  height: 120,
  padding: 12,
  corner: 14,
  showDots: true,
  markers: () => [],
  invert: false,
})

const colors = {
  bg: '#2b2b2b',
  border: 'rgba(0,0,0,0.35)',
  midline: 'rgba(255,255,255,0.25)',
  area: '#ffffff',
  line: '#d9d9d9',
  marker: '#2ecc71',
  dots: {
    default: '#f5c24200',
    excellent: '#34c759',
    good: '#34c759',
    okay: '#34c759',
    inaccuracy: '#f7c948',
    mistake: '#f59f00',
    blunder: '#e03131',
    book: '#8e8e93',
  },
}

const innerW = computed(() => toNum(props.width))
const innerH = computed(() => toNum(props.height))
const pad = computed(() => props.padding)
const plotW = computed(() => innerW.value - pad.value * 2)
const plotH = computed(() => innerH.value - pad.value * 2)

const clipId = `clip-${Math.random().toString(36).slice(2)}`

const domain = computed(() => [props.min, props.max] as const)
const scaleX = (i: number) => {
  const n = Math.max(1, props.data.length - 1)
  return pad.value + (i / n) * plotW.value
}
const scaleY = (cp: number) => {
  const [min, max] = domain.value
  const c = Math.max(min, Math.min(max, cp))
  const t = (c - min) / (max - min)
  const frac = props.invert ? 1 - t : t
  return pad.value + (1 - frac) * plotH.value
}

const pts = computed(() => props.data.map((v, i) => ({ x: scaleX(i), y: scaleY(v) })))

// Generate a smooth path using cubic Bézier curves between points
function buildSmoothPath(points: {x:number,y:number}[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i+1]
    const midX = (p0.x + p1.x) / 2
    d += ` Q ${midX} ${p0.y}, ${p1.x} ${p1.y}`
  }
  return d
}

const linePath = computed(() => buildSmoothPath(pts.value))

const areaPath = computed(() => {
  if (pts.value.length === 0) return ''
  const first = pts.value[0]
  const last = pts.value[pts.value.length - 1]
  const baseY = pad.value + plotH.value
  let d = `M ${first.x} ${baseY} L ${first.x} ${first.y}`
  for (let i = 0; i < pts.value.length - 1; i++) {
    const p0 = pts.value[i]
    const p1 = pts.value[i+1]
    const midX = (p0.x + p1.x) / 2
    d += ` Q ${midX} ${p0.y}, ${p1.x} ${p1.y}`
  }
  d += ` L ${last.x} ${baseY} Z`
  return d
})

const dotR = 4
function dotColor(i: number) {
  const m = props.markers?.find(m => m.i === i)
  if (!m) return colors.dots.default
  return colors.dots[m.type || 'default'] || colors.dots.default
}
function dotOpacity(i: number) {
  const m = props.markers?.find(m => m.i === i)
  return m?.opacity ?? 1
}
function xAt(i: number) { return scaleX(Math.max(0, Math.min(i, Math.max(0, props.data.length - 1)))) }
function toPx(v: number | string) { return typeof v === 'number' ? `${v}px` : v }
function toNum(v: number | string) { return typeof v === 'number' ? v : parseFloat(v) || 0 }

const ariaLabel = computed(() => `Evaluation timeline with ${props.data.length} points; positive values favor White.`)
</script>

<style scoped>
.eval-timeline { position: relative; display: inline-block; }
.svg-root { display: block; }
</style>