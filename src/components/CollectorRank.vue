<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trophy, ArrowUpDown, Scale, DollarSign, Package } from 'lucide-vue-next'
import type { Collector, RankSortType } from '@/types'
import { formatWeight, formatCurrency } from '@/utils/format'

interface Props {
  collectors: Collector[]
}

const props = defineProps<Props>()
const sortBy = ref<RankSortType>('orders')

const sortOptions: { key: RankSortType; label: string; icon: typeof Package }[] = [
  { key: 'orders', label: '接单量', icon: Package },
  { key: 'weight', label: '回收重量', icon: Scale },
  { key: 'income', label: '总收入', icon: DollarSign },
]

const rankedCollectors = computed(() => {
  const sorted = [...props.collectors].sort((a, b) => {
    switch (sortBy.value) {
      case 'orders':
        return b.stats.ordersToday - a.stats.ordersToday
      case 'weight':
        return b.stats.totalWeight - a.stats.totalWeight
      case 'income':
        return b.stats.totalIncome - a.stats.totalIncome
    }
  })
  return sorted.slice(0, 8)
})

function getValue(c: Collector) {
  switch (sortBy.value) {
    case 'orders':
      return `${c.stats.ordersToday} 单`
    case 'weight':
      return formatWeight(c.stats.totalWeight)
    case 'income':
      return formatCurrency(c.stats.totalIncome)
  }
}

function getRankClass(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
  if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
  if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
}
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden flex flex-col">
    <div class="p-4 border-b border-gray-100 dark:border-gray-700">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Trophy class="w-5 h-5 text-warning-500" />
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">回收员排行榜</h3>
        </div>
      </div>
      <div class="flex gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
        <button
          v-for="opt in sortOptions"
          :key="opt.key"
          @click="sortBy = opt.key"
          class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="[
            sortBy === opt.key
              ? 'bg-white dark:bg-gray-800 text-warning-600 dark:text-warning-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          ]"
        >
          <component :is="opt.icon" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <table class="w-full">
        <tbody>
          <tr
            v-for="(c, idx) in rankedCollectors"
            :key="c.id"
            class="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
          >
            <td class="w-14 py-3 px-4">
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                :class="getRankClass(idx + 1)"
              >
                {{ idx + 1 }}
              </div>
            </td>
            <td class="py-3 pr-2">
              <div class="flex items-center gap-2.5">
                <img
                  :src="c.avatar"
                  :alt="c.name"
                  class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"
                />
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ c.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    接单率 {{ Math.round(c.stats.acceptRate * 100) }}%
                  </p>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-right">
              <span class="text-sm font-bold font-mono text-gray-900 dark:text-white">
                {{ getValue(c) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
