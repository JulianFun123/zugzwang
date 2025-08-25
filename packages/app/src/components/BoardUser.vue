<script setup lang="ts">
defineProps<{
  player: {
    username: string;
    time: string;
    rating: number;
    avatar: string;
  },
  isTurn: boolean
}>()
</script>
<template>

  <div class="flex justify-between">
    <div class="flex gap-2">
      <div class="w-[2.5rem] aspect-square rounded-full border border-neutral-200 flex items-center justify-center">
        <span>{{player.username[0]}}</span>
      </div>
      <span class="flex gap-2">
              <span>{{player.username}}</span>
              <span class="opacity-50">{{player.rating}}</span>
            </span>
    </div>
    <div class="border border-neutral-200 rounded-md px-3 flex items-center justify-center" :class="{'bg-neutral-800 text-white': isTurn}">
      <span>{{player.time}}</span>
    </div>
  </div>
</template>