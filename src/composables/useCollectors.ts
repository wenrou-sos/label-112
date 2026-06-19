import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Collector, CollectorStatus } from '@/types'
import { generateCollectors } from '@/data/mock'

const collectors = ref<Collector[]>([])
let updateTimer: number | null = null

export function useCollectors() {
  if (collectors.value.length === 0) {
    collectors.value = generateCollectors(16)
  }

  const onlineCollectors = computed(() =>
    collectors.value.filter(c => c.status === 'online')
  )

  const busyCollectors = computed(() =>
    collectors.value.filter(c => c.status === 'busy')
  )

  const getCollectorById = (id: string) =>
    collectors.value.find(c => c.id === id)

  function updateCollectorStatus(id: string, status: CollectorStatus) {
    const c = collectors.value.find(x => x.id === id)
    if (c) c.status = status
  }

  function simulateMovement() {
    collectors.value.forEach(c => {
      if (c.status !== 'offline') {
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
  }
}
