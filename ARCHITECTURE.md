# 瑞晨汽車零件商城 — 完整系統架構與功能文件

> 最後更新：2026-08-27　|　適用版本：carparts-api / carparts-web / carparts-admin（C:\\carparts\\）

---

## 1. 系統總覽

```
┌──────────────┐   webhook    ┌─────────────────────────┐
│  LINE Bot    │◄────────────►│   Hermes Desktop Gateway │
│ (車主通知)    │              │   (ngrok: chewy-licking- │
└──────────────┘              │    grumbling.ngrok-free.dev)
                              └─────────────────────────┘
┌──────────────┐  :5173/:3001
│ carparts-web │◄───────── proxy /api,/media ─────────┐
│ 車主端 SPA    │                                      ▼
└──────────────┘                             ┌──────────────────┐
┌──────────────┐  :3001                      │   carparts-api   │
│ carparts-admin│◄──────────────────────────►│ Express + Prisma │
│ 管理後台      │                             │   PostgreSQL     │
└──────────────┘                             └──────────────────┘
```

| 專案 | 技術棧 | 埠 | 說明 |
|---|---|---|---|
| `carparts-api` | Node.js + Express + Prisma + PostgreSQL | 3000（dev）/ 3001 | 單體 API，所有路由掛載於 `src/app.js` |
| `carparts-web` | React 19 + Vite + Tailwind v4 + react-router v6 | 5173 | 車主端購物/預約/保養 SPA |
| `carparts-admin` | React + Vite | 3001（dev） | 管理後台 |
| Hermes Gateway | Hermes Desktop | 8644 | LINE webhook 接收（已取代舊 line-bot.js） |

---

## 2. Prisma 資料模型（schema.prisma，全部含 @@map 自訂表名）

### 使用者與車輛
| Model | 表名 | 重點欄位 |
|---|---|---|
| `EndUser` | end_users | phone(unique)、lineId、resetCodeHash（密碼重設） |
| `Workshop` | workshops | role(TRIAL/VERIFIED/ADMIN)、is_garage、garage_slots(Json)、rating |
| `VehicleProfile` | vehicle_profiles | 一人一車限制、variantId、vin/licensePlate/modifications(Json) |
| `VehicleVariant` | vehicle_variants | make/model/generation/year_start~year_end/engine_code |

### 商品與相容性
| Model | 表名 | 重點欄位 |
|---|---|---|
| `Part` | parts | sku(unique)、msrp/wholesale_price、stock_qty、**is_universal**🆕、**stock_location**🆕、preorder_lead_time_days |
| `PartCompatibility` | part_vehicle_compatibility | part ↔ vehicle_variant 多對多 |
| `Categories` / `Subcategories` | categories / subcategories | 樹狀分類；?all=1 才回傳停用項 |

### 訂單體系（雙軌）
| Model | 表名 | 用途 |
|---|---|---|
| `ConsumerOrder(Item)` | consumer_orders(_items) | 車主端零售；orderType INSTOCK/PREORDER；訂金制 depositAmount |
| `Order`(=OrderItem) | orders(order_items) | 車廠 B2C/B2B；promised_weeks 預購承諾週數 |
| `PurchaseOrder(Item)` | purchase_orders(_items) | 車廠向平台進貨（SUBMITTED→CONFIRMED→SHIPPED→COMPLETED） |

### 🆕 進貨成本管理（2026-08-24 新增）
| Model | 表名 | 說明 |
|---|---|---|
| `Supplier` | suppliers | 名稱/國家/聯絡人/付款條件/幣別 |
| `Shipment` | shipments | 進貨批次 SHyyyymmdd-####；type IMPORT/DOMESTIC；狀態機 DRAFT→ORDERED→IN_TRANSIT→CUSTOMS→RECEIVED/CANCELLED；匯率、國際運費、國內運費、關稅、報關雜費、付款額（皆 TWD）|
| `ShipmentItem` | shipment_items | qty × unit_price_twd；入庫時寫入 **landed_unit_cost 到岸成本** |

