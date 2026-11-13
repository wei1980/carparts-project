# 零件大量上傳標準格式 v1

> 檔案位置：`C:\carparts\carparts-api\prisma\seeds\parts_upload_template.csv`
> 上傳方式：把填好的 CSV 存到同目錄（建議命名 `parts_with_cars.csv`），執行：
> ```
> cd C:\carparts\carparts-api
> node prisma/seeds/importPartsWithCompat.js
> ```

## 欄位規格（15 欄）

| # | 欄位名 | 必填 | 說明 | 範例 |
|---|--------|------|------|------|
| 1 | `SKU` | ✅ | 零件唯一編號。**同一 SKU 出現多列 = 多台車適配**，系統自動合併 | `PX1895` |
| 2 | `品名` | ✅ | 完整商品名稱（品牌+品名+型號） | `Pipercross 高流量空濾 PP1895` |
| 3 | `品牌` | ✅ | 零件製造品牌 | `Pipercross` |
| 4 | `主分類` | ✅ | 需與網站分類樹主分類名稱一致 | `進氣` |
| 5 | `子分類` | ⭕ | 子分類名稱，留空則只掛主分類 | `空氣濾芯` |
| 6 | `建議售價` | ✅ | 整數，車主看到的价格 | `3000` |
| 7 | `車廠批發價` | ⭕ | 整數，留空 = 無批發 | `2250` |
| 8 | `庫存數量` | ✅ | 整數。0 = 顯示「預訂」 | `10` |
| 9 | `商品說明` | ⭕ | 商品描述文字 | `適用 VAG EA888...` |
| 10 | `圖片路徑` | ⭕ | 相對路徑，檔案實際放 `carparts-api/media/` 下 | `media/parts/PX1895.jpg` |
| 11 | `廠牌` | ✅ | 車輛廠牌（見下方對照表） | `VW` |
| 12 | `車型` | ✅ | **年式規格全名**（越細越好） | `Golf GTI` |
| 13 | `世代` | ⭕ | 世代代碼 | `Mk8` / `B9 (8W)` |
| 14 | `引擎代碼` | ⭕⭐ | **強烈建議填**：引擎家族+世代是匹配防呆的關鍵 | `EA888 evo4` / `EA211 Evo` / `M270.910` |
| 15 | `年份` | ✅ | 該列適配的年式（西元） | `2022` |

## ⭐ 引擎代碼寫法（重要）

匯入程式以「引擎家族 + 世代」做跨車型防呆，格式：

```
家族 + 世代
EA888 Gen3      ← 家族 EA888、第3代
EA888 Gen4      ← 第4代（= evo4）
EA888 evo4      ← 同上，會自動視為 Gen4
EA211 Evo       ← EA211 演進版
M270.910        ← Benz 引擎編號（整串視為家族）
B48             ← BMW
```

❌ 不要寫 `EA888`（沒世代 → 可能誤連不同代）
❌ 不要寫 `Gen 3`（中間空格可，但建議 `Gen3`）

## 🚗 廠牌對照（CSV 可寫左欄任意一種，系統自動正規化）

| CSV 寫法 | 正規化為 |
|----------|----------|
| Volkswagen / VW | VW |
| Mercedes-Benz / Mercedes benz / Benz | Benz |
| BMW / Audi / Toyota / Honda / Ford / Porsche / Subaru / Nissan / Mazda / Lexus / Infiniti / Volvo / Skoda / Mini / Suzuki / Mitsubishi / Daihatsu / Isuzu | 同名小寫 |

## 📋 三條鐵律

1. **一台車一年式 = 一列**。同一 SKU 適配 20 台車就複製 20 列，改後面 5 欄（廠牌/車型/世代/引擎/年份），前面 10 欄保持一致
2. **同一台車同一品牌只能有一種零件**（例如 KN 的空濾對 Golf GTI Mk8 只能有一個 SKU）。若你的來源資料同一格出現兩個 SKU，先確認是不是年式不同——不同年式可以用不同 SKU，但要各列一行年份
3. **車型名稱越細越好**。系統的 vehicleVariant 是「年式規格」級別（如 `Golf 230 eTSI Comfort`），CSV 寫得跟它一樣就能精準匹配；寫太粗（只寫 `Golf`）會落到寬鬆匹配，可能連不到或誤連

## 🔍 品牌別名補充

若有同義品牌/車型名稱（例如來源寫 `福斯` 或 `Volkswagon` 拼錯），加到：
```
C:\carparts\carparts-api\prisma\seeds\aliases.json
```
```json
{
  "makes": { "福斯": "vw" },
  "models": { "vw|golf 8": "Golf 8" }
}
```

## ✅ 上傳後自我檢查

上傳後跑這個確認每台車每品牌只有一種同類零件：
```
cd C:\carparts\carparts-api
node hermes-check-dupes2.js
```
