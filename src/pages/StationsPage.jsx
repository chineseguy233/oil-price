import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { autoLocate, amapSearchNearby } from '../utils/geolocation'

const API_BASE = '/api'

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
  const url = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=car&callnative=1`
  window.open(url, '_blank')
}

// ========== 真实高德地图 ==========
function RealMap({ stations, userLocation, radius, onStationClick }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [amapReady, setAmapReady] = useState(false)

  useEffect(() => {
    if (window.AMap) {
      setAmapReady(true)
      return
    }
    const timer = setInterval(() => {
      if (window.AMap) {
        setAmapReady(true)
        clearInterval(timer)
      }
    }, 200)
    const timeout = setTimeout(() => clearInterval(timer), 15000)
    return () => { clearInterval(timer); clearTimeout(timeout) }
  }, [])

  useEffect(() => {
    if (!amapReady || !mapRef.current || mapInstance.current) return

    try {
      mapInstance.current = new window.AMap.Map(mapRef.current, {
        zoom: 13,
        center: userLocation ? [userLocation.lng, userLocation.lat] : undefined,
        mapStyle: 'amap://styles/whitesmoke',
      })
      mapInstance.current.addControl(new window.AMap.Scale())
    } catch (e) {
      console.error('AMap init failed:', e)
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy()
        mapInstance.current = null
      }
    }
  }, [amapReady])

  useEffect(() => {
    if (!mapInstance.current || !userLocation) return
    mapInstance.current.setCenter([userLocation.lng, userLocation.lat])
  }, [userLocation])

  useEffect(() => {
    if (!mapInstance.current) return

    markersRef.current.forEach(m => mapInstance.current.remove(m))
    markersRef.current = []

    if (!userLocation) return

    const userMarker = new window.AMap.Marker({
      position: new window.AMap.LngLat(userLocation.lng, userLocation.lat),
      title: '您的位置',
      content: '<div style="width:12px;height:12px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #2563eb;"></div>',
      offset: new window.AMap.Pixel(-6, -6),
    })
    mapInstance.current.add(userMarker)
    markersRef.current.push(userMarker)

    stations.forEach(s => {
      if (!s.location) return
      const [lng, lat] = s.location.split(',').map(Number)
      const priceText = s.price92 != null ? `¥${s.price92}` : ''
      const brandText = s.brand || ''
      const marker = new window.AMap.Marker({
        position: new window.AMap.LngLat(lng, lat),
        title: `${s.name} ${priceText}`,
        content: `<div style="background:#f59e0b;color:white;padding:2px 6px;border-radius:10px;font-size:11px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);cursor:pointer;">${brandText}</div>`,
        offset: new window.AMap.Pixel(-20, -10),
      })
      marker.on('click', () => onStationClick && onStationClick(s))
      mapInstance.current.add(marker)
      markersRef.current.push(marker)
    })

    if (stations.length > 0) {
      mapInstance.current.setFitView(markersRef.current, false, [50, 50, 50, 50])
    }
  }, [stations, onStationClick])

  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '12px',
      marginBottom: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>📍 附近加油站</div>
      {!amapReady ? (
        <div style={{
          width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden',
          border: '1px solid #e5e7eb', background: '#f9fafb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ fontSize: '20px' }}>🗺️</div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>地图加载中...</div>
        </div>
      ) : (
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '180px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
          }}
        />
      )}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>
        {amapReady ? `共${stations.length}个油站 · 点击标记查看详情` : '等待地图加载...'}
      </div>
    </div>
  )
}

// ========== 加油站卡片 ==========
function StationCard({ station, sortKey, provincePrice }) {
  const hasPrice = station.price92 != null || station.price95 != null
  const avgPrice = station.price92 != null && station.price95 != null
    ? ((station.price92 + station.price95) / 2).toFixed(2)
    : (station.price92 || station.price95)?.toFixed(2)

  const isCheap = sortKey === 'price92' || sortKey === 'price95'
  const discount = station.discount || null

  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: isCheap ? '1px solid #fef3c7' : '1px solid transparent',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {isCheap && station.price92 != null && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          fontSize: '10px',
          padding: '2px 8px',
          borderBottomLeftRadius: '8px',
          fontWeight: '600',
        }}>
          较便宜
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px', paddingRight: '50px' }}>
            {station.name}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.4' }}>
            {station.address || '地址未知'}
          </div>
          {station.businessHours && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: station.is24h ? '#10b981' : '#6b7280' }}>
              {station.is24h ? '🕐 24小时营业' : `⏰ ${station.businessHours}`}
            </div>
          )}
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

      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
        <div style={{
          flex: 1,
          background: '#fef3c7',
          borderRadius: '10px',
          padding: '10px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '2px' }}>92#汽油</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>
            {station.price92 != null ? `¥${station.price92}` : '—'}
          </div>
          {station.price92 != null && (
            <div style={{ fontSize: '9px', color: '#b45309', marginTop: '2px' }}>模拟数据</div>
          )}
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
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c3aed' }}>
            {station.price95 != null ? `¥${station.price95}` : '—'}
          </div>
          {station.price95 != null && (
            <div style={{ fontSize: '9px', color: '#7c3aed', marginTop: '2px' }}>模拟数据</div>
          )}
          {!station.price95 && provincePrice && (
            <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '2px' }}>参考价¥{provincePrice}</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {station.brand && (
          <div style={{
            padding: '4px 10px',
            background: '#f0fdf4',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#15803d',
            fontWeight: '500',
          }}>
            ⛽ {station.brand}
          </div>
        )}

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

        {discount && (
          <div style={{
            padding: '4px 10px',
            background: '#fef2f2',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#dc2626',
            fontWeight: '600',
          }}>
            🎁 {discount}
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

// ========== 加油站比价页面（仅附近） ==========
export default function StationsPage({ oilData } = {}) {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('distance')
  const [locationStatus, setLocationStatus] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locMessage, setLocMessage] = useState('')
  const [locError, setLocError] = useState('')
  const [radius, setRadius] = useState(5000)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  // 当前定位省份的油价（参考价）
  const provincePrice = useMemo(() => {
    if (!oilData || !userLocation?.province) return null
    const data = oilData[userLocation.province]
    return data?.['92'] ?? null
  }, [oilData, userLocation?.province])

  // 加载附近加油站（GPS定位 + 分页）
  const loadNearbyStations = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    setLocError('')

    try {
      const loc = await autoLocate()
      setUserLocation(loc)
      setLocationStatus('success')
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
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [radius])

  // 首次加载
  useEffect(() => {
    setPage(1)
    setStations([])
    setLocationStatus('locating')
    loadNearbyStations(1)
  }, [radius])

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
        <span>🔍</span> 附近加油站
      </div>

      {/* 定位状态 */}
      <div style={{
        background: 'white',
        borderRadius: '14px',
        padding: '12px 16px',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        {locationStatus === 'success' && userLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: '#10b981', fontWeight: '600' }}>
              {userLocation.source === 'gps' ? '🛰 GPS精确定位' : '🌐 网络定位'}
            </span>
            <span style={{ color: '#6b7280' }}>
              {userLocation.city || userLocation.province}，周边 {sortedStations.length} 个油站
            </span>
          </div>
        )}
        {locationStatus === 'error' && (
          <div style={{ color: '#ef4444', fontSize: '13px' }}>
            ⚠️ {locError}
          </div>
        )}
        {locationStatus === 'locating' && (
          <span style={{ color: '#2563eb', fontSize: '13px' }}>📍 正在获取您的位置...</span>
        )}
        {!locationStatus && (
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>正在获取您的位置...</span>
        )}
      </div>

      {/* 半径选择 */}
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
      <div style={{
        background: '#eff6ff',
        borderRadius: '10px',
        padding: '8px 12px',
        marginBottom: '12px',
        fontSize: '11px',
        color: '#3b82f6',
      }}>
        💡 数据来源：高德地图POI · 油价为该省参考均价 · 实际价格以加油站为准
      </div>

      {/* 地图 */}
      {userLocation && stations.length > 0 && (
        <RealMap
          stations={sortedStations}
          userLocation={userLocation}
          radius={radius}
          onStationClick={(station) => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
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
            {userLocation?.source === 'ip' && (
              <span style={{ color: '#f59e0b', fontSize: '11px' }}>⚠️ 网络定位，精度较低</span>
            )}
          </div>
          {sortedStations.map((station, idx) => (
            <StationCard
              key={`${station.name}-${station.location || idx}`}
              station={station}
              sortKey={sortKey}
              provincePrice={provincePrice}
            />
          ))}

          {/* 加载更多 */}
          {sortedStations.length < total && (
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
      ) : locationStatus === 'error' ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: '#d1d5db',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          定位失败，请检查定位权限后重试
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
