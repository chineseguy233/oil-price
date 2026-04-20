import React, { useState, useEffect } from 'react'
import { View, Text, Button, Input, Picker, Modal } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

// ========== 数据存储 ==========
//
// storage key: 'oil_fuel_records'
// 数据结构（newest-first，按日期倒序）:
//   { date, km, fuel, pricePerL, price }
//     date       — 加油日期 'YYYY-MM-DD'
//     km         — 仪表盘累计读数（公里），只增不减，用于计算油耗区间
//     fuel       — 本次加油量（升）
//     pricePerL  — 单价（元/升），可不填，由 price/fuel 反推
//     price      — 本次总价（元）
//
// 重要：km 是仪表盘读数（绝对值），不是"本次行驶里程"。
//       例如：3月10日 km=480，3月15日 km=520 → 本次行驶 520-480=40km
//       添加记录时，新 km 必须大于已有记录的最大 km（不管日期顺序）
//
// 油耗计算 avgConsumption():
//   公式：总油量 / 总里程 * 100
//   使用 records[1..n] 而非 records[0..n]：
//     records[0] 是最新记录，没有"下一次里程"来算最后一段油耗区间
//     从 records[1] 开始，每条都能找到前一条 records[i-1] 的 km 做起点

const STORAGE_KEY = 'oil_fuel_records'

interface FuelRecord {
  date: string
  km: number   // 仪表盘累计读数（绝对值，只增不减）
  fuel: number  // 本次加油量（升）
  pricePerL: number
  price: number
}

