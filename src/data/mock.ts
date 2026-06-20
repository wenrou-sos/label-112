import type { Collector, Order, Region, OrderCategory, CollectorStatus, CollectorDailyStats } from '@/types'

const SHANGHAI_CENTER = { lat: 31.2304, lng: 121.4737 }

const collectorNames = [
  '张伟', '王芳', '李娜', '刘强', '陈静', '杨洋', '赵敏', '黄磊',
  '周杰', '吴秀', '郑浩', '孙丽', '钱勇', '马超', '朱琳', '胡军',
]

const userNames = [
  '小明', '小红', '小刚', '小丽', '小华', '小强', '小芳', '小军',
  '小燕', '小龙', '小娟', '小伟', '小敏', '小涛', '小霞', '小磊',
]

const addresses = [
  '浦东新区陆家嘴环路1000号',
  '黄浦区南京东路100号',
  '徐汇区衡山路880号',
  '静安区南京西路1788号',
  '长宁区虹桥路1438号',
  '普陀区长寿路1118号',
  '虹口区四川北路1688号',
  '杨浦区邯郸路220号',
  '闵行区莘庄地铁站南广场',
  '宝山区牡丹江路1288号',
  '嘉定区城中路66号',
  '松江区中山中路196号',
]

const categories: OrderCategory[] = ['paper', 'plastic', 'metal', 'electronic', 'mixed']
const statuses: CollectorStatus[] = ['online', 'online', 'online', 'busy', 'busy', 'offline']

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1))
}

function randomOffset(center: { lat: number; lng: number }, radiusKm: number) {
  const r = radiusKm / 111
  return {
    lat: center.lat + randomInRange(-r, r),
    lng: center.lng + randomInRange(-r, r) * Math.cos(center.lat * Math.PI / 180),
  }
}

function generatePhone(): string {
  return '138' + String(randomInt(10000000, 99999999))
}

function getDateKey(offsetDays: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function generateDailyStats(days: number = 30): CollectorDailyStats[] {
  const stats: CollectorDailyStats[] = []
  for (let i = days - 1; i >= 0; i--) {
    const baseFactor = Math.max(0.3, 1 - i * 0.015)
    const weekdayBias = (() => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const wd = d.getDay()
      if (wd === 0 || wd === 6) return 1.2
      return 1.0
    })()
    const factor = baseFactor * weekdayBias * (0.75 + Math.random() * 0.5)

    const orders = Math.max(0, Math.round(randomInt(3, 25) * factor))
    const weight = Math.round(randomInRange(30, 500) * factor * 10) / 10
    const income = Math.round(randomInRange(120, 2000) * factor * 100) / 100
    const requested = Math.round(orders * (1 + Math.random() * 0.3))
    const accepted = Math.max(0, Math.round(requested * (0.75 + Math.random() * 0.23)))

    stats.push({
      dateKey: getDateKey(i),
      orders,
      weight,
      income,
      accepted,
      requested,
    })
  }
  return stats
}

export function generateCollectors(count: number = 16): Collector[] {
  return collectorNames.slice(0, count).map((name, i) => {
    const regionIndex = i % 4
    const dailyStats = generateDailyStats(30)
    const today = dailyStats[dailyStats.length - 1]
    const totalWeight = dailyStats.reduce((s, d) => s + d.weight, 0)
    const totalIncome = dailyStats.reduce((s, d) => s + d.income, 0)
    const totalAccepted = dailyStats.reduce((s, d) => s + d.accepted, 0)
    const totalRequested = dailyStats.reduce((s, d) => s + d.requested, 0)
    return {
      id: `c${i + 1}`,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      phone: generatePhone(),
      status: statuses[i % statuses.length],
      location: randomOffset(SHANGHAI_CENTER, 5),
      stats: {
        ordersToday: today.orders,
        totalWeight: Math.round(totalWeight * 10) / 10,
        totalIncome: Math.round(totalIncome * 100) / 100,
        acceptRate: totalRequested > 0 ? totalAccepted / totalRequested : 0.85,
      },
      dailyStats,
      regionId: `r${regionIndex + 1}`,
    }
  })
}

const regionWeights = [0.35, 0.30, 0.20, 0.15]

function pickWeightedRegionIndex(): number {
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < regionWeights.length; i++) {
    acc += regionWeights[i]
    if (r < acc) return i
  }
  return 0
}

