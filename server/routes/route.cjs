const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const AMAP_KEY = '6e5eadd96b048804120c4fa2cbad220f';
const OIL_PRICES_FILE = path.join(__dirname, '../../data/oil_prices.json');

// ============ 节假日免费判断 ============
//
// 策略：动态调用万年历 API（周末+调休），结合 2026 年法定节假日区间（硬编码，超可靠）。
// - 优先请求 apihubs 万年历（返回 date=YYYYMMDD + holiday 字段）
// - 法定节假日区间从 hardcoded lookup 获取（含节假日本身+调休日）
// - Fallback：若 API 失败，直接用 hardcoded 数据
//
// 高速免费规则（交通运输部规定）：
//   小客车（7座及以下）：春节、劳动节、国庆节免费
//   大客车/货车：法定节假日无免费，按正常费率收
//   免费时段：节日第一天 00:00 至最后一天 24:00（以出站时间为准）
//

// 法定节假日区间（含调休日），按年份索引
// 结构：{ name, start:'MMDD', end:'MMDD' }  start<=date<=end → 该节假日区间
const LEGAL_HOLIDAYS = {
  2026: [
    { name: '元旦',   start: '0101', end: '0103' },  // 1月1-3日
    { name: '春节',   start: '0128', end: '0203' },  // 1月28-2月3日（2月16-23为调休上班）
    { name: '清明节', start: '0403', end: '0406' },  // 4月3-6日
    { name: '劳动节', start: '0501', end: '0505' },  // 5月1-5日
    { name: '端午节', start: '0628', end: '0630' },  // 6月28-30日
    { name: '中秋节', start: '0930', end: '1001' },  // 9月30-10月1日（连国庆）
    { name: '国庆节', start: '1001', end: '1007' },  // 10月1-7日
  ],
  2027: [
    { name: '元旦',   start: '0101', end: '0103' },
    { name: '春节',   start: '0216', end: '0222' },
    { name: '清明节', start: '0405', end: '0407' },
    { name: '劳动节', start: '0501', end: '0503' },
    { name: '端午节', start: '0618', end: '0620' },
    { name: '中秋节', start: '0925', end: '0927' },
    { name: '国庆节', start: '1001', end: '1007' },
  ],
};

// 小客车（7座及以下）在这些节日免高速费
const FREE_FOR_SMALL_CAR = new Set(['春节', '劳动节', '国庆节']);

let _holidayCache = null; // 全年 holiday map 缓存

