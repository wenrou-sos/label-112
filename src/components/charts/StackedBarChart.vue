<script setup lang="ts">
import { computed } from 'vue'
import type { RegionOrderStats } from '@/utils/stats'

interface Props {
  data: RegionOrderStats[]
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 200,
})

function niceScale(maxData: number): { max: number; step: number } {
  if (maxData <= 0) maxData = 1
  const steps = [1, 2, 5, 10, 20, 25, 50, 100]
  for (const step of steps) {
    if (step * 4 >= maxData) {
      return { max: step * 4, step }
    }
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxData)))
  const niceStep = Math.ceil(maxData / 4 / magnitude) * magnitude
  return { max: niceStep * 4, step: niceStep }
}

const chartMax = computed(() => {
  const max = Math.max(...props.data.map(d => d.total), 1)
  return niceScale(max).max
})

const yTicks = computed(() => {
  const { step } = niceScale(Math.max(...props.data.map(d => d.total), 1))
  return [0, 1, 2, 3, 4].map(i => Math.round(step * i))
})
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex items-center gap-4 mb-3 text-xs">
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-eco-500"></span>
        <span class="text-gray-600 dark:text-gray-400">已完成</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-warning-400"></span>
        <span class="text-gray-600 dark:text-gray-400">待处理</span>
      </div>
    </div>

    <div class="flex-1 flex">
      <div class="flex flex-col justify-between pr-2 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
        <span v-for="tick in [...yTicks].reverse()" :key="tick">{{ tick }}</span>
      </div>

      <div class="flex-1 flex items-end justify-around gap-2 border-l border-b border-gray-200 dark:border-gray-700 relative">
        <div
          v-for="tick in yTicks.slice(1)"
          :key="'line-' + tick"
          class="absolute left-0 right-0 border-t border-dashed border-gray-100 dark:border-gray-700/50 pointer-events-none"
          :style="{ bottom: `${(tick / chartMax) * 100}%` }"
        ></div>

        <div
          v-for="item in data"
          :key="item.regionId"
          class="flex-1 flex flex-col items-center gap-1.5 group"
        >
          <span class="text-[11px] font-bold font-mono text-gray-700 dark:text-gray-200 h-4">
            {{ item.total }}
          </span>

          <div
            class="w-full max-w-[40px] rounded-t-md flex flex-col-reverse overflow-hidden transition-all duration-500 ease-out"
            :style="{ height: `${(item.total / chartMax) * 100}%` }"
          >
            <div
              class="w-full bg-warning-400 dark:bg-warning-500/90 transition-all duration-500"
              :style="{ height: `${(item.pending / item.total) * 100}%` }"
              v-show="item.pending > 0"
            ></div>
            <div
              class="w-full bg-gradient-to-t from-eco-600 to-eco-400 dark:from-eco-500 dark:to-eco-400 transition-all duration-500"
              :style="{ height: `${(item.completed / item.total) * 100}%` }"
              v-show="item.completed > 0"
            ></div>
          </div>

          <span class="text-[11px] text-gray-500 dark:text-gray-400 text-center truncate w-full">
            {{ item.regionName.replace('区域', '') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
