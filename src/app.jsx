import React, { useState, useEffect, useCallback } from 'react'
import { getStorageSync } from '@tarojs/taro'
import './app.css'

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

// API Base
const API_BASE = process.env.TARO_API_BASE || 'http://localhost:3000'

// ========== 全局状态 Context ==========
export const AppContext = React.createContext({})

export function App({ children }) {
  const [user, setUser] = useState(null)
  const [oilData, setOilData] = useState(null)
  const [regions, setRegions] = useState([])
  const [updateTime, setUpdateTime] = useState(null)
  const [hoursOld, setHoursOld] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState('北京')
  const [selectedOil, setSelectedOil] = useState('92')

  // 加载油价数据
  const loadOilData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/oil-prices`)
      const data = await res.json()
      if (data.prices) {
        setOilData(data.prices)
        setRegions(Object.keys(data.prices).filter(k => !k.startsWith('_')).sort())
        setUpdateTime(data.update_time || data.date)
        if (data.fetched_at) {
          const fetched = new Date(data.fetched_at)
          setHoursOld(((new Date() - fetched) / 3600000).toFixed(1))
        }
      }
    } catch (e) {
      console.error('加载油价数据失败', e)
    }
  }, [])

  // 初始化登录状态
  const initAuth = useCallback(() => {
    const token = getStorageSync('oil_token')
    const userInfo = getStorageSync('oil_user')
    if (token && userInfo) {
      setUser({ token, ...userInfo })
    }
  }, [])

  useEffect(() => {
    loadOilData()
    initAuth()
  }, [loadOilData, initAuth])

  const contextValue = {
    user, setUser,
    oilData, setOilData,
    regions, setRegions,
    updateTime, hoursOld,
    selectedRegion, setSelectedRegion,
    selectedOil, setSelectedOil,
    API_BASE,
    loadOilData,
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export default App
