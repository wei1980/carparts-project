#!/bin/bash
# 全量抓取：分批跑，每批结束记录进度，可中断续跑
cd "$(dirname "$0")"
OUT=Parts_V11_FULL.csv
VIS=visited_V11_FULL.txt
MAN=manifest_V11_FULL.csv
LOG=full_run.log

echo "=== $(date '+%F %T') 開始 ===" >> $LOG
node scrape_BILSTEIN_V11.js --out $OUT --visited $VIS --manifest $MAN >> $LOG 2>&1
echo "=== $(date '+%F %T') 結束 exit=$? ===" >> $LOG
