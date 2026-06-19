<script setup lang="ts">
import { Map, TrendingUp, Clock } from 'lucide-vue-next'
import type { Region } from '@/types'
import { generateRegions } from '@/data/mock'

const regions = generateRegions()
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden flex flex-col">
    <div class="p-4 border-b border-gray-100 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <Map class="w-5 h-5 text-eco-500" />
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">区域统计</h3>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <div
        v-for="region in regions"
        :key="region.id"
        class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ region.name }}</h4>
          <div class="flex items-center gap-1 text-xs text-eco-600 dark:text-eco-400">
            <TrendingUp class="w-3 h-3" />
            <span>{{ Math.round((region.stats.completedOrders / region.stats.totalOrders) * 100) }}%</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-0.5">今日订单</p>
            <p class="text-lg font-bold font-mono text-gray-900 dark:text-white">{{ region.stats.totalOrders }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-0.5">已完成</p>
            <p class="text-lg font-bold font-mono text-eco-600 dark:text-eco-400">{{ region.stats.completedOrders }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-0.5">平均响应</p>
            <p class="text-lg font-bold font-mono text-warning-600 dark:text-warning-400">
              {{ region.stats.avgResponseTime }}<span class="text-xs font-normal ml-0.5">分</span>
            </p>
          </div>
        </div>

        <div class="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-eco-400 to-eco-600 rounded-full transition-all duration-500"
            :style="{ width: `${Math.min((region.stats.completedOrders / region.stats.totalOrders) * 100, 100)}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
