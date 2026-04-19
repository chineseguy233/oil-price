import { useState, useEffect, useCallback } from 'react'
import { autoLocate, amapSearchNearby } from '../utils/geolocation'

const API_BASE = '/api'

// 省份列表
const PROVINCES = [
  '北京', '上海', '广东', '江苏', '浙江', '四川', '湖北', '湖南',
  '河南', '河北', '山东', '山西', '陕西', '安徽', '福建', '江西',
  '辽宁', '吉林', '黑龙江', '内蒙古', '新疆', '甘肃', '青海', '宁夏',
  '西藏', '云南', '贵州', '广西', '海南', '天津', '重庆'
]

// 附近半径选项
const RADIUS_OPTIONS = [
  { value: 1000, label: '1km' },
  { value: 3000, label: '3km' },
  { value: 5000, label: '5km' },
  { value: 10000, label: '10km' },
]

// ========== 工具函数 ==========

function formatDistance(meters) {
  if (!meters && meters !== 0) return '未知'
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * 唤起导航（高德地图 Web / 小程序 / App）
 * @param {string} location - "lng,lat" 格式
 * @param {string} name - 加油站名称
 */
function navigateTo(location, name) {
  if (!location) return
  const [lng, lat] = location.split(',')
  // 优先尝试高德地图URI scheme
  const url = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=car&callnative=1`
  window.open(url, '_blank')
}

// ========== 加油站卡片（增强版）============
function StationCard({ station, sortKey, provincePrice }) {
  const hasPrice = station.price92 != null || station.price95 != null
  const avgPrice = station.price92 != null && station.price95 != null
    ? ((station.price92 + station.price95) / 2).toFixed(2)
    : (station.price92 || station.price95)?.toFixed(2)

  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {/* 第一行：名称 + 距离 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
            {station.name}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            {station.address || '地址未知'}
            {station.businessHours && (
              <span style={{ marginLeft: '8px', color: station.is24h ? '#10b981' : '#6b7280' }}>
                {station.is24h ? '🕐 24小时营业' : `⏰ ${station.businessHours}`}
              </span>
            )}
          </div>
        </div>
        <div style={{
          background: '#f3f4f6',
          padding: '4px 8px',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#6b7280',
          flexShrink: 0,
          marginLeft: '8px',
        }}>
          📍 {station.distance}
        </div>
      </div>

      {/* 第二行：价格（参考价标注）+ 品牌 */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
        <div style={{
          flex: 1,
          background: '#fef3c7',
          borderRadius: '10px',
          padding: '10px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '2px' }}>92#汽油</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d97706' }}>
            {station.price92 != null ? `¥${station.price92}` : '—'}
          </div>
          {!station.price92 && provincePrice && (
            <div style={{ fontSize: '10px', color: '#b45309', marginTop: '2px' }}>参考价¥{provincePrice}</div>
          )}
        </div>
        <div style={{
          flex: 1,
          background: '#ede9fe',
          borderRadius: '10px',
          padding: '10px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#6d28d9', marginBottom: '2px' }}>95#汽油</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#7c3aed' }}>
            {station.price95 != null ? `¥${station.price95}` : '—'}
          </div>
          {!station.price95 && provincePrice && (
            <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '2px' }}>参考价¥{provincePrice}</div>
          )}
        </div>
      </div>

      {/* 第三行：品牌 + 评分 + 电话 + 导航按钮 */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          padding: '4px 10px',
          background: '#f0fdf4',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#15803d',
        }}>
          {station.brand || '民营'}
        </div>

        {station.rating && (
          <div style={{
            padding: '4px 10px',
            background: '#fff7ed',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#c2410c',
          }}>
            ⭐ {station.rating.toFixed(1)}
          </div>
        )}

        {station.tel && (
          <a href={`tel:${station.tel}`} style={{
            padding: '4px 10px',
            background: '#eff6ff',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#2563eb',
            textDecoration: 'none',
          }}>
            📞 {station.tel}
          </a>
        )}

        {station.location && (
          <button
            onClick={() => navigateTo(station.location, station.name)}
            style={{
              marginLeft: 'auto',
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}
          >
            🚗 导航
          </button>
        )}
      </div>
    </div>
  )
}

// ========== 省份选择器（带搜索）============
function ProvinceSelector({ value, onChange, provinces }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = search
    ? provinces.filter(p => p.includes(search) || p.pinyin?.toLowerCase().includes(search.toLowerCase()))
    : provinces

  // 最近访问
  const recent = JSON.parse(localStorage.getItem('recent_provinces') || '[]')

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => {
          onChange(e.target.value)
          // 记录最近
          const recent = JSON.parse(localStorage.getItem('recent_provinces') || '[]')
          const updated = [e.target.value, ...recent.filter(r => r !== e.target.value)].slice(0, 3)
          localStorage.setItem('recent_provinces', JSON.stringify(updated))
        }}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          background: '#f9fafb',
          cursor: 'pointer',
          color: '#374151',
        }}
      >
        {provinces.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  )
}

// ========== 加油站比价页面 ==========
export default function StationsPage({ selectedRegion, setSelectedRegion, regions }) {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('distance')
  const [searchMode, setSearchMode] = useState('province') // 'province' | 'nearby'
  const [locationStatus, setLocationStatus] = useState(null) // null | 'locating' | 'success' | 'error'
  const [userLocation, setUserLocation] = useState(null) // { lat, lng, province, city }
  const [locMessage, setLocMessage] = useState('')
  const [locError, setLocError] = useState('')
  const [radius, setRadius] = useState(5000)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  // 获取当前省份油价（作为参考价）
  const provincePrice = null // 后续通过props或context传入更准确

  // 加载省份加油站（模拟数据）
  const loadProvinceStations = useCallback(() => {
    setLoading(true)
    fetch(`${API_BASE}/stations/search?province=${encodeURIComponent(selectedRegion)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setStations(d.stations || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedRegion])

  // 加载附近加油站（GPS定位 + 分页）
  const loadNearbyStations = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    setLocError('')

    try {
      const loc = await autoLocate()
      setUserLocation(loc)
      setLocationStatus('success')

      // 保存定位成功消息
      setLocMessage(loc.message || (loc.source === 'gps' ? 'GPS定位成功' : '网络定位成功'))

      const result = await amapSearchNearby(loc.lat, loc.lng, radius, pageNum)
      if (pageNum === 1) {
        setStations(result.stations)
      } else {
        setStations(prev => [...prev, ...result.stations])
      }
      setTotal(result.total)
      setPage(result.page)
    } catch (e) {
      console.error('定位/搜索失败:', e)
      setLocError(e.message || '定位失败')
      setLocationStatus('error')
      // fallback 到省份数据
      if (pageNum === 1) loadProvinceStations()
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [radius, loadProvinceStations])

  // 搜索模式切换时重新加载
  useEffect(() => {
    setPage(1)
    setStations([])
    if (searchMode === 'province') {
      setLocationStatus(null)
      loadProvinceStations()
    } else {
      setLocationStatus('locating')
      loadNearbyStations(1)
    }
  }, [searchMode, selectedRegion, radius])

  // 加载更多
  const handleLoadMore = () => {
    if (loadingMore || page * 20 >= total) return
    loadNearbyStations(page + 1)
  }

  // 排序
  const sortedStations = [...stations].sort((a, b) => {
    if (sortKey === 'distance') {
      return (a.distanceRaw || 999999) - (b.distanceRaw || 999999)
    } else if (sortKey === 'price92') {
      return (a.price92 ?? 999) - (b.price92 ?? 999)
    } else if (sortKey === 'price95') {
      return (a.price95 ?? 999) - (b.price95 ?? 999)
    }
    return 0
  })

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 顶部标题 */}
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>🔍</span> 加油站比价
      </div>

      {/* 搜索模式切换 */}
      <div style={{
        background: 'white',
        borderRadius: '14px',
        padding: '14px 16px',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: '500' }}>查找方式</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSearchMode('nearby')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: searchMode === 'nearby' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f3f4f6',
              color: searchMode === 'nearby' ? 'white' : '#6b7280',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {searchMode === 'nearby' && locationStatus === 'locating' ? '📍 定位中...' : '📍 附近'}
          </button>
          <button
            onClick={() => setSearchMode('province')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: searchMode === 'province' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f3f4f6',
              color: searchMode === 'province' ? 'white' : '#6b7280',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🗺 按省份
          </button>
        </div>

        {/* 定位状态提示 - 改进版 */}
        {searchMode === 'nearby' && (
          <div style={{ marginTop: '10px', fontSize: '12px', minHeight: '20px' }}>
            {locationStatus === 'success' && userLocation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>
                  {userLocation.source === 'gps' ? '🛰 GPS精确定位' : '🌐 网络定位'}
                </span>
                <span style={{ color: '#6b7280' }}>
                  {userLocation.city || userLocation.province}，周边 {sortedStations.length} 个油站
                </span>
              </div>
            )}
            {locationStatus === 'error' && (
              <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️ {locError}</span>
                <span style={{ color: '#9ca3af' }}>，已切换到省份数据</span>
              </div>
            )}
            {locationStatus === 'locating' && (
              <span style={{ color: '#2563eb' }}>📍 正在获取您的位置...</span>
            )}
            {!locationStatus && (
              <span style={{ color: '#9ca3af' }}>点击「附近」将获取您的位置来查找周边加油站</span>
            )}
          </div>
        )}
      </div>

      {/* 半径选择（仅附近模式显示） */}
      {searchMode === 'nearby' && (
        <div style={{
          background: 'white',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>搜索范围:</span>
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setRadius(opt.value)
                  setPage(1)
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: radius === opt.value ? '#2563eb' : '#f3f4f6',
                  color: radius === opt.value ? 'white' : '#6b7280',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 省份选择（仅省份模式显示） */}
      {searchMode === 'province' && (
        <div style={{
          background: 'white',
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>选择省份</div>
          <ProvinceSelector
            value={selectedRegion}
            onChange={setSelectedRegion}
            provinces={regions}
          />
        </div>
      )}

      {/* 排序选项 */}
      <div style={{
        background: 'white',
        borderRadius: '14px',
        padding: '12px 16px',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginRight: '4px' }}>排序:</span>
        {[
          { key: 'distance', label: '距离优先' },
          { key: 'price92', label: '92#最便宜' },
          { key: 'price95', label: '95#最便宜' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: sortKey === opt.key ? '#2563eb' : '#f3f4f6',
              color: sortKey === opt.key ? 'white' : '#6b7280',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 数据来源说明 */}
      {searchMode === 'nearby' && (
        <div style={{
          background: '#eff6ff',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '11px',
          color: '#3b82f6',
        }}>
          💡 附近数据来自高德地图。油价为该省参考价，实际价格以加油站为准
        </div>
      )}

      {/* 加油站列表 */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 0',
          color: '#9ca3af',
          fontSize: '14px',
        }}>
          {locationStatus === 'locating' ? '📍 定位中...' : '加载中...'}
        </div>
      ) : sortedStations.length > 0 ? (
        <div>
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginBottom: '12px',
            paddingLeft: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>共找到 {sortedStations.length}{total > sortedStations.length ? `/${total}` : ''} 个加油站</span>
            {searchMode === 'nearby' && userLocation?.source === 'ip' && (
              <span style={{ color: '#f59e0b', fontSize: '11px' }}>⚠️ 网络定位，精度较低</span>
            )}
          </div>
          {sortedStations.map((station, idx) => (
            <StationCard
              key={`${station.name}-${station.location || idx}`}
              station={station}
              sortKey={sortKey}
              provincePrice={null}
            />
          ))}

          {/* 加载更多 */}
          {searchMode === 'nearby' && sortedStations.length < total && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 24px',
                  borderRadius: '20px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                }}
              >
                {loadingMore ? '加载中...' : `加载更多 (${total - sortedStations.length}个)`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: '#d1d5db',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          暂无加油站数据
        </div>
      )}
    </div>
  )
}
