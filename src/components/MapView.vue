<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import L from 'leaflet'
import type { Collector, Order, Location } from '@/types'
import { MAP_CENTER } from '@/data/mock'
import { statusLabels } from '@/utils/format'

interface Props {
  collectors: Collector[]
  orders: Order[]
  selectedOrderId?: string | null
  navigationRoute?: { waypoints: Location[] } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'selectCollector', id: string): void
  (e: 'selectOrder', id: string): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
const collectorMarkers = new Map<string, L.Marker>()
const orderMarkers = new Map<string, L.Marker>()
let routeLine: L.Polyline | null = null

function createCollectorIcon(status: string) {
  const colorMap: Record<string, string> = {
    online: '#10b981',
    busy: '#f59e0b',
    offline: '#9ca3af',
  }
  const color = colorMap[status] || '#9ca3af'
  return L.divIcon({
    className: 'collector-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: white;
          opacity: 0.9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">♻️</div>
        <div style="
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
        "></div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 44],
  })
}

function createOrderIcon(status: string, isSelected: boolean) {
  const isPending = status === 'pending'
  const size = isSelected ? 44 : 36
  return L.divIcon({
    className: 'order-marker',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <div style="
          position: absolute;
          inset: 0;
          background: ${isPending ? '#ef4444' : '#3b82f6'};
          transform: rotate(45deg);
          border: 3px solid white;
          border-radius: 6px 6px 6px 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          ${isPending ? 'animation: pulse 1.5s infinite;' : ''}
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -60%);
          font-size: ${isSelected ? '18px' : '15px'};
          z-index: 1;
        ">📍</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

function updateCollectorMarkers() {
  if (!map) return
  props.collectors.forEach(c => {
    const marker = collectorMarkers.get(c.id)
    if (marker) {
      marker.setLatLng([c.location.lat, c.location.lng])
      marker.setIcon(createCollectorIcon(c.status))
    } else {
      const m = L.marker([c.location.lat, c.location.lng], {
        icon: createCollectorIcon(c.status),
      })
      m.bindPopup(`
        <div class="p-2 min-w-[160px]">
          <div class="flex items-center gap-2 mb-2">
            <img src="${c.avatar}" class="w-8 h-8 rounded-full" />
            <div>
              <p class="font-semibold text-sm text-gray-900">${c.name}</p>
              <p class="text-xs text-gray-500">${statusLabels[c.status]}</p>
            </div>
          </div>
          <div class="text-xs text-gray-600 space-y-0.5">
            <p>今日接单: <b>${c.stats.ordersToday}</b> 单</p>
            <p>累计重量: <b>${c.stats.totalWeight}</b> kg</p>
          </div>
        </div>
      `)
      m.on('click', () => emit('selectCollector', c.id))
      m.addTo(map!)
      collectorMarkers.set(c.id, m)
    }
  })
}

function updateOrderMarkers() {
  if (!map) return
  const visibleOrders = props.orders.filter(o =>
    o.status === 'pending' || o.status === 'accepted'
  )

  props.orders.forEach(o => {
    if (o.status === 'completed' || o.status === 'cancelled') {
      const marker = orderMarkers.get(o.id)
      if (marker) {
        marker.remove()
        orderMarkers.delete(o.id)
      }
    }
  })

  visibleOrders.forEach(o => {
    const isSelected = props.selectedOrderId === o.id
    const marker = orderMarkers.get(o.id)
    if (marker) {
      marker.setLatLng([o.location.lat, o.location.lng])
      marker.setIcon(createOrderIcon(o.status, isSelected))
      if (isSelected) marker.openPopup()
    } else {
      const m = L.marker([o.location.lat, o.location.lng], {
        icon: createOrderIcon(o.status, isSelected),
        zIndexOffset: isSelected ? 1000 : 100,
      })
      m.bindPopup(`
        <div class="p-2 min-w-[180px]">
          <p class="font-semibold text-sm text-gray-900 mb-1">订单 #${o.id}</p>
          <p class="text-xs text-gray-600 mb-2">${o.address}</p>
          <div class="text-xs text-gray-500 space-y-0.5">
            <p>用户: ${o.userName}</p>
            <p>预估重量: ${o.estimatedWeight.toFixed(1)} kg</p>
          </div>
        </div>
      `)
      m.on('click', () => emit('selectOrder', o.id))
      m.addTo(map!)
      orderMarkers.set(o.id, m)
    }
  })
}

function updateRoute() {
  if (!map) return
  if (routeLine) {
    routeLine.remove()
    routeLine = null
  }
  if (props.navigationRoute && props.navigationRoute.waypoints.length >= 2) {
    const latlngs = props.navigationRoute.waypoints.map(wp => [wp.lat, wp.lng] as [number, number])
    routeLine = L.polyline(latlngs, {
      color: '#10b981',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
      lineJoin: 'round',
    }).addTo(map)
    map.fitBounds(routeLine.getBounds().pad(0.2))
  }
}

watch(() => props.collectors, updateCollectorMarkers, { deep: true })
watch(() => props.orders, updateOrderMarkers, { deep: true })
watch(() => props.selectedOrderId, updateOrderMarkers)
watch(() => props.navigationRoute, updateRoute, { deep: true })

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: [MAP_CENTER.lat, MAP_CENTER.lng],
    zoom: 13,
    zoomControl: true,
    attributionControl: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map)

  updateCollectorMarkers()
  updateOrderMarkers()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-card">
    <div ref="mapContainer" class="w-full h-full"></div>

    <div class="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 z-[1000]">
      <p class="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">图例</p>
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-eco-500"></span>
          <span class="text-xs text-gray-600 dark:text-gray-300">在线</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-warning-500"></span>
          <span class="text-xs text-gray-600 dark:text-gray-300">忙碌</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-gray-400"></span>
          <span class="text-xs text-gray-600 dark:text-gray-300">离线</span>
        </div>
        <div class="border-t border-gray-200 dark:border-gray-700 my-1.5"></div>
        <div class="flex items-center gap-2">
          <span class="text-sm">📍</span>
          <span class="text-xs text-gray-600 dark:text-gray-300">待取件</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.leaflet-container {
  font-family: inherit !important;
  background: #e5e7eb;
}
.collector-marker,
.order-marker {
  background: transparent !important;
  border: none !important;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.8); }
}
</style>
