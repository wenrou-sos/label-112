export type CollectorStatus = 'online' | 'busy' | 'offline'
export type OrderStatus = 'pending' | 'accepted' | 'completed' | 'cancelled'
export type OrderCategory = 'paper' | 'plastic' | 'metal' | 'electronic' | 'mixed'
export type RankSortType = 'orders' | 'weight' | 'income'

export interface Location {
  lat: number
  lng: number
}

export interface Collector {
  id: string
  name: string
  avatar: string
  phone: string
  status: CollectorStatus
  location: Location
  stats: {
    ordersToday: number
    totalWeight: number
    totalIncome: number
    acceptRate: number
  }
  regionId: string
}

export interface Order {
  id: string
  userId: string
  userName: string
  userPhone: string
  address: string
  location: Location
  category: OrderCategory
  estimatedWeight: number
  status: OrderStatus
  createdAt: number
  acceptedAt?: number
  completedAt?: number
  collectorId?: string
  regionId: string
  priceMultiplier: number
}

export interface Region {
  id: string
  name: string
  bounds: [[number, number], [number, number]]
  stats: {
    totalOrders: number
    completedOrders: number
    avgResponseTime: number
  }
}

export interface RecommendedCollector {
  collector: Collector
  distance: number
  eta: number
}

export interface DashboardStats {
  totalOrdersToday: number
  completedOrdersToday: number
  onlineCollectors: number
  avgResponseTime: number
}
