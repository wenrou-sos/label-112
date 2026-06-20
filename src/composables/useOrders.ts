import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Order, OrderStatus, DashboardStats } from '@/types'
import { generateOrders, generateSingleOrder } from '@/data/mock'
import { useCollectors } from './useCollectors'

const orders = ref<Order[]>([])
const snoozeUntil = ref<Map<string, number>>(new Map())
let checkTimer: number | null = null
let orderGenTimer: number | null = null
let statusSimTimer: number | null = null
let nextOrderId = 2000

export const TIMEOUT_THRESHOLD = 10 * 60 * 1000
export const SNOOZE_DURATION = 3 * 60 * 1000

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
      const snoozeTime = snoozeUntil.value.get(o.id) ?? 0
      return age >= TIMEOUT_THRESHOLD && now >= snoozeTime
    })
  }

  function snoozeAlert(orderId: string) {
    snoozeUntil.value.set(orderId, Date.now() + SNOOZE_DURATION)
  }

  function clearSnooze(orderId: string) {
    snoozeUntil.value.delete(orderId)
  }

  function startTimeoutChecker(callback: (orders: Order[]) => void) {
    if (checkTimer) return
    const runCheck = () => {
      const timedOut = checkTimeoutOrders()
      if (timedOut.length > 0) {
        timedOut.forEach(o => snoozeAlert(o.id))
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

  function addNewOrder() {
    const newOrder = generateSingleOrder(nextOrderId++)
    orders.value.unshift(newOrder)
    if (orders.value.length > 100) {
      orders.value = orders.value.slice(0, 100)
    }
  }

  function simulateOrderStatus() {
    const pending = orders.value.filter(o => o.status === 'pending')
    if (pending.length > 0 && Math.random() > 0.5) {
      const order = pending[Math.floor(Math.random() * pending.length)]
      const onlineCollectors = collectors.value.filter(c => c.status === 'online')
      if (onlineCollectors.length > 0) {
        const collector = onlineCollectors[Math.floor(Math.random() * onlineCollectors.length)]
        updateOrderStatus(order.id, 'accepted', collector.id)
      }
    }

    const active = orders.value.filter(o => o.status === 'accepted')
    if (active.length > 0 && Math.random() > 0.6) {
      const order = active[Math.floor(Math.random() * active.length)]
      const age = Date.now() - (order.acceptedAt || order.createdAt)
      if (age > 5 * 60 * 1000 || Math.random() > 0.7) {
        updateOrderStatus(order.id, 'completed', order.collectorId)
      }
    }
  }

  function startOrderSimulation() {
    if (orderGenTimer) return
    orderGenTimer = window.setInterval(() => {
      if (Math.random() > 0.4) {
        addNewOrder()
      }
    }, 8000)

    if (statusSimTimer) return
    statusSimTimer = window.setInterval(simulateOrderStatus, 6000)
  }

  function stopOrderSimulation() {
    if (orderGenTimer) {
      clearInterval(orderGenTimer)
      orderGenTimer = null
    }
    if (statusSimTimer) {
      clearInterval(statusSimTimer)
      statusSimTimer = null
    }
  }

  onMounted(() => {
    startOrderSimulation()
  })
  onUnmounted(() => {
    stopTimeoutChecker()
    stopOrderSimulation()
  })

  return {
    orders,
    pendingOrders,
    activeOrders,
    completedOrders,
    dashboardStats,
    updateOrderStatus,
    increasePriceMultiplier,
    snoozeAlert,
    clearSnooze,
    startTimeoutChecker,
    stopTimeoutChecker,
  }
}
