import type { Order } from '@/types'
import { generateRegions } from '@/data/mock'

const regions = generateRegions()

export interface RegionOrderStats {
  regionId: string
  regionName: string
  total: number
  completed: number
  pending: number
  completionRate: number
  avgResponseTime: number
  onlineCollectors: number
}

export function aggregateRegionOrders(orders: Order[], collectors: { regionId: string; status: string }[]): RegionOrderStats[] {
  return regions.map(region => {
    const regionOrders = orders.filter(o => o.regionId === region.id)
    const total = regionOrders.length
    const completed = regionOrders.filter(o => o.status === 'completed').length
    const pending = total - completed - regionOrders.filter(o => o.status === 'cancelled').length
    const completionRate = total > 0 ? completed / total : 0

    const acceptedOrders = regionOrders.filter(o => o.acceptedAt)
    const responseTimes = acceptedOrders.map(o => (o.acceptedAt! - o.createdAt) / 60000)
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    const onlineCollectors = collectors.filter(
      c => c.regionId === region.id && c.status !== 'offline'
    ).length

    return {
      regionId: region.id,
      regionName: region.name,
      total,
      completed,
      pending: Math.max(0, pending),
      completionRate,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      onlineCollectors,
    }
  })
}

export interface HourlyOrderStats {
  hour: number
  count: number
  label: string
}

export function aggregateHourlyOrders(orders: Order[]): HourlyOrderStats[] {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
    label: `${String(i).padStart(2, '0')}:00`,
  }))

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startTime = startOfDay.getTime()

  orders.forEach(order => {
    if (order.createdAt >= startTime) {
      const hour = new Date(order.createdAt).getHours()
      if (hour >= 0 && hour < 24) {
        hours[hour].count++
      }
    }
  })

  return hours
}

export interface RegionHourlyData {
  regionId: string
  regionName: string
  hourly: { hour: number; count: number }[]
}

export function aggregateRegionHourlyOrders(orders: Order[]): RegionHourlyData[] {
  return regions.map(region => {
    const regionOrders = orders.filter(o => o.regionId === region.id)
    const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTime = startOfDay.getTime()

    regionOrders.forEach(order => {
      if (order.createdAt >= startTime) {
        const hour = new Date(order.createdAt).getHours()
        if (hour >= 0 && hour < 24) {
          hourly[hour].count++
        }
      }
    })

    return {
      regionId: region.id,
      regionName: region.name,
      hourly,
    }
  })
}

export function getCompletionRateColor(rate: number): string {
  if (rate >= 0.85) return '#10b981'
  if (rate >= 0.6) return '#f59e0b'
  return '#ef4444'
}

export function getCompletionRateBgClass(rate: number): string {
  if (rate >= 0.85) return 'bg-eco-500'
  if (rate >= 0.6) return 'bg-warning-500'
  return 'bg-danger-500'
}

export { regions }
