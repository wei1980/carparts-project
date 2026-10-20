# 🚀 金流模組部署檢查清單

> 適用範圍：consumerOrders 金流 + adminBank 對帳 + Mock Bank.xlsx（Sprint 1–5）
> 產出日期：2026-08-23

## ✅ 本機已完成驗證

- [x] Prisma Client 重啟生效（Sprint 1）
- [x] 後端路由掛載：`/api/consumer/orders`、`/api/admin/bank`
- [x] 前台金流 UI（Checkout / Orders）編譯進 bundle
- [x] Admin 後台（AdminBank 對帳頁、AdminOrders 物流/手動確認）編譯進 bundle
- [x] `npm run build` 通過（689 modules，無錯誤）
- [x] `/health` 回 `{"ok":true}`
- [x] 未授權呼叫金流端點回 401（權限保護正常）
- [x] Mock Bank.xlsx 自動產生（`C:/carparts/Update/Bank.xlsx`）

---

## 🔧 環境變數（.env）

| 變數 | 本機測試值 | 正式環境 | 說明 |
|------|-----------|---------|------|
| `MOCK_BANK_EXCEL` | `true` | ⚠️ **必須移除或設 `false`** | true 時啟動會自動造假 Excel |
| `BANK_EXCEL_PATH` | `C:/carparts/Update/Bank.xlsx` | 改成正式對帳檔路徑 | bankExcelService 讀取來源 |
| `PORT` | `3000` | 依部署環境 | |

```bash
# 正式環境 .env 檢查
MOCK_BANK_EXCEL=false        # 或整行刪掉
BANK_EXCEL_PATH=/data/bank/Bank.xlsx   # 依實際路徑
```

## 🗄️ 資料庫

- [ ] `npx prisma migrate deploy`（**不要**在正式跑 `migrate dev` / `db push`）
- [ ] 確認 consumerOrders 相關新欄位/資料表 migration 都已套用
- [ ] 備份資料庫後再執行 migration

## 📦 建置與部署

```bash
# 後端
cd carparts-api
npm ci --omit=dev          # xlsx 為執行期依賴，務必裝進 production
npx prisma generate
pm2 restart carparts-api   # 或你的 process manager

# 前端
cd carparts-web
npm ci
npm run build              # dist/ 丟到靜態主機或 CDN
```

- [ ] 確認 `xlsx` 有進 production dependencies（`package.json` 的 dependencies，不是 devDependencies）
- [ ] 前端 API 用相對路徑 `/api/...`，由 reverse proxy 轉發到 :3000

## 🏦 銀行 Excel 對帳檔

- [ ] 放置真實的 `Bank.xlsx` 到 `BANK_EXCEL_PATH` 指定位置
- [ ] 欄位格式確認（服務已相容多種寫法）：
  - 交易日期：`交易日期` 或 `日期`
  - 金額：`存入金額` 或 `金額`（需 > 0）
  - 備註：`註記` / `備註` / `摘要`
  - 匯款人：`匯款人名稱`
- [ ] 檔案權限：只有 API 執行帳號可讀寫

## 🔒 安全性

- [ ] `/api/admin/bank` 僅 ADMIN 角色可存取（adminAuth.js）
- [ ] `/api/consumer/orders` 僅登入車主可存取（authMiddleware.js）
- [ ] 移除任何測試用種子資料 / 測試訂單
- [ ] HTTPS 已啟用（金流資料不可走明文）

## 🧪 上線後煙霧測試

```bash
curl http://localhost:3000/health                                  # → {"ok":true}
curl -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/bank    # → 401（未帶 token）
curl -o /dev/null -w "%{http_code}" http://localhost:3000/api/consumer/orders # → 401
```

- [ ] 車主下單 → 選轉帳 → 取得匯款資訊
- [ ] Admin 對帳頁能讀到銀行 Excel 明細並比對成功
- [ ] Admin 手動確認收款 → 訂單狀態流轉正常
- [ ] Admin 物流更新（出貨/送達）→ 車主端訂單狀態同步
