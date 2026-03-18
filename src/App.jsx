import { useState } from 'react'

// 油价数据
const oilPrices = {
  '92': 7.64,
  '95': 7.98,
  '98': 8.56,
  '0': 7.32
}

const regionPrices = {
  '北京': { '92': 7.64, '95': 7.98, '98': 8.56, '0': 7.32 },
  '上海': { '92': 7.62, '95': 7.95, '98': 8.50, '0': 7.28 },
  '广东': { '92': 7.68, '95': 8.04, '98': 8.65, '0': 7.35 },
  '江苏': { '92': 7.60, '95': 7.92, '98': 8.45, '0': 7.25 },
  '浙江': { '92': 7.63, '95': 7.96, '98': 8.52, '0': 7.30 },
}

// 油价页面
function OilPricePage({ selectedOil, setSelectedOil, selectedRegion, setSelectedRegion }) {
  const currentPrice = oilPrices[selectedOil] || 7.64
  const regions = Object.keys(regionPrices)
  
  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>今日油价 · {selectedRegion}</div>
        <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
          {currentPrice} <span style={{ fontSize: '18px', fontWeight: 'normal' }}>元/升</span>
        </div>
        <div style={{ color: '#22c55e', fontSize: '14px' }}>↓ 较昨日 0.02 元 (0.26%)</div>
      </div>

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
                cursor: 'pointer'
              }}
            >
              {type === '0' ? '0#柴油' : `${type}#汽油`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: '500', fontSize: '14px' }}>
          各省油价参考
        </div>
        {regions.map((region, i) => (
          <div key={region} style={{ 
            padding: '12px', 
            display: 'flex', 
            justifyContent: 'space-between',
            background: i % 2 === 0 ? 'white' : '#f9fafb',
            borderBottom: i < regions.length - 1 ? '1px solid #f3f4f6' : 'none'
          }}>
            <span style={{ fontSize: '14px' }}>{region}</span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{regionPrices[region][selectedOil]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 趋势页面
function TrendPage() {
  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>油价走势</h2>
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', color: '#9ca3af' }}>
        趋势图表开发中...
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
function MyPage() {
  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>我的</h2>
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '24px' }}>👤</span>
          <span>用户中心</span>
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

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui' }}>
      <div style={{ background: 'white', padding: '16px', textAlign: 'center', fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        油价守护者
      </div>

      {tab === 'price' && <OilPricePage selectedOil={selectedOil} setSelectedOil={setSelectedOil} selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} />}
      {tab === 'trend' && <TrendPage />}
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
              cursor: 'pointer'
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
