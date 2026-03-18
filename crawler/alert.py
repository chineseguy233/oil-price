#!/usr/bin/env python3
"""
油价提醒系统 - 检测价格变化并发送通知
"""
import json
import os
from datetime import datetime

DATA_FILE = '../data/oil_prices.json'
HISTORY_FILE = '../data/oil_history.json'
ALERT_CONFIG = '../data/alert_config.json'

def load_json(filepath, default=None):
    if default is None:
        default = {}
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default

def save_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def check_price_changes():
    """检查价格变化"""
    current = load_json(DATA_FILE)
    history = load_json(HISTORY_FILE, {'last_prices': {}})
    
    if not current or 'prices' not in current:
        print("没有当前油价数据")
        return []
    
    changes = []
    current_prices = current.get('prices', {})
    last_prices = history.get('last_prices', {})
    
    for city, prices in current_prices.items():
        if city not in last_prices:
            continue
            
        last = last_prices[city]
        for fuel_type in ['92', '95', '98', '0']:
            if fuel_type in prices and fuel_type in last:
                curr_price = prices[fuel_type]
                last_price = last[fuel_type]
                
                if curr_price != last_price:
                    change = curr_price - last_price
                    change_type = "上涨" if change > 0 else "下跌"
                    changes.append({
                        'city': city,
                        'type': fuel_type,
                        'old': last_price,
                        'new': curr_price,
                        'change': change,
                        'change_type': change_type
                    })
    
    # 更新历史
    history['last_prices'] = current_prices
    history['last_update'] = current.get('update_time', '')
    save_json(HISTORY_FILE, history)
    
    return changes

def send_alert(changes):
    """发送提醒到飞书"""
    if not changes:
        print("价格无变化")
        return
    
    print(f"检测到 {len(changes)} 个价格变化:")
    for c in changes:
        print(f"  {c['city']} {c['type']}号汽油: {c['old']} → {c['new']} ({c['change_type']}{abs(c['change']):.2f}元)")
    
    # 构建消息
    msg = "📢 油价提醒\n\n"
    for c in changes:
        emoji = "⬆️" if c['change'] > 0 else "⬇️"
        msg += f"{emoji} {c['city']} {c['type']}号汽油: {c['old']} → {c['new']}元 ({c['change_type']}{abs(c['change']):.2f}元)\n"
    
    # 发送飞书消息
    cmd = f'openclaw-cn message send --channel feishu --target ou_d7208ac674e6d7672290fb8fe2d74d07 --message "{msg}" --json 2>&1'
    os.system(cmd)

def setup_cron():
    """设置定时任务"""
    import subprocess
    
    # 每天早上8点更新油价
    cron_job = "0 8 * * * cd /home/tony/Projects/oil-price-app/crawler && python3 oil_crawler.py && python3 alert.py"
    
    # 检查是否已存在
    result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
    if 'oil_crawler' not in result.stdout:
        result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
        current = result.stdout or ""
        new_cron = current + "\n" + cron_job + "\n"
        subprocess.run(['crontab', '-'], input=new_cron, text=True)
        print("定时任务已设置: 每天早上8点自动更新油价并检查价格变化")
    else:
        print("定时任务已存在")

if __name__ == '__main__':
    print("=" * 50)
    print("油价提醒系统")
    print("=" * 50)
    
    changes = check_price_changes()
    send_alert(changes)
