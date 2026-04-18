const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
const PORT = 3000;

const USERS_FILE = path.join(__dirname, '../data/users.json');

// 验证码存储 (内存中，5分钟过期)
const verificationCodes = new Map();

// 确保users文件存在
function getUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        }
    } catch (e) {}
    return {};
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 密码哈希 (使用 PBKDF2)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return salt + ':' + hash;
}

function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const newHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === newHash;
}

// 生成简单token
function generateToken(userId) {
    return crypto.randomBytes(32).toString('hex');
}

// 验证token
function verifyToken(token) {
    const users = getUsers();
    for (const [phone, user] of Object.entries(users)) {
        if (user.token === token) {
            return user;
        }
    }
    return null;
}

// 中间件：验证登录
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '请先登录' });
    }
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ error: '登录已过期' });
    }
    req.user = user;
    next();
}

// ============ 用户API ============

// 发送验证码
app.post('/api/auth/code', (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
        return res.json({ success: false, error: '手机号格式错误' });
    }
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[验证码] ${phone}: ${code}`);
    
    // 存储验证码，5分钟过期
    verificationCodes.set(phone, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000
    });
    
    // 5分钟后删除验证码
    setTimeout(() => {
        verificationCodes.delete(phone);
        console.log(`[验证码] ${phone} 已过期`);
    }, 5 * 60 * 1000);
    
    // 安全：不再明文返回验证码
    res.json({ success: true, message: '验证码已发送' });
});

// 登录/注册
app.post('/api/auth/login', (req, res) => {
    const { phone, code, password } = req.body;
    if (!phone) {
        return res.json({ success: false, error: '请填写手机号' });
    }
    
    // 验证码校验
    const storedCode = verificationCodes.get(phone);
    if (!storedCode) {
        return res.json({ success: false, error: '请先获取验证码' });
    }
    if (Date.now() > storedCode.expiresAt) {
        verificationCodes.delete(phone);
        return res.json({ success: false, error: '验证码已过期' });
    }
    if (storedCode.code !== code) {
        return res.json({ success: false, error: '验证码错误' });
    }
    
    // 验证成功后立即删除验证码
    verificationCodes.delete(phone);
    
    const users = getUsers();
    let user = users[phone];
    
    if (!user) {
        // 新用户注册 - 密码哈希存储
        const hashedPassword = password ? hashPassword(password) : null;
        user = {
            phone,
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString(),
            fuelRecords: [],
            remindSettings: {},
            stations: []
        };
    } else if (password) {
        // 登录时验证密码
        if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
            return res.json({ success: false, error: '密码错误' });
        }
    }
    
    user.token = generateToken(phone);
    user.loginAt = new Date().toISOString();
    users[phone] = user;
    saveUsers(users);
    
    res.json({ 
        success: true, 
        token: user.token,
        user: { phone: user.phone, createdAt: user.createdAt }
    });
});

// 设置密码 (注册后可选)
app.post('/api/auth/set-password', authMiddleware, (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
        return res.json({ success: false, error: '密码至少6位' });
    }
    
    const users = getUsers();
    if (users[req.user.phone]) {
        users[req.user.phone].passwordHash = hashPassword(password);
        saveUsers(users);
    }
    
    res.json({ success: true, message: '密码设置成功' });
});

// 登出
app.post('/api/auth/logout', authMiddleware, (req, res) => {
    const users = getUsers();
    if (users[req.user.phone]) {
        users[req.user.phone].token = null;
        saveUsers(users);
    }
    res.json({ success: true });
});

// 获取用户信息
app.get('/api/user/info', authMiddleware, (req, res) => {
    res.json({ 
        success: true,
        user: { 
            phone: req.user.phone, 
            createdAt: req.user.createdAt,
            fuelRecordsCount: (req.user.fuelRecords || []).length
        }
    });
});

// ============ 数据同步API ============

// 同步油耗记录
app.post('/api/sync/fuel', authMiddleware, (req, res) => {
    const { records } = req.body;
    const users = getUsers();
    
    if (users[req.user.phone]) {
        users[req.user.phone].fuelRecords = records || [];
        users[req.user.phone].syncedAt = new Date().toISOString();
        saveUsers(users);
    }
    
    res.json({ success: true, message: '同步成功' });
});

// 获取油耗记录
app.get('/api/sync/fuel', authMiddleware, (req, res) => {
    const users = getUsers();
    const records = users[req.user.phone]?.fuelRecords || [];
    res.json({ success: true, records });
});

// 同步提醒设置
app.post('/api/sync/remind', authMiddleware, (req, res) => {
    const { settings } = req.body;
    const users = getUsers();
    
    if (users[req.user.phone]) {
        users[req.user.phone].remindSettings = settings || {};
        saveUsers(users);
    }
    
    res.json({ success: true, message: '设置已同步' });
});

// 获取提醒设置
app.get('/api/sync/remind', authMiddleware, (req, res) => {
    const users = getUsers();
    const settings = users[req.user.phone]?.remindSettings || {};
    res.json({ success: true, settings });
});

// ============ 油价API ============

// 油价数据API
app.get('/api/oil-prices', (req, res) => {
    const dataPath = path.join(__dirname, '../data/oil_prices.json');
    try {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// 价格变化/历史趋势API
app.get('/api/price-changes', (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const province = req.query.province || '北京';
    
    const historyPath = path.join(__dirname, '../data/oil_history.json');
    try {
        const allHistory = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        const provinceHistory = allHistory[province] || {};
        
        const dates = Object.keys(provinceHistory).sort().slice(-days);
        const history = {};
        dates.forEach(date => {
            history[date] = provinceHistory[date];
        });
        
        res.json({ province, days, history });
    } catch (e) {
        res.json({ province, days, history: {} });
    }
});

// 获取所有省份列表
app.get('/api/provinces', (req, res) => {
    const dataPath = path.join(__dirname, '../data/oil_prices.json');
    try {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        res.json(Object.keys(data.prices || {}));
    } catch (e) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// ============ 健康检查API ============

// 数据新鲜度检查
app.get('/api/health', (req, res) => {
    const fs = require('fs');
    const path = require('path');

    const pricesPath = path.join(__dirname, '../data/oil_prices.json');
    const statsPath = path.join(__dirname, '../data/crawl_stats.json');

    let freshness = { is_fresh: false, hours_old: null, last_update: null, source: null, stale_warning: true };
    let stats = {};

    try {
        if (fs.existsSync(pricesPath)) {
            const data = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));
            freshness = {
                last_update: data.update_time || null,
                source: data.source || null,
                fetch_time: data.fetched_at || null,
                provinces_count: Object.keys(data.prices || {}).length,
            };
            // 简单小时数估算
            if (data.fetched_at) {
                const fetched = new Date(data.fetched_at);
                const now = new Date();
                freshness.hours_old = ((now - fetched) / 3600000).toFixed(1);
                freshness.is_fresh = freshness.hours_old < 24;
                freshness.stale_warning = freshness.hours_old >= 24;
            } else {
                freshness.stale_warning = true;
            }
        }
    } catch (e) {}

    try {
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        }
    } catch (e) {}

    const status = freshness.is_fresh ? 'healthy' : 'stale';
    res.json({
        status,
        freshness,
        stats: {
            last_crawl: stats.last_crawl || null,
            success_rate: stats.success_rate || null,
        }
    });
});

// 手动触发爬虫
app.post('/api/crawl', (req, res) => {
    const { spawn } = require('child_process');
    // 使用 crawler_manager.py（带重试）
    const py = spawn('python3', [
        require('path').resolve(__dirname, '../crawler/crawler_manager.py'),
        '--quick'
    ], { cwd: require('path').resolve(__dirname, '..') });

    let output = '';
    py.stdout.on('data', d => output += d.toString());
    py.stderr.on('data', d => output += d.toString());
    py.on('close', code => {
        if (code === 0) {
            res.json({ success: true, message: '更新成功', output });
        } else {
            res.json({ success: false, error: '更新失败', output });
        }
    });
});

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

// ============ 加油站API ============

// 按省份搜索加油站
app.get('/api/stations/search', (req, res) => {
    const province = req.query.province || '北京';
    
    // 模拟加油站数据（实际应接地图API）
    const brands = ['中石化', '中石油', '壳牌', '中化石油', '道达尔', '民营'];
    const districts = ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '石景山区', '通州区', '大兴区'];
    
    const mockStations = Array.from({ length: 15 }, (_, i) => {
        const basePrice92 = 7.0 + Math.random() * 1.5;
        const basePrice95 = basePrice92 + 0.5 + Math.random() * 0.8;
        const distance = (Math.random() * 8).toFixed(1);
        const brand = brands[Math.floor(Math.random() * brands.length)];
        
        return {
            id: `${province}-${i + 1}`,
            name: `${brand}${districts[i % districts.length]}加油站`,
            address: `${province}${districts[i % districts.length]}${Math.floor(Math.random() * 200) + 1}号`,
            brand,
            distance: `${distance}km`,
            price92: parseFloat(basePrice92.toFixed(2)),
            price95: parseFloat(basePrice95.toFixed(2)),
        };
    });
    
    res.json({ success: true, stations: mockStations, province });
});

// 获取附近加油站
app.get('/api/stations/nearby', (req, res) => {
    const lat = parseFloat(req.query.lat) || 39.9;
    const lng = parseFloat(req.query.lng) || 116.4;
    const radius = parseInt(req.query.radius) || 5000;
    
    const stationsPath = path.join(__dirname, '../data/stations.json');
    try {
        if (fs.existsSync(stationsPath)) {
            const data = JSON.parse(fs.readFileSync(stationsPath, 'utf-8'));
            const stations = (data.stations || []).map(s => ({
                ...s,
                distance: Math.round(Math.random() * 5 * 10) / 10 + 'km'
            })).slice(0, 20);
            res.json({ success: true, stations });
        } else {
            res.json({ success: true, stations: [] });
        }
    } catch (e) {
        res.json({ success: true, stations: [] });
    }
});

// 用户订阅加油站
app.post('/api/stations/subscribe', authMiddleware, (req, res) => {
    const { stationId, radius } = req.body;
    const users = getUsers();
    
    if (users[req.user.phone]) {
        if (!users[req.user.phone].stationSubscriptions) {
            users[req.user.phone].stationSubscriptions = [];
        }
        
        const existing = users[req.user.phone].stationSubscriptions.find(s => s.stationId === stationId);
        if (!existing) {
            users[req.user.phone].stationSubscriptions.push({
                stationId,
                radius: radius || 3,
                createdAt: new Date().toISOString()
            });
        }
        
        saveUsers(users);
    }
    
    res.json({ success: true, message: '订阅成功' });
});

// 获取用户订阅的加油站
app.get('/api/stations/subscriptions', authMiddleware, (req, res) => {
    const users = getUsers();
    const subscriptions = users[req.user.phone]?.stationSubscriptions || [];
    res.json({ success: true, subscriptions });
});

// 取消订阅
app.delete('/api/stations/subscribe/:stationId', authMiddleware, (req, res) => {
    const stationId = req.params.stationId;
    const users = getUsers();
    
    if (users[req.user.phone]?.stationSubscriptions) {
        users[req.user.phone].stationSubscriptions = 
            users[req.user.phone].stationSubscriptions.filter(s => s.stationId !== stationId);
        saveUsers(users);
    }
    
    res.json({ success: true, message: '已取消订阅' });
});

// ============ 油价提醒API ============

const OIL_PRICES_FILE = path.join(__dirname, '../data/oil_prices.json');

// 获取油价数据（用于计算提醒）
function getOilPrices() {
    try {
        if (fs.existsSync(OIL_PRICES_FILE)) {
            return JSON.parse(fs.readFileSync(OIL_PRICES_FILE, 'utf-8'));
        }
    } catch (e) {}
    return null;
}

// 获取用户的提醒设置
app.get('/api/remind', authMiddleware, (req, res) => {
    const users = getUsers();
    const reminders = users[req.user.phone]?.remindSettings || [];
    res.json({ success: true, reminders });
});

// 设置油价提醒
app.post('/api/remind', authMiddleware, (req, res) => {
    const { province, oilType, threshold } = req.body;
    
    if (!province || !oilType || !threshold) {
        return res.json({ success: false, message: '缺少参数' });
    }
    
    const users = getUsers();
    if (!users[req.user.phone]) {
        users[req.user.phone] = {};
    }
    if (!users[req.user.phone].remindSettings) {
        users[req.user.phone].remindSettings = [];
    }
    
    const newRemind = {
        id: Date.now().toString(),
        province,
        oilType,
        threshold: parseFloat(threshold),
        createdAt: new Date().toISOString(),
        lastNotifiedPrice: null
    };
    
    users[req.user.phone].remindSettings.push(newRemind);
    saveUsers(users);
    
    res.json({ success: true, remind: newRemind, message: '提醒设置成功' });
});

// 删除提醒
app.delete('/api/remind/:id', authMiddleware, (req, res) => {
    const id = req.params.id;
    const users = getUsers();
    
    if (users[req.user.phone]?.remindSettings) {
        users[req.user.phone].remindSettings = 
            users[req.user.phone].remindSettings.filter(r => r.id !== id);
        saveUsers(users);
    }
    
    res.json({ success: true, message: '已删除提醒' });
});

// 检查油价是否触发提醒（内部接口，供定时任务调用）
app.get('/api/remind/check', authMiddleware, (req, res) => {
    const users = getUsers();
    const reminders = users[req.user.phone]?.remindSettings || [];
    const oilData = getOilPrices();
    
    if (!oilData || !oilData.prices) {
        return res.json({ success: true, triggered: [] });
    }
    
    const triggered = [];
    for (const remind of reminders) {
        const provinceData = oilData.prices[remind.province];
        if (!provinceData) continue;
        
        const currentPrice = provinceData[remind.oilType];
        if (!currentPrice) continue;
        
        // 如果有上次通知价格，检查涨幅
        if (remind.lastNotifiedPrice !== null) {
            const priceDiff = currentPrice - remind.lastNotifiedPrice;
            if (priceDiff > remind.threshold) {
                triggered.push({
                    remind,
                    currentPrice,
                    lastPrice: remind.lastNotifiedPrice,
                    priceDiff
                });
            }
        }
    }
    
    res.json({ success: true, triggered });
});
