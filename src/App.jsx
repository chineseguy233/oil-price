import { useState, useEffect } from 'react'

const API_BASE = '/api'

// 各省油价颜色（用于列表展示）
const OIL_KEYS = {
  '92': '92#汽油',
  '95': '95#汽油',
  '98': '98#汽油',
  '0': '0#柴油',
}

// 油价页面
function OilPricePage({ selectedOil, setSelectedOil, selectedRegion, setSelectedRegion, oilData, regions, updateTime }) {
  if (!oilData) {
    return (
      <div style={{ padding: '16px', paddingBottom: '80px', textAlign: 'center', color: '#9ca3af' }}>
        加载中...
      </div>
    )
  }

  const currentPrice = oilData[selectedRegion]?.[selectedOil] ?? '—'
  const sortedRegions = regions

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 油价卡片 */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
          今日油价 · {selectedRegion}
          {updateTime && <span style={{ marginLeft: 8, fontSize: '12px' }}>({updateTime})</span>}
        </div>
        <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
          {currentPrice} <span style={{ fontSize: '18px', fontWeight: 'normal' }}>元/升</span>
        </div>
      </div>

      {/* 省份选择 */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>选择省份</div>
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          {regions.sort().map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* 油号选择 */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>选择油号</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['92', '95', '98', '0'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedOil(type)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: selectedOil === type ? 'none' : '1px solid #e5e7eb',
                background: selectedOil === type ? '#2563eb' : 'white',
                color: selectedOil === type ? 'white' : '#6b7280',
                fontWeight: 'medium',
                cursor: 'pointer',
              }}
            >
              {type === '0' ? '0#柴油' : `${type}#汽油`}
            </button>
          ))}
        </div>
      </div>

      {/* 各省油价列表 */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: '500', fontSize: '14px' }}>
          各省油价参考（{OIL_KEYS[selectedOil]}）
        </div>
        {sortedRegions.sort().map((region, i) => (
          <div key={region} style={{
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            background: i % 2 === 0 ? 'white' : '#f9fafb',
            borderBottom: i < regions.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span style={{ fontSize: '14px' }}>{region}</span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              {oilData[region]?.[selectedOil] ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 趋势页面
function TrendPage({ selectedRegion, setSelectedRegion, regions }) {
  const [trendData, setTrendData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/price-changes?province=${encodeURIComponent(selectedRegion)}&days=7`)
      .then(r => r.json())
      .then(d => { setTrendData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedRegion])

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>选择省份</div>
        <select
          value={selectedRegion}
          onChange={e => setSelectedRegion(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            background: 'white',
          }}
        >
          {regions.sort().map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>{selectedRegion} 油价走势（7天）</div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>加载中...</div>
        ) : trendData && Object.keys(trendData.history || {}).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(trendData.history).sort().map(([date, prices]) => (
              <div key={date} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: '#f9fafb',
                borderRadius: '8px',
                fontSize: '13px',
              }}>
                <span style={{ color: '#6b7280' }}>{date}</span>
                <span>92#={prices['92'] ?? '—'}  95#={prices['95'] ?? '—'}  98#={prices['98'] ?? '—'}  0#={prices['0'] ?? '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
            暂无历史数据，请先等待爬虫运行几天积累数据
          </div>
        )}
      </div>
    </div>
  )
}

// 油耗页面
function FuelPage() {
  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>油耗记录</h2>
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', color: '#9ca3af' }}>
        油耗功能开发中...
      </div>
    </div>
  )
}

// 我的页面
function MyPage({ onTriggerCrawl }) {
  const [crawlStatus, setCrawlStatus] = useState(null)

  const handleCrawl = () => {
    setCrawlStatus('running')
    fetch('/api/crawl', { method: 'POST' })
      .then(r => r.json())
      .then(d => setCrawlStatus(d.success ? 'ok' : 'err'))
      .catch(() => setCrawlStatus('err'))
    setTimeout(() => setCrawlStatus(null), 3000)
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>我的</h2>
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '24px' }}>👤</span>
          <span>用户中心</span>
        </div>
        <div
          onClick={handleCrawl}
          style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
        >
          🔄 手动更新油价数据
          {crawlStatus === 'running' && <span style={{ color: '#9ca3af', marginLeft: 8 }}>更新中...</span>}
          {crawlStatus === 'ok' && <span style={{ color: '#22c55e', marginLeft: 8 }}>✓ 已更新</span>}
          {crawlStatus === 'err' && <span style={{ color: '#ef4444', marginLeft: 8 }}>更新失败</span>}
        </div>
        <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
          <span>🔔 油价提醒</span>
        </div>
        <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
          <span>⭐ 收藏油站</span>
        </div>
        <div style={{ padding: '12px 0' }}>
          <span>⚙️ 设置</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('price')
  const [selectedOil, setSelectedOil] = useState('92')
  const [selectedRegion, setSelectedRegion] = useState('北京')
  const [oilData, setOilData] = useState(null)
  const [updateTime, setUpdateTime] = useState('')
  const [regions, setRegions] = useState(['北京', '上海', '广东', '江苏', '浙江'])

  // 加载油价数据
  useEffect(() => {
    fetch(`${API_BASE}/oil-prices`)
      .then(r => r.json())
      .then(d => {
        if (d.prices) {
          setOilData(d.prices)
          setRegions(Object.keys(d.prices))
          setUpdateTime(d.update_time || '')
          // 默认选中第一个省份
          const first = Object.keys(d.prices)[0]
          if (first) setSelectedRegion(first)
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui' }}>
      <div style={{ background: 'white', padding: '16px', textAlign: 'center', fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        ⛽ 油价守护者
        {updateTime && <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#9ca3af', marginLeft: 8 }}>{updateTime}</span>}
      </div>

      {tab === 'price' && (
        <OilPricePage
          selectedOil={selectedOil} setSelectedOil={setSelectedOil}
          selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion}
          oilData={oilData} regions={regions} updateTime={updateTime}
        />
      )}
      {tab === 'trend' && (
        <TrendPage selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} regions={regions} />
      )}
      {tab === 'fuel' && <FuelPage />}
      {tab === 'my' && <MyPage />}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex' }}>
        {[{ id: 'price', name: '油价', icon: '⛽' }, { id: 'trend', name: '趋势', icon: '📈' }, { id: 'fuel', name: '油耗', icon: '📊' }, { id: 'my', name: '我的', icon: '👤' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              textAlign: 'center',
              color: tab === t.id ? '#2563eb' : '#9ca3af',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{t.icon}</div>
            <div style={{ fontSize: '12px' }}>{t.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
