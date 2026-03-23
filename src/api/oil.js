// src/api/oil.js
const API_BASE = 'http://localhost:3000/api'

export async function getOilPrices() {
  const res = await fetch(`${API_BASE}/oil-prices`)
  return res.json()
}

export async function getPriceHistory(province = '北京', days = 7) {
  const res = await fetch(`${API_BASE}/price-changes?province=${encodeURIComponent(province)}&days=${days}`)
  return res.json()
}

export async function getProvinces() {
  const res = await fetch(`${API_BASE}/provinces`)
  return res.json()
}

export async function getNearbyStations(lat, lng) {
  const res = await fetch(`${API_BASE}/stations/nearby?lat=${lat}&lng=${lng}`)
  return res.json()
}

// 登录相关API
export async function sendVerifyCode(phone) {
  const res = await fetch(`${API_BASE}/auth/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  })
  return res.json()
}

export async function loginWithCode(phone, code) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code })
  })
  return res.json()
}

export async function getUserInfo(token) {
  const res = await fetch(`${API_BASE}/user/info`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}

export async function getFuelRecords(token) {
  const res = await fetch(`${API_BASE}/sync/fuel`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.json()
}

export async function addFuelRecord(token, record) {
  const res = await fetch(`${API_BASE}/sync/fuel`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(record)
  })
  return res.json()
}