**到岸成本公式**：
```
overhead = 國際運費 + 國內運費 + 關稅 + 報關雜費
BY_AMOUNT: 每件成本 = (單價×qty + overhead×(貨款比)) ÷ qty
BY_QTY:    每件成本 = (單價×qty + overhead×(數量比)) ÷ qty
RECEIVED 入庫交易：stock_qty += qty、寫 landed_unit_cost、記 InventoryLog(type=SHIPMENT_RECEIVE）
```

### 保養與提醒
| Model | 表名 | 說明 |
|---|---|---|
| `ServiceRecord(Item)` | service_records(_items) | 工單（LABOR/PART 工項）；完工自動同步預約 COMPLETED |
| `MaintenanceReminder` | maintenance_reminders | AUTO（工單完工依週期表自動產生）/ MANUAL；到期狀態 DUE_NOW/DUE_SOON/OK 由 `maintenanceReminderService.withDueStates()` 推導 |

### 🆕 願望清單與降價通知（2026-08-24 接線）
| Model | 表名 | 新欄位 |
|---|---|---|
| `WishItem` | wish_items | **partId**、**targetPrice**、**notifiedAt**、**notifiedAtPrice**（防重複轟炸）|

降價流程：admin 更新商品價格下降 → `adminParts.js` 觸發 `wishPriceService.checkPriceDrops(partId)` → 現價≤期望價且未通知 → LINE pushMessage。

### 🆕 汽車保險模組（未啟用，feature flag 預設關）
- `InsuranceProduct`（is_active 預設 false）、`InsurancePolicy`（QUOTED/APPLIED/ACTIVE/EXPIRED/CANCELLED）
- 已建表但無任何路由掛載——啟用時需新增路由 + admin 開關

---

## 3. API 路由總表（app.js 掛載順序）

### 公開
| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | /health | 健康檢查 |
| GET | /years /makes /models /variants | 車型階層查詢 |
| GET | /categories/tree?all=1 | 分類樹（all=1 含停用） |
| GET | /parts /parts/:id | 商品搜尋/詳情 |
| POST | /parts/bulk | CSV 匯入 |

### 車主端（authMiddleware，JWT { userId }）
| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | /api/auth/register · login · forgot/reset | 註冊審核制；登入有 rate limit |
| GET/POST/PUT/DELETE | /api/vehicles | 一人一車；PUT 僅 vin/licensePlate |
| GET | /api/consumer/parts/recommended | 🔍 核心搜尋：vehicleId+category+subcategory+search+page+sort（🔥 `sort=hot`：sales_count→view_count→id，Shop 預設）；**通用件 OR is_universal 永遠納入**🆕 |
| CRUD | /api/consumer/orders | 訂單（現貨/預購訂金制）；建立時交易內 `part.sales_count += qty`、取消回補（熱門排序用） |
| GET | /api/parts/:id | 公開商品詳情；每次瀏覽非同步 `view_count +1`（熱門排序用） |
| GET/POST/PATCH/DELETE | /api/wishlist | 🆕 願望清單（partId 去重、期望價、取消） |
| GET | /api/my-car/dashboard | 🆕 我的愛車彙總（車況+工單史+提醒+建議保養） |
| GET/POST/PATCH/DELETE | /api/maintenance-reminders | 提醒管理 |
| GET/POST | /api/service-records | 工單查詢 |
| POST | /api/appointments | 預約 |

### 車廠端（garageAuth，JWT { workshopId }）
採購單全套（/api/garage/purchase-orders）、工作單（/api/garage/service-records）、預約管理、資料隔離（強制 workshop_id 過濾）。

### 管理端（adminAuth，JWT { workshopId, role:'ADMIN' }）
| 路由前綴 | 功能 |
|---|---|
| /api/admin/parts | 商品 CRUD；PATCH 支援 is_universal🆕；降價時自動觸發 wish 通知🆕 |
| /api/admin/inventory | 庫存列表/調整/異動 log |
| /api/admin/procurement | 🆕 suppliers CRUD、shipments CRUD、status 推進（RECEIVED 入庫計算）、monthly-report 月毛利 |
| /api/admin/dashboard-insights | 🆕 best_sellers / turnover / overdue_preorders 三合一聚合 |
| /api/admin/bank | 對帳/手動確認（觸發 LINE 通知） |
| /api/admin/stats /users /vehicles /variants /categories /ai-drafts /settings | 其餘管理功能 |

