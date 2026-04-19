const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const OIL_PRICES_FILE = path.join(__dirname, '../../data/oil_prices.json');
const ANALYSIS_FILE = path.join(__dirname, '../../data/province_analysis.json');

// ============ 读取数据 ============

function getOilPrices() {
  try {
    if (fs.existsSync(OIL_PRICES_FILE)) {
      return JSON.parse(fs.readFileSync(OIL_PRICES_FILE, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

function getAnalysis() {
  try {
    if (fs.existsSync(ANALYSIS_FILE)) {
      return JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

// ============ API ============

router.get('/rankings/provinces', (req, res) => {
  const { oil_type = '92' } = req.query;
  const validOilTypes = ['92', '95', '98', '0'];
  const oilType = validOilTypes.includes(oil_type) ? oil_type : '92';

  const oilData = getOilPrices();
  const analysis = getAnalysis() || {};

  if (!oilData) {
    return res.status(500).json({ success: false, error: '油价数据加载失败' });
  }

// 构建省份排行
  const rankings = []
  const prices = oilData.prices || {}
  for (const [province, data] of Object.entries(prices)) {
    const price = data?.[oilType] ?? null;
    if (price !== null) {
      rankings.push({
        province,
        price,
        analysis: analysis[province] || null,
      });
    }
  }

  // 按价格排序
  rankings.sort((a, b) => a.price - b.price);

  const cheapest = rankings.slice(0, 5);    // 最便宜 TOP5
  const expensive = rankings.slice(-5).reverse(); // 最贵 TOP5

  res.json({
    success: true,
    oil_type: oilType,
    updated_at: oilData._fetched_at || oilData.fetched_at || null,
    cheapest,
    expensive,
    all: rankings,
  });
});

module.exports = router;
