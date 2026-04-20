// ========== 油号配置 ==========
export const OIL_TYPES = [
  { key: '92', label: '92#汽油', color: '#f59e0b' },
  { key: '95', label: '95#汽油', color: '#3b82f6' },
  { key: '98', label: '98#汽油', color: '#8b5cf6' },
  { key: '0', label: '0#柴油', color: '#10b981' },
]

export const OIL_COLORS = {
  '92': '#f59e0b',
  '95': '#3b82f6',
  '98': '#8b5cf6',
  '0': '#10b981',
}

// ========== API_BASE ==========
export const API_BASE = (typeof process !== 'undefined' && process.env?.TARO_API_BASE)
  ? process.env.TARO_API_BASE
  : 'http://localhost:3000'
