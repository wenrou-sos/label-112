<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, Clock, Scale, User, Send, Eye } from 'lucide-vue-next'
import type { Order } from '@/types'
import { categoryLabels, statusLabels, formatTime, getTimeAgo, formatWeight, formatPhone } from '@/utils/format'

interface Props {
  order: Order
  selected?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'select'): void
  (e: 'dispatch'): void
}>()

const showActions = computed(() => props.order.status === 'pending')

const statusColorClass = computed(() => {
  const map: Record<string, string> = {
    pending: 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-500/10 dark:text-danger-400 dark:border-danger-500/20',
    accepted: 'bg-warning-50 text-warning-600 border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20',
    completed: 'bg-eco-50 text-eco-600 border-eco-200 dark:bg-eco-500/10 dark:text-eco-400 dark:border-eco-500/20',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600',
  }
  return map[props.order.status] || map.pending
})

const waitTime = computed(() => {
  const diff = Date.now() - props.order.createdAt
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟`
  return `${Math.floor(mins / 60)} 小时 ${mins % 60} 分`
})
</script>

<template>
  <div
    class="group p-4 rounded-xl border transition-all duration-200 cursor-pointer"
    :class="[
      selected
        ? 'border-eco-400 bg-eco-50/50 dark:bg-eco-500/10 dark:border-eco-500/40 shadow-md'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-eco-300 hover:shadow-card',
    ]"
    @click="emit('select')"
  >
    <div class="flex items-start justify-between mb-3">
      <div>
        <p class="text-sm font-semibold text-gray-900 dark:text-white">#{{ order.id }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ getTimeAgo(order.createdAt) }}下单</p>
      </div>
      <span
        class="px-2.5 py-1 rounded-full text-xs font-medium border"
        :class="statusColorClass"
      >
        {{ statusLabels[order.status] }}
      </span>
    </div>

    <div class="space-y-2">
      <div class="flex items-start gap-2">
        <MapPin class="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
        <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{{ order.address }}</p>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <Scale class="w-3.5 h-3.5 text-gray-400" />
          <span class="text-xs text-gray-600 dark:text-gray-300">{{ formatWeight(order.estimatedWeight) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <User class="w-3.5 h-3.5 text-gray-400" />
          <span class="text-xs text-gray-600 dark:text-gray-300">{{ order.userName }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
          {{ categoryLabels[order.category] }}
        </span>
        <div v-if="order.status === 'pending'" class="flex items-center gap-1">
          <Clock class="w-3 h-3 text-danger-500" />
          <span class="text-xs text-danger-500 font-medium">等待 {{ waitTime }}</span>
        </div>
        <span v-else-if="order.acceptedAt" class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatTime(order.acceptedAt) }} 接单
        </span>
        <span v-else class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatPhone(order.userPhone) }}
        </span>
      </div>

      <div v-if="order.priceMultiplier > 1" class="mt-2">
        <span class="px-2 py-0.5 bg-warning-500/15 text-warning-600 dark:text-warning-400 rounded text-xs font-medium">
          🔥 加价 {{ Math.round((order.priceMultiplier - 1) * 100) }}%
        </span>
      </div>

      <div
        v-if="showActions"
        class="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
        @click.stop
      >
        <button
          class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          @click="emit('select')"
        >
          <Eye class="w-3.5 h-3.5" />
          查看
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-eco-500 to-eco-600 text-white text-xs font-medium hover:from-eco-600 hover:to-eco-700 transition-all shadow-sm hover:shadow-md"
          @click="emit('dispatch')"
        >
          <Send class="w-3.5 h-3.5" />
          立即派单
        </button>
      </div>
    </div>
  </div>
</template>
