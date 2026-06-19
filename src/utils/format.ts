export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`
  }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`
}

export function formatWeight(kg: number): string {
  if (kg < 1000) {
    return `${kg.toFixed(1)} kg`
  }
  return `${(kg / 1000).toFixed(2)} 吨`
}

export function formatCurrency(yuan: number): string {
  return `¥ ${yuan.toFixed(2)}`
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

export function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

export const categoryLabels: Record<string, string> = {
  paper: '废纸',
  plastic: '塑料',
  metal: '金属',
  electronic: '电子废弃物',
  mixed: '混合废品',
}

export const statusLabels: Record<string, string> = {
  online: '在线',
  busy: '忙碌',
  offline: '离线',
  pending: '待接单',
  accepted: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}
