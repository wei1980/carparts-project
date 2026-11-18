#!/usr/bin/env bash
# bilstein_sync.sh — BILSTEIN 增量同步（合并抓取结果 → 导入 DB → 报告）
#
# 抓取在跑（4 路并行）时，随时可以执行这支脚本把当前结果吸收进 DB。
# 可反复执行：merge 用 (sku+Type+From_to+series) 去重，import 用 upsert。
#
# 用法：
#   bash carparts-api/scripts/bilstein_sync.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$HERE/.." && pwd)"
SCRAPE_DIR="C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN"

echo "=== BILSTEIN 增量同步 $(date '+%F %T') ==="

# 抓取进度
V=$(cat "$SCRAPE_DIR"/visited_V11_P*.txt 2>/dev/null | wc -l | tr -d ' ')
echo "抓取进度: $V 车型已抓（4 路并行）"

# 1) 合并（merge 腳本用 __dirname 定位 CSV，cd 到它自己的目錄最保險）
cd "$HERE" || exit 1
node bilstein_merge.js || { echo "❌ merge 失败"; exit 1; }

# 2) 导入
cd "$API" || exit 1
node scripts/bilstein_import.js --apply 2>&1 | grep -E "rows|unique|商品數|圖片:|parts 成功|links 寫入"

# 2b) 自动补缺图（新抓到的 SKU 若 CSV 没图，用同产品线通用图）
node scripts/bilstein_fix4.js --apply 2>&1 | grep -E "複製|驗證" || true

# 3) 报告
node scripts/bilstein_report.js
echo "=== 同步完成 $(date '+%F %T') ==="