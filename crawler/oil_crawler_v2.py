#!/usr/bin/env python3
"""
油价爬虫 V2 - 支持定时抓取和历史存储(JSON版)
"""
import requests
from bs4 import BeautifulSoup
import json
import time
import os
from datetime import datetime, timedelta

# 配置
DATA_DIR = os.path.dirname(os.path.abspath(__file__)) + '/../data'
HISTORY_FILE = os.path.join(DATA_DIR, 'oil_history.json')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

# 省份映射
CITIES = {
    '北京': 'beijing.shtml', '上海': 'shanghai.shtml', '天津': 'tianjin.shtml',
    '重庆': 'chongqing.shtml', '广东': 'guangdong.shtml', '江苏': 'jiangsu.shtml',
    '浙江': 'zhejiang.shtml', '山东': 'shandong.shtml', '河北': 'hebei.shtml',
    '河南': 'henan.shtml', '四川': 'sichuan.shtml', '湖北': 'hubei.shtml',
    '湖南': 'hunan.shtml', '辽宁': 'liaoning.shtml', '福建': 'fujian.shtml',
    '陕西': 'shanxi-3.shtml', '山西': 'shanxi.shtml', '安徽': 'anhui.shtml',
    '江西': 'jiangxi.shtml', '吉林': 'jilin.shtml', '黑龙江': 'heilongjiang.shtml',
    '甘肃': 'gansu.shtml', '贵州': 'guizhou.shtml', '海南': 'hainan.shtml',
    '内蒙古': 'neimenggu.shtml', '广西': 'guangxi.shtml', '宁夏': 'ningxia.shtml',
    '青海': 'qinghai.shtml', '新疆': 'xinjiang.shtml', '西藏': 'xizang.shtml',
    '云南': 'yunnan.shtml',
}

BASE_URL = 'http://www.qiyoujiage.com/'

def load_history():
    """加载历史数据"""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_history(data):
    """保存到历史JSON"""
    history = load_history()
    today = datetime.now().strftime('%Y-%m-%d')
    
    for province, prices in data['prices'].items():
        if province not in history:
            history[province] = {}
        history[province][today] = prices
    
    # 只保留最近90天数据
    cutoff = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
    for province in history:
        dates = list(history[province].keys())
        for date in dates:
            if date < cutoff:
                del history[province][date]
    
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    print(f"历史数据已保存 (共 {len(history)} 个省份)")

def get_oil_price(city_name, path):
    """获取单个省市油价"""
    url = BASE_URL + path
    try:
        response = requests.get(url, headers=HEADERS, timeout=10, verify=False)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        prices = {}
        dt_tags = soup.find_all('dt')
        dd_tags = soup.find_all('dd')
        
        for dt, dd in zip(dt_tags, dd_tags):
            name = dt.get_text().strip()
            price = dd.get_text().strip()
            
            if '92' in name:
                try: prices['92'] = float(price)
                except: pass
            elif '95' in name:
                try: prices['95'] = float(price)
                except: pass
            elif '98' in name:
                try: prices['98'] = float(price)
                except: pass
            elif '0' in name or '柴油' in name:
                try: prices['0'] = float(price)
                except: pass
        
        return prices if prices else None
    except Exception as e:
        print(f"Error: {city_name} - {e}")
        return None

def crawl_all():
    """爬取所有省市油价"""
    results = {
        'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'prices': {}
    }
    
    for city, path in CITIES.items():
        print(f"正在获取 {city}...", end=" ")
        prices = get_oil_price(city, path)
        if prices:
            results['prices'][city] = prices
            print(f"92#={prices.get('92', '-')}")
        time.sleep(0.3)
    
    return results

def save_to_file(data, filepath='../data/oil_prices.json'):
    """保存到JSON文件"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"数据已保存到 {filepath}")

def run_crawl():
    """执行爬取并存储"""
    print("=" * 50)
    print("油价爬虫 V2 启动")
    print("=" * 50)
    
    # 爬取数据
    data = crawl_all()
    
    # 保存当日数据
    save_to_file(data)
    
    # 保存历史数据
    save_history(data)
    
    print(f"\n✅ 完成！共获取 {len(data['prices'])} 个省市油价")

if __name__ == '__main__':
    import warnings
    warnings.filterwarnings('ignore')
    run_crawl()
