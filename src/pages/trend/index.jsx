import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Echarts from 'echarts-for-react'

const API_BASE = '/api'

// 油号配置
const OIL_TYPES = [
  { key: '92', label: '92#汽油', color: '#3b82f6' },
  { key: '95', label: '95#汽油', color: '#8b5cf6' },
  { key: '98', label: '98#汽油', color: '#f59e0b' },
  { key: '0', label: '0#柴油', color: '#10b981' },
]

// ProvinceSelector: inline component since original is in App.jsx
function ProvinceSelector({ value, onChange, provinces }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef(null)

  const filtered = search ? provinces.filter(p => p.includes(search)) : provinces

  // 最近访问 - Taro storage
  const recent = JSON.parse(Taro.getStorageSync('recent_provinces') || '[]')

  const grouped = {}
  filtered.forEach(p => {
    const letter = p.charAt(0).toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(p)
  })
  const letters = Object.keys(grouped).sort()
  const flatFiltered = filtered

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
    // 保存最近访问 - Taro storage
    const updated = [p, ...recent.filter(r => r !== p)].slice(0, 5)
    Taro.setStorageSync('recent_provinces', JSON.stringify(updated))
  }

  return (
    <View style={{ position: 'relative' }}>
      <View
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 12px', borderRadius: '10px',
          border: open ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          background: '#f3f4f6', cursor: 'pointer', minHeight: '44px',
        }}
      >
        <Text style={{ fontSize: '15px', flex: 1 }}>{value}</Text>
        <Text style={{ color: '#9ca3af', fontSize: '12px' }}>{open ? '▲' : '▼'}</Text>
      </View>

      {open && (
        <>
          <View onClick={() => { setOpen(false); setSearch('') }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
          <View style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#ffffff', borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            zIndex: 1000, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            border: '1px solid #e5e7eb',
          }}>
            <View style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <View style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', borderRadius: '8px', padding: '6px 10px' }}>
                <Text style={{ color: '#9ca3af', fontSize: '14px' }}>🔍</Text>
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="搜索省份..."
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
                />
              </View>
            </View>

            <View style={{ overflow: 'scroll', flex: 1 }}>
              {recent.length > 0 && !search && (
                <View style={{ padding: '8px 12px' }}>
                  <Text style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>最近访问</Text>
                  <View style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {recent.map(r => (
                      <View
                        key={r}
                        onClick={() => select(r)}
                        style={{ padding: '4px 10px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', color: '#3b82f6' }}
                      >
                        {r}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {letters.map(letter => (
                <View key={letter} style={{ padding: '8px 12px' }}>
                  <Text style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>{letter}</Text>
                  <View style={{ marginTop: '4px' }}>
                    {grouped[letter].map((p, i) => {
                      const globalIdx = flatFiltered.indexOf(p)
                      return (
                        <View
                          key={p}
                          onClick={() => select(p)}
                          style={{
                            padding: '8px 10px',
                            background: highlighted === globalIdx ? '#eff6ff' : 'transparent',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#374151',
                          }}
                        >
                          {p}
                        </View>
                      )
                    })}
                  </View>
                </View>
              ))}

              {filtered.length === 0 && (
                <View style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
                  未找到匹配省份
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  )
}

// ========== 趋势页面 ==========
export default function TrendPage() {
  const [trendData, setTrendData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [selectedPoint, setSelectedPoint] = useState(null)
  const chartRef = useRef(null)
  const echartsRef = useRef(null)
  const [echartsId] = useState(`trend-chart-${Date.now()}`)

  // 从 Context 获取
  const { selectedRegion, setSelectedRegion, oilData, regions } = Taro.getApp().globalData || {}

  const load = useCallback(() => {
    if (!selectedRegion) return
    setLoading(true)
    setSelectedPoint(null)
    setTrendData(null)
    Taro.request({
      url: `${API_BASE}/price-changes?province=${encodeURIComponent(selectedRegion)}&days=${days}`,
    }).then(r => {
      if (r.ok) return r.data
      return Promise.reject(r.statusCode)
    }).then(d => { setTrendData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedRegion, days])

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

  // 生成图表 option
  const getOption = useCallback(() => {
    const history = trendData?.history || {}
    const dates = Object.keys(history).sort()
    const hasData = dates.length > 0

    if (!hasData || loading) return null

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

    return {
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
  }, [trendData, loading, selectedRegion, days])

  // 点击事件处理
  const onChartClick = useCallback((params) => {
    if (params.componentType === 'series') {
      const date = params.name
      const history = trendData?.history || {}
      setSelectedPoint({ date, values: history[date] || {} })
    }
  }, [trendData])

  return (
    <View style={{ padding: '16px', paddingBottom: '80px', minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 筛选控制 */}
      <View style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <View style={{ flex: 1, background: 'white', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <View style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>选择省份</View>
          <ProvinceSelector value={selectedRegion || ''} onChange={v => setSelectedRegion && setSelectedRegion(v)} provinces={regions || []} />
        </View>
        <View style={{ background: 'white', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minWidth: '90px' }}>
          <View style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>时间范围</View>
          <View style={{ display: 'flex', gap: '4px' }}>
            {[7, 14, 30].map(d => (
              <View
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: '6px 8px', borderRadius: '6px',
                  background: days === d ? '#2563eb' : '#f3f4f6',
                  color: days === d ? 'white' : '#9ca3af',
                  fontSize: '12px', fontWeight: '500',
                }}
              >
                {d}天
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 统计卡片 */}
      {trendData && trendData.history && Object.keys(trendData.history).length > 0 && (
        <View style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {OIL_TYPES.filter(t => calcStats(trendData.history, t.key)).slice(0, 2).map(t => {
            const s = calcStats(trendData.history, t.key)
            return (
              <View key={t.key} style={{
                flex: 1, background: 'white', borderRadius: '12px', padding: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center'
              }}>
                <View style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{t.label}</View>
                <View style={{ fontSize: '20px', fontWeight: 'bold', color: t.color }}>{s.latest}</View>
                <View style={{ fontSize: '10px', color: parseFloat(s.change) >= 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                  {parseFloat(s.change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(s.change))}元
                </View>
                <View style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>均值{s.avg}</View>
              </View>
            )
          })}
        </View>
      )}

      {/* 趋势图表 */}
      <View style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <View style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
            加载中...
          </View>
        ) : trendData && Object.keys(trendData.history || {}).length > 0 ? (
          <>
            <Echarts
              canvasIdPrefix={echartsId}
              ref={echartsRef}
              option={getOption()}
              style={{ width: '100%', height: '300px' }}
              onEvents={{ click: onChartClick }}
            />
            {/* 点击数据点详情 */}
            {selectedPoint && (
              <View style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: '12px',
                fontSize: '13px',
              }}>
                <View style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                  📅 {selectedPoint.date} 油价详情
                </View>
                <View style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {OIL_TYPES.map(t => {
                    const val = selectedPoint.values[t.key]
                    return val != null ? (
                      <View key={t.key} style={{
                        padding: '8px 12px',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: t.color, fontWeight: '600' }}>{t.label}</Text>
                        <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>¥{val}元/升</Text>
                      </View>
                    ) : null
                  })}
                </View>
                {Object.keys(selectedPoint.values).length === 0 && (
                  <View style={{ color: '#9ca3af', textAlign: 'center', padding: '8px' }}>当日无数据</View>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '14px' }}>
            暂无历史数据，请先等待爬虫运行几天积累数据
          </View>
        )}
      </View>
    </View>
  )
}