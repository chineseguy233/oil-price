#!/usr/bin/env python3
"""
油价爬虫管理器 v2 - 多重保障确保数据及时更新
==========================================

保障策略:
1. 多时窗重试: 短时间内对主数据源多次探测（应对临时网络抖动）
2. 指数退避: 失败后自动等待重试，不过早放弃
3. 数据新鲜度监控: 记录每次抓取时间，自动判断是否需要更新
4. 健康检查API: 后端可查询数据状态，stale 时主动报警

使用方式:
  python3 crawler_manager.py          # 完整抓取（重试+历史）
  python3 crawler_manager.py --quick  # 快速抓取（一次尝试）
  python3 crawler_manager.py --check  # 仅检查数据新鲜度，不抓取
"""
import requests
import json
import re
import os
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List

# 配置
DATA_DIR = os.path.dirname(os.path.abspath(__file__)) + '/../data'
OIL_PRICES_FILE = os.path.join(DATA_DIR, 'oil_prices.json')
OIL_HISTORY_FILE = os.path.join(DATA_DIR, 'oil_history.json')
STATS_FILE = os.path.join(DATA_DIR, 'crawl_stats.json')

# 重试配置
MAX_RETRIES = 3          # 最多重试次数
INITIAL_DELAY = 2        # 初始等待秒数
MAX_DELAY = 30           # 最长等待秒数
STALE_HOURS = 24         # 超过此小时数认为数据过时

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('crawler_manager')

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


# ============================================================
# 主数据源: 汽车之家
# ============================================================

