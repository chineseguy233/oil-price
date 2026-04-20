import { useState, useEffect, useCallback, useMemo, useContext } from 'react'
import { View, Text, Button, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AppContext } from '../../app'
import { OIL_TYPES } from '../../app'
import { VehicleManager } from '../../components/VehicleComponents'

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

// Helper for Taro request
const request = (url, opts = {}) => {
  const { API_BASE } = Taro.getStorageSync('oil_user') 
    ? { API_BASE: 'http://localhost:3000' } 
    : { API_BASE: 'http://localhost:3000' }
  return Taro.request({ url: `${API_BASE}${url}`, ...opts }).then(r => r.data)
}

function MyPage() {
  const { user, selectedRegion, setUser } = useContext(AppContext)

  const [health, setHealth] = useState(null)
  const [showRemindModal, setShowRemindModal] = useState(false)
  const [regions, setRegions] = useState(['北京', '上海', '广东', '江苏', '浙江'])
  const [historyData, setHistoryData] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 提醒配置
  const [remindConfig, setRemindConfig] = useState(() => {
    try { return JSON.parse(Taro.getStorageSync('oil_remind_config') || 'null') } catch { return null }
  })
  const [configForm, setConfigForm] = useState({ province: '北京', oilType: '92' })

  // Redirect to login if not logged in
  useEffect(() => {
    const token = Taro.getStorageSync('oil_token')
    const userInfo = Taro.getStorageSync('oil_user')
    if (!token || !userInfo) {
      Taro.redirectTo({ url: '/pages/login/index' })
    }
  }, [])

  // Load health and regions
  useEffect(() => {
    Taro.request({ url: 'http://localhost:3000/health' })
      .then(r => r.data)
      .then(setHealth)
      .catch(() => {})
    
    Taro.request({ url: 'http://localhost:3000/oil-prices' })
      .then(r => r.data)
      .then(d => {
        if (d.prices) setRegions(Object.keys(d.prices))
      })
      .catch(() => {})
  }, [])

  // Load history data for price stats
  const loadHistory = useCallback(() => {
    setLoadingHistory(true)
    Taro.request({
      url: `http://localhost:3000/price-changes?province=${encodeURIComponent(configForm.province)}&days=30`
    }).then(r => r.data)
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
    Taro.setStorageSync('oil_remind_config', JSON.stringify(cfg))
    // Sync to server
    const token = Taro.getStorageSync('oil_token')
    Taro.request({
      url: 'http://localhost:3000/sync/remind',
      method: 'POST',
      header: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      data: JSON.stringify(cfg),
    }).catch(() => {})
    setShowRemindModal(false)
  }

  const clearRemindConfig = () => {
    setRemindConfig(null)
    Taro.removeStorageSync('oil_remind_config')
    const token = Taro.getStorageSync('oil_token')
    Taro.request({
      url: 'http://localhost:3000/sync/remind',
      method: 'POST',
      header: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      data: JSON.stringify({ enabled: false }),
    }).catch(() => {})
  }

  // Compute 30-day min/max/current for selected oil type
  const priceStats = useMemo(() => {
    if (!historyData || !configForm.oilType) return null
    const oilKey = configForm.oilType
    const entries = Object.entries(historyData).sort((a, b) => a[0].localeCompare(b[0]))
    const prices = entries.map(([, vals]) => vals[oilKey]).filter(p => p != null)
    if (prices.length === 0) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const current = prices[prices.length - 1]
    return { min, max, current, count: prices.length }
  }, [historyData, configForm.oilType])

  const handleLogout = () => {
    Taro.removeStorageSync('oil_token')
    Taro.removeStorageSync('oil_user')
    setUser(null)
    Taro.redirectTo({ url: '/pages/login/index' })
  }

  const MenuItem = ({ icon, label, value, onClick, status }) => (
    <View
      onClick={onClick}
      style={{
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <View style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Text style={{ fontSize: '20px' }}>{icon}</Text>
        <Text style={{ fontSize: '15px', color: '#374151' }}>{label}</Text>
      </View>
      <View style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {value && <Text style={{ fontSize: '13px', color: '#9ca3af' }}>{value}</Text>}
        {status === 'running' && <Text style={{ color: '#9ca3af', fontSize: '13px' }}>更新中...</Text>}
        {status === 'ok' && <Text style={{ color: '#22c55e', fontSize: '13px' }}>✓</Text>}
        {status === 'err' && <Text style={{ color: '#ef4444', fontSize: '13px' }}>失败</Text>}
        <Text style={{ color: '#d1d5db', fontSize: '12px' }}>›</Text>
      </View>
    </View>
  )

  if (!user) return null

  const userInfo = Taro.getStorageSync('oil_user') || {}
  const phone = user.phone || userInfo.phone || ''

  return (
    <View style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* Status Card */}
      {health && (
        <View style={{
          background: health.status === 'healthy'
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '16px',
          color: 'white',
        }}>
          <Text style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px', display: 'block' }}>
            {health.status === 'healthy' ? '✅ 数据正常' : '⚠️ 数据可能过期'}
          </Text>
          <Text style={{ fontSize: '12px', opacity: 0.8, display: 'block' }}>
            {health.freshness?.last_update ? `更新时间: ${health.freshness.last_update}` : '暂无数据'}
            {health.freshness?.hours_old ? ` · ${health.freshness.hours_old}h前` : ''}
            {health.freshness?.provinces_count ? ` · ${health.freshness.provinces_count}个省份` : ''}
          </Text>
        </View>
      )}

      {/* Vehicle Management */}
      <VehicleManager />

      {/* User Info */}
      <View style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <View style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: 'white',
            fontWeight: 'bold',
          }}>
            {phone.slice(-4)}
          </View>
          <View>
            <Text style={{ fontSize: '15px', fontWeight: '600', color: '#374151', display: 'block' }}>
              {phone.slice(0, 3)}****{phone.slice(-4)}
            </Text>
            <Text style={{ fontSize: '12px', color: '#10b981', display: 'block' }}>已登录</Text>
          </View>
        </View>
        <Button
          onClick={handleLogout}
          style={{ padding: '6px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '13px' }}
          size='mini'
          type='warn'
        >
          退出
        </Button>
      </View>

      {/* Menu */}
      <View style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <MenuItem
          icon="🔔"
          label="油价提醒"
          value={remindConfig ? `${remindConfig.province} ${OIL_TYPES.find(t => t.key === remindConfig.oilType)?.label}` : '未设置'}
          onClick={openRemindModal}
        />
        <MenuItem
          icon="📤"
          label="分享给朋友"
          onClick={async () => {
            const text = `🚗 自驾出行查油价，就用「油价守护者」
⛽ 实时查看全国各省市92#/95#/98#油价，对比历史走势
🗺️ 附近加油站导航，找油站不迷路
📊 油耗记录，自动计算百公里油耗
🔗 oil-price.app`
            Taro.setClipboardData({ data: text }).catch(() => {})
            Taro.showToast({ title: '已复制到剪贴板', icon: 'success' })
          }}
        />
      </View>

      {/* Remind Modal */}
      {showRemindModal && (
        <View style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} onClick={() => setShowRemindModal(false)}>
          <View style={{
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '360px',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '20px',
          }} onClick={e => e.stopPropagation()}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'block', textAlign: 'center' }}>
              油价提醒
            </Text>

            {/* Description */}
            <View style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <Text style={{ fontSize: '13px', color: '#166534', display: 'block', lineHeight: 1.5 }}>
                系统自动监控油价，降价到30天最低价时推送「降价提醒」，涨到30天最高价时推送「涨价提醒」
              </Text>
            </View>

            {/* Province + Oil Type Selection */}
            <View style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <View style={{ marginBottom: '12px' }}>
                <Text style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>监控省份</Text>
                <Picker
                  mode='selector'
                  range={regions}
                  value={regions.indexOf(configForm.province)}
                  onChange={e => setConfigForm({ ...configForm, province: regions[e.detail.value] })}
                >
                  <View style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', background: 'white' }}>
                    {configForm.province}
                  </View>
                </Picker>
              </View>
              <View style={{ marginBottom: '12px' }}>
                <Text style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>油号</Text>
                <Picker
                  mode='selector'
                  range={OIL_TYPES}
                  rangeKey='label'
                  value={OIL_TYPES.findIndex(t => t.key === configForm.oilType)}
                  onChange={e => setConfigForm({ ...configForm, oilType: OIL_TYPES[e.detail.value].key })}
                >
                  <View style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', background: 'white' }}>
                    {OIL_TYPES.find(t => t.key === configForm.oilType)?.label}
                  </View>
                </Picker>
              </View>
            </View>

            {/* Monitor Range Preview */}
            {configForm.province && (
              <View style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px', display: 'block' }}>监控范围（共3个省份）</Text>
                <View style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {getMonitorProvinces(configForm.province).map(p => (
                    <Text key={p} style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      background: p === configForm.province ? '#dbeafe' : '#f3f4f6',
                      color: p === configForm.province ? '#1e40af' : '#374151',
                      fontWeight: p === configForm.province ? '600' : '400',
                    }}>{p}</Text>
                  ))}
                </View>
              </View>
            )}

            {/* 30-day price range */}
            {loadingHistory ? (
              <View style={{ textAlign: 'center', padding: '16px' }}>
                <Text style={{ color: '#9ca3af', fontSize: '13px' }}>加载历史数据中...</Text>
              </View>
            ) : priceStats ? (
              <View style={{ background: '#fafafa', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <Text style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
                  近30天价格区间（{priceStats.count}天数据）
                </Text>
                <View style={{ display: 'flex', gap: '12px' }}>
                  <View style={{ flex: 1, textAlign: 'center', background: '#f0fdf4', borderRadius: '8px', padding: '8px' }}>
                    <Text style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>最低价</Text>
                    <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d', display: 'block' }}>{priceStats.min}</Text>
                  </View>
                  <View style={{ flex: 1, textAlign: 'center', background: '#fef2f2', borderRadius: '8px', padding: '8px' }}>
                    <Text style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>当前价</Text>
                    <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', display: 'block' }}>{priceStats.current}</Text>
                  </View>
                  <View style={{ flex: 1, textAlign: 'center', background: '#fff7ed', borderRadius: '8px', padding: '8px' }}>
                    <Text style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>最高价</Text>
                    <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#c2410c', display: 'block' }}>{priceStats.max}</Text>
                  </View>
                </View>
                {priceStats.current === priceStats.min && (
                  <Text style={{ marginTop: '8px', display: 'block', textAlign: 'center', fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
                    📉 当前处于30天最低价，适合加油！
                  </Text>
                )}
                {priceStats.current === priceStats.max && (
                  <Text style={{ marginTop: '8px', display: 'block', textAlign: 'center', fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                    📈 当前处于30天最高价，谨慎加油
                  </Text>
                )}
                {priceStats.current !== priceStats.min && priceStats.current !== priceStats.max && (
                  <Text style={{ marginTop: '8px', display: 'block', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                    处于正常区间，关注即可
                  </Text>
                )}
              </View>
            ) : (
              <View style={{ textAlign: 'center', padding: '16px', marginBottom: '16px' }}>
                <Text style={{ color: '#9ca3af', fontSize: '13px' }}>暂无30天历史数据</Text>
              </View>
            )}

            {/* Buttons */}
            {remindConfig ? (
              <View style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={clearRemindConfig} style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', borderRadius: '8px', fontSize: '14px' }}>
                  取消提醒
                </Button>
                <Button onClick={saveRemindConfig} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', borderRadius: '8px', fontSize: '14px' }}>
                  保存修改
                </Button>
              </View>
            ) : (
              <Button
                onClick={saveRemindConfig}
                disabled={!priceStats}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: priceStats ? '#10b981' : '#9ca3af',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                开启油价提醒
              </Button>
            )}

            <Button
              onClick={() => setShowRemindModal(false)}
              style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#f3f4f6', color: '#374151', borderRadius: '8px', fontSize: '14px' }}
            >
              关闭
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}

export default MyPage