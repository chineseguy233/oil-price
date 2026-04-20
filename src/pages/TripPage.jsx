import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getSelectedVehicle, getVehicles, setSelectedVehicleId } from '../utils/vehicles'
import { VehicleSelector } from '../components/VehicleComponents'
import TabBar from '../components/TabBar'

const API_BASE = '/api'

const FUEL_CONSUMPTION_OPTIONS = [
  { key: '6', label: '6L', desc: '经济型' },
  { key: '7.5', label: '7.5L', desc: '家用轿车' },
  { key: '10', label: '10L', desc: 'SUV' },
  { key: '12', label: '12L', desc: '大型SUV' },
]

const VEHICLE_TYPE_OPTIONS = [
  { key: 'small', label: '🚗 小客车', desc: '7座及以下', sub: '春节/劳动节/国庆免费' },
  { key: 'big', label: '🚌 大客车', desc: '8座及以上', sub: '仅春节免费' },
]

// ========== 输入卡片 ==========
function InputCard({ from, setFrom, to, setTo, fuelConsumption, setFuelConsumption, onCalculate, loading, vehicleMode, setVehicleMode, selectedVehicle, setSelectedVehicleState, travelDate, setTravelDate, vehicleType, setVehicleType }) {
  const handleVehicleChange = (v) => {
    setSelectedVehicleState(v)
    setSelectedVehicleId(v.id)
    setFuelConsumption(String(v.fuelConsumption))
  }

  const handleQuickMode = () => {
    setVehicleMode(false)
    setSelectedVehicleState(null)
    setSelectedVehicleId(null)
  }

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

      {/* 车型/油耗 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>车型油耗</div>
          <button
            onClick={() => vehicleMode ? handleQuickMode() : setVehicleMode(true)}
            style={{
              fontSize: '11px', color: '#2563eb',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            {vehicleMode ? '快速选择' : '我的车辆'}
          </button>
        </div>

        {vehicleMode ? (
          /* 车辆选择模式 */
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <VehicleSelector selectedVehicle={selectedVehicle} onChange={handleVehicleChange} />
            {selectedVehicle && (
              <div style={{
                fontSize: '12px', color: '#6b7280',
                background: '#f0f9ff', borderRadius: '8px',
                padding: '6px 10px', flexShrink: 0,
              }}>
                {selectedVehicle.oilType}# · {selectedVehicle.fuelConsumption}L/百公里
              </div>
            )}
          </div>
        ) : (
          /* 快速选择模式 */
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
                    ? 'linear-gradient(135deg, #3b82f6, #60a5fa)'
                    : '#f9fafb',
                  color: fuelConsumption === opt.key ? 'white' : '#6b7280',
                  fontWeight: fuelConsumption === opt.key ? 'bold' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: fuelConsumption === opt.key ? '0 4px 12px #3b82f644' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <div>🚗 {opt.label}</div>
                <div style={{ fontSize: '10px', opacity: fuelConsumption === opt.key ? 0.8 : 0.7, marginTop: '2px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 车型（座位数，影响高速费免费规则） */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>车型</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {VEHICLE_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setVehicleType(opt.key)}
              style={{
                flex: 1,
                padding: '10px 6px',
                borderRadius: '12px',
                border: vehicleType === opt.key ? 'none' : '1.5px solid #e5e7eb',
                background: vehicleType === opt.key
                  ? 'linear-gradient(135deg, #3b82f6, #60a5fa)'
                  : '#f9fafb',
                color: vehicleType === opt.key ? 'white' : '#6b7280',
                fontWeight: vehicleType === opt.key ? 'bold' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: vehicleType === opt.key ? '0 4px 12px #3b82f644' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{opt.key === 'small' ? '🚗' : '🚌'}</div>
              <div>{opt.desc}</div>
              <div style={{ fontSize: '10px', opacity: 0.75, marginTop: '2px' }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 出行日期 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>出行日期（高速免费判断用）</div>
        <input
          type="date"
          value={travelDate}
          onChange={e => setTravelDate(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: '12px', border: '1.5px solid #e5e7eb',
            fontSize: '14px', color: '#1f2937',
            background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
          }}
        />
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
    total_km, provinces_crossed, province_prices, province_distances,
    oil_cost, toll_cost, is_free_toll, holiday, free_toll_saving, unknown,
    from, to, total_cost, oil_type, fuel_consumption, total_duration_min,
    weighted_price, vehicle_type,
  } = result

  const oilColor = { '92': '#3b82f6', '95': '#8b5cf6', '98': '#f59e0b', '0': '#10b981' }[oil_type] || '#3b82f6'
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{vehicle_type === 'big' ? '🚌 大客车' : '🚗 小客车'}</span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>约 {total_duration_min} 分钟</span>
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
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: '500' }}>
            途经省份油价（{oil_type}#）
            {weighted_price && (
              <span style={{ fontWeight: 'normal', color: '#2563eb', marginLeft: '8px', fontSize: '11px' }}>
                加权均价 ¥{weighted_price}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {validProvinces.map((p, i) => {
              const price = province_prices[p]
              const dist = province_distances?.[p]
              const isMin = price === Math.min(...validProvinces.map(x => province_prices[x]))
              return (
                <div key={p} style={{
                  flexShrink: 0,
                  background: isMin ? '#f0fdf4' : '#f9fafb',
                  border: isMin ? '1.5px solid #86efac' : '1.5px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  textAlign: 'center',
                  minWidth: '72px',
                }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{p}</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: isMin ? '#16a34a' : oilColor }}>
                    ¥{price}
                  </div>
                  {dist && <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>{dist}km</div>}
                  {isMin && <div style={{ fontSize: '9px', color: '#22c55e', marginTop: '1px' }}>最低</div>}
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
        {!is_free_toll && !unknown && (
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
            ¥{total_cost}{unknown ? '+' : ''}
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

      {/* 节假日未知时提示 */}
      {unknown && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '16px',
          padding: '14px 16px',
          marginBottom: '12px',
          color: '#92400e',
          fontSize: '13px',
          lineHeight: '1.5',
        }}>
          ⚠️ 节假日数据暂未收录，高速费按正常费率计算。如该日期为节假日，免费政策以交通运输部规定为准。
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
export default function TripPage() {
  const navigate = useNavigate()
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
  const [fuelConsumption, setFuelConsumption] = useState(() => {
    const v = getSelectedVehicle()
    return v ? String(v.fuelConsumption) : '7.5'
  })
  const [travelDate, setTravelDate] = useState(() => {
    // 用本地时间，避免 UTC 偏移导致日期差一天
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
  })
  const [vehicleMode, setVehicleMode] = useState(() => !!getSelectedVehicle())
  const [selectedVehicle, setSelectedVehicleState] = useState(getSelectedVehicle)
  const [vehicleType, setVehicleType] = useState('small')
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
        `${API_BASE}/route/oil-cost?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&fuel_consumption=${fuelConsumption}&travel_date=${travelDate}&vehicle_type=${vehicleType}`
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
  }, [from, to, fuelConsumption, travelDate, vehicleType, setSearchParams])

  // 从 URL 参数进来时自动计算
  useEffect(() => {
    if (searchParams.get('from') && searchParams.get('to') && !result && !loading) {
      calculate()
    }
  }, [])

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1f2937',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* 顶部 — 风格与 App 统一 */}
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
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🚗</span>
          <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#1f2937' }}>自驾油费计算器</span>
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>输入出发地和目的地</div>
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
        fuelConsumption={fuelConsumption} setFuelConsumption={setFuelConsumption}
        onCalculate={calculate}
        loading={loading}
        vehicleMode={vehicleMode}
        setVehicleMode={setVehicleMode}
        selectedVehicle={selectedVehicle}
        setSelectedVehicleState={setSelectedVehicleState}
        travelDate={travelDate} setTravelDate={setTravelDate}
        vehicleType={vehicleType} setVehicleType={setVehicleType}
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
      <TabBar activeTab="price" onTabChange={(id) => navigate('/')} />
    </div>
  )
}
