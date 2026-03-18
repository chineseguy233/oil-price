#!/usr/bin/env python3
"""
油价爬虫 - 从汽油价格网获取各省市油价
"""
import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime

# 请求头
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# 省份/城市映射
CITIES = {
    '北京': 'beijing.shtml',
    '上海': 'shanghai.shtml',
    '天津': 'tianjin.shtml',
    '重庆': 'chongqing.shtml',
    '广东': 'guangdong.shtml',
    '深圳': 'shenzhen.shtml',
    '江苏': 'jiangsu.shtml',
    '浙江': 'zhejiang.shtml',
    '山东': 'shandong.shtml',
    '河北': 'hebei.shtml',
    '河南': 'henan.shtml',
    '四川': 'sichuan.shtml',
    '湖北': 'hubei.shtml',
    '湖南': 'hunan.shtml',
    '辽宁': 'liaoning.shtml',
    '福建': 'fujian.shtml',
    '陕西': 'shanxi-3.shtml',
    '山西': 'shanxi.shtml',
    '安徽': 'anhui.shtml',
    '江西': 'jiangxi.shtml',
    '吉林': 'jilin.shtml',
    '黑龙江': 'heilongjiang.shtml',
    '甘肃': 'gansu.shtml',
    '贵州': 'guizhou.shtml',
    '海南': 'hainan.shtml',
    '内蒙古': 'neimenggu.shtml',
    '广西': 'guangxi.shtml',
    '宁夏': 'ningxia.shtml',
    '青海': 'qinghai.shtml',
    '新疆': 'xinjiang.shtml',
    '西藏': 'xizang.shtml',
    '云南': 'yunnan.shtml',
}

BASE_URL = 'http://www.qiyoujiage.com/'

def get_oil_price(city_name, path):
    """获取单个城市的油价"""
    url = BASE_URL + path
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找价格
        prices = {}
        dt_tags = soup.find_all('dt')
        dd_tags = soup.find_all('dd')
        
        for dt, dd in zip(dt_tags, dd_tags):
            name = dt.get_text().strip()
            price = dd.get_text().strip()
            
            if '92#' in name or '92号' in name:
                try:
                    prices['92'] = float(price)
                except:
                    pass
            elif '95#' in name or '95号' in name:
                try:
                    prices['95'] = float(price)
                except:
                    pass
            elif '98#' in name or '98号' in name:
                try:
                    prices['98'] = float(price)
                except:
                    pass
            elif '0#' in name or '0号柴油' in name or '柴油' in name:
                try:
                    prices['0'] = float(price)
                except:
                    pass
        
        return prices if prices else None
    except Exception as e:
        print(f"Error fetching {city_name}: {e}")
        return None

def crawl_all():
    """爬取所有城市油价"""
    results = {
        'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'prices': {}
    }
    
    for city, path in CITIES.items():
        print(f"正在获取 {city} 油价...")
        prices = get_oil_price(city, path)
        if prices:
            results['prices'][city] = prices
            print(f"  {city}: 92#={prices.get('92', '-')}, 95#={prices.get('95', '-')}")
        time.sleep(0.5)  # 避免请求过快
    
    return results

def save_to_file(data, filepath='../data/oil_prices.json'):
    """保存到文件"""
    import os
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n数据已保存到 {filepath}")

if __name__ == '__main__':
    print("=" * 50)
    print("油价爬虫启动")
    print("=" * 50)
    data = crawl_all()
    save_to_file(data)
    print(f"\n共获取 {len(data['prices'])} 个省市油价")
