import React, { useState, useEffect } from 'react'
import { View, Text, Button, Input, Picker, Modal } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

const STORAGE_KEY = 'oil_fuel_records'

interface FuelRecord {
  date: string
  km: number
  fuel: number
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

  // 计算百公里油耗
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

  // 添加记录
  const addRecord = () => {
    const r = newRecord
    if (!r.date || !r.km || !r.fuel || !r.price) {
      Taro.showToast({ title: '请填写完整', icon: 'none' })
      return
    }
    
    const newData = [{
      date: r.date,
      km: parseFloat(r.km),
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
