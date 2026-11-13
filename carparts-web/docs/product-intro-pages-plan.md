# 產品介紹頁面規劃（客戶版）

## 目標
- 對客戶（車主）提供「我的車 + 我要裝什麼零件」的認知內容，比現有 Shop / PartDetail 的交易型頁面更具教育與信任感。
- 所有頁面必須沿用既有 design token 與元件（`btn-primary`、`product-card`、`chip`、`skeleton`、ErrorState…）。

## 現有後端依賴（不需新 API 即可做 MVP）
- `GET /api/parts/brands`（支援 `?category=` / `?subcategory=` 連動）
- `GET /api/parts/recommended?sort=hot`（熱門零件）
- `GET /api/parts/:id`（單品 + 相容性）
- `GET /api/parts/:id/compatibility`（CONFIRMED / NEEDS_VEHICLE / NEEDS_REVIEW）

## 規劃頁面

### Phase 1 — MVP（先做兩個）
1. **品牌介紹頁** `/brands/:brand`
   - 品牌故事、公司貨標示（`is_official`：BMW / Mercedes / KN / Pipercross…）
   - 該品牌熱門零件 top N
   - 適用車型情境入口（→ 車系頁 / 單品頁）
2. **Landing 首頁** `/`
   - 品牌速覽、熱門車型情境、熱門零件、CTA

### Phase 2
3. **車系 / 世代介紹** `/vehicles/:variantId`
   - 世代（year_start~year_end）+ 引擎 → 適用零件清單 + 狀態（NEEDS_REVIEW 煞車卡鉗等）

### Phase 3
4. **系列 / 情境內容**（依後端 content 欄位或 CMS 擴充）

## 設計要求
- 三態（loading / error / empty）統一使用 `ErrorState` + retry。
- CTA 文案：「查看適用配件 → /part/:id」與「加入追蹤」。
