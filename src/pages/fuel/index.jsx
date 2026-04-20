import React, { useState, useEffect, useRef, useMemo, useContext } from 'react'
import { View, Text, Button, Input, Picker, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import * as echarts from 'echarts'
import { AppContext } from '../../app'
import { VehicleManager, VehicleEditModal } from '../../components/VehicleComponents'
import {
  getVehicles,
  getSelectedVehicleId,
  setSelectedVehicleId,
  getFuelRecords,
  addFuelRecord,
  deleteFuelRecord,
  updateFuelRecord,
  recalcVehicleConsumption,
} from '../../utils/vehicles'
import './index.css'

const FUEL_RECORDS_KEY = 'fuel_records'

export default function FuelPage() {
  const { user } = useContext(AppContext)
  const [records, setRecords] = useState([])
  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState(getSelectedVehicleId() || '')
  const [form, setForm] = useState({ date: '', distance: '', amount: '', price: '' })
  const [editingRecord, setEditingRecord] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [showVehicleEdit, setShowVehicleEdit] = useState(false)
  const fuelChartRef = useRef(null)
  const fuelChartInstance = useRef(null)

  // Load records from Taro storage
  useEffect(() => {
    const stored = Taro.getStorageSync(FUEL_RECORDS_KEY)
    if (stored) {
      setRecords(JSON.parse(stored))
    } else {
      // Initialize with mock data
      const mockData = [
        { id: 'mock-1', vehicleId: null, date: '2026-03-15', distance: 520, amount: 42, price: 328, consumption: '8.9' },
        { id: 'mock-2', vehicleId: null, date: '2026-03-10', distance: 480, amount: 38, price: 298, consumption: '9.2' },
      ]
      setRecords(mockData)
      Taro.setStorageSync(FUEL_RECORDS_KEY, JSON.stringify(mockData))
    }
  }, [])

  // Persist records to Taro storage
  const saveRecords = (data) => {
    Taro.setStorageSync(FUEL_RECORDS_KEY, JSON.stringify(data))
    setRecords(data)
  }

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
    const lastRecord = recs.length > 0 ? recs[recs.length - 1] : null
    const totalKm = lastRecord ? (parseFloat(lastRecord.distance) || 0) : 0
    const avgConsumption = totalKm > 0 ? (totalFuel / totalKm * 100).toFixed(1) : '--'
    const avgCostPerRecord = recs.length > 0 ? (totalCost / recs.length).toFixed(0) : '--'
    return {
      totalRecords: recs.length,
      totalKm,
      totalFuel: totalFuel.toFixed(1),
      totalCost: totalCost.toFixed(0),
      avgConsumption,
      avgCostPerRecord,
    }
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
        formatter: p => `${p[0].name}<br/><b>${p[0].value}</b> L/100km`,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 30 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { fontSize: 10, color: '#9ca3af', formatter: v => v.toFixed(1) },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [{
        name: '油耗',
        type: 'line',
        smooth: true,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59,130,246,0.1)' },
        data: consumptions,
        connectNulls: true,
      }],
    }
    fuelChartInstance.current = echarts.init(fuelChartRef.current)
    fuelChartInstance.current.setOption(option, true)
  }, [filteredRecords])

  // 响应式
  useEffect(() => {
    const h = () => fuelChartInstance.current?.resize()
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const handleSubmit = () => {
    if (!validateForm()) return

    if (editingRecord) {
      const vehicleRecords = getFuelRecords()
        .filter(r => r.vehicleId === selectedVehicleId)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      const editIdx = vehicleRecords.findIndex(r => r.id === editingRecord.id)
      const prevRecord = editIdx > 0 ? vehicleRecords[editIdx - 1] : null
      const prevDist = prevRecord ? parseFloat(prevRecord.distance) : 0
      const currDist = parseFloat(form.distance)
      const deltaKm = currDist - prevDist
      const consumption = deltaKm > 0 ? ((parseFloat(form.amount) / deltaKm) * 100).toFixed(2) : ''

      const updated = updateFuelRecord(editingRecord.id, {
        vehicleId: selectedVehicleId,
        date: form.date,
        distance: form.distance,
        amount: form.amount,
        price: form.price,
        consumption,
      })
      recalcVehicleConsumption(selectedVehicleId)
      const newRecords = getFuelRecords()
      saveRecords(newRecords)
      setEditingRecord(null)
      clearForm()
    } else {
      const vehicleRecords = getFuelRecords()
        .filter(r => r.vehicleId === selectedVehicleId)
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
      const newRecords = getFuelRecords()
      saveRecords(newRecords)
      clearForm()
    }
  }

  const handleDeleteRecord = (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条加油记录吗？',
      success: (res) => {
        if (res.confirm) {
          deleteFuelRecord(id)
          const newRecords = getFuelRecords()
          saveRecords(newRecords)
          Taro.showToast({ title: '已删除', icon: 'success' })
        }
      },
    })
  }

  const handleEditRecord = (r) => {
    setEditingRecord(r)
    setForm({ date: r.date, distance: String(r.distance), amount: String(r.amount), price: String(r.price) })
    setSelectedVehicleId(r.vehicleId || '')
    setFormErrors({})
  }

  const stats = calcFuelStats()
  const vehicles = getVehicles()

  const today = new Date().toISOString().split('T')[0]

  return (
    <ScrollView className="page" scrollY>
      {/* 车辆选择器 */}
      <View className="vehicle-selector-row">
        <Picker
          mode="selector"
          range={vehicles}
          rangeKey="name"
          value={selectedVehicleId ? vehicles.findIndex(v => v.id === selectedVehicleId) : 0}
          onChange={e => {
            const idx = e.detail.value
            if (vehicles[idx]) {
              setSelectedVehicleId(vehicles[idx].id)
            }
          }}
        >
          <View className="vehicle-picker">
            <Text className="picker-label">🚗 绑定车辆</Text>
            <Text className="picker-value">
              {selectedVehicleId
                ? (vehicles.find(v => v.id === selectedVehicleId)?.name || '选择车辆')
                : '选择车辆'}
            </Text>
          </View>
        </Picker>
        <Button className="btn-manage-vehicle" onClick={() => setShowVehicleEdit(true)}>管理车辆</Button>
      </View>

      {formErrors.vehicle && <View className="error-text">{formErrors.vehicle}</View>}

      {/* 统计卡片 */}
      {stats && (
        <View className="stats">
          <View className="stat-card">
            <Text className="stat-value" style={{ color: '#3b82f6' }}>{stats.avgConsumption}</Text>
            <Text className="stat-label">百公里油耗(L)</Text>
          </View>
          <View className="stat-card">
            <Text className="stat-value" style={{ color: '#10b981' }}>¥{stats.avgCostPerRecord}</Text>
            <Text className="stat-label">平均单次(元)</Text>
          </View>
          <View className="stat-card">
            <Text className="stat-value" style={{ color: '#6b7280' }}>{stats.totalKm}</Text>
            <Text className="stat-label">累计公里</Text>
          </View>
          <View className="stat-card">
            <Text className="stat-value" style={{ color: '#f59e0b' }}>{stats.totalFuel}</Text>
            <Text className="stat-label">累计加油(L)</Text>
          </View>
        </View>
      )}

      {/* 油耗历史曲线 */}
      {filteredRecords.length >= 2 && (
        <View className="card">
          <View className="card-title">📈 油耗曲线</View>
          <View ref={fuelChartRef} style={{ width: '100%', height: '200px' }} />
        </View>
      )}

      {/* 添加记录表单 */}
      <View className="card">
        <View className="card-title">{editingRecord ? '✏️ 编辑加油记录' : '📝 添加加油记录'}</View>

        {/* 日期 */}
        <View className="form-item">
          <Text className="label">日期</Text>
          <Picker mode="date" value={form.date} end={today} onChange={e => {
            setForm(f => ({ ...f, date: e.detail.value }))
            setFormErrors(err => ({ ...err, date: '' }))
          }}>
            <View className={`picker ${formErrors.date ? 'error-border' : ''}`}>
              {form.date || '选择日期'}
            </View>
          </Picker>
          {formErrors.date && <Text className="error-text">{formErrors.date}</Text>}
        </View>

        {/* 里程 */}
        <View className="form-item">
          <Text className="label">里程 (km)</Text>
          <Input
            type="number"
            placeholder={`里程（当前车辆最大: ${maxDistanceForSelectedVehicle > 0 ? maxDistanceForSelectedVehicle + ' km' : '无'}）`}
            value={form.distance}
            onInput={e => {
              setForm(f => ({ ...f, distance: e.detail.value }))
              setFormErrors(err => ({ ...err, distance: '' }))
            }}
            className={`input ${formErrors.distance ? 'error-border' : ''}`}
          />
          {formErrors.distance && <Text className="error-text">{formErrors.distance}</Text>}
        </View>

        {/* 油量和油费 */}
        <View className="form-row">
          <View className="form-item" style={{ flex: 1 }}>
            <Text className="label">油量 (L)</Text>
            <Input
              type="number"
              placeholder="油量 (L)"
              value={form.amount}
              onInput={e => {
                setForm(f => ({ ...f, amount: e.detail.value }))
                setFormErrors(err => ({ ...err, amount: '' }))
              }}
              className={`input ${formErrors.amount ? 'error-border' : ''}`}
            />
            {formErrors.amount && <Text className="error-text">{formErrors.amount}</Text>}
          </View>
          <View className="form-item" style={{ flex: 1, marginLeft: '10px' }}>
            <Text className="label">油费 (元)</Text>
            <Input
              type="number"
              placeholder="油费 (元)"
              value={form.price}
              onInput={e => {
                setForm(f => ({ ...f, price: e.detail.value }))
                setFormErrors(err => ({ ...err, price: '' }))
              }}
              className={`input ${formErrors.price ? 'error-border' : ''}`}
            />
            {formErrors.price && <Text className="error-text">{formErrors.price}</Text>}
          </View>
        </View>

        {/* 计算油价 */}
        {computedPricePerL !== null && (
          <View className="computed-price">
            计算油价：<Text style={{ color: '#2563eb', fontWeight: '600' }}>{computedPricePerL}</Text> 元/升
          </View>
        )}

        <Button
          className={`btn-submit ${editingRecord ? 'btn-edit' : ''}`}
          onClick={handleSubmit}
        >
          {editingRecord ? '✏️ 保存修改' : '+ 添加记录'}
        </Button>

        {editingRecord && (
          <Button
            className="btn-cancel"
            onClick={() => { setEditingRecord(null); clearForm() }}
          >
            取消编辑
          </Button>
        )}
      </View>

      {/* 记录列表 */}
      {filteredRecords.length > 0 ? (
        <View className="card">
          <View className="card-header">
            <Text className="card-title">加油记录</Text>
            <Text className="count">共 {filteredRecords.length} 条</Text>
          </View>
          {filteredRecords.map((r, i) => {
            const vehicle = vehicles.find(v => v.id === r.vehicleId)
            return (
              <View key={r.id} className="record-row">
                <View className="record-info">
                  <View className="record-date-row">
                    <Text className="record-date">{r.date}</Text>
                    {vehicle && (
                      <Text className="vehicle-tag">{vehicle.name}</Text>
                    )}
                  </View>
                  <Text className="record-detail">{r.distance}km · {r.amount}L · ¥{r.price}</Text>
                </View>
                <View className="record-right">
                  <View className="record-consumption">
                    <Text className="consumption-value">{r.consumption || '--'}</Text>
                    <Text className="consumption-unit">L/100km</Text>
                  </View>
                  <View className="record-actions">
                    <Text className="action-btn" onClick={() => handleEditRecord(r)}>✏️</Text>
                    <Text className="action-btn delete" onClick={() => handleDeleteRecord(r.id)}>🗑️</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      ) : (
        <View className="empty-state">
          暂无记录，添加您的第一条油耗数据
        </View>
      )}

      {/* 车辆管理弹窗 */}
      {showVehicleEdit && (
        <VehicleEditModal
          vehicle={null}
          onClose={() => setShowVehicleEdit(false)}
          onSaved={() => {}}
        />
      )}

      <View style={{ height: '80px' }} />
    </ScrollView>
  )
}