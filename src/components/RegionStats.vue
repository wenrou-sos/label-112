<script setup lang="ts">
import { ref, computed } from 'vue'
import { Map, ChevronDown, Users, Clock, Package, TrendingUp } from 'lucide-vue-next'
import type { Order, Collector } from '@/types'
import { aggregateRegionOrders, aggregateHourlyOrders, aggregateRegionHourlyOrders } from '@/utils/stats'
import type { RegionOrderStats, HourlyOrderStats, RegionHourlyData } from '@/utils/stats'
import StackedBarChart from './charts/StackedBarChart.vue'
import CompletionRateChart from './charts/CompletionRateChart.vue'
import TrendLineChart from './charts/TrendLineChart.vue'

interface Props {
  orders: Order[]
  collectors: Collector[]
}

const props = defineProps<Props>()

const expandedRegionId = ref<string | null>(null)

const regionStats = computed<RegionOrderStats[]>(() =>
  aggregateRegionOrders(props.orders, props.collectors.map(c => ({ regionId: c.regionId, status: c.status })))
)

const hourlyStats = computed<HourlyOrderStats[]>(() =>
  aggregateHourlyOrders(props.orders)
)

const regionHourlyData = computed<RegionHourlyData[]>(() =>
  aggregateRegionHourlyOrders(props.orders)
)

const expandedRegionOrders = computed(() => {
  if (!expandedRegionId.value) return []
  return props.orders
    .filter(o => o.regionId === expandedRegionId.value)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
})

const expandedRegionHourly = computed(() =>
  regionHourlyData.value.find(r => r.regionId === expandedRegionId.value)?.hourly || []
)

const peakHour = computed(() => {
  const hourly = expandedRegionHourly.value
  if (hourly.length === 0) return null
  const peak = hourly.reduce((a, b) => a.count > b.count ? a : b)
  return peak.count > 0 ? peak : null
})

function toggleRegion(regionId: string) {
  expandedRegionId.value = expandedRegionId.value === regionId ? null : regionId
}

