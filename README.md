# 油价守护者 ⛽

> 让每一次加油都明智

全国各省市实时油价查询，支持 92#/95#/98#/0# 柴油，提供油价趋势分析、附近加油站导航、油耗记录功能。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端 API

```bash
node server/api.cjs
```

### 3. 启动爬虫（获取最新数据）

```bash
cd crawler
pip install requests
python crawler_manager.py
```

或者设置定时任务（每日早上8点自动爬取）：

```bash
# 加入 crontab
0 8 * * * cd /path/to/oil-price-app/crawler && bash scheduler.sh
```

### 4. 启动前端开发服务器

```bash
npm run dev
```

访问 http://localhost:5174

## 技术栈

- **前端**: React + Vite + Tailwind CSS + Taro（支持小程序）
- **后端**: Express.js
- **爬虫**: Python 3 + requests + BeautifulSoup
- **地图/定位**: 高德地图 Web API
- **数据源**: 汽车之家（autohome.com.cn/oil）

## 主要功能

- ✅ 全国 31 省市实时油价查询（每日自动更新）
- ✅ 多油号切换 (92#/95#/98#/0#柴油)
- ✅ 启动时自动定位 → 自动选中用户所在省份
- ✅ 油价数据新鲜度实时显示（"刚刚更新" / "Xh前" / "⚠️ Xh前"）
- ✅ 油价趋势图（近7/14/30天，点击数据点查看当日详情）
- ✅ 附近加油站搜索（1/3/5/10km可调）
- ✅ 加油站导航（跳转高德地图）
- ✅ 加油站信息：电话、营业时间、24小时标识、评分
- ✅ 油耗记录（百公里油耗计算）
- ✅ 油价提醒（需登录）
- ✅ 小程序 / H5 双端支持

## 项目结构

```
oil-price-app/
├── crawler/              # Python 爬虫
│   ├── autohome_crawler.py  # 汽车之家数据源
│   ├── crawler_manager.py    # 主爬虫管理器（多数据源 + 重试）
│   ├── station_spider.py    # 加油站数据爬虫（预留）
│   ├── cities.py            # 城市/省份数据
│   ├── data_manager.py      # 数据存储管理
│   ├── scheduler.sh         # 定时任务脚本
│   └── requirements.txt     # Python 依赖
├── server/               # Express API
│   └── api.cjs            # API 服务器（含用户系统、提醒、油站订阅）
├── src/                  # React 前端
│   ├── main.jsx          # 入口
│   ├── App.jsx           # 主应用（5个Tab页面）
│   ├── pages/
│   │   ├── StationsPage.jsx  # 加油站比价页
│   │   └── fuel/
│   │       └── index.tsx    # 油耗记录页
│   └── utils/
│       └── geolocation.js   # 定位 + 高德地图 API
├── data/                 # 数据目录
│   ├── oil_prices.json   # 当日油价（每日更新）
│   ├── oil_history.json   # 历史油价
│   └── crawl_stats.json  # 爬虫统计
└── dist/                # 构建输出（H5 + 小程序）
```

## 小程序构建

```bash
# 小程序
npx taro build --type weapp

# H5
npx taro build --type h5
```

## 环境变量

高德地图 Web API Key 已内置于代码中（`src/utils/geolocation.js`），如需替换：

```js
const AMAP_KEY = 'your_key_here'
```

## License

MIT
