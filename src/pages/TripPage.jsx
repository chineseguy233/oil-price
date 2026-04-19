import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = '/api'

const OIL_TYPES = [
  { key: '92', label: '92#汽油', color: '#3b82f6' },
  { key: '95', label: '95#汽油', color: '#8b5cf6' },
  { key: '98', label: '98#汽油', color: '#f59e0b' },
  { key: '0', label: '0#柴油', color: '#10b981' },
]

const OIL_COLORS = { '92': '#3b82f6', '95': '#8b5cf6', '98': '#f59e0b', '0': '#10b981' }

const FUEL_CONSUMPTION_OPTIONS = [
  { key: '6', label: '6L', desc: '小型车' },
  { key: '7.5', label: '7.5L', desc: '经济型' },
  { key: '10', label: '10L', desc: 'SUV' },
  { key: '12', label: '12L', desc: '大型SUV/皮卡' },
]

// ========== 输入卡片 ==========
function InputCard({ from, setFrom, to, setTo, oilType, setOilType, fuelConsumption, setFuelConsumption, onCalculate, loading }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '24px',
      padding: '24px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      margin: '16px',
    }}>
      {/* 出发地 / 目的地 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>出发地</div>
          <input
            value={from}
            onChange={e => setFrom(e.target.value)}
            placeholder="例如：北京"
            style={{
              width: '100%', padding: '12px 14px',
              borderRadius: '14px', border: '1.5px solid #e5e7eb',
              fontSize: '16px', fontWeight: '600', color: '#1f2937',
              background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ fontSize: '28px', color: '#d1d5db', marginTop: '20px', flexShrink: 0 }}>→</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>目的地</div>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="例如：上海"
            style={{
              width: '100%', padding: '12px 14px',
              borderRadius: '14px', border: '1.5px solid #e5e7eb',
              fontSize: '16px', fontWeight: '600', color: '#1f2937',
              background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* 油耗 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>车型油耗</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {FUEL_CONSUMPTION_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFuelConsumption(opt.key)}
              style={{
                padding: '10px 4px',
                borderRadius: '12px',
                border: fuelConsumption === opt.key ? 'none' : '1.5px solid #e5e7eb',
                background: fuelConsumption === opt.key
                  ? `linear-gradient(135deg, ${OIL_COLORS['92']}, ${OIL_COLORS['92']}cc)`
                  : '#f9fafb',
                color: fuelConsumption === opt.key ? 'white' : '#6b7280',
                fontWeight: fuelConsumption === opt.key ? 'bold' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: fuelConsumption === opt.key ? `0 4px 12px ${OIL_COLORS['92']}44` : 'none',
                transition: 'all 0.2s',
              }}
            >
              <div>🚗 {opt.label}</div>
              <div style={{ fontSize: '10px', opacity: fuelConsumption === opt.key ? 0.8 : 0.7, marginTop: '2px' }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 油号 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>选择油号</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {OIL_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setOilType(t.key)}
              style={{
                padding: '10px 4px',
                borderRadius: '12px',
                border: oilType === t.key ? 'none' : '1.5px solid #e5e7eb',
                background: oilType === t.key
                  ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)`
                  : '#f9fafb',
                color: oilType === t.key ? 'white' : '#6b7280',
                fontWeight: oilType === t.key ? 'bold' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: oilType === t.key ? `0 4px 12px ${t.color}44` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {t.key === '0' ? '0#柴油' : `${t.key}#汽油`}
            </button>
          ))}
        </div>
      </div>

      {/* 计算按钮 */}
      <button
        onClick={onCalculate}
        disabled={!from || !to || loading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '16px',
          border: 'none',
          background: !from || !to
            ? '#e5e7eb'
            : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: !from || !to ? '#9ca3af' : 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: !from || !to ? 'not-allowed' : 'pointer',
          boxShadow: from && to ? '0 4px 16px rgba(37,99,235,0.3)' : 'none',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {loading ? (
          <>
            <span style={{ fontSize: '18px' }}>⏳</span>
            <span>计算中...</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '18px' }}>⛽</span>
            <span>计算全程油费</span>
          </>
        )}
      </button>
    </div>
  )
}