class AutohomeSource:
    """汽车之家 - 主数据源，唯一可靠的全国各省油价结构化数据"""
    name = "autohome"
    url = "https://www.autohome.com.cn/oil/"

    def fetch(self) -> Optional[dict]:
        try:
            resp = requests.get(self.url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            resp.encoding = "utf-8"

            m = re.search(
                r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
                resp.text, re.DOTALL
            )
            if not m:
                log.warning("autohome: 未找到 __NEXT_DATA__，页面结构可能已变")
                return None

            raw = json.loads(m.group(1))
            base = raw.get("props", {}).get("pageProps", {}).get("baseData", {})
            oil_info = base.get("oilPriceInfo", {})
            prices = oil_info.get("oilPrices", [])

            if not prices:
                log.warning("autohome: 油价数据为空")
                return None

            update_time = prices[0].get("currentDateTime",
                                        datetime.now().strftime("%Y年%m月%d日"))

            # 标准化
            formatted = {}
            for p in prices:
                province = p["provinceName"]
                formatted[province] = {
                    "92": p.get("oilPrice92"),
                    "95": p.get("oilPrice95"),
                    "98": p.get("oilPrice98"),
                    "0": p.get("oilPrice0"),
                    "_update": p.get("currentDateTime", ""),
                    "_date": p.get("dateTime", ""),
                }

            log.info(f"autohome: 获取到 {len(formatted)} 个省份")
            return {
                "source": self.name,
                "update_time": update_time,
                "date": prices[0].get("dateTime", datetime.now().strftime("%Y-%m-%d")),
                "prices": formatted,
            }
        except requests.RequestException as e:
            log.warning(f"autohome: 网络请求失败 - {e}")
            return None
        except Exception as e:
            log.warning(f"autohome: 解析失败 - {e}")
            return None

    def validate(self, data: dict) -> bool:
        """至少10个省才认为有效"""
        return len(data.get('prices', {})) >= 10


# ============================================================
# 数据新鲜度检查
# ============================================================

def check_freshness() -> dict:
    """
    检查当前数据新鲜度
    返回: { is_fresh: bool, hours_old: float, last_update: str, source: str }
    """
    result = {
        "is_fresh": False,
        "hours_old": None,
        "last_update": None,
        "source": None,
        "provinces_count": 0,
        "stale_warning": False,
    }

    if not os.path.exists(OIL_PRICES_FILE):
        result["stale_warning"] = True
        return result

    try:
        with open(OIL_PRICES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

        update_time_str = data.get('update_time', '')
        result["last_update"] = update_time_str
        result["source"] = data.get('source', 'unknown')
        result["provinces_count"] = len(data.get('prices', {}))

        # 解析更新时间
        try:
            # 格式: "2026年04月18日"
            dt = datetime.strptime(update_time_str.replace('年', '-').replace('月', '-').replace('日', ''), '%Y-%m-%d')
            hours_old = (datetime.now() - dt).total_seconds() / 3600
            result["hours_old"] = round(hours_old, 1)
            result["is_fresh"] = hours_old < STALE_HOURS
            result["stale_warning"] = hours_old >= STALE_HOURS
        except Exception:
            result["stale_warning"] = True

    except Exception as e:
        log.warning(f"检查新鲜度失败: {e}")
        result["stale_warning"] = True

    return result


# ============================================================
# 抓取器（带重试）
# ============================================================

class OilCrawler:
    """带指数退避重试的爬虫"""

    def __init__(self):
        self.source = AutohomeSource()

    def crawl_with_retry(self, max_retries: int = MAX_RETRIES,
                         quick: bool = False) -> Optional[dict]:
        """
        带指数退避重试的抓取

        Args:
            max_retries: 最大重试次数
            quick: True=只试一次，不重试
        """
        if quick:
            return self.source.fetch()

        delay = INITIAL_DELAY
        last_error = None

        for attempt in range(1, max_retries + 1):
            log.info(f"抓取尝试 {attempt}/{max_retries}...")

            data = self.source.fetch()
            if data and self.source.validate(data):
                if attempt > 1:
                    log.info(f"  -> 第 {attempt} 次尝试成功")
                return data

            last_error = "数据无效"
            if attempt < max_retries:
                log.info(f"  -> 失败，{delay} 秒后重试...")
                time.sleep(delay)
                delay = min(delay * 2, MAX_DELAY)  # 指数退避

        log.error(f"全部 {max_retries} 次尝试均失败: {last_error}")
        return None

    def save(self, data: dict) -> None:
        """保存当日油价"""
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(OIL_PRICES_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "update_time": data['update_time'],
                "date": data['date'],
                "source": data['source'],
                "fetched_at": datetime.now().isoformat(),
                "prices": data['prices'],
            }, f, ensure_ascii=False, indent=2)
        log.info(f"已保存: {OIL_PRICES_FILE}（{len(data['prices'])} 个省份）")

    def append_history(self, data: dict) -> None:
        """追加历史记录"""
        history = {}
        if os.path.exists(OIL_HISTORY_FILE):
            try:
                with open(OIL_HISTORY_FILE, 'r', encoding='utf-8') as f:
                    history = json.load(f)
            except Exception:
                history = {}

        today = data['date']
        new_count = 0
        for province, prices in data['prices'].items():
            if province not in history:
                history[province] = {}
            if today not in history[province]:
                history[province][today] = {
                    "92": prices.get("92"),
                    "95": prices.get("95"),
                    "98": prices.get("98"),
                    "0": prices.get("0"),
                }
                new_count += 1

        with open(OIL_HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

        total = sum(len(v) for v in history.values())
        log.info(f"历史记录: 共 {total} 条，新增 {new_count} 条")

    def update_stats(self, data: dict, success: bool) -> None:
        """更新抓取统计"""
        stats = {}
        if os.path.exists(STATS_FILE):
            try:
                with open(STATS_FILE, 'r', encoding='utf-8') as f:
                    stats = json.load(f)
            except Exception:
                stats = {}

        today = datetime.now().strftime('%Y-%m-%d %H:%M')
        entry = {
            'time': today,
            'success': success,
            'source': data.get('source') if data else None,
            'provinces': len(data['prices']) if data else 0,
        }

        stats.setdefault('history', [])
        stats['history'].append(entry)
        stats['history'] = stats['history'][-60:]  # 保留最近60条

        stats['last_crawl'] = entry

        # 统计成功率
        if len(stats['history']) >= 5:
            successes = sum(1 for e in stats['history'] if e['success'])
            stats['success_rate'] = round(successes / len(stats['history']) * 100, 1)

        with open(STATS_FILE, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)

    def run(self, quick: bool = False) -> bool:
        """执行抓取"""
        log.info("=" * 50)
        log.info(f"油价爬虫启动 | 模式: {'快速' if quick else '重试'}")
        log.info("=" * 50)

        data = self.crawl_with_retry(quick=quick)

        if not data:
            self.update_stats(None, success=False)
            log.error("抓取失败")
            return False

        self.save(data)
        if not quick:
            self.append_history(data)
        self.update_stats(data, success=True)

        log.info(f"✅ 完成 | 来源: {data['source']} | {len(data['prices'])} 省")
        return True


# ============================================================
# 健康检查（供后端 API 调用）
# ============================================================

def health_check() -> dict:
    """
    返回数据健康状态，供后端 API 查询
    """
    freshness = check_freshness()
    stats = {}

    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, 'r', encoding='utf-8') as f:
                stats = json.load(f)
        except Exception:
            pass

    return {
        "status": "healthy" if freshness["is_fresh"] else "stale",
        "freshness": freshness,
        "stats": {
            "last_crawl": stats.get("last_crawl"),
            "success_rate": stats.get("success_rate"),
            "total_attempts": len(stats.get("history", [])),
        }
    }


# ============================================================
# 入口
# ============================================================

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

    if '--check' in sys.argv:
        # 仅检查新鲜度
        result = check_freshness()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0 if not result.get('stale_warning') else 1)

    quick = '--quick' in sys.argv or '-q' in sys.argv

    crawler = OilCrawler()
    success = crawler.run(quick=quick)
    sys.exit(0 if success else 1)
