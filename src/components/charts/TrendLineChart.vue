<script setup lang="ts">
import { computed } from 'vue'
import type { HourlyOrderStats } from '@/utils/stats'

interface Props {
  data: HourlyOrderStats[]
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 160,
})

const chartWidth = 600
const chartHeight = computed(() => props.height - 30)
const paddingTop = 10
const paddingBottom = 24
const paddingLeft = 5

const maxValue = computed(() => {
  const max = Math.max(...props.data.map(d => d.count), 1)
  return Math.ceil(max / 5) * 5 || 10
})

const yTicks = computed(() => {
  const ticks = []
  const step = maxValue.value / 3
  for (let i = 0; i <= 3; i++) {
    ticks.push(Math.round(step * i))
  }
  return ticks
})

const visibleLabels = computed(() => {
  return props.data.filter((_, i) => i % 4 === 0 || i === props.data.length - 1)
})

const points = computed(() => {
  const width = chartWidth - paddingLeft
  const height = chartHeight.value - paddingTop - paddingBottom
  const stepX = width / (props.data.length - 1)

  return props.data.map((d, i) => ({
    x: paddingLeft + i * stepX,
    y: chartHeight.value - paddingBottom - (d.count / maxValue.value) * height,
    value: d.count,
    hour: d.hour,
    label: d.label,
  }))
})

const pathD = computed(() => {
  if (points.value.length < 2) return ''
  const pts = points.value
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
})

const areaD = computed(() => {
  if (!pathD.value) return ''
  const lastX = points.value[points.value.length - 1].x
  const firstX = points.value[0].x
  const baseY = chartHeight.value - paddingBottom
  return `${pathD.value} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`
})
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex items-center justify-between mb-2">
      <p class="text-xs font-medium text-gray-600 dark:text-gray-400">今日订单趋势</p>
      <p class="text-[11px] text-gray-400 dark:text-gray-500">单位：单/小时</p>
    </div>

    <div class="flex-1 relative">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.02" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g class="grid-lines">
          <line
            v-for="tick in yTicks.slice(0, -1)"
            :key="'grid-' + tick"
            :x1="paddingLeft"
            :y1="chartHeight - paddingBottom - (tick / maxValue) * (chartHeight - paddingTop - paddingBottom)"
            :x2="chartWidth - 5"
            :y2="chartHeight - paddingBottom - (tick / maxValue) * (chartHeight - paddingTop - paddingBottom)"
            stroke="currentColor"
            stroke-opacity="0.08"
            stroke-dasharray="4 4"
            class="text-gray-500 dark:text-gray-400"
          />
        </g>

        <path
          :d="areaD"
          fill="url(#lineGradient)"
          class="transition-all duration-500"
        />

        <path
          :d="pathD"
          fill="none"
          stroke="#10b981"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#glow)"
          class="transition-all duration-500"
        />

        <g v-for="(p, idx) in points" :key="idx">
          <circle
            v-if="p.value > 0 && idx % 2 === 0"
            :cx="p.x"
            :cy="p.y"
            r="3"
            fill="white"
            stroke="#10b981"
            stroke-width="2"
            class="transition-all duration-500"
          />
        </g>

        <g class="x-labels">
          <text
            v-for="d in visibleLabels"
            :key="'label-' + d.hour"
            :x="paddingLeft + (d.hour / 23) * (chartWidth - paddingLeft)"
            :y="chartHeight - 8"
            text-anchor="middle"
            class="text-[9px] fill-gray-400 dark:fill-gray-500 font-mono"
          >
            {{ d.label }}
          </text>
        </g>
      </svg>

      <div class="absolute top-0 left-0 -translate-x-1 flex flex-col justify-between h-[calc(100%-24px)] text-[9px] font-mono text-gray-400 dark:text-gray-500 pointer-events-none">
        <span v-for="tick in [...yTicks].reverse()" :key="'yt-' + tick">{{ tick }}</span>
      </div>
    </div>
  </div>
</template>
