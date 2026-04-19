import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TabBar from '../components/TabBar'

const API_BASE = '/api'

const OIL_TYPES = [
  { key: '92', label: '92#汽油', color: '#3b82f6' },
  { key: '95', label: '95#汽油', color: '#8b5cf6' },
  { key: '98', label: '98#汽油', color: '#f59e0b' },
  { key: '0', label: '0#柴油', color: '#10b981' },
]
const OIL_COLORS = { '92': '#3b82f6', '95': '#8b5cf6', '98': '#f59e0b', '0': '#10b981' }

// 各省油价原因（直接内嵌，避免请求）
const PROVINCE_ANALYSIS = {
  '海南': { level: '最贵', reason: '高速不收费，油价含高速费，约1.05元/升附加费' },
  '西藏': { level: '很贵', reason: '运输成本极高，油品需从内地长途运输' },
  '广东': { level: '偏贵', reason: '经济发达、需求旺盛，价格难以下调' },
  '贵州': { level: '偏贵', reason: '山路多、运输成本高、炼油厂少' },
  '吉林': { level: '中等偏贵', reason: '冬季需添加防冻剂，生产成本略高' },
  '广西': { level: '中等偏贵', reason: '边境省份、进口渠道有限，运输距离远' },
  '云南': { level: '中等', reason: '地形复杂运输成本高，但有本地炼油厂' },
  '北京': { level: '中等偏贵', reason: '首都标准、油品质量要求高（京标）' },
  '上海': { level: '中等偏贵', reason: '经济中心、需求集中，进口渠道畅通但消耗大' },
  '江苏': { level: '中等偏贵', reason: '经济发达、需求旺盛，靠近炼油基地但消费高' },
  '浙江': { level: '中等偏贵', reason: '民企活跃、竞争充分，但需求量大' },
  '天津': { level: '中等', reason: '沿海城市，进口渠道便利，价格适中' },
  '河北': { level: '中等', reason: '环绕京津冀，需求大但靠近胜利油田，供应尚可' },
  '辽宁': { level: '中等偏宜', reason: '辽河油田所在地，本地供应充足' },
  '河南': { level: '中等', reason: '人口大省、交通枢纽，需求量大' },
  '湖北': { level: '中等', reason: '地理位置居中、交通便利，价格稳定' },
  '湖南': { level: '中等', reason: '内陆省份，需求一般，运输成本略高' },
  '安徽': { level: '中等', reason: '地理位置居中、交通便利，调配方便' },
  '福建': { level: '中等', reason: '沿海省份，进口渠道多远，本地产能一般' },
  '江西': { level: '中等', reason: '内陆省份，需求不大，物流成本存在' },
  '山东': { level: '中等', reason: '炼油产能全国第一，但也是消费大省' },
  '重庆': { level: '中等', reason: '直辖市体量小、需求集中，调配方便' },
  '四川': { level: '中等', reason: '炼油产能丰富，盆地地形运输困难' },
  '山西': { level: '便宜', reason: '煤层气资源丰富，本地能源成本低' },
  '内蒙古': { level: '便宜', reason: '煤炭和油气资源丰富，供应充足' },
  '黑龙江': { level: '便宜', reason: '大庆油田所在地，本地供应充足' },
  '陕西': { level: '很便宜', reason: '延长石油总部所在地，本地供应充足' },
  '甘肃': { level: '便宜', reason: '西部油气产区，兰州石化等大型炼油厂' },
  '青海': { level: '便宜', reason: '柴达木盆地油气资源丰富，本地需求小' },
  '宁夏': { level: '便宜', reason: '靠近鄂尔多斯盆地，油气资源丰富' },
  '新疆': { level: '最便宜', reason: '本地油气资源最丰富，远离消费市场' },
}

// ========== 油号选择器 ==========
function OilTypeSelector({ oilType, setOilType }) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '12px 16px',
      background: 'white',
      borderBottom: '1px solid #f0f0f0',
      overflowX: 'auto',
    }}>
      {OIL_TYPES.map(t => (
        <button
          key={t.key}
          onClick={() => setOilType(t.key)}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: '20px',
            border: oilType === t.key ? 'none' : '1.5px solid #e5e7eb',
            background: oilType === t.key
              ? `linear-gradient(135deg, ${t.color}, ${t.color}cc)`
              : '#f9fafb',
            color: oilType === t.key ? 'white' : '#6b7280',
            fontWeight: oilType === t.key ? 'bold' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: oilType === t.key ? `0 2px 8px ${t.color}44` : 'none',
            transition: 'all 0.2s',
          }}
        >
          {t.key === '0' ? '0#柴油' : `${t.key}#汽油`}
        </button>
      ))}
    </div>
  )
}