export function generateOrders(count: number = 20): Order[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const ageMinutes = randomInt(0, 180)
    const status = ageMinutes < 8
      ? 'pending'
      : ageMinutes < 60
        ? (Math.random() > 0.4 ? 'accepted' : 'pending')
        : (Math.random() > 0.2 ? 'completed' : 'accepted')
    const acceptedAt = status !== 'pending' ? now - ageMinutes * 60000 + randomInt(60, 480) * 1000 : undefined
    const completedAt = status === 'completed' ? (acceptedAt ?? now) + randomInt(15, 60) * 60000 : undefined
    const regionIdx = pickWeightedRegionIndex()
    const addrIdx = regionIdx * 3 + randomInt(0, 2)
    const regionAddresses = [
      ['浦东新区陆家嘴环路1000号', '浦东新区张杨路500号', '浦东新区世纪大道1200号'],
      ['黄浦区南京东路100号', '静安区南京西路1788号', '徐汇区衡山路880号'],
      ['闵行区莘庄地铁站南广场', '松江区中山中路196号', '长宁区虹桥路1438号'],
      ['宝山区牡丹江路1288号', '普陀区长寿路1118号', '嘉定区城中路66号'],
    ]
    const addr = regionAddresses[regionIdx][addrIdx % 3]

    return {
      id: `o${1000 + i}`,
      userId: `u${randomInt(1, 100)}`,
      userName: userNames[i % userNames.length],
      userPhone: generatePhone(),
      address: addr,
      location: randomOffset(SHANGHAI_CENTER, 6),
      category: categories[randomInt(0, categories.length - 1)],
      estimatedWeight: randomInRange(2, 50),
      status,
      createdAt: now - ageMinutes * 60000,
      acceptedAt,
      completedAt,
      collectorId: acceptedAt ? `c${randomInt(1, 16)}` : undefined,
      regionId: `r${regionIdx + 1}`,
      priceMultiplier: 1.0,
    }
  })
}

export function generateSingleOrder(id: number): Order {
  const now = Date.now()
  const regionIdx = pickWeightedRegionIndex()
  const regionAddresses = [
    ['浦东新区陆家嘴环路1000号', '浦东新区张杨路500号', '浦东新区世纪大道1200号'],
    ['黄浦区南京东路100号', '静安区南京西路1788号', '徐汇区衡山路880号'],
    ['闵行区莘庄地铁站南广场', '松江区中山中路196号', '长宁区虹桥路1438号'],
    ['宝山区牡丹江路1288号', '普陀区长寿路1118号', '嘉定区城中路66号'],
  ]
  const addrIdx = randomInt(0, 2)
  const addr = regionAddresses[regionIdx][addrIdx]

  return {
    id: `o${id}`,
    userId: `u${randomInt(1, 100)}`,
    userName: userNames[randomInt(0, userNames.length - 1)],
    userPhone: generatePhone(),
    address: addr,
    location: randomOffset(SHANGHAI_CENTER, 6),
    category: categories[randomInt(0, categories.length - 1)],
    estimatedWeight: randomInRange(2, 50),
    status: 'pending',
    createdAt: now,
    regionId: `r${regionIdx + 1}`,
    priceMultiplier: 1.0,
  }
}

export function generateRegions(): Region[] {
  return [
    {
      id: 'r1',
      name: '浦东区域',
      bounds: [[31.18, 121.50], [31.28, 121.60]],
      stats: { totalOrders: 42, completedOrders: 35, avgResponseTime: 6.5 },
    },
    {
      id: 'r2',
      name: '浦西中心区',
      bounds: [[31.20, 121.43], [31.26, 121.50]],
      stats: { totalOrders: 56, completedOrders: 48, avgResponseTime: 5.2 },
    },
    {
      id: 'r3',
      name: '西南区域',
      bounds: [[31.10, 121.38], [31.20, 121.48]],
      stats: { totalOrders: 33, completedOrders: 26, avgResponseTime: 8.1 },
    },
    {
      id: 'r4',
      name: '北部区域',
      bounds: [[31.25, 121.40], [31.35, 121.52]],
      stats: { totalOrders: 28, completedOrders: 21, avgResponseTime: 7.3 },
    },
  ]
}

export const MAP_CENTER = SHANGHAI_CENTER