---

## 4. 前端頁面地圖（carparts-web）

| 路由 | 元件 | 重點 |
|---|---|---|
| /login | Login | 註冊（審核制）+ 登入 + 忘記密碼（LINE 驗證碼）；同步 import（首屏） |
| /shop（=/） | Shop | 車型+分類+搜尋+排序+分頁；**PartCard**🆕：加入購物車變綠「✓ 已加入」、**「通用 全車系」徽章**🆕；DB 無結果→AI 自動建草稿 |
| /part/:id | PartDetail | 規格表、會員價、數量加減、加入回饋 |
| /cart | Cart | 配色已對齊 token🆕；aria-label 數量按鈕🆕 |
| /checkout | Checkout | 收件/付款；alert 待改就地驗證 |
| /orders | Orders | 商品明細表 + 進度條 OrderProgress |
| /profile | Profile | 單頁整合（會員資料列+我的車型） |
| /garages, /garage/:id, /booking | 車廠瀏覽/詳情/預約 | 星等、縣市分組 |
| /appointments /service-records | 預約/工單紀錄 | — |
| /garage/new | Garage(isNew) | 新增車輛（行照 OCR 掃描）— `/garage/:id` 動態路由同時承載 |
| /settings | Settings | 密碼/LINE 綁定 |

**設計系統**（index.css）：`.btn-primary .btn-secondary .field .product-card .page-shell .chip .skeleton .animate-fade-in`；色票 --brand-bg #0b0f14 / surface #131a22 / accent #3b82f6 / amber #f59e0b / green #10b981。新頁面一律用 token，禁止散寫 gray-*。

---

## 5. 本輪完成的功能（2026-08-23 ~ 08-27）

### 第一批
1. ✅ **我的愛車** `/api/my-car/dashboard`（後端就緒；前端頁待做）
2. ✅ **願望清單接線** schema 擴充 + `/api/wishlist` + 降價 LINE 通知服務（前端待做）
3. ✅ **儀表板聚合** `/api/admin/dashboard-insights`（熱銷 TOP10、週轉率、預購逾期 days_overdue）
4. ✅ **進貨成本系統** Supplier/Shipment/ShipmentItem + 到岸成本分攤（BY_AMOUNT/BY_QTY）+ RECEIVED 入庫交易 + 月毛利報表
5. ✅ **汽車保險 schema**（feature flag 預設關閉，無路由）

### 第二批（UI 修復 + 通用件 + 前端頁面接入）
6. ✅ **Home.jsx** 修復無效 Tailwind token（surface-950/primary-600 不存在於 v4）→ 改用設計系統色；加錯誤重試狀態
7. ✅ **Cart.jsx** gray-* 全部換成品牌 token；aria-label；btn-primary/btn-secondary
8. ✅ **Shop PartCard** 加入購物車點擊回饋（✓ 已加入 1.5 秒）+ 通用徽章渲染
9. ✅ **通用型零件**：
   - Schema：`Part.is_universal Boolean @default(false)`（db push 完成）
   - 後端：recommended 查詢在 variantId 或 make/model 匹配兩條路徑都包 `OR [universalOr, 相容條件]`；找不到對應車型時 fallback 只顯示通用件
   - Admin：AdminParts 表單「通用型（全車系）」勾選框（create+patch 都支援）
   - **E2E 驗證 3 PASS**：標記 509 → 車型篩選出現 → 還原後消失

### 第三批（前端頁面接入，2026-08-24）
10. ✅ **`/my-car` MyCar.jsx** — 車輛頭卡（里程/保養次數/車牌）、提醒清單含 DUE_NOW/DUE_SOON 徽章、建議保養清單（標記尚未做過）、保養歷史時間軸（工項徽章+車廠+金額）；skeleton loading；空狀態引導
11. ✅ **`/wishlist` Wishlist.jsx** — 商品卡列（現價 vs 期望價對照）、期望價就地編輯（Enter 送出）、降價達標綠框+「🔥 已達期望價」脈動徽章、移除確認
12. ✅ **Admin Dashboard 三區塊** — Insights 元件：預購逾期紅色警報表（逾期天數徽章，>14 天加深）、熱銷排行（金銀銅牌+條狀圖+營收/庫存）、庫存週轉警示（×1 綠/×2 橙/×2↑ 紅三級）
13. ✅ **Navbar** 新增「愛車」「願望」tab（MIconCar/MIconHeart SVG 圖示），暫時移除「維修紀錄」（從 Profile 仍可達）
14. ✅ `api/index.js` 新增 myCarAPI/wishlistAPI helper

