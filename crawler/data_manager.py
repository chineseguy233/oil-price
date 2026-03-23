#!/usr/bin/env python3
"""
统一数据管理器
- 统一数据源：JSON (oil_history.json)
- 支持定时爬取和历史数据管理
"""
import json
import os
import sqlite3
from datetime import datetime, timedelta

DATA_DIR = os.path.dirname(os.path.abspath(__file__)) + '/../data'
HISTORY_FILE = os.path.join(DATA_DIR, 'oil_history.json')
DB_FILE = os.path.join(DATA_DIR, 'oil_history.db')

def load_history():
    """加载历史JSON数据"""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_history(data):
    """保存到历史JSON"""
    history = load_history()
    today = datetime.now().strftime('%Y-%m-%d')
    
    for province, prices in data.get('prices', {}).items():
        if province not in history:
            history[province] = {}
        history[province][today] = prices
    
    # 只保留最近90天数据
    cutoff = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
    for province in list(history.keys()):
        dates = list(history[province].keys())
        for date in dates:
            if date < cutoff:
                del history[province][date]
        if not history[province]:
            del history[province]
    
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    return history

def sync_to_db():
    """同步JSON数据到SQLite（可选，用于备份或SQL查询）"""
    history = load_history()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 创建表（如果不存在）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS oil_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            province TEXT NOT NULL,
            oil_type TEXT NOT NULL,
            price REAL NOT NULL,
            UNIQUE(date, province, oil_type)
        )
    ''')
    
    # 插入数据
    count = 0
    for province, dates in history.items():
        for date, prices in dates.items():
            for oil_type, price in prices.items():
                try:
                    cursor.execute('''
                        INSERT OR REPLACE INTO oil_history (date, province, oil_type, price)
                        VALUES (?, ?, ?, ?)
                    ''', (date, province, oil_type, price))
                    count += 1
                except:
                    pass
    
    conn.commit()
    conn.close()
    print(f"已同步 {count} 条记录到数据库")

def get_history(province=None, days=30):
    """获取历史数据"""
    history = load_history()
    
    if province:
        if province in history:
            dates = sorted(history[province].keys())[-days:]
            return {province: {d: history[province][d] for d in dates}}
        return {}
    
    # 返回所有省份
    result = {}
    for prov, dates in history.items():
        sorted_dates = sorted(dates.keys())[-days:]
        result[prov] = {d: dates[d] for d in sorted_dates}
    return result

def get_stats():
    """获取数据统计"""
    history = load_history()
    all_dates = set()
    for prov, dates in history.items():
        all_dates.update(dates.keys())
    
    return {
        'provinces': len(history),
        'days': len(all_dates),
        'date_range': f"{min(all_dates)} ~ {max(all_dates)}" if all_dates else "N/A"
    }

if __name__ == '__main__':
    stats = get_stats()
    print(f"数据统计: {stats}")
