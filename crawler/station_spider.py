#!/usr/bin/env python3
"""
加油站数据抓取 - 备用方案
"""
import requests
import json
import os
from datetime import datetime

# 腾讯地图WebService API Key
TENCENT_MAP_KEY = "NVLBZ-UIDC4-YTFUP-KMHA5-BGBGF-HZFNH"

# 模拟数据（API不可用时的备选）
MOCK_STATIONS = [
    {"id": "1", "name": "中石化朝阳加油站", "address": "朝阳区", "distance": "0.5km", "lat": 39.904, "lng": 116.408, "discount": "暂无优惠", "brand": "中石化"},
    {"id": "2", "name": "中石油海淀加油站", "address": "海淀区", "distance": "1.2km", "lat": 39.914, "lng": 116.398, "discount": "暂无优惠", "brand": "中石油"},
    {"id": "3", "name": "壳牌东城加油站", "address": "东城区", "distance": "1.5km", "lat": 39.894, "lng": 116.418, "discount": "暂无优惠", "brand": "壳牌"},
    {"id": "4", "name": "民营丰台加油站", "address": "丰台区", "distance": "2.0km", "lat": 39.884, "lng": 116.388, "discount": "暂无优惠", "brand": "民营"},
    {"id": "5", "name": "中化石油加油站", "address": "西城区", "distance": "2.5km", "lat": 39.914, "lng": 116.378, "discount": "暂无优惠", "brand": "中化"},
]

def search_nearby_stations(lat, lng, radius=3000, page_index=0, page_size=20):
    """
    腾讯地图POI搜索 - 加油站
    注意：当前API Key未开启WebserviceAPI功能
    """
    url = "https://apis.map.qq.com/ws/place/v1/search"
    params = {
        "boundary": f"nearby({lat},{radius},{radius})",
        "keyword": "加油站",
        "page_index": page_index,
        "page_size": page_size,
        "key": TENCENT_MAP_KEY
    }
    
    try:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        
        if data.get("status") == 0:
            return data.get("data", [])
        else:
            print(f"API Error: {data.get('message')}")
            # 返回模拟数据
            return MOCK_STATIONS
    except Exception as e:
        print(f"Request failed: {e}")
        return MOCK_STATIONS

def save_stations(stations, filepath="../data/stations.json"):
    """保存到文件"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump({
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "stations": stations
        }, f, ensure_ascii=False, indent=2)
    
    print(f"已保存 {len(stations)} 个加油站")

def crawl_area(lat, lng, radius=5000):
    """抓取指定区域加油站"""
    print(f"正在抓取附近加油站: {lat}, {lng}, 半径{radius}m")
    
    all_stations = []
    for page in range(3):  # 最多3页
        stations = search_nearby_stations(lat, lng, radius, page, 20)
        if not stations:
            break
        all_stations.extend(stations[:20])
    
    if all_stations:
        save_stations(all_stations)
    else:
        print("未获取到数据")

if __name__ == "__main__":
    # 测试
    crawl_area(39.9, 116.4, 5000)
