import type { Collector, Order, Region, OrderCategory, CollectorStatus } from '@/types'

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

export function generateCollectors(count: number = 16): Collector[] {
  return collectorNames.slice(0, count).map((name, i) => {
    const regionIndex = i % 4
    return {
      id: `c${i + 1}`,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      phone: generatePhone(),
      status: statuses[i % statuses.length],
      location: randomOffset(SHANGHAI_CENTER, 5),
      stats: {
        ordersToday: randomInt(5, 25),
        totalWeight: randomInt(50, 500),
        totalIncome: randomInt(200, 2000),
        acceptRate: randomInRange(0.75, 0.98),
      },
      regionId: `r${regionIndex + 1}`,
    }
  })
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
    const addrIdx = i % addresses.length

    return {
      id: `o${1000 + i}`,
      userId: `u${randomInt(1, 100)}`,
      userName: userNames[i % userNames.length],
      userPhone: generatePhone(),
      address: addresses[addrIdx],
      location: randomOffset(SHANGHAI_CENTER, 6),
      category: categories[i % categories.length],
      estimatedWeight: randomInRange(2, 50),
      status,
      createdAt: now - ageMinutes * 60000,
      acceptedAt,
      completedAt,
      collectorId: acceptedAt ? `c${randomInt(1, 16)}` : undefined,
      regionId: `r${(addrIdx % 4) + 1}`,
      priceMultiplier: 1.0,
    }
  })
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