function getSublistHours(hourly: { hour: number; count: number }[]) {
  const currentHour = new Date().getHours()
  const start = Math.max(0, currentHour - 5)
  const end = Math.min(23, currentHour + 2)
  return hourly.slice(start, end + 1)
}
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden flex flex-col">
    <div class="p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-2">
        <Map class="w-5 h-5 text-eco-500" />
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">区域统计</h3>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-5">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-gray-700 dark:text-gray-300">各区域订单量</p>
          <p class="text-[11px] text-gray-400 dark:text-gray-500">已完成 / 待处理</p>
        </div>
        <div class="h-[150px]">
          <StackedBarChart :data="regionStats" :height="140" />
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300">完成率对比</p>
        <CompletionRateChart :data="regionStats" />
      </div>

      <div class="space-y-2">
        <div class="h-[140px]">
          <TrendLineChart :data="hourlyStats" :height="130" />
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300">区域详情</p>
        <p class="text-[11px] text-gray-400 dark:text-gray-500">点击卡片展开查看</p>

        <div class="space-y-2">
          <div
            v-for="region in regionStats"
            :key="region.regionId"
            class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300"
            :class="{ 'border-eco-400 dark:border-eco-500/50': expandedRegionId === region.regionId }"
          >
            <div
              class="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              @click="toggleRegion(region.regionId)"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ region.regionName }}</h4>
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :class="[
                      region.completionRate >= 0.85 ? 'bg-eco-100 text-eco-700 dark:bg-eco-500/15 dark:text-eco-400' :
                      region.completionRate >= 0.6 ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400' :
                      'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-400',
                    ]"
                  >
                    {{ Math.round(region.completionRate * 100) }}%
                  </span>
                </div>
                <ChevronDown
                  class="w-4 h-4 text-gray-400 transition-transform duration-300"
                  :class="{ 'rotate-180': expandedRegionId === region.regionId }"
                />
              </div>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">总订单</p>
                  <p class="text-sm font-bold font-mono text-gray-900 dark:text-white">{{ region.total }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">已完成</p>
                  <p class="text-sm font-bold font-mono text-eco-600 dark:text-eco-400">{{ region.completed }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">在线回收员</p>
                  <p class="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{{ region.onlineCollectors }}</p>
                </div>
              </div>
            </div>

            <Transition name="expand">
              <div
                v-if="expandedRegionId === region.regionId"
                class="border-t border-gray-200 dark:border-gray-700"
              >
                <div class="p-3 space-y-4">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="p-2.5 rounded-lg bg-eco-50 dark:bg-eco-500/5">
                      <div class="flex items-center gap-1.5 mb-1">
                        <Users class="w-3.5 h-3.5 text-eco-500" />
                        <span class="text-[11px] text-gray-600 dark:text-gray-400">在线回收员</span>
                      </div>
                      <p class="text-lg font-bold font-mono text-gray-900 dark:text-white">
                        {{ region.onlineCollectors }} <span class="text-xs font-normal text-gray-400">人</span>
                      </p>
                    </div>
                    <div class="p-2.5 rounded-lg bg-warning-50 dark:bg-warning-500/5">
                      <div class="flex items-center gap-1.5 mb-1">
                        <Clock class="w-3.5 h-3.5 text-warning-500" />
                        <span class="text-[11px] text-gray-600 dark:text-gray-400">平均响应</span>
                      </div>
                      <p class="text-lg font-bold font-mono text-gray-900 dark:text-white">
                        {{ region.avgResponseTime }} <span class="text-xs font-normal text-gray-400">分钟</span>
                      </p>
                    </div>
                  </div>

                  <div v-if="getSublistHours(regionHourlyData.find(r => r.regionId === region.regionId)?.hourly || []).length > 0" class="space-y-2">
                    <p class="text-[11px] font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <TrendingUp class="w-3 h-3" />
                      近时段订单分布
                    </p>
                    <div class="flex items-end justify-between gap-1 h-16 px-1">
                      <div
                        v-for="h in getSublistHours(regionHourlyData.find(r => r.regionId === region.regionId)?.hourly || [])"
                        :key="h.hour"
                        class="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          class="w-full max-w-[20px] rounded-t-sm bg-gradient-to-t from-eco-500 to-eco-300 dark:from-eco-600 dark:to-eco-400 transition-all duration-500"
                          :style="{
                            height: `${Math.max((h.count / Math.max(...(regionHourlyData.find(r => r.regionId === region.regionId)?.hourly || []).map(x => x.count), 1)) * 100, 5)}%`,
                            minHeight: '4px',
                          }"
                        ></div>
                        <span class="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                          {{ String(h.hour).padStart(2, '0') }}
                        </span>
                      </div>
                    </div>
                    <p v-if="peakHour && region.regionId === expandedRegionId" class="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                      峰值: {{ peakHour.hour }}:00 ({{ peakHour.count }}单)
                    </p>
                  </div>

                  <div class="space-y-2">
                    <p class="text-[11px] font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Package class="w-3 h-3" />
                      近期订单 ({{ expandedRegionOrders.length }})
                    </p>
                    <div class="space-y-1.5">
                      <div
                        v-for="order in expandedRegionOrders"
                        :key="order.id"
                        class="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30 text-xs"
                      >
                        <div class="flex items-center justify-between mb-0.5">
                          <span class="font-medium text-gray-800 dark:text-gray-200">#{{ order.id }}</span>
                          <span
                            class="px-1.5 py-0.5 rounded text-[10px]"
                            :class="[
                              order.status === 'completed' ? 'bg-eco-100 text-eco-700 dark:bg-eco-500/15 dark:text-eco-400' :
                              order.status === 'accepted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' :
                              'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
                            ]"
                          >
                            {{ order.status === 'completed' ? '已完成' : order.status === 'accepted' ? '进行中' : '待接单' }}
                          </span>
                        </div>
                        <p class="text-gray-500 dark:text-gray-400 truncate text-[11px]">{{ order.address }}</p>
                      </div>
                    </div>
                    <p v-if="expandedRegionOrders.length === 0" class="text-[11px] text-gray-400 dark:text-gray-500 text-center py-3">
                      暂无订单
                    </p>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition: max-height 0.3s ease-out, opacity 0.25s ease;
  max-height: 600px;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
