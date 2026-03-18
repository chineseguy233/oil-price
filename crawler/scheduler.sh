#!/bin/bash
# 油价爬虫定时任务脚本
# 使用方法: 
#   添加到 crontab: 0 8 * * * /home/tony/Projects/oil-price-app/crawler/scheduler.sh
#   或手动运行: bash /home/tony/Projects/oil-price-app/crawler/scheduler.sh

cd "$(dirname "$0")"
LOG_FILE="../data/crawl.log"
ERROR_LOG="../data/crawl_error.log"

echo "========== $(date) 油价爬虫启动 ==========" >> "$LOG_FILE"

# 执行爬虫
python3 oil_crawler_v2.py >> "$LOG_FILE" 2>> "$ERROR_LOG"

# 检查是否成功
if [ $? -eq 0 ]; then
    echo "$(date) 爬取成功" >> "$LOG_FILE"
    
    # 可选：同步到数据库
    python3 data_manager.py -s 2>/dev/null || true
else
    echo "$(date) 爬取失败" >> "$ERROR_LOG"
fi

echo "========== 完成 ==========" >> "$LOG_FILE"
