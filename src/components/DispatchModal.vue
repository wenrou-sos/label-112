<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Clock, MapPin, Star, Send, Route } from 'lucide-vue-next'
import type { Order, Collector, RecommendedCollector, Location } from '@/types'
import { useDispatch } from '@/composables/useDispatch'
import { formatWeight, categoryLabels } from '@/utils/format'
import { formatDistance } from '@/utils/distance'

interface Props {
  visible: boolean
  order: Order | null
  isNavigating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isNavigating: false,
})
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'assign', orderId: string, collectorId: string): void
}>()

const { getRecommendedCollectors, getNavigationRoute } = useDispatch()

const recommended = ref<RecommendedCollector[]>([])
const navigationInfo = ref<{ distance: number; eta: number; waypoints: Location[] } | null>(null)
const selectedCollectorId = ref<string | null>(null)

watch(
  () => [props.visible, props.order],
  () => {
    if (props.visible && props.order) {
      recommended.value = getRecommendedCollectors(props.order, 3)
      if (recommended.value.length > 0) {
        selectedCollectorId.value = recommended.value[0].collector.id
        updateNavigation(recommended.value[0].collector)
      }
    } else {
      navigationInfo.value = null
      selectedCollectorId.value = null
    }
  },
  { immediate: true }
)

function updateNavigation(collector: Collector) {
  if (!props.order) return
  const route = getNavigationRoute(collector.location, props.order.location)
  navigationInfo.value = route
  selectedCollectorId.value = collector.id
}

function handleAssign() {
  if (!props.order || !selectedCollectorId.value) return
  emit('assign', props.order.id, selectedCollectorId.value)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
          <div class="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">智能调度派单</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">订单 #{{ order?.id }}</p>
            </div>
            <button
              @click="emit('close')"
              class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div v-if="order" class="flex-1 overflow-y-auto p-5 space-y-5">
            <div class="p-4 rounded-xl bg-gradient-to-br from-eco-50 to-eco-100/50 dark:from-eco-500/10 dark:to-eco-500/5 border border-eco-100 dark:border-eco-500/20">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-eco-500 flex items-center justify-center shrink-0">
                  <MapPin class="w-5 h-5 text-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ order.address }}</p>
                  <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-600 dark:text-gray-300">
                    <span>{{ categoryLabels[order.category] }}</span>
                    <span>预估 {{ formatWeight(order.estimatedWeight) }}</span>
                    <span>{{ order.userName }}</span>
                    <span v-if="order.priceMultiplier > 1" class="text-warning-600 dark:text-warning-400 font-medium">
                      🔥 加价{{ Math.round((order.priceMultiplier - 1) * 100) }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="navigationInfo" class="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
              <div class="flex items-center gap-2 mb-3">
                <Route class="w-4 h-4 text-blue-500" />
                <p class="text-sm font-semibold text-gray-900 dark:text-white">导航路线信息</p>
              </div>
              <div class="flex gap-6">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-0.5">总距离</p>
                  <p class="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {{ formatDistance(navigationInfo.distance) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-0.5">预估到达</p>
                  <p class="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {{ navigationInfo.eta }} <span class="text-sm font-normal">分钟</span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                推荐回收员 <span class="text-gray-400 font-normal">(按距离排序)</span>
              </p>
              <div class="space-y-2.5">
                <div
                  v-for="(rec, idx) in recommended"
                  :key="rec.collector.id"
                  @click="updateNavigation(rec.collector)"
                  class="p-4 rounded-xl border-2 cursor-pointer transition-all"
                  :class="[
                    selectedCollectorId === rec.collector.id
                      ? 'border-eco-500 bg-eco-50/50 dark:bg-eco-500/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-eco-300 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  ]"
                >
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <img
                        :src="rec.collector.avatar"
                        :alt="rec.collector.name"
                        class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"
                      />
                      <div
                        class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
                        :class="{
                          'bg-eco-500': rec.collector.status === 'online',
                          'bg-warning-500': rec.collector.status === 'busy',
                          'bg-gray-400': rec.collector.status === 'offline',
                        }"
                      ></div>
                      <span
                        v-if="idx === 0"
                        class="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-[10px] font-bold flex items-center justify-center"
                      >
                        {{ idx + 1 }}
                      </span>
                    </div>

                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ rec.collector.name }}</p>
                      <div class="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                          <MapPin class="w-3 h-3" />
                          {{ formatDistance(rec.distance) }}
                        </span>
                        <span class="flex items-center gap-1">
                          <Clock class="w-3 h-3" />
                          ETA {{ rec.eta }}分钟
                        </span>
                        <span class="flex items-center gap-1">
                          <Star class="w-3 h-3 text-warning-500 fill-warning-500" />
                          {{ Math.round(rec.collector.stats.acceptRate * 100) }}%
                        </span>
                      </div>
                    </div>

                    <div class="text-right">
                      <p class="text-xs text-gray-500 dark:text-gray-400">今日</p>
                      <p class="text-sm font-bold font-mono text-gray-900 dark:text-white">
                        {{ rec.collector.stats.ordersToday }}单
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-5 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button
              @click="emit('close')"
              class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              @click="handleAssign"
              :disabled="!selectedCollectorId || isNavigating"
              class="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-eco-500 to-eco-600 text-white font-medium hover:from-eco-600 hover:to-eco-700 transition-all shadow-lg shadow-eco-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <template v-if="isNavigating">
                <div class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                正在导航中…
              </template>
              <template v-else>
                <Send class="w-4 h-4" />
                确认派单
              </template>
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
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
