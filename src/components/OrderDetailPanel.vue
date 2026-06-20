<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  X,
  User,
  Phone,
  MapPin,
  Scale,
  Clock,
  Navigation,
  Send,
  Star,
  FileText,
  Target,
  Package,
  Newspaper,
  Recycle,
  Cpu,
  Layers,
  CheckCircle2,
  Circle,
  TrendingUp,
} from 'lucide-vue-next'
import type { Order, Collector, RecommendedCollector, Location } from '@/types'
import { useDispatch } from '@/composables/useDispatch'
import { useCollectors } from '@/composables/useCollectors'
import {
  categoryLabels,
  statusLabels,
  formatTime,
  formatWeight,
} from '@/utils/format'
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
  (e: 'locateAddress', location: Location): void
  (e: 'navigateCollector', collectorId: string, route: { waypoints: Location[] }): void
}>()

const { getRecommendedCollectors, getNavigationRoute } = useDispatch()
const { getCollectorById } = useCollectors()

const recommended = ref<RecommendedCollector[]>([])

watch(
  () => [props.visible, props.order],
  () => {
    if (props.visible && props.order && props.order.status === 'pending') {
      recommended.value = getRecommendedCollectors(props.order, 3)
    } else {
      recommended.value = []
    }
  },
  { immediate: true }
)

const assignedCollector = computed(() => {
  if (!props.order?.collectorId) return null
  return getCollectorById(props.order.collectorId)
})

const statusColorClass = computed(() => {
  if (!props.order) return ''
  const map: Record<string, string> = {
    pending:
      'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-500/10 dark:text-danger-400 dark:border-danger-500/20',
    accepted:
      'bg-warning-50 text-warning-600 border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20',
    completed:
      'bg-eco-50 text-eco-600 border-eco-200 dark:bg-eco-500/10 dark:text-eco-400 dark:border-eco-500/20',
    cancelled:
      'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600',
  }
  return map[props.order.status] || map.pending
})

const categoryIcon = computed(() => {
  if (!props.order) return Package
  const map: Record<string, typeof Package> = {
    paper: Newspaper,
    plastic: Recycle,
    metal: Layers,
    electronic: Cpu,
    mixed: Package,
  }
  return map[props.order.category] || Package
})

interface TimelineNode {
  key: string
  label: string
  time: number | null
  done: boolean
  current: boolean
  collector?: Collector | null
}

const timelineNodes = computed<TimelineNode[]>(() => {
  if (!props.order) return []
  const nodes: TimelineNode[] = []
  const status = props.order.status

  nodes.push({
    key: 'created',
    label: '已下单',
    time: props.order.createdAt,
    done: true,
    current: status === 'pending',
  })

  if (status === 'accepted' || status === 'completed') {
    nodes.push({
      key: 'accepted',
      label: '已接单',
      time: props.order.acceptedAt ?? null,
      done: true,
      current: status === 'accepted',
      collector: assignedCollector.value,
    })
  } else {
    nodes.push({
      key: 'accepted',
      label: '已接单',
      time: null,
      done: false,
      current: false,
    })
  }

  if (status === 'completed') {
    nodes.push({
      key: 'completed',
      label: '已完成',
      time: props.order.completedAt ?? null,
      done: true,
      current: false,
    })
  } else {
    nodes.push({
      key: 'completed',
      label: '已完成',
      time: null,
      done: false,
      current: false,
    })
  }

  return nodes
})

const completionDuration = computed(() => {
  if (!props.order || !props.order.acceptedAt || !props.order.completedAt) return ''
  const diff = props.order.completedAt - props.order.acceptedAt
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} 分钟`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`
})

function handleAssign(collectorId: string) {
  if (!props.order) return
  emit('assign', props.order.id, collectorId)
  emit('close')
}

function handleLocateAddress() {
  if (!props.order) return
  emit('locateAddress', props.order.location)
}

