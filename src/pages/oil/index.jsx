import React, { useState, useContext } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AppContext } from '../../app'
import { OIL_TYPES, OIL_COLORS } from '../../app'

// ========== 实用信息 Banner ==========
function InfoBanner({ style }) {
  const tips = [
    { icon: '⏰', text: '数据每日更新，实际价格以加油站为准' },
    { icon: '📍', text: '点击加油站页面，查看附近油站实时油价' },
    { icon: '📊', text: '趋势页面可查看30天历史油价走势' },
  ]
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)])

  return (
    <View style={{
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
      <Text style={{ fontSize: '18px', flexShrink: 0 }}>{tip.icon}</Text>
      <Text style={{ fontSize: '13px', color: '#15803d', lineHeight: 1.4 }}>{tip.text}</Text>
    </View>
  )
}

// ========== 省油价列表项 ==========
function ProvinceRow({ region, price, oilType, index }) {
  return (
    <View style={{
      padding: '14px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: index % 2 === 0 ? '#ffffff' : '#f9fafb',
      borderBottom: '1px solid #f3f4f6',
    }}>
      <View style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <View style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: `linear-gradient(135deg, ${OIL_COLORS[oilType]}22, ${OIL_COLORS[oilType]}44)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 'bold', color: OIL_COLORS[oilType],
        }}>
          {region.slice(0, 2)}
        </View>
        <Text style={{ fontSize: '15px', color: '#374151', fontWeight: '500' }}>{region}</Text>
      </View>
      <View style={{ textAlign: 'right' }}>
        <Text style={{ fontSize: '18px', fontWeight: 'bold', color: OIL_COLORS[oilType] }}>{price ?? '—'}</Text>
        <Text style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '2px' }}>元/升</Text>
      </View>
    </View>
  )
}

// ========== 油价页面 ==========
export default function OilPricePage() {
  const ctx = useContext(AppContext)
  const {
    oilData, regions, updateTime, hoursOld,
    selectedRegion, setSelectedRegion,
    selectedOil, setSelectedOil,
  } = ctx

  const [showAdBanner, setShowAdBanner] = useState(true)
  const [listSearch, setListSearch] = useState('')
  const [listSort, setListSort] = useState('default')

  if (!oilData) {
    return (
      <View style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af' }}>
        <View style={{ fontSize: '32px', marginBottom: '12px' }}>⛽</View>
        <Text>数据加载中...</Text>
      </View>
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

  // 分享功能
  const handleShare = async () => {
    const oilLabel = OIL_TYPES.find(t => t.key === selectedOil)?.label
    const text = `⛽ ${selectedRegion}今日${oilLabel}油价：¥${currentPrice}/升
📊 历史走势、油价提醒、附近加油站
🔗 oil-price.app`
    const title = `【油价守护者】${selectedRegion}${oilLabel} ¥${currentPrice}/升`

    try {
      await Taro.showShareMenu({
        title,
        path: `/pages/oil/index`,
        templateId: '',
      })
      Taro.onShareAppMessage(() => ({
        title,
        path: `/pages/oil/index`,
      }))
      Taro.showToast({ title: '已分享', icon: 'success' })
    } catch (e) {
      Taro.showToast({ title: '分享失败', icon: 'none' })
    }
  }

  // 省份切换
  const handleRegionChange = (val) => {
    setSelectedRegion(val)
    const recent = Taro.getStorageSync('recent_provinces') || '[]'
    try {
      const parsed = JSON.parse(recent)
      const updated = [val, ...parsed.filter(r => r !== val)].slice(0, 3)
      Taro.setStorageSync('recent_provinces', JSON.stringify(updated))
    } catch (e) {
      // ignore
    }
  }

  return (
    <View style={{ paddingBottom: '80px' }}>
      {/* 实用信息 Banner */}
      {showAdBanner && <InfoBanner />}

      {/* 主油价卡片 */}
      <View style={{
        margin: '0 16px 16px',
        background: 'white',
        borderRadius: '20px',
        padding: '24px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景装饰 */}
        <View style={{
          position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
          background: `radial-gradient(circle, ${oilColor}18 0%, transparent 70%)`,
          borderRadius: '0 20px 0 120px',
        }} />

        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <View style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Text>今日油价 · {selectedRegion}</Text>
              {updateTime && <Text style={{ fontSize: '12px' }}>({updateTime})</Text>}
              {/* 数据新鲜度指示 */}
              {hoursOld !== null && (
                <Text style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isStale ? '#fef2f2' : '#f0fdf4',
                  color: isStale ? '#ef4444' : '#10b981',
                  fontWeight: '600',
                }}>
                  {hoursOld < 1 ? '刚刚更新' : isStale ? `⚠️ ${hoursOld.toFixed(0)}h前` : `${hoursOld.toFixed(0)}h前`}
                </Text>
              )}
            </View>
            <View style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <Text style={{ fontSize: '44px', fontWeight: 'bold', color: oilColor, lineHeight: 1 }}>{currentPrice}</Text>
              <Text style={{ fontSize: '16px', color: '#9ca3af' }}>元/升</Text>
            </View>
          </View>
          <View style={{ textAlign: 'right' }}>
            <View style={{
              background: `${oilColor}18`,
              color: oilColor,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 'bold',
              marginBottom: '6px',
            }}>
              <Text>{OIL_TYPES.find(t => t.key === selectedOil)?.label}</Text>
            </View>
            {/* 分享按钮 */}
            <Button
              onClick={handleShare}
              size='mini'
              style={{
                background: 'none',
                border: '1.5px solid #e5e7eb',
                borderRadius: '8px',
                padding: '3px 10px',
                fontSize: '11px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              📤 分享
            </Button>
          </View>
        </View>
      </View>

      {/* 省份选择 */}
      <View style={{ margin: '0 16px 12px', background: 'white', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <View style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '500' }}>选择省份</View>
        <View style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 使用 Taro Picker 替代 ProvinceSelector */}
          <View style={{ flex: 1, position: 'relative' }}>
            <Text
              onClick={() => {
                Taro.showActionSheet({
                  itemList: regions,
                  success: (res) => {
                    const val = regions[res.tapIndex]
                    handleRegionChange(val)
                  },
                })
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 12px', borderRadius: '10px',
                border: '1px solid #e5e7eb',
                background: '#f9fafb', minHeight: '44px',
                color: '#374151',
                fontSize: '15px',
              }}
            >
              <Text style={{ flex: 1 }}>{selectedRegion}</Text>
              <Text style={{ color: '#9ca3af', fontSize: '12px' }}>▼</Text>
            </Text>
          </View>
          <Button
            size='mini'
            onClick={() => setShowAdBanner(v => !v)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: 'white',
              fontSize: '12px',
              color: '#9ca3af',
              flexShrink: 0,
            }}
          >
            {showAdBanner ? '🙈' : '👁'}
          </Button>
        </View>
      </View>

      {/* 油号选择 */}
      <View style={{ margin: '0 16px 12px', background: 'white', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <View style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: '500' }}>选择油号</View>
        <View style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {OIL_TYPES.map(t => (
            <Button
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
                boxShadow: selectedOil === t.key ? `0 4px 12px ${t.color}44` : 'none',
              }}
            >
              {t.key === '0' ? '0#柴油' : `${t.key}#汽油`}
            </Button>
          ))}
        </View>
      </View>

      {/* 各省油价列表 */}
      <View style={{ margin: '0 16px', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <View style={{
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
          <Text>各省油价参考 <Text style={{ fontWeight: '400', color: '#9ca3af', fontSize: '11px' }}>({displayedRegions.length}省)</Text></Text>
          <View style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* 搜索 */}
            <View style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '2px 8px' }}>
              <Text style={{ fontSize: '11px', color: '#9ca3af' }}>🔍</Text>
              <Input
                value={listSearch}
                onInput={e => setListSearch(e.detail.value)}
                placeholder="过滤..."
                style={{ border: 'none', outline: 'none', fontSize: '12px', width: '60px', background: 'transparent', color: '#374151' }}
              />
              {listSearch && (
                <Text onClick={() => setListSearch('')} style={{ color: '#9ca3af', cursor: 'pointer', fontSize: '10px' }}>✕</Text>
              )}
            </View>
            {/* 排序 */}
            {[
              { key: 'default', label: '默认' },
              { key: 'price_asc', label: '↑价低' },
              { key: 'price_desc', label: '↓价高' },
            ].map(s => (
              <Button
                key={s.key}
                size='mini'
                onClick={() => setListSort(s.key)}
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: listSort === s.key ? oilColor : '#e5e7eb',
                  background: listSort === s.key ? `${oilColor}18` : '#fff',
                  color: listSort === s.key ? oilColor : '#9ca3af',
                  fontSize: '11px',
                  fontWeight: '500',
                }}
              >{s.label}</Button>
            ))}
          </View>
        </View>
        <View>
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
            <View style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
              <Text>未找到包含 "{listSearch}" 的省份</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}