### 第四批（進貨後台頁 + Checkout 就地驗證，2026-08-24）
15. ✅ **`/admin/procurement` AdminProcurement.jsx** — 三 tab：
    - 進貨批次：狀態篩選、批次卡（批次號/類型/狀態徽章、五項成本明細）、狀態推進（DRAFT→ORDERED→IN_TRANSIT→CUSTOMS→RECEIVED，入庫前二次確認）
    - 批次表單 Modal：供貨商下拉、幣別×匯率、零件防抖搜尋加入明細、數量×單價即時小計、四項費用欄位、分攤方式、即時成本預覽；就地驗證零 alert
    - 供貨商卡片列表 + 建立/編輯 Modal
    - 月營收報表：KPI 卡（總營收/毛利/毛利率+缺成本警示）+ 月度損益表含趨勢條
16. ✅ **Checkout 就地驗證** — alert 11→**0**：必填+手機格式 `09xxxxxxxx`+地址長度檢查；紅框+欄位下錯誤文字+自動聚焦；輸入即時清錯；提交失敗改頁首 inline 紅色橫幅；下單成功改 sessionStorage 傳遞 → Orders 頁綠色成功通知卡（訂單編號/應付金額/匯款帳戶/安裝與進口提示）

### 第五批（體驗打磨，2026-08-24）
17. ✅ **ErrorState 共用元件** — full 版（大圖示+重試鈕）與 compact 行內版；接入 Shop（車輛+分類雙提示）/Orders/MyAppointments/ServiceRecords/GarageList 五頁的載入失敗狀態
18. ✅ **Navbar 手機版底部 tab bar** — md 以下：頂部僅 LOGO＋會員/願望/登出；底部 fixed 5-tab（愛車/訂單/預約/車廠/購物車）含 badge、active 頂部指示條、iOS safe-area-inset-bottom、內容預留空間
19. ✅ **recharts chunk 瘦身** — 圖表抽至 `DashboardCharts.jsx` 以 React.lazy 載入：Dashboard 主 chunk **377KB→8.1KB**，recharts 獨立 chunk 非同步載入不阻塞統計卡
20. ✅ **客戶端預約可勾選安裝訂單項目** — `GET /api/appointments/installable-items`（已付款/已出貨/已完成訂單零件）；Booking.jsx 勾選清單；建立預約帶 `installItems`
21. ✅ **LINE 通知車廠** — 預約建立後推播車廠（車輛/客戶/時間/安裝項目清單）
22. ✅ **車廠報價/時間往返** — `PATCH /api/garage/appointments/:id/quote`（報價金額+說明+提議新時間）→ LINE 通知客戶；GarageDashboard 新增 QuoteModal
23. ✅ **車廠直接同意** — `/:id/confirm` → LINE 通知客戶 CONFIRMED
24. ✅ **客戶接受建議時間** — `POST /api/appointments/:id/accept-proposal`（時間改為提議時段→CONFIRMED）→ LINE 通知車廠；MyAppointments 顯示報價卡+「同意此時間」按鈕
25. ✅ **同縣市車廠限制 + 距離排序** — `GET /api/garages?myCity=<客戶地址>&sortBy=distance`：只回傳同縣市車廠、依客戶地址解析縣市中心點計算距離排序（≈km）；特改品另洽客服的提示文案待加入 GarageList
26. ✅ **GarageList 同縣市過濾** — 「📍 我的地區（縣市）/全台」切換；預設依 `GET /api/auth/profile` 地址解析縣市 → 傳 `myCity` 過濾 + `sortBy=distance`；車廠卡顯示「🚗 X km」距離
27. ✅ **特改品客服提示** — GarageList 標題下固定提示：「特殊改裝品安裝：可洽詢客服為您推薦專業改裝車廠」
28. ✅ **評價系統** — `GarageReview` model（appointment_id unique，一預約一評）＋路由 `/api/reviews`：
    - 公開 `GET /garage/:garageId`：評價列表 + average/count 聚合
    - 車主 `POST /`：限 COMPLETED 預約、rating 1–5、交易式重算 Workshop.rating/review_count 同步至車廠列表
    - 車主 `GET /mine?appointmentId=`：判斷是否已評
    - MyAppointments：COMPLETED 顯示星等選擇（hover 效果）+200 字評論；已評顯示綠色已送出卡
    - **E2E 7/7 PASS**：建 COMPLETED 預約→寫 5 星→重複被擋（「此預約已評價過」）→count 0→1、Workshop.review_count=1、rating=5 同步
