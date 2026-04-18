# 油价守护者 - 产品需求文档 v2.0

## 1. 项目概述

**项目名称**：油价守护者
**项目类型**：H5 油价查询应用
**Slogan**：让每一次加油都明智
**技术栈**：React + Vite + Express.js + Python 爬虫

## 2. 目标用户

- 私家车主
- 网约车司机
- 货车司机

## 3. 核心功能

### 3.1 实时油价查询 ✅
- 显示全国各省市92#/95#/98#汽油、0号柴油今日价格
- 支持按省份筛选
- 油价更新时间提示
- 数据来源：汽车之家（主）+ 备用数据源

### 3.2 油价走势分析 ⏳
- 近7天/30天油价变化趋势图
- 涨跌原因分析（基于历史数据）
- 智能建议："现在加"还是"再等等"

### 3.3 智能提醒 ⏳
- 油价上涨前主动推送（预留接口）
- 下调窗口期提醒（预留接口）
- 个性化订阅（关注特定地区/油号）

### 3.4 附近加油站比价 ⏳
- 基于定位推荐周边加油站
- 按价格排序
- 导航到站（预留）

### 3.5 油耗记录 ⏳
- 记录加油轨迹
- 计算百公里油耗
- 油耗统计报表（基础版已完成）

## 4. 技术架构

```
oil-price-app/
├── crawler/              # Python 爬虫
│   ├── crawler_manager.py  # 主爬虫管理器（多数据源 + 重试）
│   ├── autohome_crawler.py # 汽车之家数据源
│   ├── cities.py          # 城市/省份数据
│   ├── data_manager.py    # 数据存储管理
│   ├── scheduler.sh       # 定时任务脚本
│   └── requirements.txt   # Python 依赖
├── server/              # Node.js 后端
│   ├── api.cjs           # Express API 服务器
│   └── public/           # 静态文件
├── src/                 # React 前端
│   ├── main.jsx         # 入口
│   ├── App.jsx          # 主应用
│   ├── components/      # 公共组件
│   ├── pages/          # 页面
│   │   └── fuel/       # 油耗记录页面
│   ├── hooks/           # 自定义 Hooks
│   └── utils/           # 工具函数
├── data/                # 数据目录
│   ├── oil_prices.json  # 当日油价
│   ├── oil_history.json # 历史油价
│   └── crawl_stats.json # 爬虫统计
├── dist/                # 构建输出
├── SPEC.md             # 产品文档
└── README.md           # 项目说明
```

## 5. 数据源

### 主数据源：汽车之家 (autohome.com.cn)
- URL: `https://www.autohome.com.cn/oil/`
- 数据格式：JSON (Next.js __NEXT_DATA__)
- 更新频率：每日

### 备用数据源：oilcn
- 预留备用位置
- 待接入

## 6. API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/oil-prices` | GET | 今日油价（所有省份） |
| `/api/price-changes` | GET | 油价趋势（按省份） |
| `/api/provinces` | GET | 省份列表 |
| `/api/health` | GET | 数据健康状态 |
| `/api/auth/code` | POST | 发送验证码 |
| `/api/auth/login` | POST | 登录/注册 |
| `/api/sync/fuel` | GET/POST | 油耗记录同步 |

## 7. 开发计划

### Phase 1: MVP ✅
- [x] 实时油价查询（31省）
- [x] 基础 UI 框架
- [x] 数据爬虫

### Phase 2: 增强 ⏳
- [ ] 油价趋势图
- [ ] 油耗记录
- [ ] 多数据源 fallback

### Phase 3: 完整 ⏳
- [ ] 智能提醒
- [ ] 加油站比价

## 8. 状态

- ✅ 已完成
- ⏳ 进行中
- 🔜 待开发
