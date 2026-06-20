<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import type { Collector, Order, Location } from '@/types'
import { MAP_CENTER } from '@/data/mock'
import { statusLabels } from '@/utils/format'
import { setSkipMovement } from '@/composables/useCollectors'

interface Props {
  collectors: Collector[]
  orders: Order[]
  selectedOrderId?: string | null
  navigationRoute?: { waypoints: Location[] } | null
  navigatingCollectorId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  navigatingCollectorId: null,
})

const emit = defineEmits<{
  (e: 'selectCollector', id: string): void
  (e: 'selectOrder', id: string): void
  (e: 'navigationStart', collectorId: string): void
  (e: 'navigationProgress', collectorId: string, progress: number): void
  (e: 'navigationComplete', collectorId: string): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
const collectorMarkers = new Map<string, L.Marker>()
const orderMarkers = new Map<string, L.Marker>()
let routeLine: L.Polyline | null = null
const trailMarkers: L.CircleMarker[] = []
let arrivedPopup: L.Popup | null = null
let arrivedPopupTimer: number | null = null
let arrivedCollectorId: string | null = null
let arrivedPopupCleanup: (() => void) | null = null

let rafId: number | null = null
let animActive = false
let animWaypoints: Location[] = []
let animCollectorId: string | null = null
let animSegmentIndex = 0
let animSegmentProgress = 0
let animSegmentDuration = 15000
let animLastTimestamp = 0
let animOrigCollectorLoc: Location | null = null
const animTrailQueue: { lat: number; lng: number; createdAt: number }[] = []

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

function createArrivedIcon() {
  return L.divIcon({
    className: 'arrived-marker',
    html: `
      <div style="position: relative; width: 36px; height: 44px; animation: arrivedBounce 0.6s ease-out;">
        <svg viewBox="0 0 24 24" fill="#3b82f6" width="36" height="44" style="filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.5));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  })
}

function createTrailMarker(lat: number, lng: number, opacity: number, isDark: boolean) {
  const color = isDark ? '#34d399' : '#10b981'
  return L.circleMarker([lat, lng], {
    radius: 5 + opacity * 4,
    fillColor: color,
    color: 'white',
    weight: 1.5,
    fillOpacity: opacity * 0.7,
    opacity: opacity,
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

function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark')
}

function clearTrailMarkers() {
  trailMarkers.forEach(m => m.remove())
  trailMarkers.length = 0
  animTrailQueue.length = 0
}

function clearArrivedPopup() {
  if (arrivedPopupTimer) {
    clearTimeout(arrivedPopupTimer)
    arrivedPopupTimer = null
  }
  if (arrivedPopup) {
    arrivedPopup.remove()
    arrivedPopup = null
  }
  if (arrivedPopupCleanup) {
    arrivedPopupCleanup()
    arrivedPopupCleanup = null
  }
}

function clearArrivedState() {
  clearArrivedPopup()
  if (arrivedCollectorId) {
    const collector = props.collectors.find(c => c.id === arrivedCollectorId)
    const marker = collectorMarkers.get(arrivedCollectorId)
    if (collector && marker) {
      marker.setIcon(createCollectorIcon(collector.status))
    }
    arrivedCollectorId = null
  }
}

function stopAnimation(keepPosition: boolean = true) {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  const wasActive = animActive
  const prevCollectorId = animCollectorId
  animActive = false

  if (prevCollectorId) {
    setSkipMovement(prevCollectorId, false)
  }

  clearTrailMarkers()

  if (!keepPosition) {
    if (prevCollectorId) {
      const collector = props.collectors.find(c => c.id === prevCollectorId)
      const marker = collectorMarkers.get(prevCollectorId)
      if (collector && marker) {
        marker.setLatLng([collector.location.lat, collector.location.lng])
        marker.setIcon(createCollectorIcon(collector.status))
      }
    }
    clearArrivedState()
  } else {
    clearArrivedPopup()
  }

  animSegmentIndex = 0
  animSegmentProgress = 0
  animLastTimestamp = 0
  animWaypoints = []
  animCollectorId = null
  animOrigCollectorLoc = null

  return wasActive
}

function interpolateLocation(a: Location, b: Location, t: number): Location {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  }
}

function addTrailPoint(lat: number, lng: number) {
  const now = Date.now()
  animTrailQueue.push({ lat, lng, createdAt: now })

  const MAX_TRAIL = 4
  while (animTrailQueue.length > MAX_TRAIL) {
    animTrailQueue.shift()
  }

  trailMarkers.forEach(m => m.remove())
  trailMarkers.length = 0

  if (!map) return
  const dark = isDarkTheme()
  animTrailQueue.forEach((p, i) => {
    const opacity = (i + 1) / animTrailQueue.length * 0.6
    const m = createTrailMarker(p.lat, p.lng, opacity, dark)
    m.addTo(map!)
    trailMarkers.push(m)
  })
}

function showArrivedPopup(lat: number, lng: number, collectorId: string) {
  if (!map) return
  clearArrivedPopup()

  const marker = collectorMarkers.get(collectorId)
  if (marker) {
    marker.setLatLng([lat, lng])
    marker.setIcon(createArrivedIcon())
    arrivedCollectorId = collectorId
  }

  arrivedPopup = L.popup({
    closeButton: false,
    autoClose: false,
    className: 'arrived-popup',
    offset: [0, -40],
  })
    .setLatLng([lat, lng])
    .setContent(`
      <div class="flex items-center gap-2 px-2 py-1" style="animation: popupFade 0.3s ease-out;">
        <span style="font-size: 16px;">✅</span>
        <span class="text-sm font-semibold text-gray-800">已到达取件点</span>
      </div>
    `)
    .openOn(map)

  arrivedPopupCleanup = () => {
    if (arrivedPopup) {
      arrivedPopup.remove()
      arrivedPopup = null
    }
  }

  arrivedPopupTimer = window.setTimeout(() => {
    if (arrivedPopup) {
      arrivedPopup.remove()
      arrivedPopup = null
    }
    arrivedPopupCleanup = null
    arrivedPopupTimer = null
  }, 3000)
}

function animationLoop(timestamp: number) {
  if (!animActive || !animCollectorId || animWaypoints.length < 2) return
  if (!map) return

  if (animLastTimestamp === 0) animLastTimestamp = timestamp
  const delta = timestamp - animLastTimestamp
  animLastTimestamp = timestamp

  const totalSegments = animWaypoints.length - 1
  if (animSegmentIndex >= totalSegments) {
    animActive = false
    const finalLoc = animWaypoints[animWaypoints.length - 1]
    setSkipMovement(animCollectorId, false)
    showArrivedPopup(finalLoc.lat, finalLoc.lng, animCollectorId)
    emit('navigationComplete', animCollectorId)
    rafId = null
    return
  }

  animSegmentProgress += delta / animSegmentDuration

  while (animSegmentProgress >= 1 && animSegmentIndex < totalSegments) {
    animSegmentProgress -= 1
    animSegmentIndex += 1
  }

  if (animSegmentIndex >= totalSegments) {
    animSegmentIndex = totalSegments - 1
    animSegmentProgress = 1
  }

  const from = animWaypoints[animSegmentIndex]
  const to = animWaypoints[animSegmentIndex + 1]
  const currentLoc = interpolateLocation(from, to, animSegmentProgress)

  const marker = collectorMarkers.get(animCollectorId)
  if (marker) {
    marker.setLatLng([currentLoc.lat, currentLoc.lng])
  }

  if (Math.random() < 0.3 || animSegmentProgress >= 0.95) {
    addTrailPoint(currentLoc.lat, currentLoc.lng)
  }

  const totalProgress = (animSegmentIndex + animSegmentProgress) / totalSegments
  emit('navigationProgress', animCollectorId, totalProgress)

  rafId = requestAnimationFrame(animationLoop)
}

function startNavigation(waypoints: Location[], collectorId: string) {
  stopAnimation(false)

  if (waypoints.length < 2) return
  animWaypoints = waypoints
  animCollectorId = collectorId
  animSegmentIndex = 0
  animSegmentProgress = 0
  animLastTimestamp = 0
  animActive = true

  setSkipMovement(collectorId, true)

  const collector = props.collectors.find(c => c.id === collectorId)
  if (collector) {
    animOrigCollectorLoc = { ...collector.location }
  }

  const startMarker = collectorMarkers.get(collectorId)
  if (startMarker) {
    startMarker.setLatLng([waypoints[0].lat, waypoints[0].lng])
  }

  emit('navigationStart', collectorId)
  rafId = requestAnimationFrame(animationLoop)
}

function resetCollectorMarkerIcon(collectorId: string) {
  const collector = props.collectors.find(c => c.id === collectorId)
  const marker = collectorMarkers.get(collectorId)
  if (collector && marker) {
    marker.setIcon(createCollectorIcon(collector.status))
  }
}

function updateCollectorMarkers() {
  if (!map) return
  props.collectors.forEach(c => {
    const isNavigating = animActive && animCollectorId === c.id
    const isArrived = arrivedCollectorId === c.id
    const marker = collectorMarkers.get(c.id)
    if (marker) {
      if (!isNavigating && !isArrived) {
        marker.setLatLng([c.location.lat, c.location.lng])
      }
      if (!isArrived) {
        marker.setIcon(createCollectorIcon(c.status))
      }
    } else {
      const m = L.marker([c.location.lat, c.location.lng], {
        icon: createCollectorIcon(c.status),
      })
      m.bindPopup(`
        <div class="p-2 min-w-[160px]">
          <div class="flex items-center gap-2 mb-2">
            <img src="${c.avatar}" class="w-8 h-8 rounded-full" />
            <div>
              <p class="font-semibold text-sm text-gray-900 dark:text-gray-100">${c.name}</p>
              <p class="text-xs text-gray-500">${statusLabels[c.status]}</p>
            </div>
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
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

  if (!props.navigationRoute || props.navigationRoute.waypoints.length < 2) {
    if (routeLine) {
      routeLine.remove()
      routeLine = null
    }
    stopAnimation(false)
    return
  }

  const latlngs = props.navigationRoute.waypoints.map(wp => [wp.lat, wp.lng] as [number, number])
  if (!routeLine) {
    routeLine = L.polyline(latlngs, {
      color: '#10b981',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
      lineJoin: 'round',
    }).addTo(map)
  } else {
    routeLine.setLatLngs(latlngs)
  }
  map.fitBounds(routeLine.getBounds().pad(0.2))
}

watch(() => props.collectors, updateCollectorMarkers, { deep: true })
watch(() => props.orders, updateOrderMarkers, { deep: true })
watch(() => props.selectedOrderId, updateOrderMarkers)
watch(() => props.navigationRoute, updateRoute, { deep: true })

watch(
  () => [props.navigationRoute, props.navigatingCollectorId],
  async () => {
    if (props.navigationRoute && props.navigatingCollectorId && props.navigationRoute.waypoints.length >= 2) {
      await nextTick()
      startNavigation(props.navigationRoute.waypoints, props.navigatingCollectorId)
    }
  },
  { deep: true }
)

watch(
  () => props.selectedOrderId,
  (newId, oldId) => {
    if (newId !== oldId && animActive) {
      stopAnimation(false)
    }
  }
)

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
  stopAnimation(false)
  if (map) {
    map.remove()
    map = null
  }
})

defineExpose({
  stopAnimation,
  resetCollectorMarkerIcon,
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
        <div class="flex items-center gap-2">
          <span class="text-sm">🔵</span>
          <span class="text-xs text-gray-600 dark:text-gray-300">已到达</span>
        </div>
      </div>
    </div>

    <div
      v-if="animActive && animCollectorId"
      class="absolute top-4 right-4 bg-blue-500 text-white rounded-xl shadow-lg px-4 py-2.5 z-[1000] flex items-center gap-2"
      style="animation: navPulse 2s ease-in-out infinite;"
    >
      <div class="flex gap-0.5">
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 0s;"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 0.15s;"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 0.3s;"></span>
      </div>
      <span class="text-xs font-medium">回收员正在前往取件点…</span>
    </div>
  </div>
</template>

<style>
.leaflet-container {
  font-family: inherit !important;
  background: #e5e7eb;
}
.collector-marker,
.order-marker,
.arrived-marker {
  background: transparent !important;
  border: none !important;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.8); }
}
@keyframes arrivedBounce {
  0% { transform: translateY(-30px) scale(0.6); opacity: 0; }
  60% { transform: translateY(8px) scale(1.05); opacity: 1; }
  100% { transform: translateY(0) scale(1); }
}
@keyframes popupFade {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes navPulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 4px 24px rgba(59, 130, 246, 0.7); }
}
.arrived-popup .leaflet-popup-content-wrapper {
  border-radius: 10px;
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  border: 1px solid #10b981;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}
.arrived-popup .leaflet-popup-content {
  margin: 6px 10px;
}
.arrived-popup .leaflet-popup-tip {
  background: #bbf7d0;
}
</style>