function handleNavigateCollector() {
  if (!props.order || !assignedCollector.value) return
  const route = getNavigationRoute(assignedCollector.value.location, props.order.location)
  emit('navigateCollector', assignedCollector.value.id, { waypoints: route.waypoints })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="visible"
        class="fixed inset-0 z-[1900] bg-black/40"
        @click="emit('close')"
      ></div>
    </Transition>

    <Transition name="panel">
      <div
        v-if="visible && order"
        class="fixed top-0 right-0 z-[2000] h-full w-[380px] bg-white dark:bg-gray-800 shadow-2xl flex flex-col"
      >
        <div class="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div class="min-w-0 flex-1 pr-3">
            <p class="text-xl font-bold text-gray-900 dark:text-white font-mono tracking-wide">
              #{{ order.id }}
            </p>
            <div class="flex items-center gap-2 mt-2">
              <span
                class="px-2.5 py-1 rounded-full text-xs font-medium border"
                :class="statusColorClass"
              >
                {{ statusLabels[order.status] }}
              </span>
              <span
                v-if="order.priceMultiplier > 1"
                class="px-2 py-0.5 bg-warning-500/15 text-warning-600 dark:text-warning-400 rounded text-xs font-medium flex items-center gap-1"
              >
                <TrendingUp class="w-3 h-3" />
                +{{ Math.round((order.priceMultiplier - 1) * 100) }}%
              </span>
            </div>
          </div>
          <button
            @click="emit('close')"
            class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="p-5 space-y-5">
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <div class="flex items-center gap-2 mb-3">
                <User class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  用户信息
                </p>
              </div>
              <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">姓名</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ order.userName }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Phone class="w-3.5 h-3.5" />
                    手机号
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white font-mono">
                    {{ order.userPhone }}
                  </span>
                </div>
                <div class="pt-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-1.5 min-w-0">
                      <MapPin class="w-3.5 h-3.5 text-eco-500 mt-0.5 shrink-0" />
                      <span class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                        {{ order.address }}
                      </span>
                    </div>
                    <button
                      @click="handleLocateAddress"
                      class="p-1.5 rounded-lg text-eco-600 hover:bg-eco-50 dark:text-eco-400 dark:hover:bg-eco-500/10 transition-colors shrink-0"
                      title="在地图上定位"
                    >
                      <Target class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <div class="flex items-center gap-2 mb-3">
                <FileText class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  订单详情
                </p>
              </div>
              <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">品类</span>
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs font-medium"
                  >
                    <component :is="categoryIcon" class="w-3.5 h-3.5" />
                    {{ categoryLabels[order.category] }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Scale class="w-3.5 h-3.5" />
                    预估重量
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ formatWeight(order.estimatedWeight) }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5" />
                    下单时间
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ formatTime(order.createdAt) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <div class="flex items-center gap-2 mb-4">
                <Clock class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  状态时间线
                </p>
              </div>
              <div class="relative pl-1">
                <div
                  class="absolute left-2.5 top-2 bottom-2 w-0.5"
                  :class="order.status === 'completed' ? 'bg-eco-200 dark:bg-eco-500/30' : 'bg-gray-200 dark:bg-gray-600'"
                ></div>
                <div class="space-y-5">
                  <div
                    v-for="(node, idx) in timelineNodes"
                    :key="node.key"
                    class="relative"
                  >
                    <div class="flex items-start gap-3">
                      <div class="relative z-10 mt-0.5">
                        <CheckCircle2
                          v-if="node.done && !node.current"
                          class="w-5 h-5 text-eco-500 dark:text-eco-400"
                        />
                        <div
                          v-else-if="node.current"
                          class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center ring-4 ring-blue-100 dark:ring-blue-500/20"
                        >
                          <Circle class="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                        <div
                          v-else
                          class="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500"
                        ></div>
                      </div>
                      <div class="flex-1 min-w-0 pt-0">
                        <div class="flex items-center gap-2">
                          <p
                            class="text-sm font-semibold"
                            :class="[
                              node.done
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500',
                            ]"
                          >
                            {{ node.label }}
                          </p>
                          <span
                            v-if="node.current"
                            class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                          >
                            进行中
                          </span>
                        </div>
                        <p
                          v-if="node.time"
                          class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                        >
                          {{ formatTime(node.time) }}
                        </p>
                        <p
                          v-if="node.collector"
                          class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1"
                        >
                          <User class="w-3 h-3" />
                          {{ node.collector.name }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="order.status === 'pending'" class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  附近空闲回收员
                </p>
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  最多显示 3 位
                </span>
              </div>
              <div class="space-y-2.5">
                <div
                  v-for="rec in recommended"
                  :key="rec.collector.id"
                  class="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-eco-300 dark:hover:border-eco-500/40 hover:bg-eco-50/30 dark:hover:bg-eco-500/5 transition-all cursor-pointer group"
                  @click="handleAssign(rec.collector.id)"
                >
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <img
                        :src="rec.collector.avatar"
                        :alt="rec.collector.name"
                        class="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700"
                      />
                      <div
                        class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 bg-eco-500"
                      ></div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ rec.collector.name }}
                      </p>
                      <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                          <MapPin class="w-3 h-3" />
                          {{ formatDistance(rec.distance) }}
                        </span>
                        <span class="flex items-center gap-1">
                          <Navigation class="w-3 h-3" />
                          ETA {{ rec.eta }}分钟
                        </span>
                        <span class="flex items-center gap-1">
                          <Star class="w-3 h-3 text-warning-500 fill-warning-500" />
                          {{ Math.round(rec.collector.stats.acceptRate * 100) }}%
                        </span>
                      </div>
                    </div>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        class="p-2 rounded-lg bg-gradient-to-r from-eco-500 to-eco-600 text-white shadow-sm"
                        title="派单"
                      >
                        <Send class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  v-if="recommended.length === 0"
                  class="p-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-600"
                >
                  <p class="text-sm text-gray-400 dark:text-gray-500">
                    暂无空闲回收员
                  </p>
                </div>
              </div>
            </div>

            <div
              v-else-if="order.status === 'accepted' && assignedCollector"
              class="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20"
            >
              <div class="flex items-center gap-2 mb-3">
                <Navigation class="w-4 h-4 text-blue-500" />
                <p class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  回收员信息
                </p>
              </div>
              <div class="flex items-center gap-3 mb-4">
                <img
                  :src="assignedCollector.avatar"
                  :alt="assignedCollector.name"
                  class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-700 shadow-sm"
                />
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ assignedCollector.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    今日 {{ assignedCollector.stats.ordersToday }} 单
                  </p>
                </div>
              </div>
              <button
                @click="handleNavigateCollector"
                :disabled="isNavigating"
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Navigation class="w-4 h-4" />
                {{ isNavigating ? '正在导航…' : '导航追踪' }}
              </button>
            </div>

            <div
              v-else-if="order.status === 'completed'"
              class="p-4 rounded-xl bg-eco-50 dark:bg-eco-500/10 border border-eco-100 dark:border-eco-500/20"
            >
              <div class="flex items-center gap-2 mb-3">
                <CheckCircle2 class="w-4 h-4 text-eco-500" />
                <p class="text-xs font-semibold text-eco-600 dark:text-eco-400 uppercase tracking-wider">
                  完成信息
                </p>
              </div>
              <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    完成用时
                  </span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ completionDuration }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Scale class="w-3.5 h-3.5" />
                    回收重量
                  </span>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ formatWeight(order.estimatedWeight) }}
                  </span>
                </div>
                <div v-if="assignedCollector" class="pt-2 border-t border-eco-100 dark:border-eco-500/20 flex items-center gap-2">
                  <img
                    :src="assignedCollector.avatar"
                    :alt="assignedCollector.name"
                    class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700"
                  />
                  <span class="text-xs text-gray-600 dark:text-gray-300">
                    由 <b class="text-gray-900 dark:text-white">{{ assignedCollector.name }}</b> 完成
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.panel-enter-active,
.panel-leave-active {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-enter-from,
.panel-leave-to {
  transform: translateX(100%);
}
</style>