29. ✅ **空氣濾清器唯一化（Air Filter Uniquify）** — 依據官方 Big5 關係表（4,583 列／30 車廠）重建空濾相容連結，使同一台車 × 每個品牌（KN/BMC/Pipercross）最多只有一個料號；復用 KW 唯一化引擎的平台碼優先、性能識別詞雙向閘門、徽章詞/排氣量/年份嚴格過濾；支援 `--apply`（wipe＋重建）、`--trace=` 診斷、`--only=` 限定廠牌；產出 `airfilter_manual_review.csv`（平手待人工）與 `airfilter_missing_skus.csv`（CSV 有但 DB 無的料號）

---

## 6. 已知限制與待辦

### 待辦優先序
1. ~~`/my-car`、`/wishlist`、Admin Dashboard 三區塊~~ ✅ 2026-08-24 完成：MyCar.jsx（車卡+提醒+建議+時間軸）、Wishlist.jsx（期望價編輯+降價達標徽章）、Dashboard.jsx Insights 元件（逾期紅色警報表/熱銷條狀排行/週轉警示）；Navbar 新增「愛車」「願望」tab（移除維修紀錄，仍可從 profile 進）
2. ~~Checkout 就地驗證取代 alert~~ ✅ 2026-08-24 完成（見第四批 #16）；~~前台 17 處 `.catch(console.warn)`~~ ✅ 同日完成：新 `ErrorState.jsx` 元件（full/compact 兩型+重試）接入 Shop/Orders/MyAppointments/ServiceRecords/GarageList 五頁；Login/Garage 的下拉選單輔助資料失敗不擋主流程，維持 console.warn
3. ~~Navbar 手機版底部 tab bar~~ ✅ 同日完成：md 以下改 fixed bottom 5-tab bar（愛車/訂單/預約/車廠/購物車，含購物車 badge、active 指示條、iOS safe-area），頂部僅留 LOGO＋會員/願望/登出；桌面版頂部導航不變
4. ~~Admin recharts chunk 382KB~~ ✅ 同日完成：圖表抽成 `DashboardCharts.jsx` 以 React.lazy 載入，Dashboard 主 chunk **377KB→8.1KB**（-98%），recharts 隔離至獨立 chunk 非同步載入不阻塞統計卡
5. 上線前：移除測試帳號 88888888/760211、內部 error.message 外洩清理

### 環境陷阱（務必牢記）
- `prisma generate` 會被執行中的 API 鎖 DLL（EPERM）→ 先殺 node 再 generate 再重啟
- Windows taskkill 在 bash 要用 `cmd //c \"taskkill /F /PID xxx\"` 或 execute_code 的 subprocess
- `.env` JWT_SECRET 帶引號，簽測試 token 前 regex 取出需剝除
- adminParts 的更新是 **PATCH** 不是 PUT
- drive_preview 對此 SPA 的互動（登入/點擊導航）不可靠；驗證畫面用 read_preview 讀文字，互動驗證走 curl/node fetch
- Vite dev server :5173、API :3000；build 用 background=true

---

*本文件涵蓋 C:\\carparts 三專案 + Hermes Gateway 的完整架構；每次重大改動請同步更新此檔。*