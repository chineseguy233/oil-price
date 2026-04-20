import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import StationsPage from './pages/StationsPage'
import TripPage from './pages/TripPage'
import { autoLocate } from './utils/geolocation'
import { VehicleManager } from './components/VehicleComponents'
import { getSelectedVehicleId, getFuelRecords, addFuelRecord, deleteFuelRecord, updateFuelRecord, getVehicles, recalcVehicleConsumption } from './utils/vehicles'

// ========== 省份选择器（带搜索）============
function ProvinceSelector({ value, onChange, provinces }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef(null)

  // 过滤
  const filtered = search
    ? provinces.filter(p => p.includes(search))
    : provinces

  // 最近访问
  const recent = JSON.parse(localStorage.getItem('recent_provinces') || '[]')

  // 按拼音首字母分组
  const grouped = {}
  filtered.forEach(p => {
    const letter = p.charAt(0).toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(p)
  })
  const letters = Object.keys(grouped).sort()

  const flatFiltered = filtered

  // 键盘导航
  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'Enter' || e.key === ' ') setOpen(true); return }
    if (e.key === 'ArrowDown') { setHighlighted(h => Math.min(h + 1, flatFiltered.length - 1)); e.preventDefault() }
    else if (e.key === 'ArrowUp') { setHighlighted(h => Math.max(h - 1, 0)); e.preventDefault() }
    else if (e.key === 'Enter' && highlighted >= 0) {
      onChange(flatFiltered[highlighted])
      setOpen(false); setSearch(''); setHighlighted(-1)
    } else if (e.key === 'Escape') { setOpen(false); setSearch('') }
  }

  const select = (p) => {
    onChange(p)
    setOpen(false)
    setSearch('')
    setHighlighted(-1)
    // 记录最近
    const rec = JSON.parse(localStorage.getItem('recent_provinces') || '[]')
    const updated = [p, ...rec.filter(r => r !== p)].slice(0, 3)
    localStorage.setItem('recent_provinces', JSON.stringify(updated))
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 12px', borderRadius: '10px',
          border: open ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
          background: open ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', cursor: 'pointer', minHeight: '44px',
          color: 'var(--text-primary)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <span style={{ fontSize: '15px', flex: 1 }}>{value}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => { setOpen(false); setSearch('') }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--bg-secondary)', borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border-color)',
          }}>
            {/* 搜索框 */}
            <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', borderRadius: '8px', padding: '6px 10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>🔍</span>
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setHighlighted(-1) }}
                  onKeyDown={handleKeyDown}
                  placeholder="搜索省份..."
                  style={{ border: 'none', outline: 'none', fontSize: '14px', background: 'transparent', flex: 1, color: 'var(--text-primary)' }}
                />
                {search && <span onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>✕</span>}
              </div>
            </div>

            {/* 最近使用 */}
            {!search && recent.length > 0 && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '500' }}>最近</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {recent.map(r => (
                    <button
                      key={r}
                      onClick={() => select(r)}
                      style={{
                        padding: '4px 12px', borderRadius: '16px', border: '1px solid var(--border-color)',
                        background: value === r ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                        color: value === r ? '#fff' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
                      }}
                    >{r}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 热门 */}
            {!search && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '500' }}>热门</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['北京', '上海', '广东', '浙江', '江苏'].filter(r => provinces.includes(r) && !recent.includes(r)).map(r => (
                    <button
                      key={r}
                      onClick={() => select(r)}
                      style={{
                        padding: '4px 12px', borderRadius: '16px', border: '1px solid var(--border-color)',
                        background: value === r ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                        color: value === r ? '#fff' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
                      }}
                    >{r}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 省份列表（带字母分组） */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {letters.map(letter => (
                <div key={letter}>
                  <div style={{ padding: '4px 12px', background: 'var(--bg-tertiary)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', position: 'sticky', top: 0 }}>{letter}</div>
                  {grouped[letter].map((p, i) => {
                    const globalIdx = flatFiltered.indexOf(p)
                    return (
                      <div
                        key={p}
                        onClick={() => select(p)}
                        onMouseEnter={() => setHighlighted(globalIdx)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                          background: globalIdx === highlighted ? 'var(--accent-blue)' + '22' : 'transparent',
                          color: value === p ? 'var(--accent-blue)' : 'var(--text-primary)',
                          fontWeight: value === p ? '600' : '400',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        {p}
                      </div>
                    )
                  })}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>未找到 "{search}"</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

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

// 实用信息 Banner
function InfoBanner({ style }) {
  const tips = [
    { icon: '⏰', text: '数据每日更新，实际价格以加油站为准' },
    { icon: '📍', text: '点击加油站页面，查看附近油站实时油价' },
    { icon: '📊', text: '趋势页面可查看30天历史油价走势' },
  ]
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      margin: '12px 16px',
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      borderRadius: '12px',
      border: '1px solid #bbf7d0',
      ...style,
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{tip.icon}</span>
      <span style={{ fontSize: '13px', color: '#15803d', lineHeight: 1.4 }}>{tip.text}</span>
    </div>
  )
}

// 省油价列表项
function ProvinceRow({ region, price, oilType, index }) {
  return (
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
  )
}

// ========== 油价页面 ==========
function OilPricePage({ selectedOil, setSelectedOil, selectedRegion, setSelectedRegion, oilData, regions, updateTime, hoursOld }) {
  const [showAdBanner, setShowAdBanner] = useState(true)
  const [listSearch, setListSearch] = useState('')
  const [listSort, setListSort] = useState('default') // 'default' | 'price_asc' | 'price_desc'

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
  const isStale = hoursOld !== null && hoursOld >= 24

  // 列表排序过滤
  const sortedRegions = [...regions].sort((a, b) => {
    if (listSort === 'price_asc') {
      return (oilData[a]?.[selectedOil] ?? 999) - (oilData[b]?.[selectedOil] ?? 999)
    } else if (listSort === 'price_desc') {
      return (oilData[b]?.[selectedOil] ?? 999) - (oilData[a]?.[selectedOil] ?? 999)
    }
    return a.localeCompare(b, 'zh-CN')
  })

  const displayedRegions = listSearch
    ? sortedRegions.filter(r => r.includes(listSearch))
    : sortedRegions

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* 实用信息 Banner */}
      {showAdBanner && <InfoBanner />}

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
            <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>今日油价 · {selectedRegion}</span>
              {updateTime && <span style={{ fontSize: '12px' }}>({updateTime})</span>}
              {/* 数据新鲜度指示 */}
              {hoursOld !== null && (
                <span style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isStale ? '#fef2f2' : '#f0fdf4',
                  color: isStale ? '#ef4444' : '#10b981',
                  fontWeight: '600',
                }}>
                  {hoursOld < 1 ? '刚刚更新' : isStale ? `⚠️ ${hoursOld.toFixed(0)}h前` : `${hoursOld.toFixed(0)}h前`}
                </span>
              )}
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
          <ProvinceSelector
            value={selectedRegion}
            onChange={val => {
              setSelectedRegion(val)
              const recent = JSON.parse(localStorage.getItem('recent_provinces') || '[]')
              const updated = [val, ...recent.filter(r => r !== val)].slice(0, 3)
              localStorage.setItem('recent_provinces', JSON.stringify(updated))
            }}
            provinces={regions}
          />
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
              flexShrink: 0,
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
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <span>各省油价参考 <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '11px' }}>({displayedRegions.length}省)</span></span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* 搜索 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '2px 8px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>🔍</span>
              <input
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                placeholder="过滤..."
                style={{ border: 'none', outline: 'none', fontSize: '12px', width: '60px', background: 'transparent', color: '#374151' }}
              />
              {listSearch && <span onClick={() => setListSearch('')} style={{ color: '#9ca3af', cursor: 'pointer', fontSize: '10px' }}>✕</span>}
            </div>
            {/* 排序 */}
            {[
              { key: 'default', label: '默认' },
              { key: 'price_asc', label: '↑价低' },
              { key: 'price_desc', label: '↓价高' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setListSort(s.key)}
                style={{
                  padding: '2px 8px', borderRadius: '6px',
                  border: '1px solid',
                  borderColor: listSort === s.key ? oilColor : '#e5e7eb',
                  background: listSort === s.key ? `${oilColor}18` : '#fff',
                  color: listSort === s.key ? oilColor : '#9ca3af',
                  fontSize: '11px', cursor: 'pointer', fontWeight: '500',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>
        <div>
          {displayedRegions.map((region, i) => (
            <ProvinceRow
              key={region}
              region={region}
              price={oilData[region]?.[selectedOil]}
              oilType={selectedOil}
              index={i}
            />
          ))}
          {displayedRegions.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
              未找到包含 "{listSearch}" 的省份
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ========== 趋势页面（点击显示详情）============
function TrendPage({ selectedRegion, setSelectedRegion, regions }) {
  const [trendData, setTrendData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [selectedPoint, setSelectedPoint] = useState(null) // { date, values }
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const [echartsReady] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setSelectedPoint(null)
    // 切换省份时先清空旧数据，避免显示旧省份的图
    setTrendData(null)
    fetch(`${API_BASE}/price-changes?province=${encodeURIComponent(selectedRegion)}&days=${days}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setTrendData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedRegion, days])

  // 直接依赖 selectedRegion 和 days，避免通过 load 引用间接触发
  useEffect(() => { load() }, [selectedRegion, days])

  // 计算统计值
  const calcStats = (history, oilKey) => {
    const values = Object.values(history).map(h => h[oilKey]).filter(v => v != null)
    if (values.length === 0) return null
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const latest = values[values.length - 1]
    const change = values.length > 1 ? latest - values[0] : 0
    return { avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), latest: latest.toFixed(2), change: change.toFixed(2) }
  }

  // 初始化和更新图表
  useEffect(() => {
    if (!chartRef.current) return
    if (!echartsReady) return

    // chartRef 可能刚挂载，容器尺寸尚未确定，用 ResizeObserver 监听尺寸变化
    let ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0 && chartInstance.current) {
          chartInstance.current.resize()
        }
      }
    })
    ro.observe(chartRef.current)

    // rAF 延迟初始化，等待布局完成
    let rafId = requestAnimationFrame(() => {
      const history = trendData?.history || {}
      const dates = Object.keys(history).sort()
      const hasData = dates.length > 0

      if (!hasData || loading) {
        if (chartInstance.current) {
          chartInstance.current.dispose()
          chartInstance.current = null
        }
        ro.disconnect()
        return
      }

      const series = OIL_TYPES.map(oil => ({
        name: oil.label,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { color: oil.color },
        data: dates.map(date => history[date]?.[oil.key] ?? null),
        connectNulls: true,
      }))

      const startDate = dates[0] || ''
      const endDate = dates[dates.length - 1] || ''

      const option = {
        backgroundColor: 'transparent',
        title: {
          text: `${selectedRegion} 油价走势（${startDate} ~ ${endDate}）`,
          left: 'center',
          top: 5,
          textStyle: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
        },
        legend: {
          top: 35,
          left: 'center',
          itemWidth: 14,
          itemHeight: 8,
          textStyle: { fontSize: 11, color: '#6b7280' },
        },
        grid: { left: 50, right: 20, top: 70, bottom: 50 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          textStyle: { fontSize: 12, color: '#374151' },
          formatter: params => {
            let result = `<div style="font-weight:bold;margin-bottom:4px">${params[0]?.axisValue}</div>`
            params.forEach(p => {
              if (p.value !== null) {
                result += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span>${p.seriesName}: <b>${p.value}</b> 元/升</span>
              </div>`
              }
            })
            return result
          },
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { fontSize: 10, color: '#9ca3af', rotate: 30 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          scale: true,
          splitLine: { lineStyle: { color: '#f3f4f6' } },
          axisLabel: { fontSize: 10, color: '#9ca3af', formatter: v => v.toFixed(2) },
        },
        dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100,
          zoomLock: false,
        }, {
          start: 0,
          end: 100,
          handleIcon: 'path://M0,0 L0,10 L10,0 Z',
          handleSize: '80%',
          handleStyle: { color: '#3b82f6', borderColor: '#3b82f6' },
          bottom: 10,
          right: 30,
        }],
        series,
      }

      if (chartInstance.current) {
        chartInstance.current.setOption(option, true)
      } else {
        chartInstance.current = echarts.init(chartRef.current)
        chartInstance.current.setOption(option, true)
      }

      // 点击事件：记录选中的点
      chartInstance.current.off('click')
      chartInstance.current.on('click', (params) => {
        if (params.componentType === 'series') {
          const date = params.name
          const history = trendData?.history || {}
          setSelectedPoint({
            date,
            values: history[date] || {}
          })
        }
      })

      ro.disconnect()
    })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [trendData, loading, selectedRegion, days])

  // 响应式 resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 筛选控制 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, background: 'white', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>选择省份</div>
            <ProvinceSelector value={selectedRegion} onChange={setSelectedRegion} provinces={regions} />
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

      {/* 统计卡片 */}
      {trendData && trendData.history && Object.keys(trendData.history).length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {OIL_TYPES.filter(t => calcStats(trendData.history, t.key)).slice(0, 2).map(t => {
            const s = calcStats(trendData.history, t.key)
            return (
              <div key={t.key} style={{
                flex: 1, background: 'white', borderRadius: '12px', padding: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{t.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: t.color }}>{s.latest}</div>
                <div style={{ fontSize: '10px', color: parseFloat(s.change) >= 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                  {parseFloat(s.change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(s.change))}元
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>均值{s.avg}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* 趋势图表 */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {loading || !echartsReady ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
            {!echartsReady ? '加载图表组件...' : '加载中...'}
          </div>
        ) : trendData && Object.keys(trendData.history || {}).length > 0 ? (
          <>
            <div ref={chartRef} style={{ width: '100%', height: '300px' }} />
            {/* 点击数据点详情 */}
            {selectedPoint && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: '12px',
                fontSize: '13px',
              }}>
                <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                  📅 {selectedPoint.date} 油价详情
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {OIL_TYPES.map(t => {
                    const val = selectedPoint.values[t.key]
                    return val != null ? (
                      <div key={t.key} style={{
                        padding: '8px 12px',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <span style={{ color: t.color, fontWeight: '600' }}>{t.label}</span>
                        <span style={{ fontWeight: 'bold', color: '#1f2937' }}>¥{val}元/升</span>
                      </div>
                    ) : null
                  })}
                </div>
                {Object.keys(selectedPoint.values).length === 0 && (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '8px' }}>当日无数据</div>
                )}
              </div>
            )}
          </>
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
  const [records, setRecords] = useState(getFuelRecords)
  const [filterVehicleId, setFilterVehicleId] = useState('') // 筛选查看的车辆，为空=全部
  const [selectedVehicleId, setSelectedVehicleId] = useState(getSelectedVehicleId) // 新增记录绑定的车辆
  const [form, setForm] = useState({ date: '', distance: '', amount: '', price: '' })
  const [editingRecord, setEditingRecord] = useState(null) // 当前编辑的记录
  const [formErrors, setFormErrors] = useState({}) // 表单错误提示
  const fuelChartRef = useRef(null)
  const fuelChartInstance = useRef(null)

  // 当前绑定车辆的已有记录中最大里程（用于校验里程不能倒填）
  const maxDistanceForSelectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return 0
    const recs = records.filter(r => r.vehicleId === selectedVehicleId)
    if (recs.length === 0) return 0
    return Math.max(...recs.map(r => parseFloat(r.distance) || 0))
  }, [records, selectedVehicleId])

  // 计算油价（元/升）
  const computedPricePerL = useMemo(() => {
    const amt = parseFloat(form.amount)
    const prc = parseFloat(form.price)
    if (!amt || !prc || amt <= 0) return null
    return (prc / amt).toFixed(2)
  }, [form.amount, form.price])

  // 校验表单
  const validateForm = () => {
    const errs = {}
    const today = new Date().toISOString().split('T')[0]
    const amt = parseFloat(form.amount)
    const dist = parseFloat(form.distance)
    const prc = parseFloat(form.price)

    if (!selectedVehicleId) {
      errs.vehicle = '请先选择绑定车辆'
    }
    if (!form.date) {
      errs.date = '请选择日期'
    } else if (form.date > today) {
      errs.date = '日期不能超过今天'
    }
    if (!form.distance) {
      errs.distance = '请填写里程'
    } else if (dist < 0) {
      errs.distance = '里程不能为负'
    } else if (maxDistanceForSelectedVehicle > 0 && dist < maxDistanceForSelectedVehicle) {
      errs.distance = `里程不能小于该车上次记录的 ${maxDistanceForSelectedVehicle} km`
    }
    if (!form.amount) {
      errs.amount = '请填写油量'
    } else if (amt < 1) {
      errs.amount = '油量至少 1 升'
    } else if (amt > 200) {
      errs.amount = '油量过大，请核实'
    }
    if (!form.price) {
      errs.price = '请填写油费'
    } else if (computedPricePerL !== null) {
      const p = parseFloat(computedPricePerL)
      if (p < 3 || p > 15) {
        errs.price = `油价 ${p} 元/升 偏离正常范围（3~15元）`
      }
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // 清空表单时同步清空错误
  const clearForm = () => {
    setForm({ date: '', distance: '', amount: '', price: '' })
    setFormErrors({})
  }

  // 当前筛选条件下的记录（按日期升序排序）
  const filteredRecords = (filterVehicleId
    ? records.filter(r => r.vehicleId === filterVehicleId)
    : records).sort((a, b) => new Date(a.date) - new Date(b.date))

  // 计算统计数据
  const calcFuelStats = () => {
    const recs = filteredRecords
    if (recs.length === 0) return null
    let totalFuel = 0, totalCost = 0
    recs.forEach(r => {
      totalFuel += parseFloat(r.amount) || 0
      totalCost += parseFloat(r.price) || 0
    })
    // 里程是仪表盘累计读数，累计行驶 = 最后一条记录的里程
    const lastRecord = recs.length > 0 ? recs[recs.length - 1] : null
    const totalKm = lastRecord ? (parseFloat(lastRecord.distance) || 0) : 0
    const avgConsumption = totalKm > 0 ? (totalFuel / totalKm * 100).toFixed(1) : '--'
    const avgCostPerRecord = recs.length > 0 ? (totalCost / recs.length).toFixed(0) : '--'
    return { totalRecords: recs.length, totalKm, totalFuel: totalFuel.toFixed(1), totalCost: totalCost.toFixed(0), avgConsumption, avgCostPerRecord }
  }

  // 渲染油耗曲线
  useEffect(() => {
    if (!fuelChartRef.current || filteredRecords.length < 2) return
    if (fuelChartInstance.current) {
      fuelChartInstance.current.dispose()
      fuelChartInstance.current = null
    }
    const validRecords = filteredRecords
    const dates = validRecords.map(r => r.date)
    const consumptions = validRecords.map(r => parseFloat(r.consumption) || 0)

    const option = {
      backgroundColor: 'transparent',
      grid: { left: 45, right: 15, top: 30, bottom: 30 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        textStyle: { fontSize: 12 },
        formatter: p => `${p[0].name}<br/><b>${p[0].value}</b> L/100km`
      },
      xAxis: {
        type: 'category', data: dates,
        axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 30 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value', scale: true,
        axisLabel: { fontSize: 10, color: '#9ca3af', formatter: v => v.toFixed(1) },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [{
        name: '油耗',
        type: 'line', smooth: true,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59,130,246,0.1)' },
        data: consumptions,
        connectNulls: true,
      }],
    }
    fuelChartInstance.current = echarts.init(fuelChartRef.current)
    fuelChartInstance.current.setOption(option, true)
    return () => {}
  }, [filteredRecords])

  // 响应式
  useEffect(() => {
    const h = () => fuelChartInstance.current?.resize()
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const stats = calcFuelStats()

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 油耗记录选择器 - 页面顶部，筛选查看的车辆 */}
      <div style={{ marginBottom: '12px' }}>
        <select
          value={filterVehicleId}
          onChange={e => setFilterVehicleId(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px',
            borderRadius: '10px', border: '1px solid #e5e7eb',
            fontSize: '14px', color: '#374151', background: '#f9fafb',
            boxSizing: 'border-box', outline: 'none',
          }}
        >
          <option value="">油耗记录（全部车辆）</option>
          {getVehicles().map(v => (
            <option key={v.id} value={v.id}>{v.name}（{v.oilType}#）</option>
          ))}
        </select>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>百公里油耗</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.avgConsumption}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>L/100km</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>平均单次花费</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>¥{stats.avgCostPerRecord}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>元/次</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>累计行驶</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6b7280' }}>{stats.totalKm}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>公里</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>累计加油</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.totalFuel}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>升</div>
          </div>
        </div>
      )}

      {/* 油耗历史曲线 */}
      {filteredRecords.length >= 2 && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '12px' }}>📈 油耗曲线</div>
          <div ref={fuelChartRef} style={{ width: '100%', height: '200px' }} />
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>📝 添加加油记录</div>

        {/* 绑定车辆 */}
        <div style={{ marginBottom: '12px' }}>
          <select
            value={selectedVehicleId || ''}
            onChange={e => {
              const val = e.target.value
              if (!val) return
              setSelectedVehicleId(val)
            }}
            style={{
              width: '100%', padding: '10px 12px',
              borderRadius: '10px',
              border: `1px solid ${formErrors.vehicle ? '#ef4444' : '#e5e7eb'}`,
              fontSize: '14px', color: '#374151', background: '#f9fafb',
              boxSizing: 'border-box', outline: 'none',
            }}
          >
            <option value="" disabled>选择车辆（必选）</option>
            {getVehicles().map(v => (
              <option key={v.id} value={v.id}>{v.name}（{v.oilType}#）</option>
            ))}
          </select>
          {formErrors.vehicle && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.vehicle}</div>}
        </div>

        {/* 录入表单 */}
        <div style={{ marginBottom: '8px' }}>
          <input
            type="date"
            value={form.date}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setFormErrors(err => ({ ...err, date: '' })) }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${formErrors.date ? '#ef4444' : '#e5e7eb'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />
          {formErrors.date && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.date}</div>}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <input
            type="number"
            placeholder={`里程 (km)，该车最大记录 ${maxDistanceForSelectedVehicle > 0 ? maxDistanceForSelectedVehicle + ' km' : '无'}`}
            value={form.distance}
            onChange={e => { setForm(f => ({ ...f, distance: e.target.value })); setFormErrors(err => ({ ...err, distance: '' })) }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${formErrors.distance ? '#ef4444' : '#e5e7eb'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />
          {formErrors.distance && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.distance}</div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
          <div>
            <input
              type="number"
              placeholder="油量 (L)"
              value={form.amount}
              onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setFormErrors(err => ({ ...err, amount: '' })) }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${formErrors.amount ? '#ef4444' : '#e5e7eb'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
            {formErrors.amount && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.amount}</div>}
          </div>
          <div>
            <input
              type="number"
              placeholder="油费 (元)"
              value={form.price}
              onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFormErrors(err => ({ ...err, price: '' })) }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${formErrors.price ? '#ef4444' : '#e5e7eb'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
            {formErrors.price && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{formErrors.price}</div>}
          </div>
        </div>
        {computedPricePerL !== null && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', textAlign: 'center' }}>
            计算油价：<span style={{ color: '#2563eb', fontWeight: '600' }}>{computedPricePerL}</span> 元/升
          </div>
        )}
        <button
          type="button"
          style={{
            width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
            background: editingRecord
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
          }}
          onClick={(e) => {
            e.preventDefault()
            if (!validateForm()) return
            if (editingRecord) {
              // 修改模式：使用当前记录与上一次的里程差来计算油耗
              const vehicleRecords = getFuelRecords().filter(r => r.vehicleId === selectedVehicleId)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
              const editIdx = vehicleRecords.findIndex(r => r.id === editingRecord.id)
              const prevRecord = editIdx > 0 ? vehicleRecords[editIdx - 1] : null
              const prevDist = prevRecord ? parseFloat(prevRecord.distance) : 0
              const currDist = parseFloat(form.distance)
              const deltaKm = currDist - prevDist
              const consumption = deltaKm > 0 ? ((parseFloat(form.amount) / deltaKm) * 100).toFixed(2) : ''
              updateFuelRecord(editingRecord.id, {
                vehicleId: selectedVehicleId,
                date: form.date,
                distance: form.distance,
                amount: form.amount,
                price: form.price,
                consumption,
              })
              recalcVehicleConsumption(selectedVehicleId)
              setRecords(getFuelRecords())
              setEditingRecord(null)
              clearForm()
            } else {
              // 新增模式：根据上一次的里程计算油耗
              const vehicleRecords = getFuelRecords().filter(r => r.vehicleId === selectedVehicleId)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
              const prevRecord = vehicleRecords.length > 0 ? vehicleRecords[vehicleRecords.length - 1] : null
              const prevDist = prevRecord ? parseFloat(prevRecord.distance) : 0
              const currDist = parseFloat(form.distance)
              const deltaKm = currDist - prevDist
              const consumption = deltaKm > 0 ? ((parseFloat(form.amount) / deltaKm) * 100).toFixed(2) : ''
              addFuelRecord({
                vehicleId: selectedVehicleId,
                date: form.date,
                distance: form.distance,
                amount: form.amount,
                price: form.price,
                consumption,
              })
              recalcVehicleConsumption(selectedVehicleId)
              setRecords(getFuelRecords())
              clearForm()
            }
          }}>
          {editingRecord ? '✏️ 保存修改' : '+ 添加记录'}
        </button>
        {editingRecord && (
          <button
            type="button"
            onClick={() => { setEditingRecord(null); clearForm() }}
            style={{
              width: '100%', marginTop: '8px', padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb',
              background: 'white', color: '#6b7280', fontSize: '14px', cursor: 'pointer',
            }}
          >
            取消编辑
          </button>
        )}
      </div>

      {/* 记录列表 */}
      {filteredRecords.length > 0 ? (
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>
            共 {filteredRecords.length} 条记录
          </div>
          {filteredRecords.map((r, i) => {
            const vehicle = getVehicles().find(v => v.id === r.vehicleId)
            return (
            <div key={r.id} style={{
              padding: '14px 16px', borderBottom: i < filteredRecords.length - 1 ? '1px solid #f3f4f6' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{r.date}</div>
                  {vehicle && (
                    <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '8px' }}>
                      {vehicle.name}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{r.distance}km · {r.amount}L · ¥{r.price}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{r.consumption}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>L/100km</div>
                </div>
                <button
                  onClick={() => {
                    setEditingRecord(r)
                    setForm({ date: r.date, distance: String(r.distance), amount: String(r.amount), price: String(r.price) })
                    setSelectedVehicleId(r.vehicleId || '')
                    setFormErrors({})
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                >✏️</button>
                <button
                  onClick={() => { deleteFuelRecord(r.id); setRecords(getFuelRecords()) }}
                  style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#d1d5db', padding: '4px' }}
                >🗑️</button>
              </div>
            </div>
          )})}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#d1d5db', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontSize: '14px' }}>
          暂无记录，添加您的第一条油耗数据
        </div>
      )}
    </div>
  )
}

// ========== 相邻省份映射（用于提醒监控范围）============
const NEIGHBOR_MAP = {
  '北京': ['河北', '天津'],
  '天津': ['北京', '河北'],
  '河北': ['北京', '天津', '山东', '河南', '山西', '内蒙古', '辽宁'],
  '山西': ['河北', '河南', '陕西'],
  '内蒙古': ['河北', '山西', '陕西', '宁夏', '甘肃', '黑龙江', '吉林', '辽宁'],
  '辽宁': ['内蒙古', '吉林', '河北'],
  '吉林': ['内蒙古', '辽宁', '黑龙江'],
  '黑龙江': ['内蒙古', '吉林'],
  '上海': ['江苏', '浙江'],
  '江苏': ['上海', '浙江', '安徽', '山东'],
  '浙江': ['上海', '江苏', '安徽', '福建', '江西'],
  '安徽': ['江苏', '浙江', '江西', '湖北', '河南', '山东'],
  '福建': ['浙江', '江西', '广东'],
  '江西': ['浙江', '安徽', '福建', '广东', '湖南', '湖北'],
  '山东': ['河北', '江苏', '安徽', '河南', '山西'],
  '河南': ['河北', '山东', '安徽', '湖北', '陕西', '山西'],
  '湖北': ['安徽', '江西', '湖南', '重庆', '陕西', '河南'],
  '湖南': ['江西', '湖北', '广东', '广西', '贵州'],
  '广东': ['福建', '江西', '湖南', '广西', '海南'],
  '广西': ['广东', '湖南', '贵州', '云南'],
  '海南': ['广东'],
  '重庆': ['湖北', '四川', '贵州', '陕西'],
  '四川': ['重庆', '云南', '贵州', '陕西', '甘肃', '青海', '西藏'],
  '贵州': ['重庆', '四川', '云南', '广西', '湖南', '江西'],
  '云南': ['四川', '贵州', '广西'],
  '西藏': ['四川', '青海'],
  '陕西': ['山西', '河南', '湖北', '重庆', '四川', '甘肃', '宁夏', '内蒙古'],
  '甘肃': ['陕西', '四川', '青海', '宁夏', '内蒙古', '新疆'],
  '青海': ['四川', '西藏', '甘肃', '新疆'],
  '宁夏': ['内蒙古', '甘肃', '陕西'],
  '新疆': ['甘肃', '青海'],
}

// 获取监控省份列表（主省 + 最多2个邻居）
function getMonitorProvinces(mainProvince) {
  const neighbors = NEIGHBOR_MAP[mainProvince] || []
  return [mainProvince, ...neighbors.slice(0, 2)]
}

// ========== 我的页面 ==========
function MyPage({ selectedRegion }) {
  const [health, setHealth] = useState(null)
  const [showRemindModal, setShowRemindModal] = useState(false)
  const [regions, setRegions] = useState(['北京', '上海', '广东', '江苏', '浙江'])
  const [historyData, setHistoryData] = useState(null) // 历史油价数据
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 登录状态
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('oil_token')
    const phone = localStorage.getItem('oil_user_phone')
    return token && phone ? { token, phone } : null
  })
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginForm, setLoginForm] = useState({ phone: '', code: '', password: '' })
  const [loginBtnText, setLoginBtnText] = useState('获取验证码')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [countdown, setCountdown] = useState(0)

  // 提醒配置（自动判断阈值，无需用户设定）
  const [remindConfig, setRemindConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('oil_remind_config') || 'null') } catch { return null }
  })
  const [configForm, setConfigForm] = useState({ province: '北京', oilType: '92' })

  // 发送验证码
  const sendCode = useCallback(() => {
    const phone = loginForm.phone
    if (!/^1\d{10}$/.test(phone)) {
      setLoginError('请输入正确的手机号')
      return
    }
    setLoginLoading(true)
    setLoginError('')
    fetch(`${API_BASE}/auth/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    }).then(r => r.json()).then(data => {
      if (data.success) {
        setCountdown(60)
        setLoginBtnText('60s后重试')
        const t = setInterval(() => {
          setCountdown(c => {
            if (c <= 1) { clearInterval(t); setLoginBtnText('获取验证码'); return 0 }
            setLoginBtnText(`${c - 1}s后重试`)
            return c - 1
          })
        }, 1000)
      } else {
        setLoginError(data.error || '发送失败')
      }
    }).catch(() => setLoginError('网络错误')).finally(() => setLoginLoading(false))
  }, [loginForm.phone])

  // 登录
  const handleLogin = useCallback(() => {
    const { phone, code } = loginForm
    if (!phone || !/^1\d{10}$/.test(phone)) { setLoginError('请输入手机号'); return }
    if (!code || code.length !== 6) { setLoginError('请输入6位验证码'); return }
    setLoginLoading(true)
    setLoginError('')
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, password: loginForm.password }),
    }).then(r => r.json()).then(data => {
      if (data.success) {
        localStorage.setItem('oil_token', data.token)
        localStorage.setItem('oil_user_phone', data.user.phone)
        setUser({ token: data.token, phone: data.user.phone })
        setShowLoginModal(false)
        setLoginForm({ phone: '', code: '', password: '' })
        setLoginError('')
      } else {
        setLoginError(data.error || '登录失败')
      }
    }).catch(() => setLoginError('网络错误')).finally(() => setLoginLoading(false))
  }, [loginForm])

  // 登出
  const handleLogout = useCallback(() => {
    const token = localStorage.getItem('oil_token')
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem('oil_token')
    localStorage.removeItem('oil_user_phone')
    setUser(null)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/health`).then(r => r.json()).then(setHealth).catch(() => {})
    fetch(`${API_BASE}/oil-prices`).then(r => r.json()).then(d => {
      if (d.prices) setRegions(Object.keys(d.prices))
    }).catch(() => {})
  }, [])

  // 加载历史数据用于计算30天最低/最高价
  const loadHistory = useCallback(() => {
    setLoadingHistory(true)
    fetch(`${API_BASE}/price-changes?province=${encodeURIComponent(configForm.province)}&days=30`)
      .then(r => r.json())
      .then(d => { if (d.history) setHistoryData(d.history) })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [configForm.province])

  useEffect(() => {
    if (showRemindModal) loadHistory()
  }, [showRemindModal, loadHistory])

  const openRemindModal = () => {
    if (!remindConfig) {
      setConfigForm({ province: selectedRegion || '北京', oilType: '92' })
    } else {
      setConfigForm({ province: remindConfig.province, oilType: remindConfig.oilType })
    }
    setShowRemindModal(true)
  }

  const saveRemindConfig = () => {
    const cfg = { ...configForm, enabled: true }
    setRemindConfig(cfg)
    localStorage.setItem('oil_remind_config', JSON.stringify(cfg))
    // 同步到服务器（无需登录）
    fetch(`${API_BASE}/sync/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token || ''}` },
      body: JSON.stringify(cfg),
    }).catch(() => {})
    setShowRemindModal(false)
  }

  const clearRemindConfig = () => {
    setRemindConfig(null)
    localStorage.removeItem('oil_remind_config')
    fetch(`${API_BASE}/sync/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token || ''}` },
      body: JSON.stringify({ enabled: false }),
    }).catch(() => {})
  }

  // 计算当前油号的30天最低/最高价
  // historyData is { date: { "92": x, "95": y, ... } }
  const priceStats = useMemo(() => {
    if (!historyData || !configForm.oilType) return null
    const oilKey = configForm.oilType
    const entries = Object.entries(historyData).sort((a, b) => a[0].localeCompare(b[0]))
    const prices = entries.map(([, vals]) => vals[oilKey]).filter(p => p != null)
    if (prices.length === 0) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const current = prices[prices.length - 1] // most recent date
    return { min, max, current, count: prices.length }
  }, [historyData, configForm.oilType])

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

      {/* 车辆管理 */}
      <VehicleManager />

      {/* 用户信息 / 登录入口 */}
      {user ? (
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', fontWeight: 'bold' }}>
              {user.phone.slice(-4)}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>{user.phone.slice(0, 3)}****{user.phone.slice(-4)}</div>
              <div style={{ fontSize: '12px', color: '#10b981' }}>已登录</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ padding: '6px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            退出
          </button>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '16px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} onClick={() => setShowLoginModal(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>登录 / 注册</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>登录后同步数据</div>
            </div>
          </div>
          <span style={{ color: '#d1d5db', fontSize: '18px' }}>›</span>
        </div>
      )}

      {/* 功能菜单 */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <MenuItem icon="🔔" label="油价提醒" value={remindConfig ? `${remindConfig.province} ${OIL_TYPES.find(t => t.key === remindConfig.oilType)?.label}` : '未设置'} onClick={openRemindModal} />
      </div>

      {/* 登录弹窗 */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1001,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowLoginModal(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '90%', maxWidth: '360px',
            maxHeight: '80vh', overflow: 'auto', padding: '24px'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
              登录油价守护者
            </div>

            {loginError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>
                {loginError}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>手机号</label>
              <input
                type="tel"
                maxLength={11}
                value={loginForm.phone}
                onChange={e => setLoginForm({...loginForm, phone: e.target.value.replace(/\D/g, '')})}
                placeholder="请输入手机号"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>验证码</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={loginForm.code}
                  onChange={e => setLoginForm({...loginForm, code: e.target.value.replace(/\D/g, '')})}
                  placeholder="6位验证码"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}
                />
                <button
                  onClick={sendCode}
                  disabled={countdown > 0 || loginLoading}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', border: 'none',
                    background: countdown > 0 ? '#e5e7eb' : '#10b981', color: 'white',
                    fontSize: '13px', cursor: countdown > 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                  }}>
                  {loginBtnText}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginBottom: '16px' }}>
              登录即表示同意<span style={{ color: '#10b981' }}>《用户协议》</span>
            </div>

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              style={{ width: '100%', padding: '12px', background: loginLoading ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: loginLoading ? 'not-allowed' : 'pointer' }}>
              {loginLoading ? '登录中...' : '登录 / 注册'}
            </button>

            <button onClick={() => { setShowLoginModal(false); setLoginError('') }}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 油价提醒弹窗（系统自动判断阈值） */}
      {showRemindModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowRemindModal(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '90%', maxWidth: '360px',
            maxHeight: '80vh', overflow: 'auto', padding: '20px'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
              油价提醒
            </div>

            {/* 说明 */}
            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
              系统自动监控油价，降价到30天最低价时推送「降价提醒」，涨到30天最高价时推送「涨价提醒」
            </div>

            {/* 省份 + 油号选择 */}
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>监控省份</label>
                <select value={configForm.province} onChange={e => setConfigForm({...configForm, province: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>油号</label>
                <select value={configForm.oilType} onChange={e => setConfigForm({...configForm, oilType: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}>
                  {OIL_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* 监控范围预览 */}
            {configForm.province && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>监控范围（共3个省份）</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {getMonitorProvinces(configForm.province).map(p => (
                    <span key={p} style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                      background: p === configForm.province ? '#dbeafe' : '#f3f4f6',
                      color: p === configForm.province ? '#1e40af' : '#374151',
                      fontWeight: p === configForm.province ? '600' : '400',
                    }}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 30天价格区间 */}
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontSize: '13px' }}>加载历史数据中...</div>
            ) : priceStats ? (
              <div style={{ background: '#fafafa', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>近30天价格区间（{priceStats.count}天数据）</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, textAlign: 'center', background: '#f0fdf4', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>最低价</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d' }}>{priceStats.min}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', background: '#fef2f2', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>当前价</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{priceStats.current}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', background: '#fff7ed', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>最高价</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c2410c' }}>{priceStats.max}</div>
                  </div>
                </div>
                {/* 提示当前处于什么区间 */}
                {priceStats.current === priceStats.min && (
                  <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#15803d', fontWeight: '600' }}>📉 当前处于30天最低价，适合加油！</div>
                )}
                {priceStats.current === priceStats.max && (
                  <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>📈 当前处于30天最高价，谨慎加油</div>
                )}
                {priceStats.current !== priceStats.min && priceStats.current !== priceStats.max && (
                  <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>处于正常区间，关注即可</div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>暂无30天历史数据</div>
            )}

            {/* 按钮 */}
            {remindConfig ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={clearRemindConfig}
                  style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  取消提醒
                </button>
                <button onClick={saveRemindConfig}
                  style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  保存修改
                </button>
              </div>
            ) : (
              <button onClick={saveRemindConfig} disabled={!priceStats}
                style={{ width: '100%', padding: '10px', background: priceStats ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: priceStats ? 'pointer' : 'not-allowed' }}>
                开启油价提醒
              </button>
            )}

            <button onClick={() => setShowRemindModal(false)}
              style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== 主应用 ==========
export default function App({ onGotoTrip, onGotoRankings }) {
  const [tab, setTab] = useState('price')
  const [selectedOil, setSelectedOil] = useState('92')
  const [selectedRegion, setSelectedRegion] = useState('北京')
  const [oilData, setOilData] = useState(null)
  const [updateTime, setUpdateTime] = useState('')
  const [regions, setRegions] = useState(['北京', '上海', '广东', '江苏', '浙江'])
  const [hoursOld, setHoursOld] = useState(null) // 数据新鲜度
  // 定位状态：{ source, accuracy, message }
  const [locInfo, setLocInfo] = useState(null)
  const [showLocDetail, setShowLocDetail] = useState(false)
  const [locToast, setLocToast] = useState(null) // 定位省份联动提示
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')

  // 启动时同步dark mode
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    document.documentElement.classList.toggle('dark', saved)
  }, [])

  // 加载油价数据
  useEffect(() => {
    fetch(`${API_BASE}/oil-prices`)
      .then(r => r.json())
      .then(d => {
        if (d.prices) {
          setOilData(d.prices)
          setRegions(Object.keys(d.prices))
          setUpdateTime(d.update_time || '')
          // 计算数据新鲜度
          if (d.fetched_at) {
            const fetched = new Date(d.fetched_at)
            const now = new Date()
            setHoursOld(((now - fetched) / 3600000))
          }
          const first = Object.keys(d.prices)[0]
          if (first) setSelectedRegion(first)
        }
      })
      .catch(console.error)
  }, [])

  // 启动时自动定位
  useEffect(() => {
    if (!oilData) return

    // 先看有没有记住的省份
    const savedProvince = localStorage.getItem('auto_province')
    if (savedProvince && oilData[savedProvince]) {
      setSelectedRegion(savedProvince)
      return
    }

    if (!navigator.geolocation) {
      setLocInfo({ source: 'none', accuracy: 'none', message: '浏览器不支持定位' })
      return
    }

    autoLocate()
      .then(loc => {
        setLocInfo({
          source: loc.source,
          accuracy: loc.accuracy,
          message: loc.message,
        })
        // 匹配省份
        const matched = Object.keys(oilData).find(p =>
          p.includes(loc.province.replace(/[省市]$/, '')) ||
          loc.province.includes(p)
        )
        if (matched) {
          setSelectedRegion(matched)
          localStorage.setItem('auto_province', matched)
          setLocToast(`📍 已定位到 ${matched}，油价已切换`)
          setTimeout(() => setLocToast(null), 3000)
        }
      })
      .catch((e) => {
        setLocInfo({ source: 'error', accuracy: 'none', message: e.message || '定位失败' })
      })
  }, [oilData])

  // 省份切换时自动记住
  const handleRegionChange = (region) => {
    setSelectedRegion(region)
    localStorage.setItem('auto_province', region)
    // 记录最近访问
    const recent = JSON.parse(localStorage.getItem('recent_provinces') || '[]')
    const updated = [region, ...recent.filter(r => r !== region)].slice(0, 3)
    localStorage.setItem('recent_provinces', JSON.stringify(updated))
  }

  const TABS = [
    { id: 'price', name: '油价', icon: '⛽' },
    { id: 'trend', name: '趋势', icon: '📈' },
    { id: 'fuel', name: '油耗', icon: '📊' },
    { id: 'stations', name: '附近', icon: '🔍' },
    { id: 'my', name: '我的', icon: '👤' },
  ]

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-primary)', transition: 'background 0.2s, color 0.2s' }} className={darkMode ? 'dark' : ''}>
      {/* 顶部导航 */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid var(--border-color)',
        transition: 'background 0.2s, box-shadow 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>⛽</span>
          <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#1f2937' }}>油价守护者</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onGotoTrip}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '12px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}
          >
            🚗 自驾
          </button>
          <button
            onClick={onGotoRankings}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              border: 'none',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '12px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
            }}
          >
            🏆 红蓝榜
          </button>
          {updateTime && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: '10px' }}>
              {updateTime}
            </span>
          )}
          <button
            onClick={() => {
              setDarkMode(d => {
                const next = !d
                localStorage.setItem('darkMode', String(next))
                document.documentElement.classList.toggle('dark', next)
                return next
              })
            }}
            style={{
              background: darkMode ? '#374151' : '#f3f4f6',
              border: 'none',
              borderRadius: '20px',
              padding: '5px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title={darkMode ? '切换日间模式' : '切换夜间模式'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        {/* 定位状态标签 - 改进版 */}
        {locInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* 刷新定位按钮 */}
            <button onClick={() => {
              if (navigator.geolocation) {
                setLocInfo({ source: 'loading', accuracy: 'none', message: '定位中...' })
                autoLocate().then(loc => {
                  setLocInfo({ source: loc.source, accuracy: loc.accuracy, message: loc.message })
                  const matched = Object.keys(oilData || {}).find(p =>
                    p.includes(loc.province.replace(/[省市]$/, '')) || loc.province.includes(p)
                  )
                  if (matched) { setSelectedRegion(matched); localStorage.setItem('auto_province', matched) }
                }).catch(e => setLocInfo({ source: 'error', accuracy: 'none', message: e.message || '定位失败' }))
              }
            }} title="刷新定位" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px 4px', borderRadius: '4px', color: '#6b7280' }}>🔄</button>
            <span
              onClick={() => locInfo.source === 'error' || locInfo.source === 'none' || locInfo.accuracy === 'low' ? setShowLocDetail(true) : null}
              style={{
                fontSize: '11px',
                color: locInfo.source === 'gps' ? '#10b981' : locInfo.source === 'ip' ? '#f59e0b' : locInfo.source === 'error' || locInfo.source === 'none' ? '#ef4444' : locInfo.source === 'loading' ? '#6b7280' : '#2563eb',
                background: locInfo.source === 'gps' ? '#f0fdf4' : locInfo.source === 'ip' ? '#fffbeb' : locInfo.source === 'error' || locInfo.source === 'none' ? '#fef2f2' : locInfo.source === 'loading' ? '#f9fafb' : '#eff6ff',
                padding: '3px 8px',
                borderRadius: '10px',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: locInfo.source === 'error' || locInfo.source === 'none' || locInfo.accuracy === 'low' ? 'pointer' : 'default',
              }}
              title={locInfo.source === 'gps' ? 'GPS定位：精度最高，适用于户外' : locInfo.source === 'ip' ? '网络定位：精度较低，城市级别' : locInfo.source === 'error' ? '定位失败：点击查看原因' : locInfo.source === 'none' ? '浏览器不支持定位' : '点击了解定位方式'}
            >
              {locInfo.source === 'gps' ? '🛰 GPS' : locInfo.source === 'ip' ? '🌐 网络定位' : locInfo.source === 'error' || locInfo.source === 'none' ? '⚠️ 定位' : locInfo.source === 'loading' ? '⏳ 定位中' : '📍'}
              {locInfo.accuracy === 'low' ? ' ⚠️' : ''}
            </span>
          </div>
        )}
        {/* 定位说明弹窗 */}
        {showLocDetail && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowLocDetail(false)}>
            <div style={{ background: 'white', borderRadius: '16px', width: '85%', maxWidth: '320px', padding: '24px' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>定位方式说明</div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>🛰 GPS 定位</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>使用手机GPS模块，精度最高（10米内），适合户外使用。首次定位可能需要几秒到几十秒。</div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>🌐 网络定位</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>通过IP地址或WiFi确定位置，精度较低（城市级别），但定位速度快，室内可用。</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>⚠️ 定位失败</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{locInfo?.message || '无法获取位置信息'}。可尝试：开启定位权限、使用VPN、切换网络或手动选择省份。</div>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginBottom: '12px' }}>点击"🔄"按钮可重新定位</div>
              <button onClick={() => setShowLocDetail(false)} style={{ width: '100%', padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>知道了</button>
            </div>
          </div>
        )}
      </div>

      {/* 页面内容 */}
      <div style={{ minHeight: 'calc(100vh - 120px)' }}>
        {tab === 'price' && (
          <OilPricePage
            selectedOil={selectedOil} setSelectedOil={setSelectedOil}
            selectedRegion={selectedRegion} setSelectedRegion={handleRegionChange}
            oilData={oilData} regions={regions} updateTime={updateTime}
            hoursOld={hoursOld}
          />
        )}
        {tab === 'trend' && (
          <TrendPage selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} regions={regions} />
        )}
        {tab === 'fuel' && <FuelPage />}
        {tab === 'stations' && (
          <StationsPage
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            regions={regions}
          />
        )}
        {tab === 'my' && <MyPage selectedRegion={selectedRegion} />}
      </div>

      {/* 定位省份联动 Toast */}
      {locToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '25px',
          fontSize: '13px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          animation: 'fadeIn 0.3s ease',
        }}>
          {locToast}
        </div>
      )}

      {/* 底部 TabBar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        padding: '6px 0 calc(6px + env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
        transition: 'background 0.2s',
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
