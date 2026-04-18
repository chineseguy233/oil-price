import { useState, useEffect, useCallback } from 'react'

const API_BASE = '/api'

// 省份列表
const PROVINCES = [
  '北京', '上海', '广东', '江苏', '浙江', '四川', '湖北', '湖南',
  '河南', '河北', '山东', '山西', '陕西', '安徽', '福建', '江西',
  '辽宁', '吉林', '黑龙江', '内蒙古', '新疆', '甘肃', '青海', '宁夏',
  '西藏', '云南', '贵州', '广西', '海南', '天津', '重庆'
]

// 加油站卡片
function StationCard({ station, sortKey }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
            {station.name}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{station.address}</div>
        </div>
        <div style={{
          background: '#f3f4f6',
          padding: '4px 8px',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#6b7280',
        }}>
          📍 {station.distance}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{
          flex: 1,
          background: '#fef3c7',
          borderRadius: '10px',
          padding: '10px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '2px' }}>92#汽油</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d97706' }}>
            ¥{station.price92}
          </div>
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
            ¥{station.price95}
          </div>
        </div>
      </div>
      
      <div style={{
        marginTop: '10px',
        padding: '6px 10px',
        background: '#f0fdf4',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#15803d',
        display: 'inline-block',
      }}>
        品牌: {station.brand}
      </div>
    </div>
  )
}

// ========== 加油站比价页面 ==========
export default function StationsPage({ selectedRegion, setSelectedRegion, regions }) {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState('distance') // distance | price92 | price95

  const loadStations = useCallback(() => {
    setLoading(true)
    fetch(`${API_BASE}/stations/search?province=${encodeURIComponent(selectedRegion)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setStations(d.stations || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedRegion])

  useEffect(() => { loadStations() }, [loadStations])

  // 排序
  const sortedStations = [...stations].sort((a, b) => {
    if (sortKey === 'distance') {
      return parseFloat(a.distance) - parseFloat(b.distance)
    } else if (sortKey === 'price92') {
      return a.price92 - b.price92
    } else if (sortKey === 'price95') {
      return a.price95 - b.price95
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

      {/* 省份选择 */}
      <div style={{
        background: 'white',
        borderRadius: '14px',
        padding: '14px 16px',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>选择省份</div>
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
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
          {PROVINCES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
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

      {/* 加油站列表 */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 0',
          color: '#9ca3af',
          fontSize: '14px',
        }}>
          加载中...
        </div>
      ) : sortedStations.length > 0 ? (
        <div>
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginBottom: '12px',
            paddingLeft: '4px',
          }}>
            共找到 {sortedStations.length} 个加油站
          </div>
          {sortedStations.map(station => (
            <StationCard key={station.id} station={station} sortKey={sortKey} />
          ))}
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
