# 油价守护者 ⛽

> 让每一次加油都明智

全国各省市实时油价查询，支持 92#/95#/98#/0# 柴油，提供油价趋势分析、附近加油站导航、油耗记录功能。

## 快速开始

```bash
npm install
node server/api.cjs          # 启动后端 API（端口 3000）
npm run dev                   # 启动前端 H5 开发服务器 → http://localhost:5174
```

**访问** http://localhost:5174

## 技术栈

- **前端**: React + Taro 4 + Webpack 5 + Tailwind CSS
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
│   ├── crawler_manager.py       # 主爬虫管理器（多数据源 + 重试）
│   ├── cities.py               # 城市/省份数据
│   ├── data_manager.py         # 数据存储管理
│   └── requirements.txt        # Python 依赖
│
├── server/                     # Express API
│   ├── api.cjs                # API 入口（含所有路由）
│   └── routes/
│       └── route.cjs          # 路线油费计算路由（含节假日判断）
│
├── src/                        # Taro 源码（H5 + 小程序）
│   ├── app.jsx                # 小程序入口 + 全局状态 Context
│   ├── app.config.js          # 小程序页面配置（pages + tabBar）
│   ├── main.jsx               # H5 入口
│   ├── components/
│   │   └── VehicleComponents.jsx  # 车辆管理组件
│   ├── pages/
│   │   ├── oil/              # 油价查询（首页 Tab 1）
│   │   ├── trend/            # 油价趋势（Tab 2）
│   │   ├── trip/              # 自驾油费计算（Tab 3）
│   │   ├── fuel/              # 油耗记录（Tab 4）
│   │   ├── nearby/            # 附近加油站
│   │   ├── my/                # 我的（Tab 5）
│   │   └── login/             # 登录
│   ├── utils/
│   │   └── constants.js      # 油号配置常量（OIL_TYPES, OIL_COLORS）
│   └── assets/                # TabBar 图标
│
├── data/                       # 运行时数据
│   ├── oil_prices.json        # 今日油价（每日更新）
│   ├── oil_history.json       # 历史油价
│   └── crawl_stats.json       # 爬虫统计
│
├── dist/                       # 小程序编译产物
├── project.config.json        # 微信小程序项目配置（AppID: wxe8beddb528a8f6de）
└── taro.config.js             # Taro 编译配置
```

---

## 小程序构建

```bash
# 小程序（输出到 dist/）
npx taro build --type weapp --clean

# H5
npx taro build --type h5

# 微信开发者工具导入项目根目录即可（会自动重新编译）
```

---

## 核心功能

### 1. 油价查询
- 显示全国各省市今日油价（92/95/98/0#）
- 启动时自动 GPS 定位 → 自动选中用户所在省份
- 数据来源：汽车之家 autohome.com.cn/oil，每日定时爬取
- 数据新鲜度实时显示（刚刚更新 / Xh前 / ⚠️ Xh前）

### 2. 油价趋势
- 近 7 / 14 / 30 天折线图（ECharts）
- 点击数据点显示当日全部油号价格

### 3. 自驾油费计算
- 输入出发地/目的地 → 高德路径规划 → 计算油费 + 高速费
- 途经省份油价加权平均
- 节假日高速免费判断（春节/劳动节/国庆，小客车免费）
- 支持选择车辆（自动带入油耗）或快速油耗选择

### 4. 油耗记录
- 本地存储（localStorage），不依赖登录
- 记录字段：日期、仪表盘里程、加油量、单价、总价
- 自动计算百公里油耗

**km 语义说明**：km 是仪表盘累计读数（绝对值），不是两次加油间的行驶里程。添加记录时，新 km 必须大于已有记录的最大 km（仪表盘只增不减）。

计算公式：`百公里油耗 = 总加油量 / 总行驶里程 * 100`

### 5. 附近加油站
- 基于 GPS 定位或 IP 定位兜底
- 搜索半径：1 / 3 / 5 / 10km 可调
- 按距离排序（AMap POI，不含实时油价）
- 支持导航跳转高德地图 App

---

## 用户登录

```
前端手机号 → POST /api/auth/code（验证码输出到服务端日志）
手机收到验证码 → POST /api/auth/login
    ↓ 返回 token
前端存入 localStorage，后续请求 Header 携带
```

验证码会直接打印在后端控制台（`/tmp/api_server.log`），开发阶段使用。

---

## API 接口

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/oil-prices` | GET | 今日油价（所有省份） | 否 |
| `/api/price-changes` | GET | 油价变化趋势 | 否 |
| `/api/provinces` | GET | 省份列表 | 否 |
| `/api/oil-history` | GET | 历史油价（参数 days/province） | 否 |
| `/api/health` | GET | 数据新鲜度 + 爬虫状态 | 否 |
| `/api/crawl` | POST | 手动触发爬虫 | 否 |
| `/api/auth/code` | POST | 发送手机验证码 | 否 |
| `/api/auth/login` | POST | 手机号+验证码登录 | 否 |
| `/api/auth/set-password` | POST | 设置密码 | 是 |
| `/api/auth/logout` | POST | 登出 | 是 |
| `/api/user/info` | GET | 用户信息 | 是 |
| `/api/sync/fuel` | GET/POST | 油耗记录同步 | 是 |
| `/api/sync/remind` | GET/POST | 提醒设置同步 | 是 |
| `/api/route/oil-cost` | GET | 自驾油费计算 | 否 |
| `/api/route/holiday-check` | GET | 节假日高速免费查询 | 否 |
| `/api/stations/search` | GET | 加油站搜索（按省份） | 否 |
| `/api/stations/nearby` | GET | 附近加油站 | 否 |

---

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# 服务器端口（可选，默认 3000）
# PORT=3000
```

---

## License

MIT
