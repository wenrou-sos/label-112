<script setup lang="ts">
import type { RegionOrderStats } from '@/utils/stats'
import { getCompletionRateColor } from '@/utils/stats'

interface Props {
  data: RegionOrderStats[]
}

defineProps<Props>()

function getBarColor(rate: number): string {
  return getCompletionRateColor(rate)
}

function getStatusText(rate: number): string {
  if (rate >= 0.85) return '优秀'
  if (rate >= 0.6) return '正常'
  return '预警'
}

function getStatusClass(rate: number): string {
  if (rate >= 0.85) return 'text-eco-500 dark:text-eco-400'
  if (rate >= 0.6) return 'text-warning-500 dark:text-warning-400'
  return 'text-danger-500 dark:text-danger-400'
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-3 text-xs">
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-eco-500"></span>
        <span class="text-gray-500 dark:text-gray-400">≥85% 优秀</span>
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-warning-500"></span>
        <span class="text-gray-500 dark:text-gray-400">60%-85% 正常</span>
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-danger-500"></span>
        <span class="text-gray-500 dark:text-gray-400">&lt;60% 预警</span>
      </span>
    </div>

    <div class="space-y-3">
      <div
        v-for="item in data"
        :key="item.regionId"
        class="group"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
            {{ item.regionName }}
          </span>
          <div class="flex items-center gap-2">
            <span
              class="text-xs font-medium px-1.5 py-0.5 rounded"
              :class="[
                item.completionRate >= 0.85 ? 'bg-eco-100 dark:bg-eco-500/15' :
                item.completionRate >= 0.6 ? 'bg-warning-100 dark:bg-warning-500/15' :
                'bg-danger-100 dark:bg-danger-500/15',
                getStatusClass(item.completionRate),
              ]"
            >
              {{ getStatusText(item.completionRate) }}
            </span>
            <span class="text-sm font-bold font-mono text-gray-900 dark:text-white">
              {{ Math.round(item.completionRate * 100) }}%
            </span>
          </div>
        </div>
        <div class="h-6 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out relative"
            :style="{
              width: `${Math.max(item.completionRate * 100, 2)}%`,
              backgroundColor: getBarColor(item.completionRate),
            }"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60"
              style="animation: shimmer 2s infinite;"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
