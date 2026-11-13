# Prisma Migrations Baseline（2026-09-17）

## 為什麼重置

原本 14 份增量 migration **重放後無法重建出目前 schema**：

- `npx prisma migrate diff --from-migrations --to-schema-datamodel` 顯示差異 672 行：22 張表、9 個 enum、多個欄位（`depositAmount`、`balanceAmount`、`depositPaidAt`、`bankLastFiveDigits`、`orderType` 等）從未存在於任何 migration。
- 實際 `carparts` 資料庫早已有這些欄位（即當初是用 `db push` 或手動 SQL 改的），所以 `migrate status` 一直顯示「up to date」，掩蓋了這個問題。
- 影響：乾淨環境跑 `prisma migrate deploy` 會建出不完整 schema，正式程式直接噴 `Unknown field`。

## 處理方式

1. 舊 migrations 備份於 `prisma/migrations_backup_20260917/`（14 份 + lock 檔，勿刪）。
2. 以 `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma` 產生單一
   `20260917000000_baseline/migration.sql`（1028 行）。
3. 對既有 `carparts` 資料庫執行 `prisma migrate resolve --applied 20260917000000_baseline`
   ——只標記、不執行 SQL，live 資料不受影響。
4. 驗證：`migrate diff --from-migrations --to-schema-datamodel --shadow-database-url` →
   **No difference detected**。

## 既有資料庫限制與修正

上述 shadow diff 僅代表 migration 重放與 schema 一致，**不代表既有 live DB 已一致**。
`resolve --applied` 只改 migration 記錄，不會新增缺少的欄位；不得將它當成結構同步。

- 已實際發現 live DB 缺少 `EndUser.currentVehicleId`，造成 `/api/my-car/dashboard` 查詢 P2022。
- 已透過 `20260917150000_reconcile_current_vehicle` 增量 migration 補齊 nullable 欄位及唯一索引；既有車輛與使用者資料不變。
- 以現有車主資料直接呼叫 dashboard handler，已回傳 200、車輛、保養紀錄與提醒；這不是登入流程的 E2E 驗證。
- 先前 live diff 另有改裝擴充欄位及索引差異，未在這次修正中套用，不能宣稱整體 schema 已同步。

## 之後的規則

- 一律用 `npx prisma migrate dev --name <描述>` 產生增量 migration，禁止 `db push`。
- 乾淨資料庫上 `prisma migrate deploy` 必須能重現 schema（可用 shadow DB diff 驗證）。