// ========== 结果卡片 ==========
function ResultCard({ result }) {
  if (!result) return null

  const {
    total_km, provinces_crossed, province_prices,
    oil_cost, toll_cost, is_free_toll, holiday, free_toll_saving,
    from, to, total_cost, oil_type, fuel_consumption, total_duration_min,
  } = result

  const oilColor = OIL_COLORS[oil_type] || '#3b82f6'
  const validProvinces = provinces_crossed.filter(p => province_prices[p] !== null)

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* 行程概览 */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            全程约 <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>{total_km}</span> 公里
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            约 {total_duration_min} 分钟
          </div>
        </div>

        <div style={{
          padding: '10px 14px',
          background: '#f0f9ff',
          borderRadius: '12px',
          fontSize: '13px',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <span>🚗</span>
          <span>{from.name}</span>
          <span style={{ color: '#93c5fd' }}>→</span>
          {provinces_crossed.slice(1, -1).map((p, i) => (
            <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#d1d5db' }}>→</span>
              <span>{p}</span>
            </span>
          ))}
          <span style={{ color: '#93c5fd' }}>→</span>
          <span>{to.name}</span>
        </div>
      </div>

      {/* 途经省份油价 */}
      {validProvinces.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '16px 20px',
          marginBottom: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: '500' }}>途经省份油价（{oil_type}#）</div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {validProvinces.map((p, i) => {
              const price = province_prices[p]
              const isMin = price === Math.min(...validProvinces.map(x => province_prices[x]))
              return (
                <div key={p} style={{
                  flexShrink: 0,
                  background: isMin ? '#f0fdf4' : '#f9fafb',
                  border: isMin ? '1.5px solid #86efac' : '1.5px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  textAlign: 'center',
                  minWidth: '72px',
                }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{p}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: isMin ? '#16a34a' : oilColor }}>
                    ¥{price}
                  </div>
                  {isMin && <div style={{ fontSize: '9px', color: '#22c55e', marginTop: '2px' }}>最低</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 费用汇总 */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px', fontWeight: '500' }}>💰 费用明细</div>

        {/* 油费 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⛽</span>
            <span style={{ fontSize: '14px', color: '#374151' }}>油费</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: oilColor }}>
            ¥{oil_cost}
          </div>
        </div>

        {/* 高速费 */}
        {!is_free_toll && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🛣️</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>高速费</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6b7280' }}>
              ¥{toll_cost}
            </div>
          </div>
        )}

        {/* 分割线 */}
        <div style={{ borderTop: '1px dashed #e5e7eb', margin: '12px 0' }} />

        {/* 总计 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', color: '#374151', fontWeight: '600' }}>合计</span>
          <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#1f2937' }}>
            ¥{total_cost}
          </span>
        </div>
      </div>

      {/* 五一高速免费 Banner */}
      {is_free_toll && free_toll_saving > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '12px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
        }}>
          <span style={{ fontSize: '28px' }}>🎉</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '2px' }}>
              {holiday}高速免费！
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              节省 ¥{free_toll_saving} 高速费
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => {
            const text = `北京→上海全程约${total_km}公里，油费约¥${oil_cost}，高速费${is_free_toll ? '免费' : '¥' + toll_cost}`
            navigator.clipboard?.writeText(text).catch(() => {})
          }}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '14px',
            border: '1.5px solid #e5e7eb',
            background: 'white',
            fontSize: '14px',
            color: '#374151',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          📋 复制行程
        </button>
        <button
          onClick={() => {
            const url = `https://uri.amap.com/navigation?to=${to.lng},${to.lat},${encodeURIComponent(to.name)}&mode=car&callnative=1`
            window.open(url, '_blank')
          }}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          }}
        >
          🚗 导航出发
        </button>
      </div>
    </div>
  )
}

