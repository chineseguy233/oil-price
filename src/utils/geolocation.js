// 高德地图 Web API Key
const AMAP_KEY = '6e5eadd96b048804120c4fa2cbad220f'

// ========== 浏览器 Geolocation ==========

/**
 * 通过IP获取大致位置（GPS失败时的兜底方案）
 * @returns {Promise<{lat: number, lng: number, source: string}>}
 */
export async function getIPLocation() {
  try {
    // 使用 ipapi.co（免费，无需key）
    const res = await fetch(`https://ipapi.co/json/`)
    const data = await res.json()
    if (data.latitude && data.longitude) {
      return {
        lat: data.latitude,
        lng: data.longitude,
        province: data.region || '',
        city: data.city || '',
        source: 'ip',
        accuracy: 'low',
      }
    }
  } catch (e) {}
  // 兜底：用高德IP API
  try {
    const res2 = await fetch(`https://restapi.amap.com/v3/ip?key=${AMAP_KEY}`)
    const data2 = await res2.json()
    if (data2.status === '1' && data2.rectangle) {
      const [sw, ne] = data2.rectangle.split(';')
      const [lng1, lat1] = sw.split(',').map(Number)
      const [lng2, lat2] = ne.split(',').map(Number)
      return {
        lat: (lat1 + lat2) / 2,
        lng: (lng1 + lng2) / 2,
        province: data2.province || '',
        city: data2.city || '',
        source: 'ip',
        accuracy: 'low',
      }
    }
  } catch (e2) {}
  throw new Error('IP定位失败')
}

/**
 * 获取浏览器 GPS 位置（带明确超时提示）
 * @returns {Promise<{lat: number, lng: number, source: 'gps', accuracy: 'high'}>}
 */
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'))
      return
    }

    // 使用单点定位，不重复请求
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
          accuracy: 'high',
        })
      },
      (err) => {
        // 明确区分错误类型，供上层提示用户
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('GPS定位超时，将切换到网络定位'))
        } else if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('定位权限被拒绝，请开启定位权限'))
        } else {
          reject(new Error('定位失败'))
        }
      },
      {
        timeout: 8000,           // 8秒超时（比之前稍长一点）
        maximumAge: 300000,      // 缓存5分钟
        enableHighAccuracy: false // 笔记本无GPS硬件，设true会超时
      }
    )
  })
}

// ========== 高德地图逆地理编码 ==========

/**
 * 通过高德 API 根据经纬度获取省市区信息
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {Promise<{province: string, city: string, district: string, adcode: string}>}
 */
export async function amapReverseGeocode(lng, lat) {
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng.toFixed(6)},${lat.toFixed(6)}&extensions=base&output=json`
  const res = await fetch(url)
  const data = await res.json()
  
  if (data.status !== '1' || !data.regeocode) {
    throw new Error(data.info || '逆地理编码失败')
  }
  
  const addr = data.regeocode.addressComponent
  return {
    province: addr.province || '',
    city: addr.city || '',
    district: addr.district || '',
    adcode: addr.adcode || '',
  }
}

// ========== 高德地图附近搜索（扩展版）============

/**
 * 搜索附近的加油站
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {number} radius - 搜索半径(米)，默认 5000
 * @param {number} page - 页码，默认 1
 * @returns {Promise<{stations: Array, total: number, page: number, totalPage: number}>}
 */
export async function amapSearchNearby(lat, lng, radius = 5000, page = 1) {
  const offset = 20
  const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${lng.toFixed(6)},${lat.toFixed(6)}&types=加油站&radius=${radius}&offset=${offset}&page=${page}&extensions=all`
  
  const res = await fetch(url)
  const data = await res.json()
  
  if (data.status !== '1') {
    throw new Error(data.info || '附近搜索失败')
  }
  
  const pois = data.pois || []
  const total = parseInt(data.count) || 0
  const totalPage = Math.ceil(total / offset)

  const stations = pois.map(p => {
    // 解析电话
    const tel = p.tel ? p.tel.replace(/;.*$/, '').trim() : null

    // 解析营业时间
    let businessHours = null
    let is24h = false
    const bizInfo = p.business_day || ''
    if (bizInfo === '全天' || bizInfo.includes('24')) {
      is24h = true
    } else if (p.business_time) {
      businessHours = p.business_time.replace(/;.*$/, '').trim()
    }

    // 解析评分
    let rating = null
    if (p.grid) {
      const match = p.grid.match(/(\d+\.?\d*)/)
      if (match) rating = parseFloat(match[1])
    }

    return {
      name: p.name,
      address: p.address || '',
      location: p.location, // "lng,lat"
      distance: p.distance ? formatDistance(parseInt(p.distance)) : '未知',
      distanceRaw: parseInt(p.distance) || 999999,
      brand: extractBrand(p.name),
      tel,
      businessHours,
      is24h,
      rating,
      // 从扩展字段里取价格（高德周边搜索不带价格）
      price92: null,
      price95: null,
    }
  })

  return { stations, total, page, totalPage }
}

/**
 * 格式化距离为中文表达
 */
function formatDistance(meters) {
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * 从名称中提取加油站品牌
 */
function extractBrand(name) {
  const brands = ['中石化', '中石油', '壳牌', '中化石油', '道达尔', '民营', '延长壳牌', '中油BP', '加德士', '埃尼', 'SK', 'CIRCLE_K', '海海湾', '京标', '中化道达尔']
  for (const b of brands) {
    if (name.includes(b)) return b
  }
  return '民营'
}

// ========== 完整流程：GPS → IP兜底 → 逆地理编码 ==========

/**
 * 一步完成 GPS 定位（失败则IP兜底）+ 逆地理编码
 * 区分GPS精确定位和网络估算定位
 * @returns {Promise<{lat, lng, province, city, district, source, accuracy, message}>}
 */
export async function autoLocate() {
  let loc
  let source = 'gps'
  let accuracy = 'high'
  let message = ''

  try {
    loc = await getBrowserLocation()
    message = 'GPS定位成功'
  } catch (e) {
    // GPS失败，用IP归属地兜底，同时返回具体原因供UI提示
    const ipLoc = await getIPLocation()
    loc = { lat: ipLoc.lat, lng: ipLoc.lng }
    source = 'ip'
    accuracy = 'low'
    message = e.message || '定位失败，已切换到网络定位'
  }

  const geo = await amapReverseGeocode(loc.lng, loc.lat)
  return {
    lat: loc.lat,
    lng: loc.lng,
    source,
    accuracy,
    message,
    ...geo
  }
}

/**
 * 外部调用：只定位到省份（轻量，适合启动时用）
 * @returns {Promise<{province: string, city: string, source: string, accuracy: string}>}
 */
export async function autoLocateProvince() {
  try {
    const result = await autoLocate()
    return {
      province: result.province,
      city: result.city,
      source: result.source,
      accuracy: result.accuracy,
      message: result.message,
    }
  } catch (e) {
    return {
      province: '',
      city: '',
      source: 'error',
      accuracy: 'none',
      message: e.message || '定位失败',
    }
  }
}