// ========== 省份卡片 ==========
function ProvinceCard({ province, price, rank, isCheapest, isExpensive, analysis, oilColor, onClick }) {
  const level = analysis?.level || ''
  const reason = analysis?.reason || ''

  const bgColor = isCheapest ? '#f0fdf4' : isExpensive ? '#fef2f2' : '#ffffff'
  const borderColor = isCheapest ? '#86efac' : isExpensive ? '#fca5a5' : '#e5e7eb'
  const rankBgColor = isCheapest ? '#22c55e' : isExpensive ? '#ef4444' : '#6b7280'
  const priceColor = isCheapest ? '#16a34a' : isExpensive ? '#dc2626' : oilColor

  return (
    <div
      onClick={onClick}
      style={{
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: '16px',
        padding: '14px 16px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 排名 */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: rankBgColor,
          color: 'white',
          fontSize: '13px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {rank}
        </div>

        {/* 省份名 + 原因 */}
        <div style={{ flex: 1, marginLeft: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginBottom: '3px' }}>
            {province}
            {isCheapest && <span style={{ fontSize: '11px', background: '#22c55e22', color: '#16a34a', padding: '1px 6px', borderRadius: '6px', marginLeft: '6px', fontWeight: '600' }}>最便宜</span>}
            {isExpensive && <span style={{ fontSize: '11px', background: '#ef444422', color: '#dc2626', padding: '1px 6px', borderRadius: '6px', marginLeft: '6px', fontWeight: '600' }}>最贵</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>{reason}</div>
        </div>

        {/* 价格 */}
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: priceColor }}>
            ¥{price}
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>元/升</div>
        </div>
      </div>
    </div>
  )
}

// ========== 原因详情弹窗 ==========
function ReasonModal({ province, analysis, price, oilType, onClose }) {
  if (!province) return null
  const level = analysis?.level || ''
  const reason = analysis?.reason || ''
  const detail = analysis?.detail || ''

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{province} · {oilType}#</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937' }}>¥{price} 元/升</div>
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '3px 10px',
            borderRadius: '20px',
            background: level === '最便宜' || level === '很便宜' || level === '便宜' ? '#f0fdf4' : level === '最贵' || level === '很贵' || level === '偏贵' ? '#fef2f2' : '#f0f9ff',
            color: level === '最便宜' || level === '很便宜' || level === '便宜' ? '#16a34a' : level === '最贵' || level === '很贵' || level === '偏贵' ? '#dc2626' : '#2563eb',
          }}>
            {level}
          </div>
        </div>

        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', fontWeight: '500' }}>直接原因</div>
          <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{reason}</div>
        </div>

        {detail && (
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6, marginBottom: '16px' }}>
            {detail}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: '#f3f4f6',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          关闭
        </button>
      </div>
    </div>
  )
}

