# 油价守护者 ⛽

> 让每一次加油都明智

全国各省市实时油价查询，支持 92#/95#/98#汽油、0号柴油，提供油价趋势分析和油耗记录功能。

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

### 4. 启动前端开发服务器

```bash
npm run dev
```

访问 http://localhost:5174

## 技术栈

- **前端**: React + Vite + Tailwind CSS
- **后端**: Express.js
- **爬虫**: Python 3 + requests
- **数据源**: 汽车之家

## 主要功能

- ✅ 全国 31 省市实时油价查询
- ✅ 多油号切换 (92#/95#/98#/0#)
- ✅ 省份筛选
- ✅ 数据来源追踪
- ⏳ 油价趋势图
- ⏳ 油耗记录

## 项目结构

```
oil-price-app/
├── crawler/          # Python 爬虫
├── server/           # Express API
├── src/              # React 前端
├── data/             # 油价数据文件
└── dist/             # 构建输出
```

## 环境变量

复制 `.env.example` 为 `.env` 并配置：

```
MINIMAX_API_KEY=your_api_key  # 可选，用于 AI 分析功能
```

## License

MIT
