<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Trophy,
  Scale,
  DollarSign,
  Package,
  Target,
  ArrowDown,
  ArrowUp,
  Crown,
  TrendingUp,
  CalendarDays,
  CircleDot,
} from 'lucide-vue-next'
import type {
  TimeRangeType,
  RankSortType,
  CollectorTrend,
  CollectorRankedStats,
} from '@/types'
import { useCollectors } from '@/composables/useCollectors'
import { formatWeight, formatCurrency } from '@/utils/format'

const { getRankedCollectors, getTrendData } = useCollectors()

const timeRange = ref<TimeRangeType>('day')
const sortBy = ref<RankSortType>('orders')

const timeRangeTabs: { key: TimeRangeType; label: string }[] = [
  { key: 'day', label: '日榜' },
  { key: 'week', label: '周榜' },
  { key: 'month', label: '月榜' },
]

const sortOptions: { key: RankSortType; label: string; icon: typeof Package }[] = [
  { key: 'orders', label: '接单量', icon: Package },
  { key: 'weight', label: '回收重量', icon: Scale },
  { key: 'income', label: '总收入', icon: DollarSign },
  { key: 'acceptRate', label: '接单率', icon: Target },
]

const rankedList = computed<CollectorRankedStats[]>(() =>
  getRankedCollectors(timeRange.value, sortBy.value, 8)
)

const trendData = computed<CollectorTrend[]>(() =>
  getTrendData(timeRange.value, 'orders')
)

function getStatValue(rs: CollectorRankedStats): string {
  const s = rs.rangeStats
  switch (sortBy.value) {
    case 'orders':
      return `${s.orders} 单`
    case 'weight':
      return formatWeight(s.weight)
    case 'income':
      return formatCurrency(s.income)
    case 'acceptRate':
      return `${Math.round(s.acceptRate * 100)}%`
  }
}

function getRankBadgeClass(rank: number) {
  if (rank === 1)
    return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md shadow-yellow-500/30'
  if (rank === 2)
    return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md shadow-gray-400/30'
  if (rank === 3)
    return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md shadow-amber-600/30'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
}

function getRowClass(rank: number) {
  const base =
    'relative border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-all'
  if (rank === 1)
    return `${base} bg-yellow-50/60 dark:bg-yellow-500/5 before:absolute before:inset-0 before:border-2 before:border-yellow-400/50 before:rounded-b-lg before:pointer-events-none`
  if (rank === 2)
    return `${base} bg-gray-50/60 dark:bg-gray-500/5 before:absolute before:inset-0 before:border-2 before:border-gray-400/50 before:rounded-b-lg before:pointer-events-none`
  if (rank === 3)
    return `${base} bg-amber-50/60 dark:bg-amber-500/5 before:absolute before:inset-0 before:border-2 before:border-amber-600/50 before:rounded-b-lg before:pointer-events-none`
  return `${base} hover:bg-gray-50 dark:hover:bg-gray-700/30`
}

function getRankChangeInfo(rs: CollectorRankedStats) {
  switch (rs.rankChange) {
    case 'up':
      return {
        text: `↑ ${rs.rankChangeAmount}`,
        cls: 'text-eco-600 dark:text-eco-400 bg-eco-50 dark:bg-eco-500/15',
      }
    case 'down':
      return {
        text: `↓ ${rs.rankChangeAmount}`,
        cls: 'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-500/15',
      }
    case 'new':
      return {
        text: 'NEW',
        cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 font-bold',
      }
    default:
      return null
  }
}

const chartWidth = 600
const chartHeight = 140
const padTop = 14
const padBottom = 24
const padLeft = 8
const padRight = 8

const trendMaxValue = computed(() => {
  const all = trendData.value.flatMap((t) => t.points.map((p) => p.value))
  const max = Math.max(...all, 1)
  return Math.ceil(max / 5) * 5 || 10
})

const trendYTicks = computed(() => {
  const ticks = []
  const step = trendMaxValue.value / 3
  for (let i = 0; i <= 3; i++) {
    ticks.push(Math.round(step * i * 10) / 10)
  }
  return ticks
})