// ========== RankingsPage 主页面 ==========
export default function RankingsPage() {
  const navigate = useNavigate()
  const [oilType, setOilType] = useState('92')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedProvince, setSelectedProvince] = useState(null) // 弹窗
  const [showAll, setShowAll] = useState(false) // F2: 展开全部省份

  // F2 SEO
  useEffect(() => {
    document.title = '中国各省油价排行榜_92号汽油哪里最便宜'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', '查看全国31省92号、95号、98号汽油价格排行，了解各省油价差异原因，海南为何最贵？新疆为何最便宜？')
    }
    return () => {
      document.title = '油价守护者 - 智能油价监测'
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', '实时查看各省92#、95#、98#汽油及0#柴油价格，对比历史走势，找附近加油站')
      }
    }
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API_BASE}/rankings/provinces?oil_type=${oilType}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [oilType])

  useEffect(() => { load() }, [load])

  const oilColor = OIL_COLORS[oilType] || '#3b82f6'
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1f2937',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
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
          <span style={{ fontSize: '22px' }}>🏆</span>
          <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#1f2937' }}>中国油价红蓝榜</span>
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{today} 更新</div>
      </div>

      {/* 油号选择 */}
      <OilTypeSelector oilType={oilType} setOilType={setOilType} />

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div>加载中...</div>
        </div>
      ) : data?.success ? (
        <>
          {/* 说明 Banner */}
          <div style={{
            margin: '12px 16px 0',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
            fontSize: '12px',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>💡</span>
            <span>点击任意省份卡片，查看油价原因分析</span>
          </div>

          {/* 分割线标签 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 16px 8px' }}>
            <div style={{ flex: 1, height: '1px', background: '#22c55e44' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: '20px' }}>
              📉 便宜榜 TOP5
            </span>
            <div style={{ flex: 1, height: '1px', background: '#22c55e44' }} />
          </div>

          <div style={{ padding: '0 16px' }}>
            {data.cheapest.map((item, i) => (
              <ProvinceCard
                key={item.province}
                province={item.province}
                price={item.price}
                rank={i + 1}
                isCheapest={true}
                isExpensive={false}
                analysis={item.analysis || PROVINCE_ANALYSIS[item.province]}
                oilColor={oilColor}
                onClick={() => setSelectedProvince(item)}
              />
            ))}
          </div>

          {/* 分割线标签 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 16px 8px' }}>
            <div style={{ flex: 1, height: '1px', background: '#ef444444' }} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: '20px' }}>
              📈 贵价榜 TOP5
            </span>
            <div style={{ flex: 1, height: '1px', background: '#ef444444' }} />
          </div>

          <div style={{ padding: '0 16px' }}>
            {data.expensive.map((item, i) => (
              <ProvinceCard
                key={item.province}
                province={item.province}
                price={item.price}
                rank={i + 1}
                isCheapest={false}
                isExpensive={true}
                analysis={item.analysis || PROVINCE_ANALYSIS[item.province]}
                oilColor={oilColor}
                onClick={() => setSelectedProvince(item)}
              />
            ))}
          </div>

          {/* 全部排行入口 */}
          <div style={{ padding: '20px 16px 0' }}>
            <button
              onClick={() => setShowAll(v => !v)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1.5px solid #e5e7eb',
                background: 'white',
                fontSize: '13px',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {showAll ? '收起全部排行' : '查看全部31省排行'}
              <span style={{ color: '#9ca3af' }}>{showAll ? '↑' : '↓'}</span>
            </button>
          </div>

          {/* F2: 全部省份展开列表 */}
          {showAll && data?.all && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 16px 8px' }}>
                <div style={{ flex: 1, height: '1px', background: '#6366f144' }} />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4f46e5', background: '#eef2ff', padding: '3px 10px', borderRadius: '20px' }}>
                  📋 全部 {data.all.length} 省排行
                </span>
                <div style={{ flex: 1, height: '1px', background: '#6366f144' }} />
              </div>
              <div style={{ padding: '0 16px' }}>
                {data.all.map((item, i) => (
                  <ProvinceCard
                    key={item.province}
                    province={item.province}
                    price={item.price}
                    rank={i + 1}
                    isCheapest={false}
                    isExpensive={false}
                    analysis={item.analysis || PROVINCE_ANALYSIS[item.province]}
                    oilColor={oilColor}
                    onClick={() => setSelectedProvince(item)}
                  />
                ))}
              </div>
            </>
          )}

          {/* 底部说明 */}
          <div style={{ padding: '20px 16px', fontSize: '11px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
            数据来源：汽车之家 · 每日更新<br />
            实际价格以各加油站为准，本数据仅供参考
          </div>
        </>
      ) : (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#ef4444' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div>{data?.error || '数据加载失败'}</div>
          <button
            onClick={load}
            style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '13px' }}
          >
            重试
          </button>
        </div>
      )}

      {/* 原因详情弹窗 */}
      {selectedProvince && (
        <ReasonModal
          province={selectedProvince.province}
          analysis={selectedProvince.analysis || PROVINCE_ANALYSIS[selectedProvince.province]}
          price={selectedProvince.price}
          oilType={oilType}
          onClose={() => setSelectedProvince(null)}
        />
      )}
      <TabBar activeTab="price" onTabChange={(id) => navigate('/')} />
    </div>
  )
}
