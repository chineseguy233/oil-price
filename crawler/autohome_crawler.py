#!/usr/bin/env python3
"""
汽车之家油价爬虫 - autohome.com.cn/oil/
数据源: window.__NEXT_DATA__ (Next.js SSR)
稳定版: 直接curl + JSON解析，无需浏览器
"""
import requests
import json
import re
import sys
import os
from datetime import datetime

BASE_URL = "https://www.autohome.com.cn/oil/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.autohome.com.cn/",
}
TIMEOUT = 20


def fetch_oil_data():
    """从autohome获取油价数据"""
    resp = requests.get(BASE_URL, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    html = resp.text

    # 从 __NEXT_DATA__ 提取JSON
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
    if not m:
        raise RuntimeError("无法找到 __NEXT_DATA__，页面结构可能已变")

    data = json.loads(m.group(1))

    # 路径: props.pageProps.baseData.oilPriceInfo.oilPrices
    base = data.get("props", {}).get("pageProps", {}).get("baseData", {})
    oil_info = base.get("oilPriceInfo", {})
    prices = oil_info.get("oilPrices", [])

    if not prices:
        raise RuntimeError(f"油价数据为空，baseData keys: {list(base.keys())}")

    update_time = prices[0].get("currentDateTime", datetime.now().strftime("%Y年%m月%d日"))

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 获取到 {len(prices)} 个省份油价数据，更新时间: {update_time}")

    return {
        "update_time": update_time,
        "date": prices[0].get("dateTime", datetime.now().strftime("%Y-%m-%d")),
        "prices": prices
    }


def save_prices(data, filepath="data/oil_prices.json"):
    """保存到oil_prices.json（兼容后端API格式）"""
    # 转换为 { provinceName: { "92": price, "95": price, ... }, ... }
    formatted = {}
    for p in data["prices"]:
        province = p["provinceName"]
        formatted[province] = {
            "92": p.get("oilPrice92"),
            "95": p.get("oilPrice95"),
            "98": p.get("oilPrice98"),
            "0": p.get("oilPrice0"),
            "_update": p.get("currentDateTime", ""),
            "_date": p.get("dateTime", ""),
        }

    output = {
        "update_time": data["update_time"],
        "prices": formatted
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"已保存油价数据到 {filepath}（{len(formatted)} 个省份）")


def append_history(data, history_path="data/oil_history.json"):
    """追加到历史记录（兼容 dict keyed by province 格式）
    格式: { province: { date: { "92": price, "95": price, "98": price, "0": price } } }
    """
    history = {}
    if os.path.exists(history_path):
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = {}

    new_count = 0
    today = data["date"]

    for p in data["prices"]:
        province = p["provinceName"]
        if province not in history:
            history[province] = {}

        # 已有今日数据则跳过
        if today in history[province]:
            continue

        history[province][today] = {
            "92": p.get("oilPrice92"),
            "95": p.get("oilPrice95"),
            "98": p.get("oilPrice98"),
            "0": p.get("oilPrice0"),
        }
        new_count += 1

    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    total_records = sum(len(v) for v in history.values())
    print(f"历史记录已更新，共 {total_records} 条，新增 {new_count} 条")


def main():
    try:
        data = fetch_oil_data()
        save_prices(data)
        append_history(data)
        print("爬取完成!")
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    # 切换到项目根目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
    main()
