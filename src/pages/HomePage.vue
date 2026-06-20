<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Package, CheckCircle2, Users, Clock, ChevronRight } from 'lucide-vue-next'
import type { Order, Location } from '@/types'
import { useCollectors } from '@/composables/useCollectors'
import { useOrders } from '@/composables/useOrders'
import { useDispatch } from '@/composables/useDispatch'

import NavHeader from '@/components/NavHeader.vue'
import StatCard from '@/components/StatCard.vue'
import MapView from '@/components/MapView.vue'
import OrderList from '@/components/OrderList.vue'
import CollectorRank from '@/components/CollectorRank.vue'
import RegionStats from '@/components/RegionStats.vue'
import DispatchModal from '@/components/DispatchModal.vue'
import AlertModal from '@/components/AlertModal.vue'
import OrderDetailPanel from '@/components/OrderDetailPanel.vue'

const { collectors } = useCollectors()
const {
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
} = useOrders()
const { getNavigationRoute, assignCollector } = useDispatch()

const selectedOrderId = ref<string | null>(null)
const dispatchOrder = ref<Order | null>(null)
const dispatchModalVisible = ref(false)
const alertModalVisible = ref(false)
const alertOrders = ref<Order[]>([])
const navigationRoute = ref<{ waypoints: Location[] } | null>(null)
const navigatingCollectorId = ref<string | null>(null)

const detailPanelVisible = ref(false)
const detailPanelOrder = computed<Order | null>(() => {
  if (!selectedOrderId.value) return null
  return orders.value.find(o => o.id === selectedOrderId.value) ?? null
})

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)

watch(
  () => detailPanelOrder.value?.status,
  (newStatus) => {
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      detailPanelVisible.value = false
    }
  }
)

function handleSelectOrder(id: string) {
  selectedOrderId.value = id
  detailPanelVisible.value = true
}

function handlePanelClose() {
  detailPanelVisible.value = false
}

function handlePanelAssign(orderId: string, collectorId: string) {
  handleAssign(orderId, collectorId)
}

function handleLocateAddress(location: Location) {
  if (mapViewRef.value) {
    mapViewRef.value.panToLocation(location)
  }
}

function handleNavigateCollector(collectorId: string, route: { waypoints: Location[] }) {
  const collector = collectors.value.find(c => c.id === collectorId)
  if (collector) {
    navigatingCollectorId.value = collectorId
    navigationRoute.value = route
  }
}

function handleDispatch(order: Order) {
  dispatchOrder.value = order
  dispatchModalVisible.value = true
  selectedOrderId.value = order.id
}

function handleAssign(orderId: string, collectorId: string) {
  updateOrderStatus(orderId, 'accepted', collectorId)
  assignCollector(orderId, collectorId)

  const order = orders.value.find(o => o.id === orderId)
  const collector = collectors.value.find(c => c.id === collectorId)
  if (order && collector) {
    const route = getNavigationRoute(collector.location, order.location)
    navigatingCollectorId.value = collectorId
    navigationRoute.value = route
  }
}

function handleNavComplete() {
  setTimeout(() => {
    navigatingCollectorId.value = null
    navigationRoute.value = null
  }, 3500)
}

function handleAlertAssign(order: Order) {
  alertModalVisible.value = false
  handleDispatch(order)
}

function handleIncreasePrice(orderId: string) {
  increasePriceMultiplier(orderId)
  clearSnooze(orderId)
}

function handleAlertClose() {
  alertOrders.value.forEach(o => snoozeAlert(o.id))
  alertModalVisible.value = false
}

onMounted(() => {
  startTimeoutChecker((timedOutOrders) => {
    alertOrders.value = timedOutOrders
    alertModalVisible.value = true
  })
})

onUnmounted(() => {
  stopTimeoutChecker()
})

const statCards = computed(() => [
  {
    title: '今日订单',
    value: dashboardStats.value.totalOrdersToday,
    icon: Package,
    trend: '较昨日 +12%',
    trendUp: true,
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-blue-600',
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
  },
  {
    title: '已完成',
    value: dashboardStats.value.completedOrdersToday,
    icon: CheckCircle2,
    trend: '完成率 78%',
    trendUp: true,
    gradientFrom: 'from-eco-400',
    gradientTo: 'to-eco-600',
    iconBg: 'bg-gradient-to-br from-eco-400 to-eco-600',
  },
  {
    title: '在线回收员',
    value: dashboardStats.value.onlineCollectors,
    icon: Users,
    trend: `共 ${collectors.value.length} 人`,
    trendUp: true,
    gradientFrom: 'from-purple-400',
    gradientTo: 'to-purple-600',
    iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
  },
  {
    title: '平均响应',
    value: `${dashboardStats.value.avgResponseTime} 分`,
    icon: Clock,
    trend: '目标 < 8 分钟',
    trendUp: dashboardStats.value.avgResponseTime < 8,
    gradientFrom: 'from-warning-400',
    gradientTo: 'to-warning-600',
    iconBg: 'bg-gradient-to-br from-warning-400 to-warning-600',
  },
])
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
    <NavHeader />

    <main class="flex-1 overflow-hidden">
      <div class="h-full flex flex-col p-4 lg:p-6 gap-4 lg:gap-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 shrink-0">
          <StatCard v-for="(card, idx) in statCards" :key="idx" v-bind="card" />
        </div>

        <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div class="lg:col-span-3 flex flex-col gap-4 lg:gap-6 min-h-0 order-2 lg:order-1">
            <div class="flex-1 min-h-[300px] lg:min-h-0">
              <OrderList
                :orders="orders"
                :pending-orders="pendingOrders"
                :active-orders="activeOrders"
                :completed-orders="completedOrders"
                :selected-order-id="selectedOrderId"
                :is-navigating="!!navigatingCollectorId"
                @select="handleSelectOrder"
                @dispatch="handleDispatch"
              />
            </div>
          </div>

          <div class="lg:col-span-6 min-h-[400px] lg:min-h-0 order-1 lg:order-2">
            <MapView
              ref="mapViewRef"
              :collectors="collectors"
              :orders="orders"
              :selected-order-id="selectedOrderId"
              :navigation-route="navigationRoute"
              :navigating-collector-id="navigatingCollectorId"
              @select-order="handleSelectOrder"
              @navigation-complete="handleNavComplete"
            />
          </div>

          <div class="lg:col-span-3 flex flex-col gap-4 lg:gap-6 min-h-0 order-3">
            <div class="flex-1 min-h-[280px] lg:min-h-0">
              <CollectorRank :collectors="collectors" />
            </div>
            <div class="flex-1 min-h-[280px] lg:min-h-0">
              <RegionStats :orders="orders" :collectors="collectors" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <DispatchModal
      :visible="dispatchModalVisible"
      :order="dispatchOrder"
      :is-navigating="!!navigatingCollectorId"
      @close="dispatchModalVisible = false"
      @assign="handleAssign"
    />

    <AlertModal
      :visible="alertModalVisible"
      :orders="alertOrders"
      @close="handleAlertClose"
      @assign="handleAlertAssign"
      @increase-price="handleIncreasePrice"
    />

    <OrderDetailPanel
      :visible="detailPanelVisible"
      :order="detailPanelOrder"
      :is-navigating="!!navigatingCollectorId"
      @close="handlePanelClose"
      @assign="handlePanelAssign"
      @locate-address="handleLocateAddress"
      @navigate-collector="handleNavigateCollector"
    />
  </div>
</template>
