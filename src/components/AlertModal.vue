<script setup lang="ts">import { computed } from 'vue';
import { AlertTriangle, X, UserPlus, TrendingUp, Clock, MapPin, Scale } from 'lucide-vue-next';
import type { Order } from '@/types';
import { categoryLabels, formatWeight, formatTime } from '@/utils/format';
interface Props {
 visible: boolean;
 orders: Order[];
}
const props = defineProps<Props>();
const emit = defineEmits<{
 (e: 'close'): void;
 (e: 'assign', order: Order): void;
 (e: 'increasePrice', orderId: string): void;
}>();
const waitMinutes = (order: Order) => {
 const diff = Date.now() - order.createdAt;
 return Math.floor(diff / 60000);
};
const currentOrder = computed(() => props.orders[0] || null);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible && orders.length > 0"
        class="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-[shake_0.5s_ease-in-out]">
          <div class="bg-gradient-to-r from-danger-500 to-danger-600 px-5 py-4">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <AlertTriangle class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">超时订单告警</h3>
                  <p class="text-sm text-white/80 mt-0.5">有 {{ orders.length }} 个订单超过10分钟未接单</p>
                </div>
              </div>
              <button
                @click="emit('close')"
                class="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div v-if="currentOrder" class="p-5 space-y-4">
            <div class="p-4 rounded-xl border-2 border-danger-200 bg-danger-50/50 dark:bg-danger-500/5 dark:border-danger-500/20">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">订单 #{{ currentOrder.id }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ formatTime(currentOrder.createdAt) }} 下单
                  </p>
                </div>
                <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-danger-500 text-white text-xs font-bold animate-pulse">
                  <Clock class="w-3 h-3" />
                  超时 {{ waitMinutes(currentOrder) }} 分钟
                </span>
              </div>

              <div class="space-y-2">
                <div class="flex items-start gap-2">
                  <MapPin class="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <p class="text-sm text-gray-700 dark:text-gray-300">{{ currentOrder.address }}</p>
                </div>
                <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ categoryLabels[currentOrder.category] }}</span>
                  <span class="flex items-center gap-1">
                    <Scale class="w-3 h-3" />
                    {{ formatWeight(currentOrder.estimatedWeight) }}
                  </span>
                  <span>用户：{{ currentOrder.userName }}</span>
                </div>
                <div v-if="currentOrder.priceMultiplier > 1" class="pt-2">
                  <span class="px-2 py-0.5 bg-warning-500/15 text-warning-600 dark:text-warning-400 rounded text-xs font-medium">
                    当前加价 {{ Math.round((currentOrder.priceMultiplier - 1) * 100) }}%
                  </span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button
                @click="emit('assign', currentOrder)"
                class="p-4 rounded-xl border-2 border-eco-200 bg-eco-50 dark:bg-eco-500/5 dark:border-eco-500/20 hover:bg-eco-100 dark:hover:bg-eco-500/10 transition-colors group"
              >
                <div class="w-10 h-10 rounded-xl bg-eco-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus class="w-5 h-5 text-white" />
                </div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">手动指派</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">选择指定回收员派单</p>
              </button>

              <button
                @click="emit('increasePrice', currentOrder.id)"
                :disabled="currentOrder.priceMultiplier >= 2.0"
                class="p-4 rounded-xl border-2 border-warning-200 bg-warning-50 dark:bg-warning-500/5 dark:border-warning-500/20 hover:bg-warning-100 dark:hover:bg-warning-500/10 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div class="w-10 h-10 rounded-xl bg-warning-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <TrendingUp class="w-5 h-5 text-white" />
                </div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">提价激励</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ currentOrder.priceMultiplier >= 2.0 ? '已达最高加价' : `加价 +30%（当前${Math.round((currentOrder.priceMultiplier - 1) * 100)}%）` }}
                </p>
              </button>
            </div>

            <div v-if="orders.length > 1" class="pt-2">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">其他超时订单：</p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="o in orders.slice(1)"
                  :key="o.id"
                  class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 font-mono"
                >
                  #{{ o.id }} · {{ waitMinutes(o) }}分钟
                </span>
              </div>
            </div>
          </div>

          <div class="px-5 pb-5">
            <button
              @click="emit('close')"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              稍后处理
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
</style>
