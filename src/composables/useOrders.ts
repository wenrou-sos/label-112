import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Order, OrderStatus, DashboardStats } from '@/types'
import { generateOrders } from '@/data/mock'
import { useCollectors } from './useCollectors'

const orders = ref<Order[]>([])
const alertedOrderIds = ref<Set<string>>(new Set())
let checkTimer: number | null = null

export const TIMEOUT_THRESHOLD = 10 * 60 * 1000

export function useOrders() {
  const { collectors, updateCollectorStatus } = useCollectors()

  if (orders.value.length === 0) {
    orders.value = generateOrders(20)
  }

  const pendingOrders = computed(() =>
    orders.value.filter(o => o.status === 'pending').sort((a, b) => a.createdAt - b.createdAt)
  )

  const activeOrders = computed(() =>
    orders.value.filter(o => o.status === 'accepted')
  )

  const completedOrders = computed(() =>
    orders.value.filter(o => o.status === 'completed')
  )

  const dashboardStats = computed<DashboardStats>(() => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const todayOrders = orders.value.filter(o => o.createdAt >= startOfDay)
    const completedToday = todayOrders.filter(o => o.status === 'completed')
    const responseTimes = orders.value
      .filter(o => o.acceptedAt && o.createdAt >= startOfDay)
      .map(o => (o.acceptedAt! - o.createdAt) / 60000)
    const avgResponse = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    return {
      totalOrdersToday: todayOrders.length,
      completedOrdersToday: completedToday.length,
      onlineCollectors: collectors.value.filter(c => c.status !== 'offline').length,
      avgResponseTime: Math.round(avgResponse * 10) / 10,
    }
  })

  function updateOrderStatus(id: string, status: OrderStatus, collectorId?: string) {
    const order = orders.value.find(o => o.id === id)
    if (!order) return
    order.status = status
    const now = Date.now()
    if (status === 'accepted') {
      order.acceptedAt = now
      order.collectorId = collectorId
      if (collectorId) updateCollectorStatus(collectorId, 'busy')
    } else if (status === 'completed') {
      order.completedAt = now
      if (collectorId) updateCollectorStatus(collectorId, 'online')
    }
  }

  function increasePriceMultiplier(id: string) {
    const order = orders.value.find(o => o.id === id)
    if (order) {
      order.priceMultiplier = Math.min(order.priceMultiplier + 0.3, 2.0)
    }
  }

  function checkTimeoutOrders(): Order[] {
    const now = Date.now()
    return pendingOrders.value.filter(o => {
      const age = now - o.createdAt
      return age >= TIMEOUT_THRESHOLD && !alertedOrderIds.value.has(o.id)
    })
  }

  function markAlerted(orderId: string) {
    alertedOrderIds.value.add(orderId)
  }

  function startTimeoutChecker(callback: (orders: Order[]) => void) {
    if (checkTimer) return
    const runCheck = () => {
      const timedOut = checkTimeoutOrders()
      if (timedOut.length > 0) {
        timedOut.forEach(o => markAlerted(o.id))
        callback(timedOut)
      }
    }
    runCheck()
    checkTimer = window.setInterval(runCheck, 15000)
  }

  function stopTimeoutChecker() {
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
  }

  onMounted(() => {})
  onUnmounted(stopTimeoutChecker)

  return {
    orders,
    pendingOrders,
    activeOrders,
    completedOrders,
    dashboardStats,
    updateOrderStatus,
    increasePriceMultiplier,
    startTimeoutChecker,
    stopTimeoutChecker,
  }
}