// ========== 错误提示 ==========
function ErrorTip({ message, onRetry }) {
  if (!message) return null
  return (
    <div style={{
      margin: '0 16px 12px',
      padding: '14px 16px',
      background: '#fef2f2',
      borderRadius: '14px',
      border: '1px solid #fecaca',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ fontSize: '13px', color: '#dc2626' }}>⚠️ {message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: '6px 14px',
          borderRadius: '8px',
          border: 'none',
          background: '#dc2626',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
        }}>
          重试
        </button>
      )}
    </div>
  )
}

// ========== TripPage 主页面 ==========
export default function TripPage({ onBack }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [from, setFrom] = useState(searchParams.get('from') || '')
  const [to, setTo] = useState(searchParams.get('to') || '')

  // F1 SEO: 动态更新页面标题和描述
  useEffect(() => {
    const fromVal = searchParams.get('from')
    const toVal = searchParams.get('to')
    if (fromVal && toVal) {
      document.title = `${fromVal}到${toVal}油费计算器_五一自驾多少钱`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', `输入出发地和目的地，计算自驾油费，${fromVal}到${toVal}途经省份油价对比，五一高速是否免费`)
      }
    } else {
      document.title = '自驾油费计算器_五一假期出行多少钱'
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', '输入出发地和目的地，计算自驾油费，途经省份油价对比，五一高速是否免费')
      }
    }
    return () => {
      document.title = '油价守护者 - 智能油价监测'
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', '实时查看各省92#、95#、98#汽油及0#柴油价格，对比历史走势，找附近加油站')
      }
    }
  }, [])
  const [oilType, setOilType] = useState('92')
  const [fuelConsumption, setFuelConsumption] = useState('7.5')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const calculate = useCallback(async () => {
    if (!from || !to) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(
        `${API_BASE}/route/oil-cost?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&oil_type=${oilType}&fuel_consumption=${fuelConsumption}`
      )
      const data = await res.json()
      if (data.success) {
        setResult(data)
        // 更新 URL 参数
        setSearchParams({ from, to })
      } else {
        setError(data.error || '计算失败，请检查输入')
      }
    } catch (e) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [from, to, oilType, fuelConsumption, setSearchParams])

  // 从 URL 参数进来时自动计算
  useEffect(() => {
    if (searchParams.get('from') && searchParams.get('to') && !result && !loading) {
      calculate()
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* 顶部 */}
      <div style={{
        background: 'white',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px',
          }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#1f2937' }}>自驾油费计算器</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>输入出发地和目的地，计算全程油费</div>
        </div>
        <div style={{ fontSize: '24px' }}>🚗</div>
      </div>

      {/* 五一 Banner */}
      <div style={{
        margin: '12px 16px 0',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
        borderRadius: '12px',
        border: '1px solid #fed7aa',
        fontSize: '12px',
        color: '#c2410c',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>💡</span>
        <span>五一假期（5月1日-5日）高速免费，自驾出行更划算！</span>
      </div>

      {/* 输入卡片 */}
      <InputCard
        from={from} setFrom={setFrom}
        to={to} setTo={setTo}
        oilType={oilType} setOilType={setOilType}
        fuelConsumption={fuelConsumption} setFuelConsumption={setFuelConsumption}
        onCalculate={calculate}
        loading={loading}
      />

      {/* 错误提示 */}
      <ErrorTip message={error} onRetry={calculate} />

      {/* 结果 */}
      {result && <ResultCard result={result} />}

      {/* 底部说明 */}
      {!result && !loading && (
        <div style={{
          margin: '0 16px',
          padding: '16px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>使用说明</div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.7 }}>
            1. 输入出发地和目的地城市名<br/>
            2. 选择车型油耗（不知道怎么选可以跳过）<br/>
            3. 点击「计算全程油费」<br/>
            4. 查看途经省份油价差异，高速费全免时直接显示节省金额<br/>
            <span style={{ color: '#9ca3af' }}>注：油价数据每日更新，实际价格以加油站为准</span>
          </div>
        </div>
      )}
    </div>
  )
}
