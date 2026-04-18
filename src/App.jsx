import { useState, useEffect, useCallback } from 'react'

const API_BASE = '/api'

// 油号配置
const OIL_TYPES = [
  { key: '92', label: '92#汽油', color: '#3b82f6' },
  { key: '95', label: '95#汽油', color: '#8b5cf6' },
  { key: '98', label: '98#汽油', color: '#f59e0b' },
  { key: '0', label: '0#柴油', color: '#10b981' },
]

// 油号选择器颜色
const OIL_COLORS = { '92': '#3b82f6', '95': '#8b5cf6', '98': '#f59e0b', '0': '#10b981' }

// 广告位配置
const AD_BANNER_SLOT = 'home_top_banner'
const AD_LIST_SLOT = 'province_list_item'

// 模拟广告数据（实际接入时可替换为真实广告SDK）
function AdBanner({ slot, style }) {
  const [ad, setAd] = useState(null)
  useEffect(() => {
    // TODO: 接入真实广告SDK（如穿山甲、广点通等）
    // 暂时显示占位，保留广告位
    setAd({ title: '广告位招租', sub: '汽车服务·品牌推广', link: '#' })
  }, [slot])
  if (!ad) return null
  return (
    <a href={ad.link} style={{
      display: 'block',
      margin: '12px 16px',
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      color: 'white',
      textDecoration: 'none',
      ...style,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{ad.title}</div>
      <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>{ad.sub}</div>
    </a>
  )
}

// 省油价列表项（带广告位）
function ProvinceRow({ region, price, oilType, index }) {
  const [ad] = useState(() => {
    // 每5条插入一个广告位
    return index > 0 && index % 5 === 0
      ? { title: '精选服务', sub: '广告', color: '#f59e0b' }
      : null
  })

  return (
    <>
      {ad && (
        <div style={{
          padding: '10px 16px',
          background: 'linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '8px',
          margin: '4px 16px',
          cursor: 'pointer',
        }}>
          <span style={{ fontSize: '12px', color: '#92400e' }}>🔥 {ad.title}</span>
          <span style={{ fontSize: '11px', color: '#b45309', marginLeft: '8px' }}>{ad.sub}</span>
        </div>
      )}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: index % 2 === 0 ? '#ffffff' : '#f9fafb',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: `linear-gradient(135deg, ${OIL_COLORS[oilType]}22, ${OIL_COLORS[oilType]}44)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 'bold', color: OIL_COLORS[oilType],
          }}>
            {region.slice(0, 2)}
          </div>
          <span style={{ fontSize: '15px', color: '#374151', fontWeight: '500' }}>{region}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: OIL_COLORS[oilType] }}>{price ?? '—'}</span>
          <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '2px' }}>元/升</span>
        </div>
      </div>
    </>
  )
}

// ========== 油价页面 ==========
function OilPricePage({ selectedOil, setSelectedOil, selectedRegion, setSelectedRegion, oilData, regions, updateTime }) {
  const [showAdBanner, setShowAdBanner] = useState(true)

  if (!oilData) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⛽</div>
        <div>数据加载中...</div>
      </div>
    )
  }

  const currentPrice = oilData[selectedRegion]?.[selectedOil] ?? '—'
  const oilColor = OIL_COLORS[selectedOil]

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* 顶部 Banner 广告 */}
      {showAdBanner && <AdBanner slot={AD_BANNER_SLOT} />}

      {/* 主油价卡片 */}
      <div style={{
        margin: '0 16px 16px',
        background: 'white',
        borderRadius: '20px',
        padding: '24px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
          background: `radial-gradient(circle, ${oilColor}18 0%, transparent 70%)`,
          borderRadius: '0 20px 0 120px',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '4px' }}>
              今日油价 · {selectedRegion}
              {updateTime && <span style={{ marginLeft: 6, fontSize: '12px' }}>({updateTime})</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '44px', fontWeight: 'bold', color: oilColor, lineHeight: 1 }}>{currentPrice}</span>
              <span style={{ fontSize: '16px', color: '#9ca3af' }}>元/升</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: `${oilColor}18`,
              color: oilColor,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 'bold',
            }}>
              {OIL_TYPES.find(t => t.key === selectedOil)?.label}
            </div>
          </div>
        </div>
      </div>

      {/* 省份选择 */}
      <div style={{ margin: '0 16px 12px', background: 'white', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>选择省份</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              background: '#f9fafb',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            {regions.sort().map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAdBanner(v => !v)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: 'white',
              fontSize: '12px',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
            title="隐藏广告"
          >
            {showAdBanner ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      {/* 油号选择 */}
      <div style={{ margin: '0 16px 12px', background: 'white', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: '500' }}>选择油号</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {OIL_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedOil(t.key)}
              style={{
                padding: '10px 4px',
                borderRadius: '12px',
                border: selectedOil === t.key ? 'none' : '1px solid #e5e7eb',
                background: selectedOil === t.key ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)` : '#f9fafb',
                color: selectedOil === t.key ? 'white' : '#6b7280',
                fontWeight: selectedOil === t.key ? 'bold' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: selectedOil === t.key ? `0 4px 12px ${t.color}44` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {t.key === '0' ? '0#柴油' : `${t.key}#汽油`}
            </button>
          ))}
        </div>
      </div>

      {/* 各省油价列表 */}
      <div style={{ margin: '0 16px', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{
          padding: '12px 16px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          fontSize: '13px',
          color: '#6b7280',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>各省油价参考</span>
          <span style={{ fontWeight: 'bold', color: oilColor }}>{OIL_TYPES.find(t => t.key === selectedOil)?.label}</span>
        </div>
        <div>
          {regions.sort().map((region, i) => (
            <ProvinceRow
              key={region}
              region={region}
              price={oilData[region]?.[selectedOil]}
              oilType={selectedOil}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ========== 趋势页面 ==========
function TrendPage({ selectedRegion, setSelectedRegion, regions }) {
  const [trendData, setTrendData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API_BASE}/price-changes?province=${encodeURIComponent(selectedRegion)}&days=${days}`)
      .then(r => r.json())
      .then(d => { setTrendData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedRegion, days])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 筛选控制 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, background: 'white', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>选择省份</div>
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px',
              borderRadius: '8px', border: '1px solid #e5e7eb',
              fontSize: '14px', background: '#f9fafb', cursor: 'pointer',
            }}
          >
            {regions.sort().map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minWidth: '90px' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>时间范围</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: '6px 8px', borderRadius: '6px',
                  border: 'none',
                  background: days === d ? '#2563eb' : '#f3f4f6',
                  color: days === d ? 'white' : '#9ca3af',
                  fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                }}
              >
                {d}天
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 趋势卡片 */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>
          📈 {selectedRegion} 油价走势（{days}天）
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>加载中...</div>
        ) : trendData && Object.keys(trendData.history || {}).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(trendData.history).sort().map(([date, prices]) => (
              <div key={date} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', fontSize: '13px',
              }}>
                <span style={{ color: '#6b7280', fontWeight: '500' }}>{date}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: OIL_COLORS['92'] }}>92# {prices['92'] ?? '—'}</span>
                  <span style={{ color: OIL_COLORS['95'] }}>95# {prices['95'] ?? '—'}</span>
                  <span style={{ color: OIL_COLORS['0'] }}>0# {prices['0'] ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '14px' }}>
            暂无历史数据，请先等待爬虫运行几天积累数据
          </div>
        )}
      </div>
    </div>
  )
}

// ========== 油耗页面 ==========
function FuelPage() {
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ date: '', distance: '', amount: '', price: '' })

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>📊 油耗记录</div>
        {/* 录入表单 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px' }}
          />
          <input
            type="number"
            placeholder="里程 (km)"
            value={form.distance}
            onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px' }}
          />
          <input
            type="number"
            placeholder="油量 (L)"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px' }}
          />
          <input
            type="number"
            placeholder="油费 (元)"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px' }}
          />
        </div>
        <button
          style={{
            width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
          }}
          onClick={() => {
            if (!form.date || !form.distance || !form.amount) return
            const consumption = ((parseFloat(form.amount) / parseFloat(form.distance)) * 100).toFixed(2)
            setRecords(r => [{ date: form.date, distance: form.distance, amount: form.amount, price: form.price, consumption }, ...r])
            setForm({ date: '', distance: '', amount: '', price: '' })
          }}
        >
          + 添加记录
        </button>
      </div>

      {/* 记录列表 */}
      {records.length > 0 ? (
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>
            共 {records.length} 条记录
          </div>
          {records.map((r, i) => (
            <div key={i} style={{
              padding: '14px 16px', borderBottom: i < records.length - 1 ? '1px solid #f3f4f6' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{r.date}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{r.distance}km · {r.amount}L · ¥{r.price}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{r.consumption}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>L/100km</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#d1d5db', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontSize: '14px' }}>
          暂无记录，添加您的第一条油耗数据
        </div>
      )}
    </div>
  )
}

// ========== 我的页面 ==========
function MyPage() {
  const [crawlStatus, setCrawlStatus] = useState(null)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/health`).then(r => r.json()).then(setHealth).catch(() => {})
  }, [])

  const handleCrawl = () => {
    setCrawlStatus('running')
    fetch('/api/crawl', { method: 'POST' })
      .then(r => r.json())
      .then(d => setCrawlStatus(d.success ? 'ok' : 'err'))
      .catch(() => setCrawlStatus('err'))
    setTimeout(() => setCrawlStatus(null), 4000)
  }

  const MenuItem = ({ icon, label, value, onClick, status }) => (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f3f4f6',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ fontSize: '15px', color: '#374151' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {value && <span style={{ fontSize: '13px', color: '#9ca3af' }}>{value}</span>}
        {status === 'running' && <span style={{ color: '#9ca3af', fontSize: '13px' }}>更新中...</span>}
        {status === 'ok' && <span style={{ color: '#22c55e', fontSize: '13px' }}>✓</span>}
        {status === 'err' && <span style={{ color: '#ef4444', fontSize: '13px' }}>失败</span>}
        <span style={{ color: '#d1d5db', fontSize: '12px' }}>›</span>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 状态卡片 */}
      {health && (
        <div style={{
          background: health.status === 'healthy'
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', color: 'white',
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
            {health.status === 'healthy' ? '✅ 数据正常' : '⚠️ 数据可能过期'}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {health.freshness?.last_update ? `更新时间: ${health.freshness.last_update}` : '暂无数据'}
            {health.freshness?.hours_old ? ` · ${health.freshness.hours_old}h前` : ''}
            {health.freshness?.provinces_count ? ` · ${health.freshness.provinces_count}个省份` : ''}
          </div>
        </div>
      )}

      {/* 功能菜单 */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <MenuItem icon="🔄" label="手动更新油价" onClick={handleCrawl} status={crawlStatus} />
        <MenuItem icon="🔔" label="油价提醒" value="未设置" />
        <MenuItem icon="⭐" label="收藏油站" value="0个" />
        <MenuItem icon="📍" label="订阅油站" value="0个" />
        <MenuItem icon="⚙️" label="设置" />
      </div>

      {/* 广告位 */}
      <AdBanner slot="my_page_bottom" style={{ marginTop: '16px' }} />
    </div>
  )
}

// ========== 主应用 ==========
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
          const first = Object.keys(d.prices)[0]
          if (first) setSelectedRegion(first)
        }
      })
      .catch(console.error)
  }, [])

  const TABS = [
    { id: 'price', name: '油价', icon: '⛽' },
    { id: 'trend', name: '趋势', icon: '📈' },
    { id: 'fuel', name: '油耗', icon: '📊' },
    { id: 'my', name: '我的', icon: '👤' },
  ]

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 顶部导航 */}
      <div style={{
        background: 'white',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>⛽</span>
          <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#1f2937' }}>油价守护者</span>
        </div>
        {updateTime && (
          <span style={{ fontSize: '11px', color: '#9ca3af', background: '#f3f4f6', padding: '3px 8px', borderRadius: '10px' }}>
            {updateTime}
          </span>
        )}
      </div>

      {/* 页面内容 */}
      <div style={{ minHeight: 'calc(100vh - 120px)' }}>
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
      </div>

      {/* 底部 TabBar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: 'white',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        padding: '6px 0 calc(6px + env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 0',
              background: 'none', border: 'none',
              textAlign: 'center', cursor: 'pointer',
              color: tab === t.id ? '#2563eb' : '#9ca3af',
              transition: 'color 0.2s',
            }}
          >
            <div style={{ fontSize: '22px', marginBottom: '2px', lineHeight: 1 }}>{t.icon}</div>
            <div style={{ fontSize: '11px', fontWeight: tab === t.id ? '600' : '400' }}>{t.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