function buildPath(trend: CollectorTrend): string {
  if (trend.points.length < 2) return ''
  const width = chartWidth - padLeft - padRight
  const height = chartHeight - padTop - padBottom
  const stepX = width / (trend.points.length - 1)
  const getX = (i: number) => padLeft + i * stepX
  const getY = (v: number) =>
    chartHeight - padBottom - (v / trendMaxValue.value) * height

  const pts = trend.points.map((p, i) => ({
    x: getX(i),
    y: getY(p.value),
  }))

  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const midX = (p0.x + p1.x) / 2
    d += ` Q ${p0.x + (p1.x - p0.x) * 0.5} ${p0.y}, ${midX} ${(p0.y + p1.y) / 2}`
  }
  const last = pts[pts.length - 1]
  d += ` T ${last.x} ${last.y}`
  return d
}

function getDotPosition(trend: CollectorTrend, index: number) {
  const width = chartWidth - padLeft - padRight
  const height = chartHeight - padTop - padBottom
  const stepX = width / (trend.points.length - 1)
  const x = padLeft + index * stepX
  const y =
    chartHeight -
    padBottom -
    (trend.points[index].value / trendMaxValue.value) * height
  return { x, y }
}

function sortValueUnit(): string {
  return '单'
}
</script>

<template>
  <div
    class="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden flex flex-col"
  >
    <div class="p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Trophy class="w-5 h-5 text-warning-500" />
          <h3
            class="text-base font-semibold text-gray-900 dark:text-white"
          >
            回收员绩效看板
          </h3>
        </div>
        <div class="flex gap-0.5 bg-gray-100 dark:bg-gray-700/50 p-0.5 rounded-lg">
          <button
            v-for="tab in timeRangeTabs"
            :key="tab.key"
            @click="timeRange = tab.key"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
            :class="[
              timeRange === tab.key
                ? 'bg-white dark:bg-gray-800 text-warning-600 dark:text-warning-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-1">
        <button
          v-for="opt in sortOptions"
          :key="opt.key"
          @click="sortBy = opt.key"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border"
          :class="[
            sortBy === opt.key
              ? 'bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 border-warning-200 dark:border-warning-500/30'
              : 'bg-white dark:bg-gray-700/40 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300',
          ]"
        >
          <component :is="opt.icon" class="w-3 h-3" />
          <span>{{ opt.label }}</span>
          <ArrowDown
            v-if="sortBy === opt.key"
            class="w-2.5 h-2.5"
          />
        </button>
      </div>
    </div>

    <div
      class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <TrendingUp
            class="w-3.5 h-3.5 text-blue-500"
          />
          <p
            class="text-[11px] font-medium text-gray-600 dark:text-gray-300"
          >
            TOP 3 接单量趋势
          </p>
        </div>
        <p class="text-[10px] text-gray-400 dark:text-gray-500">
          单位：{{ sortValueUnit() }}
        </p>
      </div>

      <div class="flex gap-2 mb-2">
        <div
          v-for="trend in trendData"
          :key="trend.collectorId"
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
          :style="{ color: trend.color }"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :style="{ background: trend.color }"
          ></span>
          <span class="truncate max-w-[60px] dark:text-gray-200 text-gray-700">
            {{ trend.collectorName }}
          </span>
        </div>
      </div>

      <div class="relative" style="height: 130px">
        <svg
          :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
          class="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <g class="grid-lines">
            <line
              v-for="tick in trendYTicks.slice(0, -1)"
              :key="'g-' + tick"
              :x1="padLeft"
              :y1="
                chartHeight -
                padBottom -
                (tick / trendMaxValue) *
                  (chartHeight - padTop - padBottom)
              "
              :x2="chartWidth - padRight"
              :y2="
                chartHeight -
                padBottom -
                (tick / trendMaxValue) *
                  (chartHeight - padTop - padBottom)
              "
              stroke="currentColor"
              stroke-opacity="0.08"
              stroke-dasharray="3 3"
              class="text-gray-500 dark:text-gray-400"
            />
          </g>

          <g v-for="trend in trendData" :key="'line-' + trend.collectorId">
            <path
              :d="buildPath(trend)"
              fill="none"
              :stroke="trend.color"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              :stroke-dasharray="
                trend.points.length === 7 ? '0' : '0'
              "
              class="transition-all duration-500 drop-shadow-sm"
            />
          </g>

          <g v-for="trend in trendData" :key="'dot-' + trend.collectorId">
            <g
              v-for="(p, idx) in trend.points"
              :key="trend.collectorId + '-' + idx"
            >
              <circle
                :cx="getDotPosition(trend, idx).x"
                :cy="getDotPosition(trend, idx).y"
                r="3"
                fill="white"
                :stroke="trend.color"
                stroke-width="2"
                class="transition-all duration-500"
              />
            </g>
          </g>

          <g class="x-labels">
            <text
              v-for="(p, i) in (trendData[0]?.points || [])"
              :key="'xl-' + i"
              :x="
                padLeft +
                (i /
                  Math.max(1, (trendData[0]?.points?.length || 1) - 1)) *
                  (chartWidth - padLeft - padRight)
              "
              :y="chartHeight - 8"
              text-anchor="middle"
              class="text-[8px] fill-gray-400 dark:fill-gray-500 font-mono"
            >
              {{ p.label }}
            </text>
          </g>
        </svg>

        <div
          class="absolute top-0 left-0 -translate-x-0.5 flex flex-col justify-between h-[calc(100%-24px)] text-[8px] font-mono text-gray-400 dark:text-gray-500 pointer-events-none"
        >
          <span v-for="tick in [...trendYTicks].reverse()" :key="'yt-' + tick">
            {{ tick }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto min-h-0">
      <div class="divide-y divide-gray-50 dark:divide-gray-700/50">
        <div
          v-for="rs in rankedList"
          :key="rs.collector.id"
          :class="getRowClass(rs.rank)"
        >
          <div class="relative z-10 py-3 px-4 flex items-center gap-3">
            <div class="relative shrink-0">
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                :class="getRankBadgeClass(rs.rank)"
              >
                <Crown
                  v-if="rs.rank === 1"
                  class="w-4 h-4"
                />
                <template v-else>
                  {{ rs.rank }}
                </template>
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <img
                :src="rs.collector.avatar"
                :alt="rs.collector.name"
                class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 shrink-0"
                :class="[
                  rs.rank === 1
                    ? 'border-yellow-300 dark:border-yellow-500/60'
                    : rs.rank === 2
                      ? 'border-gray-300 dark:border-gray-400'
                      : rs.rank === 3
                        ? 'border-amber-400 dark:border-amber-600'
                        : 'border-white dark:border-gray-700',
                ]"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <p
                    class="text-sm font-medium truncate"
                    :class="[
                      rs.rank === 1
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : rs.rank === 2
                          ? 'text-gray-700 dark:text-gray-200'
                          : rs.rank === 3
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-gray-900 dark:text-white',
                    ]"
                  >
                    {{ rs.collector.name }}
                  </p>
                  <span
                    v-if="getRankChangeInfo(rs)"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] shrink-0"
                    :class="getRankChangeInfo(rs)!.cls"
                  >
                    {{ getRankChangeInfo(rs)!.text }}
                  </span>
                </div>
                <p
                  class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5"
                >
                  <CircleDot
                    class="w-2.5 h-2.5"
                    :class="[
                      rs.collector.status === 'online'
                        ? 'text-eco-500'
                        : rs.collector.status === 'busy'
                          ? 'text-warning-500'
                          : 'text-gray-400',
                    ]"
                  />
                  <span class="capitalize">
                    {{
                      rs.collector.status === 'online'
                        ? '在线'
                        : rs.collector.status === 'busy'
                          ? '忙碌'
                          : '离线'
                    }}
                  </span>
                  <span class="mx-1 text-gray-300 dark:text-gray-600">|</span>
                  <span>接单率 {{ Math.round(rs.rangeStats.acceptRate * 100) }}%</span>
                </p>
              </div>
            </div>

            <div class="text-right shrink-0 min-w-[64px]">
              <p
                class="font-bold font-mono"
                :class="[
                  rs.rank <= 3 ? 'text-lg' : 'text-sm',
                  rs.rank === 1
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : rs.rank === 2
                      ? 'text-gray-700 dark:text-gray-300'
                      : rs.rank === 3
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-900 dark:text-white',
                ]"
              >
                {{ getStatValue(rs) }}
              </p>
              <p
                v-if="sortBy !== 'orders'"
                class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5"
              >
                {{ rs.rangeStats.orders }} 单
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
