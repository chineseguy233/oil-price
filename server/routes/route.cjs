const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const AMAP_KEY = '6e5eadd96b048804120c4fa2cbad220f';
const OIL_PRICES_FILE = path.join(__dirname, '../../data/oil_prices.json');

// ============ 节假日判断 ============

const HOLIDAYS_2026 = [
  { name: '元旦', start: '2026-01-01', end: '2026-01-03' },
  { name: '春节', start: '2026-01-28', end: '2026-02-03' },  // 农历正月初一
  { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
  { name: '劳动节', start: '2026-05-01', end: '2026-05-05' },
  { name: '端午节', start: '2026-05-31', end: '2026-06-02' },
  { name: '中秋节', start: '2026-10-01', end: '2026-10-08' },
  { name: '国庆节', start: '2026-10-01', end: '2026-10-07' },
];

const HOLIDAY_EXPRESSWAY_FREE = ['元旦', '清明节', '劳动节', '端午节', '国庆节', '春节'];

function isExpresswayFree(dateStr) {
  // dateStr: 'YYYY-MM-DD'
  const d = new Date(dateStr);
  for (const h of HOLIDAYS_2026) {
    const start = new Date(h.start);
    const end = new Date(h.end);
    if (d >= start && d <= end && HOLIDAY_EXPRESSWAY_FREE.includes(h.name)) {
      return { free: true, holiday: h.name };
    }
  }
  return { free: false, holiday: null };
}

// ============ 油价数据 ============

function getOilPrices() {
  try {
    if (fs.existsSync(OIL_PRICES_FILE)) {
      return JSON.parse(fs.readFileSync(OIL_PRICES_FILE, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

// ============ 高德 API 调用 ============

async function amapGeocode(address) {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&output=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
    throw new Error(data.info || `地理编码失败: ${address}`);
  }
  const g = data.geocodes[0];
  const [lng, lat] = g.location.split(',').map(Number);
  return { lng, lat, province: g.province, city: g.city, adcode: g.adcode };
}

async function amapReverseGeocode(lng, lat) {
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base&output=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== '1' || !data.regeocode) {
    throw new Error(data.info || '逆地理编码失败');
  }
  const addr = data.regeocode.addressComponent;
  return {
    province: addr.province || '',
    city: addr.city || '',
    district: addr.district || '',
    adcode: addr.adcode || '',
  };
}

async function amapDriving(origin, destination) {
  // origin/destination: "lng,lat"
  const url = `https://restapi.amap.com/v3/direction/driving?key=${AMAP_KEY}&origin=${origin}&destination=${destination}&output=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== '1') {
    throw new Error(data.info || '路线规划失败');
  }
  const routes = data.route || {};
  const path = routes.paths || [];
  if (path.length === 0) {
    throw new Error('未找到可行路线');
  }
  // 取最优路线（默认第一条）
  const best = path[0];
  return {
    totalDistance: parseInt(best.distance) || 0,      // 米
    totalDuration: parseInt(best.time || 0) || 0,       // 秒（高德有时返回 null）
    strategy: best.strategy || '',
    steps: (best.steps || []).map(s => ({
      instruction: s.instruction || '',
      distance: parseInt(s.distance) || 0,           // 米
      tolls: parseInt(s.tolls) || 0,                  // 元
      tollsDistance: parseInt(s.tolls_distance) || 0, // 收费路段距离 米
      road: s.road || '',
      // 高德返回的路线坐标串，每两步一个节点
      // 提取途径城市/省份信息用得上
      polyline: s.polyline || '',
    })),
  };
}

// ============ 途经省份分析 ============

// 省份名称标准化映射（高德返回的省份名 → oil_prices.json 的省份名）
const PROVINCE_MAP = {
  '北京市': '北京', '上海市': '上海', '天津市': '天津', '重庆市': '重庆',
  '河北省': '河北', '山西省': '山西', '辽宁省': '辽宁', '吉林省': '吉林',
  '黑龙江省': '黑龙江', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
  '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
  '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '海南省': '海南',
  '四川省': '四川', '贵州省': '贵州', '云南省': '云南', '陕西省': '陕西',
  '甘肃省': '甘肃', '青海省': '青海', '内蒙古自治区': '内蒙古',
  '广西壮族自治区': '广西', '西藏自治区': '西藏', '宁夏回族自治区': '宁夏',
  '新疆维吾尔自治区': '新疆',
};

function normalizeProvince(p) {
  return PROVINCE_MAP[p] || p;
}

// 收集路线上足够分散的采样点，用于判断途经省份
// 高德 driving 返回的 steps 里的 polyline 是 "lng,lat;lng,lat;..." 格式
function extractSamplingPoints(steps) {
  const points = [];
  for (const step of steps) {
    if (!step.polyline) continue;
    const coords = step.polyline.split(';');
    // 每隔一段取一个点，避免采样过多
    const stepSize = Math.max(1, Math.floor(coords.length / 3));
    for (let i = 0; i < coords.length; i += stepSize) {
      const [lng, lat] = coords[i].split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat)) points.push({ lng, lat });
    }
  }
  return points;
}

// ============ 核心计算 ============

async function calculateRouteOilCost({ from, to, oil_type = '92', fuel_consumption = 7.5 }) {
  // 1. 地理编码起点终点
  const fromGeo = await amapGeocode(from);
  const toGeo = await amapGeocode(to);

  // 2. 路线规划
  const route = await amapDriving(`${fromGeo.lng},${fromGeo.lat}`, `${toGeo.lng},${toGeo.lat}`);

  // 3. 采样路线上的点，逆地理编码获取途经省份
  const samplingPoints = extractSamplingPoints(route.steps);
  const provinceSet = new Set();
  provinceSet.add(normalizeProvince(fromGeo.province));
  provinceSet.add(normalizeProvince(toGeo.province));

  // 对采样点按距离权重逆地理编码（避免过多 API 调用，最多 8 个采样点）
  const sampled = samplingPoints.length > 8
    ? samplingPoints.filter((_, i) => i % Math.ceil(samplingPoints.length / 8) === 0).slice(0, 8)
    : samplingPoints;

  await Promise.all(sampled.map(async (pt) => {
    try {
      const geo = await amapReverseGeocode(pt.lng, pt.lat);
      const p = normalizeProvince(geo.province);
      if (p) provinceSet.add(p);
    } catch (e) { /* 忽略单点失败 */ }
  }));

  const provinces_crossed = Array.from(provinceSet);

  // 4. 取各省油价
  const oilData = getOilPrices();
  const pricesRoot = oilData?.prices || oilData || {};
  const province_prices = {};
  let total_price_weight = 0; // 加权油价和
  let total_distance = route.totalDistance; // 米

  for (const prov of provinces_crossed) {
    const price = pricesRoot[prov]?.[oil_type] ?? null;
    province_prices[prov] = price;
  }

  // 5. 计算油费：按各省里程比例加权
  // 由于没有分省里程数据，用简化方式：起点省油价值起点段，终点省油价值终点段，中间用平均
  // 精确实现：按采样点的省份分布来估算各省里程比例
  // 简化版：假设各省均匀分布，按省份数量平均
  const validProvinces = provinces_crossed.filter(p => province_prices[p] !== null);
  const avgPrice = validProvinces.length > 0
    ? validProvinces.reduce((sum, p) => sum + province_prices[p], 0) / validProvinces.length
    : null;

  let oil_cost = null;
  if (avgPrice !== null && total_distance > 0) {
    const distance_km = total_distance / 1000;
    const consumption_L = distance_km * (fuel_consumption / 100);
    oil_cost = parseFloat((consumption_L * avgPrice).toFixed(2));
  }

  // 6. 高速费估算（参考值：0.45元/公里）
  const toll_cost = parseFloat((total_distance / 1000 * 0.45).toFixed(2));

  // 7. 节假日免费判断
  const today = new Date().toISOString().split('T')[0];
  const holidayInfo = isExpresswayFree(today);
  const is_free_toll = holidayInfo.free;
  const free_toll_saving = is_free_toll ? toll_cost : 0;

  // 8. 总费用
  const total_cost = (oil_cost !== null ? oil_cost : 0) + (is_free_toll ? 0 : toll_cost);

  return {
    from: { name: from, province: normalizeProvince(fromGeo.province), lng: fromGeo.lng, lat: fromGeo.lat },
    to: { name: to, province: normalizeProvince(toGeo.province), lng: toGeo.lng, lat: toGeo.lat },
    total_km: parseFloat((total_distance / 1000).toFixed(1)),
    total_duration_min: Math.round(route.totalDuration / 60),
    strategy: route.strategy,
    provinces_crossed,
    province_prices,
    oil_cost,
    toll_cost,
    is_free_toll,
    holiday: holidayInfo.holiday,
    free_toll_saving,
    total_cost: parseFloat(total_cost.toFixed(2)),
    oil_type,
    fuel_consumption,
  };
}

// ============ API 路由 ============

router.get('/route/oil-cost', async (req, res) => {
  const { from, to, oil_type = '92', fuel_consumption = '7.5' } = req.query;

  if (!from || !to) {
    return res.status(400).json({ success: false, error: '缺少必填参数：from, to' });
  }

  const oilType = ['92', '95', '98', '0'].includes(oil_type) ? oil_type : '92';
  const fuelConsumption = parseFloat(fuel_consumption) || 7.5;

  try {
    const result = await calculateRouteOilCost({
      from, to, oil_type: oilType, fuel_consumption: fuelConsumption,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[/api/route/oil-cost]', err.message);
    // 高德 API 配额超限或其他错误
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
