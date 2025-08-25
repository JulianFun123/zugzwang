<script setup lang="ts">
import {type Cp, cpToPercent, type Mate} from "@/helper/stockfish.ts";

defineProps<{
  evaluation?: Cp|Mate
}>()
</script>
<template>

  <div class="w-4  h-full border border-neutral-200 rounded-full relative dark:border-neutral-800 bg-white/80">
    <div
      v-if="evaluation"
      class="w-full bg-neutral-700 rounded-full transition-all"
      :style="{
            height: `${cpToPercent(evaluation?.cp || 0)}%`
          }"
    />
    <div v-if="evaluation && evaluation?.type === 'mate'" class="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bg-neutral-800 border border-neutral-700 text-white px-1.5 rounded-full text-sm text-nowrap">
      M{{
        // Why is typescript failing here???
        // @ts-ignore
        Math.abs(evaluation.mate)
      }}
    </div>
  </div>
</template>