export default function FuelPage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newRecord, setNewRecord] = useState({
    date: '',
    km: '',
    fuel: '',
    pricePerL: '',
    price: ''
  })

  // 读取本地存储
  useEffect(() => {
    const stored = Taro.getStorageSync(STORAGE_KEY)
    if (stored) {
      setRecords(JSON.parse(stored))
    } else {
      // 初始化mock数据
      const mockData = [
        { date: '2026-03-15', km: 520, fuel: 42, pricePerL: 7.8, price: 328 },
        { date: '2026-03-10', km: 480, fuel: 38, pricePerL: 7.8, price: 298 },
      ]
      setRecords(mockData)
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(mockData))
    }
  }, [])

  // 保存到本地存储
  const saveRecords = (data: FuelRecord[]) => {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data))
    setRecords(data)
  }

  // ========== 计算百公里油耗 ==========
  //
  // 原理：用 records[1..n] 之间的油量和里程计算。
  //   records[1]: km=480, fuel=38  → 从 km=480 到 km=520 烧了 38L
  //   records[0]: km=520, fuel=42  → 最新记录，尾段油耗无法计算（不知道下次加了多少）
  //
  // 公式：∑(records[i].fuel) / ∑(records[i].km - records[i-1].km) * 100
  const avgConsumption = () => {
    if (records.length < 2) return '--'
    let totalFuel = 0
    let totalKm = 0
    for (let i = 1; i < records.length; i++) {
      totalFuel += records[i].fuel
      totalKm += records[i].km
    }
    if (totalKm === 0) return '--'
    return (totalFuel / totalKm * 100).toFixed(1)
  }

  // 计算平均花费
  const avgCost = () => {
    if (records.length === 0) return '--'
    const total = records.reduce((a, b) => a + b.price, 0)
    return (total / records.length).toFixed(0)
  }

  // ========== 添加记录 ==========
  //
  // 校验规则（km 语义：仪表盘累计读数）：
  //   1. 必填字段：date, km, fuel, price
  //   2. 新 km > 所有已有记录的最大 km（仪表盘只增不减，不受日期顺序影响）
  //      例：先加 4/2 的 200km，再加 3/20 的 120km → 拒绝（120 < 200）
  //      例：先加 4/2 的 200km，再加 4/5 的 300km → 接受（300 > 200）
  //
  // 数据写入：unshift（插入数组头部），保持 newest-first 顺序
  const addRecord = () => {
    const r = newRecord
    if (!r.date || !r.km || !r.fuel || !r.price) {
      Taro.showToast({ title: '请填写完整', icon: 'none' })
      return
    }

    const newKm = parseFloat(r.km)
    const newDate = r.date

    // 校验：里程（仪表盘读数）只增不减，不受日期顺序影响
    if (records.length > 0) {
      const maxKm = Math.max(...records.map(r => r.km))
      if (newKm <= maxKm) {
        Taro.showToast({ title: '里程数应大于仪表盘读数', icon: 'none' })
        return
      }
    }

    const newData = [{
      date: newDate,
      km: newKm,
      fuel: parseFloat(r.fuel),
      pricePerL: parseFloat(r.pricePerL) || (parseFloat(r.price) / parseFloat(r.fuel)),
      price: parseFloat(r.price)
    }, ...records]

    saveRecords(newData)
    setShowModal(false)
    setNewRecord({ date: '', km: '', fuel: '', pricePerL: '', price: '' })
    Taro.showToast({ title: '添加成功', icon: 'success' })
  }

  // 删除记录
  const deleteRecord = (index: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const newData = [...records]
          newData.splice(index, 1)
          saveRecords(newData)
          Taro.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }

  // 日期选择
  const onDateChange = (e) => {
    setNewRecord({ ...newRecord, date: e.detail.value })
  }

  return (
    <View className="page">
      {/* 统计卡片 */}
      <View className="stats">
        <View className="stat-card">
          <View className="value">{avgConsumption()}</View>
          <View className="label">百公里油耗(L)</View>
        </View>
        <View className="stat-card">
          <View className="value">¥{avgCost()}</View>
          <View className="label">平均单次(元)</View>
        </View>
      </View>

      {/* 加油记录列表 */}
      <View className="card">
        <View className="title">加油记录 <Text className="count">({records.length})</Text></View>
        
        {records.length === 0 && (
          <View className="empty">暂无记录，点击下方按钮添加</View>
        )}
        
        {records.map((r, i) => (
          <View key={i} className="record-row">
            <View>
              <View className="date">{r.date}</View>
              <View className="detail">行驶 {r.km} 公里 · 加 {r.fuel}L · 单价¥{r.pricePerL}</View>
            </View>
            <View className="right">
              <View className="price">¥{r.price}</View>
              <View className="delete-btn" onClick={() => deleteRecord(i)}>删除</View>
            </View>
          </View>
        ))}
      </View>

      {/* 记录加油按钮 */}
      <Button className="btn-add" onClick={() => setShowModal(true)}>+ 记录加油</Button>

      {/* 添加记录弹窗 */}
      {showModal && (
        <View className="modal-mask" onClick={() => setShowModal(false)}>
          <View className="modal" onClick={e => e.stopPropagation()}>
            <View className="modal-title">添加加油记录</View>
            
            <View className="form-item">
              <View className="label">日期</View>
              <Picker mode="date" value={newRecord.date} onChange={onDateChange}>
                <View className="picker">{newRecord.date || '选择日期'}</View>
              </Picker>
            </View>
            
            <View className="form-item">
              <View className="label">行驶里程(公里)</View>
              <Input type="number" value={newRecord.km} onInput={e => setNewRecord({...newRecord, km: e.detail.value})} placeholder="上次加油后行驶的里程" />
            </View>
            
            <View className="form-item">
              <View className="label">加油量(升)</View>
              <Input type="number" value={newRecord.fuel} onInput={e => setNewRecord({...newRecord, fuel: e.detail.value})} placeholder="本次加油的升数" />
            </View>
            
            <View className="form-item">
              <View className="label">油价(元/升)</View>
              <Input type="number" value={newRecord.pricePerL} onInput={e => setNewRecord({...newRecord, pricePerL: e.detail.value})} placeholder="单价" />
            </View>
            
            <View className="form-item">
              <View className="label">总价(元)</View>
              <Input type="number" value={newRecord.price} onInput={e => setNewRecord({...newRecord, price: e.detail.value})} placeholder="总价" />
            </View>
            
            <View className="modal-btns">
              <Button className="btn-cancel" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="btn-confirm" onClick={addRecord}>保存</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
