import { useState, useEffect, useCallback, useRef } from 'react'
import * as echarts from 'echarts'
import StationsPage from './pages/StationsPage'
import { autoLocate } from './utils/geolocation'

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
          <select
            value={selectedRegion}
            onChange={e => {
              setSelectedRegion(e.target.value)
              // 记录最近访问
              const recent = JSON.parse(localStorage.getItem('recent_provinces') || '[]')
              const updated = [e.target.value, ...recent.filter(r => r !== e.target.value)].slice(0, 3)
              localStorage.setItem('recent_provinces', JSON.stringify(updated))
            }}
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
    fetch(`${API_BASE}/price-changes?province=${encodeURIComponent(selectedRegion)}&days=${days}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setTrendData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedRegion, days])

  useEffect(() => { load() }, [load])

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

    const history = trendData?.history || {}
    const dates = Object.keys(history).sort()
    const hasData = dates.length > 0

    if (!hasData || loading) {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
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

    return () => {}
  }, [trendData, loading, selectedRegion])

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
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ date: '', distance: '', amount: '', price: '' })
  const fuelChartRef = useRef(null)
  const fuelChartInstance = useRef(null)

  // 计算统计数据
  const calcFuelStats = () => {
    if (records.length === 0) return null
    let totalFuel = 0, totalKm = 0, totalCost = 0
    records.forEach(r => {
      totalFuel += parseFloat(r.amount) || 0
      totalKm += parseFloat(r.distance) || 0
      totalCost += parseFloat(r.price) || 0
    })
    const avgConsumption = totalKm > 0 ? (totalFuel / totalKm * 100).toFixed(1) : '--'
    const avgCostPerRecord = records.length > 0 ? (totalCost / records.length).toFixed(0) : '--'
    return { totalRecords: records.length, totalKm, totalFuel: totalFuel.toFixed(1), totalCost: totalCost.toFixed(0), avgConsumption, avgCostPerRecord }
  }

  // 渲染油耗曲线
  useEffect(() => {
    if (!fuelChartRef.current || records.length < 2) return
    if (fuelChartInstance.current) {
      fuelChartInstance.current.dispose()
      fuelChartInstance.current = null
    }
    const validRecords = records.slice().reverse()
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
  }, [records])

  // 响应式
  useEffect(() => {
    const h = () => fuelChartInstance.current?.resize()
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const stats = calcFuelStats()

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
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
      {records.length >= 2 && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '12px' }}>📈 油耗曲线</div>
          <div ref={fuelChartRef} style={{ width: '100%', height: '200px' }} />
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>📊 加油记录</div>
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
          }}>
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
  const [showRemindModal, setShowRemindModal] = useState(false)
  const [reminders, setReminders] = useState([])
  const [remindForm, setRemindForm] = useState({ province: '北京', oilType: '92', threshold: '0.1' })
  const [regions, setRegions] = useState(['北京', '上海', '广东', '江苏', '浙江'])

  useEffect(() => {
    fetch(`${API_BASE}/health`).then(r => r.json()).then(setHealth).catch(() => {})
    fetch(`${API_BASE}/oil-prices`).then(r => r.json()).then(d => {
      if (d.prices) setRegions(Object.keys(d.prices))
    }).catch(() => {})
  }, [])

  const loadReminders = () => {
    fetch(`${API_BASE}/remind`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setReminders(d.reminders || []) })
      .catch(() => {})
  }

  const openRemindModal = () => {
    loadReminders()
    setShowRemindModal(true)
  }

  const addReminder = () => {
    const token = localStorage.getItem('token')
    if (!token) return alert('请先登录')
    fetch(`${API_BASE}/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(remindForm)
    }).then(r => r.json()).then(d => {
      if (d.success) {
        setReminders([...reminders, d.remind])
        setRemindForm({ province: '北京', oilType: '92', threshold: '0.1' })
      } else {
        alert(d.message || '设置失败')
      }
    }).catch(() => alert('设置失败'))
  }

  const deleteReminder = (id) => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API_BASE}/remind/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      if (d.success) setReminders(reminders.filter(r => r.id !== id))
    }).catch(() => {})
  }

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
        <MenuItem icon="🔔" label="油价提醒" value={reminders.length > 0 ? `${reminders.length}个` : '未设置'} onClick={openRemindModal} />
        <MenuItem icon="⭐" label="收藏油站" value="0个" />
        <MenuItem icon="📍" label="订阅油站" value="0个" />
        <MenuItem icon="⚙️" label="设置" />
      </div>

      {/* 广告位 */}
      <AdBanner slot="my_page_bottom" style={{ marginTop: '16px' }} />

      {/* 油价提醒弹窗 */}
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
              油价提醒设置
            </div>

            {/* 添加提醒表单 */}
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>省份</label>
                <select value={remindForm.province} onChange={e => setRemindForm({...remindForm, province: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>油号</label>
                <select value={remindForm.oilType} onChange={e => setRemindForm({...remindForm, oilType: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }}>
                  {OIL_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>涨价阈值（元/升）</label>
                <input type="number" step="0.05" min="0.05" value={remindForm.threshold}
                  onChange={e => setRemindForm({...remindForm, threshold: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
              </div>
              <button onClick={addReminder}
                style={{ width: '100%', padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                添加提醒
              </button>
            </div>

            {/* 已有提醒列表 */}
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>已设置的提醒（{reminders.length}个）</div>
              {reminders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>暂无提醒设置</div>
              )}
              {reminders.map(r => (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: '8px', marginBottom: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#374151' }}>{r.province} {OIL_TYPES.find(t => t.key === r.oilType)?.label}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>涨幅超 {r.threshold}元/升</div>
                  </div>
                  <button onClick={() => deleteReminder(r.id)}
                    style={{ padding: '4px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    删除
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setShowRemindModal(false)}
              style={{ width: '100%', marginTop: '12px', padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              关闭
            </button>
          </div>
        </div>
      )}
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
  const [hoursOld, setHoursOld] = useState(null) // 数据新鲜度
  // 定位状态：{ source, accuracy, message }
  const [locInfo, setLocInfo] = useState(null)
  const [showLocDetail, setShowLocDetail] = useState(false)

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