// 从万年历 API 抓全年调休/工作日数据
async function fetchYearCalendar(year) {
  try {
    const url = `https://api.apihubs.cn/holiday/get?year=${year}&size=366`;
    const res = await fetch(url, { timeout: 5000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.code !== 0 || !data.data?.list) throw new Error('Invalid response');
    return data.data.list; // [{ date:20260101, holiday:2, holiday_legal:2, ... }, ...]
  } catch (e) {
    return null; // 网络失败，返回 null 走 fallback
  }
}

// 把日期字符串转成 MMDD
function toMMDD(dateStr) {
  // dateStr = 'YYYY-MM-DD' or 'YYYYMMDD'
  const s = dateStr.replace(/-/g, ''); // 全局替换，否则 '2026-05-01' -> '202605-01' -> '05-01' 是错的
  return s.slice(4); // '20260101' -> '0101'
}

// 判断某日期是否在法定节假日区间（含调休日）
// 先用 API 数据增强（API 成功时），API 失败则直接查 year-specific hardcoded 表
function isHolidayByDate(dateStr, calendarList, year) {
  const mmdd = toMMDD(dateStr);

  // 查找所在的节假日区间（优先用 year-specific 硬编码表）
  const holidays = LEGAL_HOLIDAYS[year];
  if (holidays) {
    for (const h of holidays) {
      if (mmdd >= h.start && mmdd <= h.end) {
        // API 增强：检查该天是否被调休（周末变工作日）→ 收费
        if (calendarList) {
          const targetDate = parseInt(dateStr.replace('-', ''));
          for (const day of calendarList) {
            if (day.date === targetDate && day.holiday_legal === 1) {
              return { free: false, holiday: null }; // 调休周末，不免费
            }
          }
        }
        return { free: true, holiday: h.name };
      }
    }
  }

  // 如果当年没有硬编码数据，且 API 失败，返回 unknown（不猜）
  if (!calendarList) {
    return { free: null, holiday: null, unknown: true };
  }

  return { free: false, holiday: null };
}

// 判断小客车是否在免费节日
function isFreeTollDay(dateStr, vehicleType, calendarList, year) {
  const info = isHolidayByDate(dateStr, calendarList, year);
  if (info.free === null && info.unknown) {
    return { free: null, holiday: null, unknown: true }; // 查不到，不猜
  }
  if (!info.free) return { free: false, holiday: null };

  if (vehicleType === 'big') {
    // 大客车/货车：只有春节免费
    return { free: info.holiday === '春节', holiday: info.holiday };
  }
  // 小客车：按 FREE_FOR_SMALL_CAR 判断
  return { free: FREE_FOR_SMALL_CAR.has(info.holiday), holiday: info.holiday };
}

// 获取/刷新全年节假日缓存
async function getHolidayCache(year) {
  if (!_holidayCache || _holidayCache.year !== year) {
    _holidayCache = { year, list: await fetchYearCalendar(year) };
  }
  return _holidayCache;
}

// 公开的免费判断接口（供 calculateRouteOilCost 使用）
async function checkFreeToll({ dateStr, vehicleType }) {
  const year = dateStr ? parseInt(dateStr.slice(0, 4)) : new Date().getFullYear();
  const cache = await getHolidayCache(year);
  return isFreeTollDay(dateStr, vehicleType, cache.list, year);
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

// ============ 高德 API ============

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

async function amapDriving(origin, destination, vehicleType) {
  // vehicleType: 'small'(default) | 'big'
  const smallCar = vehicleType === 'big' ? 0 : 1; // 1=小客车（7座及以下）高速费用5折
  const url = `https://restapi.amap.com/v3/direction/driving?key=${AMAP_KEY}&origin=${origin}&destination=${destination}&output=json&smallCar=${smallCar}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== '1') {
    throw new Error(data.info || '路线规划失败');
  }
  const routes = data.route || {};
  const pathArr = routes.paths || [];
  if (pathArr.length === 0) {
    throw new Error('未找到可行路线');
  }
  const best = pathArr[0];
  return {
    totalDistance: parseInt(best.distance) || 0,      // 米
    totalDuration: parseInt(best.time)
      || Math.round((parseInt(best.distance) || 0) / 75 * 3.6) || 0, // 秒
    strategy: best.strategy || '',
    steps: (best.steps || []).map(s => ({
      instruction: s.instruction || '',
      distance: parseInt(s.distance) || 0,           // 米
      tolls: parseFloat(s.tolls) || 0,               // 元（高德返回实值）
      tollsDistance: parseInt(s.tolls_distance) || 0, // 收费路段 米
      road: s.road || '',
      polyline: s.polyline || '',                    // "lng,lat;lng,lat;..."
    })),
  };
}

// ============ 省份工具 ============

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

// 从 steps 的 polyline 提取采样点，并返回每段距离
function extractStepsWithDistance(steps) {
  const result = [];
  for (const step of steps) {
    if (!step.polyline) {
      result.push({ ...step, province: null });
      continue;
    }
    const coords = step.polyline.split(';');
    const stepSize = Math.max(1, Math.floor(coords.length / 3));
    const points = [];
    for (let i = 0; i < coords.length; i += stepSize) {
      const [lng, lat] = coords[i].split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat)) points.push({ lng, lat });
    }
    result.push({ ...step, _samplePoints: points });
  }
  return result;
}

// ============ 核心计算 ============

async function calculateRouteOilCost({
  from, to,
  oil_type = '92',
  fuel_consumption = 7.5,
  travel_date,
  vehicle_type = 'small', // 'small' | 'big'
}) {
  const travelDate = travel_date || new Date().toISOString().split('T')[0];
  const vehicleType = vehicle_type === 'big' ? 'big' : 'small';

  // 1. 地理编码
  const fromGeo = await amapGeocode(from);
  const toGeo = await amapGeocode(to);

  // 2. 路线规划
  const route = await amapDriving(
    `${fromGeo.lng},${fromGeo.lat}`,
    `${toGeo.lng},${toGeo.lat}`,
    vehicleType,
  );

  // 3. 解析路线 steps（含坐标串），逆地理编码采样点 → 途经省份
  const totalDistance = route.totalDistance; // 米
  const stepsWithPts = extractStepsWithDistance(route.steps);

  // 收集采样点
  const allPoints = [];
  for (const step of stepsWithPts) {
    if (step._samplePoints) {
      for (const pt of step._samplePoints) {
        allPoints.push({ ...pt, stepDistance: step.distance });
      }
    }
  }

  // 限制采样数量（最多 12 个，避免 API 轰炸）
  const sampled = allPoints.length > 12
    ? allPoints.filter((_, i) => i % Math.ceil(allPoints.length / 12) === 0).slice(0, 12)
    : allPoints;

  // 一次逆地理编码，把省份直接挂到每个采样点
  const provincePointCount = {};
  const provinceSet = new Set();
  provinceSet.add(normalizeProvince(fromGeo.province));
  provinceSet.add(normalizeProvince(toGeo.province));

  for (const pt of sampled) {
    try {
      const geo = await amapReverseGeocode(pt.lng, pt.lat);
      const p = normalizeProvince(geo.province);
      if (p) {
        provinceSet.add(p);
        if (!provincePointCount[p]) provincePointCount[p] = 0;
        provincePointCount[p]++;
        pt._province = p; // 挂载到点对象上，复用结果
      }
    } catch (_) {}
  }

  const provinces_crossed = Array.from(provinceSet);

  // 4. 按里程加权各省油价
  //    方法：统计落在各省的采样点数量，按比例估算各省里程权重
  let sampledWithProvince = 0;
  for (const p of provinces_crossed) {
    if (!provincePointCount[p]) provincePointCount[p] = 0;
    sampledWithProvince += provincePointCount[p];
  }

  const oilData = getOilPrices();
  const pricesRoot = oilData?.prices || oilData || {};
  const province_prices = {};
  for (const prov of provinces_crossed) {
    province_prices[prov] = pricesRoot[prov]?.[oil_type] ?? null;
  }

  // 加权平均油价：各省油价 × (该省采样点数 / 总有效采样点) 之和
  const validProvinces = provinces_crossed.filter(p => province_prices[p] !== null);
  let weightedPrice = null;
  if (sampledWithProvince > 0 && validProvinces.length > 0) {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const p of validProvinces) {
      const weight = provincePointCount[p] || 1;
      totalWeight += weight;
      weightedSum += province_prices[p] * weight;
    }
    weightedPrice = totalWeight > 0 ? weightedSum / totalWeight : null;
  } else if (validProvinces.length > 0) {
    // 降级：采样全部失败，用简单平均
    weightedPrice = validProvinces.reduce((s, p) => s + province_prices[p], 0) / validProvinces.length;
  }

  // 5. 油费 = 里程 × 油耗率 × 加权油价
  let oil_cost = null;
  if (weightedPrice !== null && totalDistance > 0) {
    const distance_km = totalDistance / 1000;
    const consumption_L = distance_km * (fuel_consumption / 100);
    oil_cost = parseFloat((consumption_L * weightedPrice).toFixed(2));
  }

  // 6. 高速费：优先用高德 step 真实 tolls，fallback 到费率估算
  let toll_cost = 0;
  const stepTollsSum = route.steps.reduce((s, st) => s + st.tolls, 0);
  if (stepTollsSum > 0) {
    // 高德返回了真实收费数据
    toll_cost = parseFloat(stepTollsSum.toFixed(2));
  } else {
    // fallback：收费路段 × 费率（小型车 0.45元/km，大型车 0.90元/km）
    const rate = vehicleType === 'big' ? 0.90 : 0.45;
    const tollDistance = route.steps.reduce((s, st) => s + st.tollsDistance, 0);
    const tollDist_km = tollDistance > 0 ? tollDistance / 1000 : totalDistance / 1000;
    toll_cost = parseFloat((tollDist_km * rate).toFixed(2));
  }

  // 7. 节假日免费判断（动态 API + hardcoded fallback）
  const holidayInfo = await checkFreeToll({ dateStr: travelDate, vehicleType });
  const is_free_toll = holidayInfo.free;
  const free_toll_saving = is_free_toll ? toll_cost : 0;

  // 8. 总费用
  // - is_free_toll=true  →  高速免费，total不含高速费
  // - is_free_toll=false →  正常收费，total含高速费
  // - unknown=true        →  高速费待确认，total含估算高速费，标注（预估）
  const total_cost = (oil_cost !== null ? oil_cost : 0)
    + ((is_free_toll === false || is_free_toll === null) ? toll_cost : 0);

  // 9. 各省里程权重（用于展示）
  const province_distances = {};
  if (sampledWithProvince > 0) {
    for (const p of provinces_crossed) {
      province_distances[p] = parseFloat(
        ((provincePointCount[p] / sampledWithProvince) * totalDistance / 1000).toFixed(1)
      );
    }
  }

  return {
    from: { name: from, province: normalizeProvince(fromGeo.province), lng: fromGeo.lng, lat: fromGeo.lat },
    to: { name: to, province: normalizeProvince(toGeo.province), lng: toGeo.lng, lat: toGeo.lat },
    total_km: parseFloat((totalDistance / 1000).toFixed(1)),
    total_duration_min: Math.round(route.totalDuration / 60),
    strategy: route.strategy,
    provinces_crossed,
    province_prices,
    province_distances,
    weighted_price: weightedPrice !== null ? parseFloat(weightedPrice.toFixed(4)) : null,
    oil_cost,
    toll_cost,
    is_free_toll,
    holiday: holidayInfo.holiday,
    free_toll_saving: parseFloat(free_toll_saving.toFixed(2)),
    unknown: holidayInfo.unknown || false,
    total_cost: parseFloat(total_cost.toFixed(2)),
    oil_type,
    fuel_consumption,
    vehicle_type: vehicleType,
  };
}

// ============ API 路由 ============

router.get('/route/oil-cost', async (req, res) => {
  const {
    from, to,
    oil_type = '92',
    fuel_consumption = '7.5',
    travel_date,
    vehicle_type = 'small',
  } = req.query;

  if (!from || !to) {
    return res.status(400).json({ success: false, error: '缺少必填参数：from, to' });
  }

  // 日期格式校验：YYYY-MM-DD
  if (travel_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travel_date)) {
      return res.status(400).json({ success: false, error: '日期格式错误，请使用 YYYY-MM-DD' });
    }
    const [y, m, d] = travel_date.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return res.status(400).json({ success: false, error: '日期不存在（如2月30日），请检查' });
    }
  }

  const oilType = ['92', '95', '98', '0'].includes(oil_type) ? oil_type : '92';
  const fuelConsumption = parseFloat(fuel_consumption) || 7.5;
  const vehicleType = ['small', 'big'].includes(vehicle_type) ? vehicle_type : 'small';

  try {
    const result = await calculateRouteOilCost({
      from, to,
      oil_type: oilType,
      fuel_consumption: fuelConsumption,
      travel_date: travel_date || (() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().split('T')[0];
      })(),
      vehicle_type: vehicleType,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[/api/route/oil-cost]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 节假日内嵌 API（供前端展示节假日名称）
router.get('/route/holiday-check', async (req, res) => {
  const { date, vehicle_type = 'small' } = req.query;
  if (!date) return res.status(400).json({ success: false, error: '缺少参数: date' });
  try {
    const info = await checkFreeToll({ dateStr: date, vehicleType: vehicle_type });
    res.json({ success: true, ...info });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
