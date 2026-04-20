/**
 * 车辆管理工具函数
 *
 * 数据存储在 localStorage，两个 key：
 *   my_vehicles          — 车辆列表（数组）
 *   selected_vehicle_id  — 当前选中车辆 ID（字符串）
 *
 * 车辆数据结构：
 *   { id, name, oilType, fuelConsumption, createdAt }
 *     id              — 唯一标识，generateId() 生成
 *     name            — 车辆名称（如"我的车"）
 *     oilType         — 油号（'92'|'95'|'98'|'0'）
 *     fuelConsumption — 油耗（升/百公里），小数
 *     createdAt       — 创建时间戳
 *
 * 油耗记录（fuel_records）与车辆的关系：
 *   - 记录通过 vehicleId 关联到某辆车
 *   - 一辆车可以有多条加油记录
 *   - recalcVehicleConsumption() 根据历史记录重新计算该车油耗，更新到 my_vehicles
 *
 * 选中状态：
 *   - selected_vehicle_id 只是一个 ID，不是对象
 *   - getSelectedVehicle() 负责把 ID → 完整车辆对象
 *   - 删车时如果删的是当前选中，自动清除选中状态
 */

const STORAGE_KEYS = {
  VEHICLES: 'my_vehicles',
  SELECTED: 'selected_vehicle_id',
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ========== 读取 ==========

export function getVehicles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VEHICLES) || '[]')
  } catch {
    return []
  }
}

// ========== 新增 ==========

export function addVehicle({ name, oilType, fuelConsumption }) {
  const vehicles = getVehicles()
  const newVehicle = {
    id: generateId(),
    name: name.trim(),
    oilType: String(oilType),
    fuelConsumption: parseFloat(fuelConsumption),
    createdAt: Date.now(),
  }
  vehicles.unshift(newVehicle)
  localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles))
  // 自动选中新增的车辆
  localStorage.setItem(STORAGE_KEYS.SELECTED, newVehicle.id)
  return newVehicle
}

// ========== 更新 ==========

export function updateVehicle(id, updates) {
  const vehicles = getVehicles()
  const index = vehicles.findIndex(v => v.id === id)
  if (index === -1) return null
  vehicles[index] = {
    ...vehicles[index],
    ...updates,
    fuelConsumption: parseFloat(updates.fuelConsumption ?? vehicles[index].fuelConsumption),
    oilType: updates.oilType !== undefined ? String(updates.oilType) : vehicles[index].oilType,
    name: updates.name ? updates.name.trim() : vehicles[index].name,
  }
  localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles))
  return vehicles[index]
}

// ========== 删除 ==========

export function deleteVehicle(id) {
  const vehicles = getVehicles()
  const filtered = vehicles.filter(v => v.id !== id)
  localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(filtered))
  // 如果删的是当前选中，恢复未选中状态
  if (getSelectedVehicleId() === id) {
    localStorage.removeItem(STORAGE_KEYS.SELECTED)
  }
}

// ========== 选中状态 ==========

export function getSelectedVehicleId() {
  return localStorage.getItem(STORAGE_KEYS.SELECTED) || null
}

export function setSelectedVehicleId(id) {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEYS.SELECTED)
  } else {
    localStorage.setItem(STORAGE_KEYS.SELECTED, String(id))
  }
}

export function getSelectedVehicle() {
  const id = getSelectedVehicleId()
  if (!id) return null
  const vehicles = getVehicles()
  return vehicles.find(v => v.id === id) || null
}

// ========== 油耗记录 ==========

const FUEL_RECORDS_KEY = 'fuel_records'

export function getFuelRecords() {
  try {
    return JSON.parse(localStorage.getItem(FUEL_RECORDS_KEY) || '[]')
  } catch {
    return []
  }
}

export function addFuelRecord({ vehicleId, date, distance, amount, price, consumption }) {
  const records = getFuelRecords()
  const newRecord = {
    id: generateId(),
    vehicleId: vehicleId || null,
    date,
    distance: parseFloat(distance),
    amount: parseFloat(amount),
    price: price ? parseFloat(price) : 0,
    consumption,
    createdAt: Date.now(),
  }
  records.unshift(newRecord)
  localStorage.setItem(FUEL_RECORDS_KEY, JSON.stringify(records))
  return newRecord
}

export function deleteFuelRecord(id) {
  const records = getFuelRecords()
  const filtered = records.filter(r => r.id !== id)
  localStorage.setItem(FUEL_RECORDS_KEY, JSON.stringify(filtered))
}

export function updateFuelRecord(id, updates) {
  const records = getFuelRecords()
  const index = records.findIndex(r => r.id === id)
  if (index === -1) return null
  records[index] = {
    ...records[index],
    ...updates,
    distance: updates.distance !== undefined ? parseFloat(updates.distance) : records[index].distance,
    amount: updates.amount !== undefined ? parseFloat(updates.amount) : records[index].amount,
    price: updates.price !== undefined ? parseFloat(updates.price) : records[index].price,
    consumption: updates.consumption !== undefined ? updates.consumption : records[index].consumption,
  }
  localStorage.setItem(FUEL_RECORDS_KEY, JSON.stringify(records))
  return records[index]
}

// ========== 根据油耗记录自动更新车辆油耗 ==========
//
// recalcVehicleConsumption 的计算逻辑（与 fuel/index.tsx 的 avgConsumption 保持一致）：
//
//   1. 取出该车的所有加油记录，按日期升序排序
//   2. 从 records[1] 开始遍历（跳过最新记录，理由同上）
//      第 i 条记录：本次加油 fuel[i]，从 km[i-1] 到 km[i] 烧的油
//   3. 总油耗 / 总里程 * 100 = 百公里油耗
//
//   例：records = [
//     { date:'3/15', km:520, fuel:42 },
//     { date:'3/10', km:480, fuel:38 },
//   ]
//   → 本次行驶 520-480=40km，烧了 38L
//   → 38/40*100 = 9.5L/100km
//
// 特殊情况：
//   - 只有一条记录：无法算里程区间，直接用该记录的 consumption 字段
//   - 总里程 deltaKm=0（两条记录 km 相同）：跳过该段
//
// 更新策略：计算结果四舍五入到 0.1L，更新到 my_vehicles 中该车的 fuelConsumption
export function recalcVehicleConsumption(vehicleId) {
  if (!vehicleId) return null
  const records = getFuelRecords()
    .filter(r => r.vehicleId === vehicleId && r.consumption && parseFloat(r.consumption) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (records.length === 0) return null

  // 方式：加权平均（按里程权重），总油耗/总里程*100
  let totalFuel = 0, totalKm = 0
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1]
    const curr = records[i]
    const deltaKm = parseFloat(curr.distance) - parseFloat(prev.distance)
    if (deltaKm > 0) {
      totalFuel += parseFloat(curr.amount)
      totalKm += deltaKm
    }
  }
  // 如果只有一条记录，用它自己的 consumption
  if (totalKm === 0 && records.length >= 1) {
    const r = records[records.length - 1]
    const c = parseFloat(r.consumption)
    if (c > 0) {
      updateVehicle(vehicleId, { fuelConsumption: c })
      return c
    }
    return null
  }

  if (totalKm === 0) return null
  const avg = (totalFuel / totalKm) * 100
  const rounded = Math.round(avg * 10) / 10
  updateVehicle(vehicleId, { fuelConsumption: rounded })
  return rounded
}
