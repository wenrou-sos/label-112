import { ref, computed, onMounted, onUnmounted } from 'vue'
import type {
  Collector,
  CollectorStatus,
  TimeRangeType,
  RankSortType,
  CollectorRankedStats,
  CollectorTrend,
  TrendPoint,
} from '@/types'
import { generateCollectors } from '@/data/mock'

const collectors = ref<Collector[]>([])
let updateTimer: number | null = null

const skipMovementIds = new Set<string>()

export function setSkipMovement(id: string, skip: boolean) {
  if (skip) skipMovementIds.add(id)
  else skipMovementIds.delete(id)
}

function getDateKey(offsetDays: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDateLabel(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getWeekLabel(offsetWeeks: number): string {
  const d = new Date()
  d.setDate(d.getDate() - offsetWeeks * 7)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getMonthLabel(offsetMonths: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - offsetMonths)
  return `${d.getFullYear()}/${d.getMonth() + 1}`
}

function aggregateRange(
  collector: Collector,
  range: TimeRangeType,
  daysAgo: number = 0
): { orders: number; weight: number; income: number; acceptRate: number } {
  const daysMap: Record<TimeRangeType, number> = {
    day: 1,
    week: 7,
    month: 30,
  }
  const totalDays = daysMap[range]
  const endIdx = collector.dailyStats.length - 1 - daysAgo
  const startIdx = Math.max(0, endIdx - totalDays + 1)

  let orders = 0
  let weight = 0
  let income = 0
  let accepted = 0
  let requested = 0

  for (let i = startIdx; i <= endIdx; i++) {
    const d = collector.dailyStats[i]
    if (!d) continue
    orders += d.orders
    weight += d.weight
    income += d.income
    accepted += d.accepted
    requested += d.requested
  }

  return {
    orders,
    weight: Math.round(weight * 10) / 10,
    income: Math.round(income * 100) / 100,
    acceptRate: requested > 0 ? accepted / requested : 0,
  }
}

function computeRank(
  list: Collector[],
  range: TimeRangeType,
  sortBy: RankSortType,
  daysAgo: number = 0
): Map<string, number> {
  const withStats = list.map((c) => ({
    id: c.id,
    s: aggregateRange(c, range, daysAgo),
  }))

  const sorted = [...withStats].sort((a, b) => {
    switch (sortBy) {
      case 'orders':
        return b.s.orders - a.s.orders
      case 'weight':
        return b.s.weight - a.s.weight
      case 'income':
        return b.s.income - a.s.income
      case 'acceptRate':
        return b.s.acceptRate - a.s.acceptRate
    }
  })

  const rankMap = new Map<string, number>()
  sorted.forEach((x, i) => rankMap.set(x.id, i + 1))
  return rankMap
}

export function useCollectors() {
  if (collectors.value.length === 0) {
    collectors.value = generateCollectors(16)
  }

  const onlineCollectors = computed(() =>
    collectors.value.filter((c) => c.status === 'online')
  )

  const busyCollectors = computed(() =>
    collectors.value.filter((c) => c.status === 'busy')
  )

  const getCollectorById = (id: string) =>
    collectors.value.find((c) => c.id === id)

  function updateCollectorStatus(id: string, status: CollectorStatus) {
    const c = collectors.value.find((x) => x.id === id)
    if (c) c.status = status
  }

  function simulateMovement() {
    collectors.value.forEach((c) => {
      if (c.status !== 'offline' && !skipMovementIds.has(c.id)) {
        c.location.lat += (Math.random() - 0.5) * 0.002
        c.location.lng += (Math.random() - 0.5) * 0.002
      }
    })
  }

  function startSimulation() {
    if (updateTimer) return
    updateTimer = window.setInterval(simulateMovement, 4000)
  }

  function stopSimulation() {
    if (updateTimer) {
      clearInterval(updateTimer)
      updateTimer = null
    }
  }

  function getRankedCollectors(
    range: TimeRangeType,
    sortBy: RankSortType,
    limit: number = 8
  ): CollectorRankedStats[] {
    const curRanks = computeRank(collectors.value, range, sortBy, 0)
    const prevRanks = computeRank(collectors.value, range, sortBy, 1)

    const result: CollectorRankedStats[] = collectors.value.map((c) => {
      const rangeStats = aggregateRange(c, range, 0)
      const rank = curRanks.get(c.id) ?? collectors.value.length
      const prevRank = prevRanks.get(c.id) ?? null
      let rankChange: 'up' | 'down' | 'new' | 'same' = 'same'
      let rankChangeAmount = 0

      if (prevRank === null) {
        if (rank <= limit) rankChange = 'new'
      } else if (rank < prevRank) {
        rankChange = 'up'
        rankChangeAmount = prevRank - rank
      } else if (rank > prevRank) {
        rankChange = 'down'
        rankChangeAmount = rank - prevRank
      } else {
        rankChange = 'same'
      }

      return {
        collector: c,
        rank,
        prevRank,
        rankChange,
        rankChangeAmount,
        rangeStats,
      }
    })

    result.sort((a, b) => a.rank - b.rank)
    return result.slice(0, limit)
  }

  function getTrendData(
    range: TimeRangeType,
    sortBy: RankSortType
  ): CollectorTrend[] {
    const top = getRankedCollectors(range, sortBy, 3)
    const top3 = top.filter((x) => x.rank <= 3)

    let labels: string[] = []
    let periodCount = 0
    let periodFn: (offset: number) => string = () => ''

    switch (range) {
      case 'day':
        periodCount = 7
        periodFn = (i) => getDateLabel(6 - i)
        break
      case 'week':
        periodCount = 4
        periodFn = (i) => getWeekLabel(3 - i)
        break
      case 'month':
        periodCount = 6
        periodFn = (i) => getMonthLabel(5 - i)
        break
    }

    for (let i = 0; i < periodCount; i++) {
      labels.push(periodFn(i))
    }

    const colors = ['#f59e0b', '#9ca3af', '#d97706']

    return top3.map((r, idx) => {
      const points: TrendPoint[] = []

      for (let p = periodCount - 1; p >= 0; p--) {
        let daysAgo = 0
        let rangeAggDays = 1

        switch (range) {
          case 'day':
            daysAgo = p
            rangeAggDays = 1
            break
          case 'week':
            daysAgo = p * 7
            rangeAggDays = 7
            break
          case 'month':
            daysAgo = 0
            const targetMonth = new Date()
            targetMonth.setMonth(targetMonth.getMonth() - (periodCount - 1 - p))
            const monthStart = new Date(
              targetMonth.getFullYear(),
              targetMonth.getMonth(),
              1
            )
            const today = new Date()
            const todayMidnight = new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate()
            )
            daysAgo = Math.floor(
              (todayMidnight.getTime() - monthStart.getTime()) / 86400000
            )
            rangeAggDays = new Date(
              targetMonth.getFullYear(),
              targetMonth.getMonth() + 1,
              0
            ).getDate()
            break
        }

        let value = 0
        for (let d = 0; d < rangeAggDays; d++) {
          const offset = daysAgo + d
          const stat = r.collector.dailyStats[r.collector.dailyStats.length - 1 - offset]
          if (stat) {
            switch (sortBy) {
              case 'orders':
                value += stat.orders
                break
              case 'weight':
                value += stat.weight
                break
              case 'income':
                value += stat.income
                break
              case 'acceptRate':
                value += stat.requested > 0 ? stat.accepted / stat.requested : 0
                break
            }
          }
        }

        if (sortBy === 'acceptRate' && rangeAggDays > 1) {
          let totalAcc = 0
          let totalReq = 0
          for (let d = 0; d < rangeAggDays; d++) {
            const offset = daysAgo + d
            const stat = r.collector.dailyStats[r.collector.dailyStats.length - 1 - offset]
            if (stat) {
              totalAcc += stat.accepted
              totalReq += stat.requested
            }
          }
          value = totalReq > 0 ? Math.round((totalAcc / totalReq) * 1000) / 10 : 0
        }

        points.push({
          label: labels[periodCount - 1 - p],
          value: Math.round(value * 100) / 100,
        })
      }

      return {
        collectorId: r.collector.id,
        collectorName: r.collector.name,
        color: colors[idx] || '#6b7280',
        points,
      }
    })
  }

  onMounted(startSimulation)
  onUnmounted(stopSimulation)

  return {
    collectors,
    onlineCollectors,
    busyCollectors,
    getCollectorById,
    updateCollectorStatus,
    startSimulation,
    stopSimulation,
    getRankedCollectors,
    getTrendData,
  }
}
