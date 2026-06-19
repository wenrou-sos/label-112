import type { Location } from '@/types'

export function haversineDistance(a: Location, b: Location): number {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export function calculateETA(distanceKm: number): number {
  const avgSpeedKmh = 15
  const baseWaitMin = 2
  return Math.round((distanceKm / avgSpeedKmh) * 60 + baseWaitMin)
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}
