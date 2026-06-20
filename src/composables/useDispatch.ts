import type { Order, RecommendedCollector } from '@/types'
import { useCollectors } from './useCollectors'
import { haversineDistance, calculateETA } from '@/utils/distance'

export function useDispatch() {
  const { collectors, updateCollectorStatus } = useCollectors()

  function getRecommendedCollectors(order: Order, limit: number = 3): RecommendedCollector[] {
    const activeCollectorIds = new Set(
      collectors.value.filter(c => c.status === 'busy').map(c => c.id)
    )

    const available = collectors.value.filter(c => {
      if (c.status !== 'online') return false
      if (activeCollectorIds.has(c.id)) return false
      return true
    })

    return available
      .map(c => ({
        collector: c,
        distance: haversineDistance(c.location, order.location),
        eta: 0,
      }))
      .map(r => ({ ...r, eta: calculateETA(r.distance) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
  }

  function assignCollector(orderId: string, collectorId: string): void {
    updateCollectorStatus(collectorId, 'busy')
  }

  function getNavigationRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const distance = haversineDistance(from, to)
    const eta = calculateETA(distance)
    const midLat = (from.lat + to.lat) / 2
    const midLng = (from.lng + to.lng) / 2 + (Math.random() - 0.5) * 0.01

    return {
      waypoints: [from, { lat: midLat, lng: midLng }, to],
      distance,
      eta,
    }
  }

  return {
    getRecommendedCollectors,
    assignCollector,
    getNavigationRoute,
  }
}
