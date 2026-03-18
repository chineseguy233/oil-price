#!/bin/bash
# 安装定时任务脚本
# 运行: bash setup_cron.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRON_CMD="0 8 * * * cd $SCRIPT_DIR && python3 oil_crawler_v2.py >> ../data/crawl.log 2>&1"

echo "油价爬虫定时任务配置"
echo "===================="
echo ""
echo "当前定时任务 (crontab):"
crontab -l 2>/dev/null | grep -i oil || echo "(无)"
echo ""
echo "将添加以下任务: 每天早上8点自动爬取油价"
echo "命令: $CRON_CMD"
echo ""
read -p "确认添加? (y/n): " confirm
if [ "$confirm" = "y" ]; then
    # 添加定时任务
    (crontab -l 2>/dev/null | grep -v oil_crawler; echo "$CRON_CMD") | crontab -
    echo "✅ 已添加定时任务"
    echo ""
    crontab -l | grep -i oil
else
    echo "已取消"
fi
