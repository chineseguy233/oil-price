# 油价守护者 - UI/UX 设计方案

## 1) 项目信息
- **目标平台**: Web/App (移动端)
- **技术栈**: React + CSS
- **类型**: 工具类应用（油价查询）

## 2) 设计系统 Tokens

### 色彩
```css
--primary: #0B1426;      /* 深蓝 - 主色 */
--primary-light: #1A2A40;
--accent-green: #4CAF50;  /* 绿色 - 下降 */
--accent-red: #F44336;    /* 红色 - 上涨 */
--bg: #FFFFFF;           /* 背景白 */
--bg-secondary: #F5F7FA; /* 次级背景 */
--text: #1A1A1A;         /* 主文字 */
--text-secondary: #717171;/* 次级文字 */
--border: #E5E7EB;        /* 边框 */
```

### 间距
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;
--space-2xl: 32px;
```

### 圆角
```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-full: 9999px;
```

### 字体
- 主字体: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif
- 标题: 18px/20px (700)
- 正文: 14px/15px (400/500)
- 小字: 12px/13px

## 3) 页面设计

### 登录页
- 背景: #0B1426 (深蓝)
- Logo: 72x72px, 圆角24px
- 输入框: 白色10%透明背景, 圆角12px
- 按钮: 白色背景, 深蓝文字

### 首页
- 顶部栏: 深蓝背景, 城市名+箭头, 刷新按钮
- 价格卡片: 白色背景, 圆角12px
- 价格: 48px 大字
- 变化标签: 圆角4px, 绿/红底白字

### 趋势页
- Tab切换: 圆角8px, 选中深蓝
- 图表: SVG折线图
- 统计: 3列卡片

### 出行页
- 加油站卡片: 白色, 圆角12px
- 油耗统计: 3列网格

### 我的页
- 头像区: 深蓝背景
- 菜单列表: 白色卡片
