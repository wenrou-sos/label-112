<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock, Truck, CheckCircle2, ListFilter } from 'lucide-vue-next'
import type { Order } from '@/types'
import OrderCard from './OrderCard.vue'

interface Props {
  orders: Order[]
  pendingOrders: Order[]
  activeOrders: Order[]
  completedOrders: Order[]
  selectedOrderId?: string | null
  isNavigating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isNavigating: false,
})
const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'dispatch', order: Order): void
}>()

type TabType = 'pending' | 'active' | 'completed'
const activeTab = ref<TabType>('pending')

const tabs = [
  { key: 'pending' as const, label: '待接单', icon: Clock },
  { key: 'active' as const, label: '进行中', icon: Truck },
  { key: 'completed' as const, label: '已完成', icon: CheckCircle2 },
]

const displayOrders = computed(() => {
  switch (activeTab.value) {
    case 'pending':
      return props.pendingOrders
    case 'active':
      return props.activeOrders
    case 'completed':
      return props.completedOrders.slice(0, 10)
  }
})

function getTabCount(key: TabType) {
  switch (key) {
    case 'pending':
      return props.pendingOrders.length
    case 'active':
      return props.activeOrders.length
    case 'completed':
      return props.completedOrders.length
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
    <div class="p-4 border-b border-gray-100 dark:border-gray-700">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">订单管理</h3>
        <button class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ListFilter class="w-4 h-4" />
        </button>
      </div>
      <div class="flex gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          :class="[
            activeTab === tab.key
              ? 'bg-white dark:bg-gray-800 text-eco-600 dark:text-eco-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          ]"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" />
          <span>{{ tab.label }}</span>
          <span
            class="px-1.5 py-0.5 rounded text-[10px] font-bold"
            :class="[
              activeTab === tab.key
                ? 'bg-eco-100 text-eco-700 dark:bg-eco-500/20 dark:text-eco-300'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300',
            ]"
          >
            {{ getTabCount(tab.key) }}
          </span>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-2.5">
      <template v-if="displayOrders.length > 0">
        <OrderCard
          v-for="order in displayOrders"
          :key="order.id"
          :order="order"
          :selected="order.id === selectedOrderId"
          :is-navigating="isNavigating"
          @select="emit('select', order.id)"
          @dispatch="emit('dispatch', order)"
        />
      </template>
      <div v-else class="h-full flex flex-col items-center justify-center text-center py-12">
        <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
          <CheckCircle2 class="w-8 h-8 text-gray-400" />
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">暂无{{ tabs.find(t => t.key === activeTab)?.label }}订单</p>
      </div>
    </div>
  </div>
</template>
