# 油价守护者 ⛽

> 让每一次加油都明智

全国各省市实时油价查询，支持 92#/95#/98#/0# 柴油，提供油价趋势分析、附近加油站导航、油耗记录功能。

## 快速开始

```bash
npm install
node server/api.cjs          # 启动后端 API（默认端口 3001）
npm run dev                   # 启动前端开发服务器 → http://localhost:5174
```

**访问** http://localhost:5174

## 技术栈

- **前端**: React + Vite + Tailwind CSS + Taro（支持小程序）
- **后端**: Express.js
- **爬虫**: Python 3 + requests + BeautifulSoup
- **地图/定位**: 高德地图 Web API
- **数据源**: 汽车之家（autohome.com.cn/oil）

---

## 项目结构

```
oil-price-app/
├── crawler/                    # Python 爬虫
│   ├── autohome_crawler.py     # 汽车之家数据源（主爬虫）
│   ├── crawler_manager.py      # 主爬虫管理器（多数据源 + 重试）
│   ├── station_spider.py       # 加油站数据爬虫（预留）
│   ├── cities.py               # 城市/省份数据
│   ├── data_manager.py         # 数据存储管理
│   ├── scheduler.sh            # 定时任务脚本（每日 8:00 执行）
│   └── requirements.txt        # Python 依赖
│
├── server/                     # Express API
│   ├── api.cjs                # API 入口（含所有路由）
│   ├── routes/
│   │   └── route.cjs          # 路线油费计算路由（含节假日判断）
│
├── src/                        # React 前端（H5 + 小程序）
│   ├── App.jsx                # 主应用（省份选择、Tab 路由）
│   ├── main.jsx               # 入口
│   ├── components/
│   │   └── VehicleComponents.jsx  # 车辆管理组件
│   ├── pages/
│   │   ├── StationsPage.jsx   # 附近加油站（AMap POI 搜索）
│   │   ├── RankingsPage.jsx   # 排行榜
│   │   ├── TripPage.jsx       # 自驾油费计算
│   │   └── fuel/
│   │       └── index.tsx      # 油耗记录（本地存储）
│   └── utils/
│       ├── geolocation.js     # 定位 + AMap API
│       └── vehicles.js        # 车辆/油耗记录管理（localStorage）
│
├── data/                       # 运行时数据
│   ├── oil_prices.json        # 今日油价（每日更新）
│   ├── oil_history.json        # 历史油价
│   └── crawl_stats.json       # 爬虫统计
│
└── dist/                       # 构建输出
```

---

## 核心功能说明

### 1. 油价查询

- 显示全国 31 省市今日油价（92/95/98/0#）
- 启动时自动 GPS 定位 → 自动选中用户所在省份
- 数据来源：汽车之家 autohome.com.cn/oil，每日定时爬取
- 数据新鲜度实时显示（刚刚更新 / Xh前 / ⚠️ Xh前）

### 2. 油价趋势

- 近 7 / 14 / 30 天折线图（ECharts）
- 点击数据点显示当日全部油号价格

### 3. 附近加油站

- 基于 GPS 定位或 IP 定位兜底
- 搜索半径：1 / 3 / 5 / 10km 可调
- 按距离排序（AMap POI，不含实时油价）
- 支持导航跳转高德地图 App
- 显示：电话、营业时间、24小时标识、评分、品牌

### 4. 自驾油费计算

- 输入出发地/目的地 → 高德路径规划 → 计算油费 + 高速费
- 途经省份油价加权平均
- 高速费判断：优先用高德真实数据，兜底用 0.45元/km 估算
- 节假日高速免费判断（春假/劳动节/国庆，小客车免费）
- 支持选择车辆（自动带入油耗）或快速油耗选择

### 5. 油耗记录

- 本地存储（localStorage），不依赖登录
- 记录字段：日期、仪表盘里程、加油量、单价、总价
- 自动计算百公里油耗

**km 语义说明**：km 是仪表盘累计读数（绝对值），不是两次加油间的行驶里程。
添加记录时，新 km 必须大于已有记录的最大 km（仪表盘只增不减，不受日期顺序影响）。

计算公式：`百公里油耗 = 总加油量 / 总行驶里程 * 100`
使用 records[1..n] 计算（跳过最新记录，因其尾段油耗无法计算）

---

## 数据流

### 油价数据

```
crawler/autohome_crawler.py
    ↓ 每日定时 / 手动触发
data/oil_prices.json
    ↓ server/api.cjs 读取
GET /api/oil-prices → 前端油价页
GET /api/route/oil-cost → TripPage（途经省份油价）
```

### 用户登录

```
前端手机号 → POST /api/auth/code（验证码输出到服务端日志）
手机收到验证码 → POST /api/auth/login
    ↓ 返回 token
前端存入 localStorage，后续请求 Header 携带
```

### 附近加油站

```
autoLocate() [geolocation.js]
    ↓ GPS 失败则 IP 兜底
amapReverseGeocode(lng, lat) → 省份
amapSearchNearby(lat, lng, radius) → 加油站 POI 列表
    ↓
StationsPage.jsx（展示列表 + AMap 地图）
```

---

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# 腾讯云 SMS（短信登录用）
TENCENT_SMS_SECRET_ID=your_secret_id
TENCENT_SMS_SECRET_KEY=your_secret_key
TENCENT_SMS_APP_ID=1400xxxxxx        # SMS 应用 SDK AppId（数字）
TENCENT_SMS_SIGN_NAME=油价守护者     # 短信签名
TENCENT_SMS_TEMPLATE_CODE=SMS_xxx    # 模板 ID

# 高德地图（已内置 key，如需替换请修改源码中 AMAP_KEY）
# server/routes/route.cjs
# src/utils/geolocation.js
```

SMS 未配置时，验证码打印到后端控制台（`/tmp/api_server.log`），不影响登录流程（开发阶段可用控制台验证码登录）。

---

## API 接口

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/oil-prices` | GET | 今日油价（所有省份） | 否 |
| `/api/price-changes` | GET | 油价趋势（参数 days） | 否 |
| `/api/provinces` | GET | 省份列表 | 否 |
| `/api/health` | GET | 数据新鲜度 + 爬虫状态 | 否 |
| `/api/crawl` | POST | 手动触发爬虫 | 否 |
| `/api/auth/code` | POST | 发送手机验证码 | 否 |
| `/api/auth/login` | POST | 手机号+验证码登录 | 否 |
| `/api/auth/set-password` | POST | 设置密码 | 是 |
| `/api/auth/logout` | POST | 登出 | 是 |
| `/api/user/info` | GET | 用户信息 | 是 |
| `/api/sync/fuel` | GET/POST | 油耗记录同步 | 是 |
| `/api/sync/remind` | GET/POST | 提醒设置同步 | 是 |
| `/api/remind` | GET/POST | 获取/添加油价提醒 | 是 |
| `/api/remind/:id` | DELETE | 删除提醒 | 是 |
| `/api/route/oil-cost` | GET | 自驾油费计算 | 否 |
| `/api/route/holiday-check` | GET | 节假日高速免费查询 | 否 |

---

## 小程序构建

```bash
# 小程序
npx taro build --type weapp

# H5
npx taro build --type h5
```

---

## License

MIT
