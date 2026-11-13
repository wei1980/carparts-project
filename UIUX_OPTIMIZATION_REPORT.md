# 車大師 carparts-web｜UI / UX 優化稽核報告

> 稽核日期：2026-10-23　|　範圍：`carparts-web`（車主端）＋ 車廠後台 ＋ 與 `carparts-api` 的關鍵資料互動
> 方法：Playwright 實機截圖（1440 / 1024 / 768 / 390px，登入／未登入／車廠身分）＋ 程式碼逐頁對照 ＋ 佈局、對比度、載入重量量測
> 證據：`audit/shots/`（56 張截圖）　|　待辦清單：`audit/uiux_backlog.csv`
> **2026-10-23 更新**：業主確認本站採註冊制、不做訪客首頁；P0-1 已改以「未登入導向 `/login`、登入後回原頁」處理，其餘 S0 修復見 [`audit/S0_CHANGELOG.md`](audit/S0_CHANGELOG.md)。

---

## 0. 執行摘要

**一句話結論**：功能面很完整（金流、預約、報價、工單、進貨、會員），但 **「第一次來的客人看不到價值、壞掉的圖與 500 讓信任崩塌、手機與平板版型沒有做完、車廠端在手機上不能操作」**。目前最該做的不是加功能，而是把這四個缺口補起來。

### 五個最關鍵的發現

| # | 發現 | 量化證據 | 影響 |
|---|---|---|---|
| 1 | 未登入訪客的首頁是**空白頁** | 首屏只有「熱門零件 0 件」，無 H1、無 CTA、無商品 | 廣告／LINE／SEO 進來的第一批人直接跳出 |
| 2 | **30% 商品圖破圖**，Logo 2MB | 13,684 筆商品中 4,134 筆指向不存在的 `m2_catalog_cache`；`logo.png` 1,973KB | 商品頁像壞掉、載入慢、專業感歸零 |
| 3 | **平板／小筆電水平溢出**、手機固定元件互壓 | 768px 頁寬 1041px、1024px 頁寬 1207px；客服鈕壓住底部 Tab | 768–1279px 使用者要左右滑、CTA 被遮 |
| 4 | **車廠端手機完全不能用** | 390px 頁寬 587px（溢出 51%）、7 顆彩色按鈕不換行、無共用導覽 | 車廠老闆在施工現場只能用手機 → 直接放棄平台 |
| 5 | **里程 OCR 是假的，卻寫入真資料**；會員點數／VIP／優惠券是 mock | `MyCar.jsx:330-343` 用 `Math.random()` 產生里程並存成 `source:'ocr'`；`Profile.jsx:15-16` | 保養提醒全失真；對外顯示不存在的點數與折扣，有誤導／法務風險 |

### 已經做得好的地方（請保留）

- Shop／Profile 的深色工業風視覺一致、卡片層級清楚，產品目錄的資訊密度適當。
- Skeleton loading、`ErrorState`、Checkout 就地驗證、訂單成功頁的匯款資訊卡，都是有溫度的細節。
- 路由層 code-splitting 與 `React.memo` 商品卡：正式 build 主 chunk 僅 **83KB gzip**、Shop chunk 8KB gzip，前端 JS 不是效能瓶頸。
- 手機底部 5-tab 的概念正確（有 badge、safe-area、active 指示），只是站點選擇與圖層需要修。
- 後端能力遠超前端呈現（報價、改時間、到店／開工／完工、保養提醒、到岸成本），代表**多數優化不需要重寫後端**。

---

## 1. 稽核範圍與量測

### 1.1 走過的路徑

| 身分 | 頁面 |
|---|---|
| 訪客 | `/`、`/shop`、`/part/:id`、`/garages`、`/login` |
| 車主（登入） | `/my-car`、`/orders`、`/appointments`、`/wishlist`、`/profile`、`/cart`、`/checkout`、`/garages/:id/book`、`/service-records` |
| 車廠 | `/garage/login`、`/garage/dashboard`、`/garage/calendar`、`/garage/work-orders`、`/garage/customers`、`/garage/settings`、`/garage/reports` |

### 1.2 量測結果

| 項目 | 數值 | 判定 |
|---|---|---|
| 768px 頁面 scrollWidth | 1041px | ❌ 水平溢出 273px |
| 1024px 頁面 scrollWidth | 1207px | ❌ 水平溢出 183px |
| 390px 車廠後台 scrollWidth | 587px | ❌ 水平溢出 197px |
| `logo.png` | 1,973 KB（顯示高度 44px） | ❌ 應 < 30KB |
| Google Fonts | 5 字重、4–5 個中文字型檔／頁 | ⚠️ 建議自架子集化 |
| 商品圖 | 15,784 張、平均 57KB、最大 12.5MB | ⚠️ 無縮圖／srcset |
| 商品圖缺失 | 4,134 / 13,684（30.2%） | ❌ P0 |
| `slate-500` 文字（#64748b） | 對 `#131a22` = 3.68:1；placeholder 3.33:1 | ❌ 未達 AA 4.5:1 |
| 白字 on `emerald-500` | 2.54:1 | ❌ 不可用於按鈕 |
| 白字 on `green-600` | 3.30:1 | ❌ |
| 正式 build | index 83.46KB gz、Shop 8.19KB gz、CSS 109KB | ✅ 正常 |

> 註：開發模式（Vite dev）首頁傳輸 8.78MB 是未打包的 dev 資源，不代表正式環境；正式 build 的 JS 大小健康。效能問題集中在**圖片、Logo、字型**。

---

## 2. P0：上線前必須修（8 個主題／11 個工作項）

### P0-1｜未登入訪客的首頁是空白頁

**現況**（`audit/shots/home-desktop.png`、`home-mobile.png`）
訪客第一次進來，畫面只有一顆篩選列與「熱門零件 0 件」，下方整片空白；沒有標題、沒有價值主張、沒有「選車」或「開始逛」的按鈕。

**證據**
- `Shop.jsx:123`：只有 `selectedVehicle` 有值才載入商品。
- `Shop.jsx:130`：`if (!hasVariant) { setParts([]); return; }` 直接把訪客擋掉。
- `Shop.jsx:489`：唯一的空狀態綁在 `searched`，沒搜尋永遠不顯示。
- 實測 `/api/parts/recommended` **不帶 variantId 也能回傳商品**（先前 curl 已驗證 12,922 筆），所以這是純前端限制。

**影響**：這是全站最大的漏斗缺口。任何從 Google／LINE／廣告進來的新客，第一眼看到「0 件」就會離開；也讓 SEO landing page 沒有內容。

**建議**
1. 移除 `hasVariant` 的 early return，訪客直接看熱門零件（後端 fallback 已支援）。
2. 首屏加「Hero + 3 步 onboarding + 信任列」：`用你的車，找到真正裝得上的零件` → ① 選車 ② 看適用零件 ③ 預約合作車廠安裝。
3. 空狀態條件改為 `!loading && !hotListError && parts.length === 0`，任何情況都要有 CTA。
4. 訪客 CTA 兩顆：「選擇我的車（30 秒）」與「先逛逛全部零件」。

**驗收**：未登入 375px／1440px 首屏有 H1、雙 CTA、至少 8 張商品卡；不得出現「0 件」。

---

### P0-2｜30% 商品圖破圖，Logo 2MB

**現況**（`part-detail-desktop.png`、`m-part-mobile.png`）
商品詳情左側是一整塊白色破圖（broken image icon），手機版佔掉整個首屏；Shop 卡片因有 `onError` 隱藏所以看起來正常，但 PDP 沒有最終 fallback。

**證據**
- DB：13,684 筆商品中 **4,134 筆** `image_url` 指向 `/media/m2_catalog_cache/...`，該資料夾不存在於 `carparts-api/media`（實測 HTTP 404）。
- `PartDetail.jsx:188-195`：`onError` 只把 `.jpg` 換成 `.png`，第二次失敗就 return；佔位圖只在 `image_url` 為空時才畫。
- `index.css:52`：圖片容器 `bg-white`，配上 `text-slate-300` 的佔位圖示幾乎看不見。
- `logo.png` 1,973KB，每個頁面都要下載。

**影響**：3 成 SKU 看起來像「下架／詐騙」；PDP 首屏被白塊佔滿；行動網路使用者先付 2MB 才看到內容。

**建議**
1. **短期**：建 `PartImage` 元件（`onError` → 深色佔位塊＋「圖片準備中」＋維持 `alt`），全站共用；PDP 容器改 `bg-[#1a232e]`。
2. **資料**：把 `m2_catalog_cache` 同步回 `media/`，或批次改寫 `image_url`；加一支檢查腳本（檔案不存在→標記 `image_missing`）。
3. **中長期**：上傳時產生 400／800px WebP 縮圖，`srcset` + `sizes` + `loading="lazy"` + 固定 `width/height`（避免 CLS）。
4. Logo 換 SVG 或 2x PNG（≤30KB），加 `width/height`。

**驗收**：抽查 100 個 SKU，圖片 200 且非 broken；PDP 無白塊；首頁行動網路傳輸 < 1.5MB。

---

### P0-3｜768–1279px 水平溢出，手機固定元件互相遮擋

**現況**（`vp-1024-shop.png`、`m-my-car-mobile.png`、`home-mobile.png`）
- 1024px：右側車輛選擇器被切掉、頁面可左右滑動。
- 手機：底部 Tab Bar 與「即時客服」浮球疊在一起，客服球正好蓋住「車廠／購物車」；頁尾內容也會被 Tab Bar 蓋住。
- 手機首頁在車輛選擇器下方多出一段 64px 空白（spacer 放錯位置）。

**證據**
- `Navbar.jsx:42` 桌機導覽用 `hidden md:block`，但 7 個「圖示＋文字」項目＋Logo＋車輛選擇器＋登出在 768–1279px 放不下（`flex-nowrap`）。
- `Navbar.jsx:135` 底部 Tab Bar `fixed bottom-0`；`Navbar.jsx:157` 的 `h-16` spacer 放在 Navbar 內、頁面內容**之前** → 上方多空白、下方照樣被遮。
- `FloatingFeedbackWidget.jsx:137` `fixed bottom-6 right-6 z-50`，與 Tab Bar 同層、同 z-index。
- `index.css:102` 把 root 字級設 110%，放大了所有擁擠問題。

**建議**
1. 桌機導覽斷點改 `xl`（1280）才展開；768–1279 走「Logo＋搜尋＋選車＋漢堡選單」。
2. 移除 Navbar 內的 spacer，改 `body { padding-bottom: calc(4.5rem + env(safe-area-inset-bottom)); }`（僅 <768px）。
3. 客服球 `bottom-24 md:bottom-6`，z-index 降到 40；`/garage/*`、`/login`、`/admin/*` 不顯示。
4. 加 360 / 768 / 1024 的 e2e 斷言：`documentElement.scrollWidth <= clientWidth + 1`。

**驗收**：360、390、768、1024、1280 皆無水平滾動；客服球與 Tab Bar 不重疊；頁尾可完整滾到。

---

### P0-4｜車廠後台在手機上完全不能用

**現況**（`gp-dashboard-mobile.png`、`gp-dashboard-desktop.png`、`gp-calendar-desktop.png`）
390px 下：Logo 直排「車大師車廠」、7 顆彩色導覽按鈕斜向溢出畫面、KPI 卡巨大、採購表單 6 個全寬下拉、月曆每格約 45×100px；右下角還掛著「即時客服」（車廠不該看到車主客服）。

**證據**
- 車廠頁面各自複製 header，沒有共用 `GarageLayout`；`GarageDashboard.jsx:267-300` 七顆按鈕在同一列不換行。
- `GarageCalendar.jsx:156-161` 7 欄 `aspect-square` + `minHeight:100px`。
- 量測：390px → scrollWidth 587。
- `FloatingFeedbackWidget.jsx:133` 只排除 `/admin`，沒排除 `/garage`。

**建議**
1. 建 `GarageLayout`：左側／抽屜導覽（待辦、行事曆、工單、採購、客戶、報表、設定）＋手機底部 5 tab（待辦／行事曆／工單／採購／我的）。
2. 手機月曆改「議程列表」（今日／本週），保留桌機月檢視。
3. 儀表板順序改為：**待處理預約 → 今日行程 → 待報價 → 採購**（採購不要壓首屏）。
4. 車廠後台隱藏車主客服浮球；改用「聯絡平台」。
5. 標題顯示店家名稱，不要寫死「車大師車廠」。

**驗收**：390px 無水平滾動；車廠能在手機完成「接單→報價→完工」三個動作。

---

### P0-5｜沒有車廠詳情頁，預約頁也認不出車廠

**現況**（`garages-desktop.png`、`a-booking-desktop.png`）
- 車廠卡片點下去**直接跳到預約表單**，中間沒有照片、服務項目、價位、營業時間、評價。
- 預約頁只顯示「預約保養」＋車型／零件／時間，**沒有車廠名稱、地址、電話、評分**（因為 `/api/garages/:id` 500，整張車廠卡消失，且只 `console.warn`）。
- 0 則評價的車廠顯示「★★★★★ 5.0 (0 則評價)」；地址欄只有一個定位圖示、沒有文字。
- `GarageDetail.jsx` 存在但**沒有路由**，而且內容其實是「車輛詳情」＋硬寫的假保養紀錄。

**證據**：`GarageList.jsx:191`（navigate 到 `/book`）、`App.jsx:141-142`（無詳情路由）、`GarageList.jsx:210`（`g.rating || 5.0`）、`GarageList.jsx:221`（地址無 fallback）、`Booking.jsx:35-39`（失敗只 warn）。

**影響**：這是「車主 ↔ 車廠橋樑」最關鍵的一步。沒有詳情頁，車主不敢把車交出去；沒有車廠資訊的預約單，車廠也不知道是哪家店被預約。

**建議**
1. 新增 `/garages/:id`（車廠詳情）：店面照、評分與評論、服務項目／工資表、營業時間與「現在營業中」、地址地圖、電話、距離、可預約時段預覽、底部固定「立即預約」。
2. 卡片改為「查看車廠 →」，詳情頁再進預約；保留快速「預約」次要按鈕。
3. `rating` 為 0 時顯示「尚無評價」，不要亮 5 星；地址為空顯示「地址待補」。
4. 預約頁頂部固定顯示車廠卡（名稱／地址／電話／評分），API 失敗時用列表資料 fallback，不可靜默消失。
5. 刪除或改寫 `GarageDetail.jsx` 的假資料（目前是 dead code）。

**驗收**：車主可在不預約的情況下看完車廠資訊；預約頁 100% 顯示車廠名稱與電話。

---

### P0-6｜「AI 里程辨識」是假的，還會寫進真資料

**現況**（`a-my-car-desktop.png`）
上傳儀表板照片後，1.5 秒後跳出「辨識完成：32,150 km」——數字其實是 `目前里程 + 500 + random(0~2000)`，再以 `source:'ocr'` 存入資料庫，保養提醒與建議據此計算。

**證據**：`MyCar.jsx:330-343`（註解自承「模擬」）、`:345-364`（寫入 `source:'ocr'`）。

**影響**：資料誠信問題。使用者以為是 AI 辨識，實際是亂數；保養週期、到期提醒、回購推薦全部被污染。這是上線前必修，不是 UX 加分項。

**建議**
1. 立刻改成「示範資料」並禁止寫入，或直接移除按鈕。
2. 接真實 OCR 服務（或先只做手動輸入＋里程推算建議）。
3. 清理既有 `source='ocr'` 的里程紀錄（回溯標記為不可信）。

---

### P0-7｜會員權益（VIP／點數／優惠券／Google 綁定）是 mock

**現況**（`a-profile-desktop.png`）
Profile 顯示「VIP 金卡會員、紅利點數 1,250 點（可折抵 NT$1,250）、3 張可用優惠券、Google 已綁定」，這些全部來自 `mockMembership`／`mockCoupons`，或寫死的文案。

**證據**：`Profile.jsx:15-16`（mock import）、`:224-255`（VIP／點數／優惠券卡）、`:316`（`🌐 Google: 已綁定` 寫死）。

**影響**：對外顯示不存在的折扣與點數，屬於誤導；若已有真實用戶，客訴與法務風險高。

**建議**
1. 全面移除 mock 或加「即將推出」遮罩（不可出現可折抵金額）。
2. 移除假的「Google 已綁定」；只呈現真實 `user.lineId` 狀態。
3. 若要做會員等級，先接真實消費累計（API 已有訂單資料）。

---

### P0-8｜交易／車廠 API 500，前端卻只顯示空白或轉圈

**現況**
- `/api/garages/:id` → 500（車廠詳情／預約頁車廠卡消失）
- `/api/garage/settings`、`/customers`、`/service-records`、`/purchase-orders/recent-parts` → 500（車廠後台多頁空白）
- `/api/vehicles/:id/modifications` → P2022：`vehicle_modifications.installedMileageKm` 欄位不存在
- `/api/vehicles/:id/completed-work-orders` → Prisma `Unknown field technician_user`
- `/api/consumer/orders/bank-info` → 500（結帳「匯款帳戶資訊 載入中…」永遠不結束）
- `/api/service-records` → 500（工單紀錄頁直接顯示「載入失敗」）

**證據**：`api_dev.log` 的 Prisma 錯誤；前端對應畫面；`Checkout.jsx:379-387` 無錯誤分支。

**影響**：車主看不到匯款帳號就不敢下單；車廠後台多頁不能用；保養紀錄永遠是空的。

**建議**
1. 先跑 `prisma migrate deploy` / `prisma generate`，修正 schema drift（欄位與關聯）。
2. 修 `include: { technician_user }` → 正確關聯名（schema 顯示應為 `technician`）。
3. 前端所有「載入中」都要有 timeout + 錯誤態（尤其匯款資訊／車廠資訊）。
4. 建 `/health/ready` 檢查 DB schema 版本，部署時抵擋不相容版本。

**驗收**：上述端點全部 200；結帳頁 3 秒內顯示完整匯款資訊（銀行、帳號、戶名）；車廠後台各頁有資料或明確空狀態。

---

## 3. P1：下一個 Sprint 該做（依主題）

### 3.1 資訊架構（IA）

| 問題 | 證據 | 建議 |
|---|---|---|
| 「我的愛車」把最重要的「下次保養提醒」藏在第 3 個分頁 | `MyCar.jsx:49` 預設 `activeTab='vehicle'`；提醒在 `:663`；車輛清單在 `:613` 與上方摘要卡重複 | 預設「總覽」：下次保養倒數＋到期提醒＋建議項目；車輛清單收進「管理車輛」 |
| 我的預約空狀態只有一行字，沒有 CTA | `MyAppointments.jsx:75-77` | 空狀態卡：「還沒有預約」＋「找車廠保養 →」＋「看我的訂單」 |
| 訂單頁全部展開、無篩選 | `Orders.jsx:289`（`max-w-7xl p-8`）、`:316`（巨型空盒＋常駐「← 回首頁」孤島按鈕） | 狀態分頁（待付款／進行中／已完成／售後）＋空狀態插畫＋CTA |
| 保養歷史有兩套 UI | `MyCar.jsx:711` 時間軸 vs `ServiceRecords.jsx:44-105`；後者無導覽入口 | 合併成一個「保養紀錄」，放在愛車頁；移除獨立頁或從愛車連過去 |
| 我的車、訂單、預約、會員、設定 **5 種頁寬** | `7xl` / `4xl` / `5xl` / `6xl` / `3xl` 各寫各的 | 全部改用 `.page-shell`；Profile／Settings 用 `max-w-5xl` 變體 |

### 3.2 導覽與全域元素

| 問題 | 證據 | 建議 |
|---|---|---|
| 手機底部 Tab 沒有「商城」 | `Navbar.jsx:31-37` 只有愛車／訂單／預約／車廠／購物車 | 改為「商城／愛車／預約／車廠／購物車」，訂單併入會員 |
| 桌面 7 項沒有「商城」入口，只能點 Logo | `Navbar.jsx:21-29` | 第一項加「商城」；Logo 仍可回首頁 |
| 訪客也看到「登出」圖示 | `Navbar.jsx:86-95`、`:117-122` 無 `user &&` | 未登入顯示「登入／註冊」；登出只在登入後出現 |
| 全站沒有 Footer | 全專案零 `footer` | 加公司資訊、客服電話／LINE、退換貨、隱私權、服務條款、統編 |
| 沒有站內通知中心 | 報價／改時間／接單只靠 LINE | Navbar 加鈴鐺＋badge；預約 tab 顯示「待你確認」數量 |
| `aria-current` 只在手機 tab 有 | `Navbar.jsx:140` | 桌機 `NavLink` 同步 |

### 3.3 登入／註冊（轉換率瓶頸）

| 問題 | 證據 | 建議 |
|---|---|---|
| 註冊硬性要求 VIN、LINE ID、車型、還需管理員審核 | `Login.jsx:219-240`、`:319-320`、`:368-369` | VIN 改選填（或行照 OCR 帶入）；LINE ID 改用 LINE Login 一鍵；審核改自動或 <1 小時 |
| 登入／註冊是同一張表單切換，沒有清楚 tab | `Login.jsx:301-389` | 兩顆 segmented tab；註冊拆兩步（帳號→愛車） |
| 無密碼顯示切換、無確認密碼、無 autocomplete | `Login.jsx:311-312` | 加 eye toggle、`autoComplete="tel"`／`current-password`、確認密碼 |
| 無服務條款／隱私權同意 | 全站沒有 | 註冊必勾（蒐集車牌、VIN、地址屬個資） |
| 登入頁沒有品牌與返回商城 | `Login.jsx:302-303` 只有灰底卡 | 加 Logo、左側價值主張、右上「回到商城」 |
| 管理者／車廠／車主三種登入頁三種設計 | `/login` 灰、`/garage/login` 綠、`/admin/login` | 共用登入版型，只換標題與色票 |

### 3.4 商品詳情（PDP）

| 問題 | 證據 | 建議 |
|---|---|---|
| 沒有「加入願望清單」 | `PartDetail.jsx` 全文無 wishlist | 標題旁加愛心（與 Shop 卡一致） |
| 缺貨仍可加入購物車，無代購說明 | `PartDetail.jsx:271` 無 `disabled`；代購訂金 50% 只在別處 | CTA 前加「代購說明」卡：訂金 50%、7–14 工作天、不可取消 |
| 不顯示料號、不顯示適用車型清單 | `PartDetail.jsx:164` 註解明示 | 料號可部分遮蔽；提供「適用車型」清單與「不適用」回報 |
| 沒有安裝服務 CTA | 平台核心是「買＋裝」 | 加「加購安裝（選合作車廠）」→ 帶入預約 |
| 沒有庫存上限 | 數量可到 99，即使庫存 3 | `max={totalStock || 99}`，超出顯示「需代購」 |
| 沒有相關／替代零件 | 無 | 「同類熱門」「升級替代」各 4 張 |

### 3.5 購物車／結帳

| 問題 | 證據 | 建議 |
|---|---|---|
| 購物車總額與結帳金額不一致 | `Cart.jsx:126` 只算商品；`Checkout.jsx:44-48` 加運費＋5% 稅＋代購 50% 訂金 | 購物車就顯示「商品／運費／稅金／本次應付（含訂金）」明細 |
| 「清空購物車」一鍵即清、與結帳同寬同色 | `Cart.jsx:129-132` | 改文字按鈕＋`confirmDialog`＋5 秒 undo |
| 兩個總額並存：「本次應付」與「商品總額（含運費與稅金）」 | `Checkout.jsx:366`、`:390` | 只留一個主總額，其餘列明細 |
| 「稅金 5%（暫未開發票）」 | `Checkout.jsx:361` | 要嘛開發票、要嘛不要收；文案不可這樣寫 |
| 匯款資訊只有銀行代碼＋帳號，戶名要「見下單完成頁」 | `Checkout.jsx:381-383` | 付款前就顯示戶名；加「複製帳號」與倒數提醒 |
| 地址是一個 free-text，易漏郵遞區號 | `Checkout.jsx:424-434`；`src/data/tw-address.json` 未使用 | 縣市／區下拉＋自動郵遞區號＋詳細地址 |
| 「需要安裝」toggle 語意不明、checkbox 只有 16px | `Checkout.jsx:456-461` | 改成卡片式 switch＋說明「下單後預約安裝」 |
| 主 CTA 是綠色，與品牌藍不一致 | `Checkout.jsx:520` | 改 `.btn-primary`（藍）；綠色只留成功狀態 |
| 送出失敗／載入失敗的錯誤不夠具體 | `Checkout.jsx:302` 有 banner，但 API 500 只給通用訊息 | 區分「欄位錯誤／庫存不足／系統錯誤」並給下一步 |

### 3.6 預約流程（橋樑的核心）

| 問題 | 證據 | 建議 |
|---|---|---|
| 沒有「服務類型」（換機油／輪胎／定位／鈑烤…） | `Booking.jsx:86-92` 只送 vehicle/garage/time/note/items；後端 `appointments.js` 已有 `serviceType` | 加必填「服務類型」＋可複選項目，車廠才能備料 |
| 沒有症狀描述、里程、是否留車 | 同上 | 加「症狀／想處理的問題」textarea、里程、預估留車時間 |
| 可預約時段只依營業時間推導，沒有已被預約的時段 | `Booking.jsx:61-77` | 新增 `GET /garages/:id/availability?date=`；前端 disable 已滿時段 |
| 送出按鈕無 disabled，連點會建兩筆 | `Booking.jsx:83-98`、`:247` | `submitting` 狀態＋按鈕 disabled＋成功後導頁 |
| 只有日期＋時段，沒有「最近可預約」 | `Booking.jsx:214-241` | 顯示未來 7 天最快可約；月曆元件已有 `GarageAppointmentCalendar` 可重用 |
| 夜間可選到凌晨（無營業時間時退回 datetime-local） | `Booking.jsx:219-221` | 一律用營業時間；未設定時顯示「此車廠尚未開放線上預約」 |
| 送出後只有 toast，沒有「預約編號／加入行事曆」 | `Booking.jsx:93` | 成功頁：編號、車廠資訊、`.ics` 加入行事曆、LINE 通知說明 |

### 3.7 設計系統與視覺一致性

| 問題 | 證據 | 建議 |
|---|---|---|
| 兩套底色：`#0b0f14`（token）vs `gray-900`（#111827） | `Checkout.jsx:288`、`MyAppointments.jsx:69`、`Orders.jsx:287`、`Login.jsx:302` | 全部改 `bg-[var(--brand-bg)]`；禁止 `gray-*` |
| 頁面標題用 emoji 當 icon（🚗📋📅📦🔧） | 6 個頁面 | 統一 SVG icon set（Heroicons/Lucide），標題只用文字 |
| 三個登入頁／車廠後台三種色系（藍／綠／紫／紅） | `GarageDashboard.jsx:272-300` | 車廠後台用中性深色＋單一 accent；狀態色只用在 badge |
| `src/components/ui/` 是空目錄 | 0 檔案 | 建 Button/Field/Select/Card/Badge/EmptyState/Dialog/Table 8 個基礎元件 |
| `ConfirmDialog` 其實是 toast | `ConfirmDialog.jsx:31-51` 用 `toast.custom`，30 秒自動取消 | 改真 `<dialog>`：`role="dialog"`、`aria-modal`、focus trap、Esc=取消、不自動關 |
| `index.css` 有無效宣告與重複區塊 | `index.css:9` `tfont-size`、`:102-104` 重複 `:root` | 只留一處 `html{font-size:110%}`；移除無效行 |
| `.field:focus` 同時 ring＋outline，雙層光圈 | `index.css:106-114` | 只留 `focus-visible` 一種 |
| 商品圖容器白底 | `index.css:52` | 改深色底；白底商品圖另加 `bg-white` |

### 3.8 無障礙（A11y）

| 問題 | 證據 | 建議 |
|---|---|---|
| 商品卡／車廠卡是 `div onClick`，不能 Tab、不能另開分頁 | `Shop.jsx:610,643`、`GarageList.jsx:190-193` | 改 `<Link>`；內層按鈕 `stopPropagation` |
| 四個篩選 select 沒有 label | `Shop.jsx:359,367,375,383` | 加 `aria-label`；搜尋框加 label |
| 對比不足：`slate-500` 3.3–4.0:1；白字 on emerald 2.5:1 | 全站 | 次要文字改 `slate-400`（7.5:1）；綠色按鈕改 `emerald-600` + 深色字或 `emerald-700` |
| Modal 無 `role="dialog"`／焦點鎖定 | `BankInfoModal`、`ReturnRequestModal`、`FeedbackModal` | 建共用 `Dialog`；Esc 關閉、鎖背景滾動、還原焦點 |
| 表單 label 未綁 input | `Booking.jsx:167,215,244`、`GarageLogin.jsx:99-103`、`Checkout.jsx:438` | `htmlFor` / `id` 成對 |
| 分頁／數量按鈕 < 44px | `Shop.jsx:546`（40px）、`:250-263`（40px） | 最小 44×44 |
| 動效未全面支援 `prefers-reduced-motion` | `index.css:116-123` 只處理 fade/skeleton | 一併處理 hover translate 與 pulse |
| 圖片缺 `width/height`、alt 不完整 | 商品卡／車廠卡 | 補尺寸避免 CLS；alt 用商品名 |

---

## 4. P2：品質與細節（可排入例行迭代）

| # | 項目 | 位置 | 建議 |
|---|---|---|---|
| 1 | 頁面出現一個孤立的「,」 | `GarageList.jsx:127` `{/* ... */},` | 刪除逗號 |
| 2 | 標題重複「熱門零件 熱門零件 160 件」 | `Shop.jsx:450,456` | 副行只留「共 160 件」；主標升 `<h1>` |
| 3 | 「回到熱門清單」沒清 search/searched | `Shop.jsx:566-574` | 同步 `setSearch('')`、`setSearched(false)` |
| 4 | `animate-slide-in` 未定義 | `Shop.jsx:462` | 改 `animate-fade-in` 或補 keyframes |
| 5 | 空狀態樣式各頁不同 | Orders／Appointments／Checkout／Wishlist | 抽 `EmptyState`（icon＋標題＋說明＋主/次 CTA） |
| 6 | 載入狀態各頁不同（純文字 / spinner / skeleton） | Orders(`:313`)、MyCar(`:461`) | 統一 skeleton 版型 |
| 7 | 結帳空車只有一行字 | `Checkout.jsx:286-293` | 沿用購物車空狀態卡 |
| 8 | 預約頁夜間可選到凌晨／UTC 當 min | `Booking.jsx:216` | 用本地時區；限制營業時間 |
| 9 | 報價只在 PENDING 顯示 | `MyAppointments.jsx:102` | 改 `quote_amount != null` |
| 10 | 預約狀態缺 ARRIVED／IN_PROGRESS 顏色 | `MyAppointments.jsx:61-66` | 補齊 6 狀態與 badge |
| 11 | 服務紀錄頁全站無入口 | `App.jsx:144` | 併入愛車頁或加導覽 |
| 12 | 車廠店面照刪除鈕只在 hover 出現 | `GarageSettings.jsx:211` | 手機常駐顯示 |
| 13 | 車廠「客戶管理」有路由無入口 | `App.jsx:154` | 加側欄項 |
| 14 | 車廠標題寫死「車大師車廠」 | `GarageDashboard.jsx:269` | 讀 `garage_name` |
| 15 | 圖片 alt 為空字串（車廠縮圖） | `Booking.jsx:121` | 動態 alt |
| 16 | 小字 10px（字數計數） | `Checkout.jsx:449` | 最小 12px、對比 ≥4.5 |
| 17 | 商品名稱重複品牌（資料） | 「Powerflex Powerflex …」 | ETL 清洗，前端去重 |
| 18 | 「代購 / 預購 / 公司貨」用詞混用 | `terms.js:16-21` | 統一為「現貨 / 預購 / 公司貨」並寫進 design guideline |
| 19 | 購物車警語「切換車輛不代表現有商品均適用」難懂 | `Cart.jsx:28-34` | 改成逐項「✓ 適用你的車 / ⚠ 需確認」 |
| 20 | 電話／地址缺少可點擊行動 | 車廠卡有 tel，預約頁無 | 一律 `tel:`／地圖連結 |

---

## 5. 策略層：把「橋樑」真的做出來

目前的產品比較像「零件電商 ＋ 一個預約表單」，但定位是「車主與車廠之間的橋樑」。要讓定位成立，建議把三個斷點接起來：

### 5.1 把「買零件」與「安裝」綁成一個商品

- PDP 的 CTA 從單一「加入購物車」變成 **「加入購物車」＋「買了順便裝」**。
- 後者直接選合作車廠＋時段，結帳時顯示「零件 + 安裝工資」總價（或工資到店報價）。
- 這是平台相對純電商（蝦皮／PChome）的差異化，也是提高客單價最直接的方法。

### 5.2 車廠詳情頁是信任的入口

車主把車交給陌生車廠，需要的是：**真實照片、評價、專長（歐系／日系／改裝）、價位區間、營業時間、距離、能否當天完成**。目前這些資訊散落在後端（`garage_photos`、`labor_fees`、`opening_hours`）但沒有前台頁面承載。

### 5.3 待辦中心（雙邊）

| 對象 | 待辦 | 目前 | 建議 |
|---|---|---|---|
| 車主 | 車廠已報價、改時間待確認、預約待確認、保養到期 | 只靠 LINE，錯過就停住 | Navbar 鈴鐺＋「預約」tab badge；預約卡頂部放「需要你確認」 |
| 車廠 | 新預約、待報價、今日到店、待完工 | 只靠 LINE／要自己開後台 | 車廠首頁「今日待辦」；LINE Flex 訊息附「一鍵接單／報價」 |

### 5.4 里程與保養提醒（產品的長期黏著）

- 真實里程來源：手動輸入、回廠工單、下次驗車／保養推算。
- 「下次保養」應是愛車頁的主角，並在到期前 14 天用 LINE 提醒＋一鍵預約。
- 目前提醒資料已在後端（`maintenance_reminders`），只差前端把它放到對的位置。

### 5.5 信任基建（比任何 UI 裝飾都有效）

- Footer：公司名稱、統一編號、地址、客服電話、LINE、退換貨政策、隱私權、服務條款。
- 商品頁：公司貨標示、保固說明、安裝保固。
- 車廠頁：認證標章（VERIFIED）、實際施工照片、評價（含負評）。
- 金流：匯款戶名、發票說明、付款期限倒數。

---

## 6. 落地路線圖（建議 90 天）

| Sprint | 時間 | 主題 | 內容 | 產出指標 |
|---|---|---|---|---|
| **S0** | 1–1.5 週（2 人並行） | 止血 | P0-1 訪客首頁、P0-2 圖片 fallback＋Logo、P0-3 溢出／圖層、P0-6 假 OCR、P0-7 mock、P0-8 API 500 | 訪客首屏有商品；全站無破圖；360–1280 無水平滾動 |
| **S1** | 2 週 | 主要動線 | P0-4 車廠手機版、P0-5 車廠詳情＋預約車廠卡、愛車頁總覽、空狀態元件、Footer／信任頁 | 車主可「看車廠→預約」；車廠可手機接單 |
| **S2** | 2 週 | 一致性 | 設計 tokens 遷移、8 個 UI 元件、icon set、表單 label／對比、Modal／Confirm 改造 | 5 個頁寬→1 個；`gray-*` 歸零；AA 對比 |
| **S3** | 2–3 週 | 轉換與黏著 | 買＋裝 bundle、待辦中心、通知 badge、預約 availability、效能（圖床／字型／Logo） | 訪客→註冊、PDP→購物車、預約完成率 |
| **S4** | 持續 | 數據 | 埋點（view_item / add_to_cart / begin_checkout / book_appointment）、漏斗報表、A/B 首頁 hero | 有基線才能優化 |

**估時**：依 `audit/uiux_backlog.csv` 逐項估算 — P0 **18.5 人日**、P1 **37 人日**、P2 **8.2 人日**，合計約 **63.7 人日**（含前後端）。以 2 名前端＋1 名後端並行約 **6–8 週**；設計（車廠詳情頁、首頁 hero、手機車廠後台）另計 8–10 人日。

---

## 7. 附錄 A：五段可直接套用的 Quick Win

### A1. 讓訪客看到商品（`Shop.jsx`）

```jsx
// 1) 移除 hasVariant 的 early return
const loadHotParts = async (targetPage = page, overrides = {}) => {
  const version = ++catalogueRequest.current;
  try {
    setLoading(true);
    setHotListError(false);
    const res = await api.get('/parts/recommended', {
      params: {
        ...(hasVariant ? { variantId: selectedVariantId } : {}), // 訪客不帶車型
        page: targetPage, pageSize: 12, sort,
        ...(category ? { category } : {}),
      },
    });
    // ...
  }
};

// 2) 空狀態不要綁 searched
{!loading && !hotListError && parts.length === 0 && (
  <EmptyState
    title={searched ? '找不到相符商品' : '還沒有熱門零件'}
    description={searched ? '試試其他關鍵字，或讓 AI 幫你辨識零件照片。' : '先選擇你的愛車，我們會列出真正裝得上的零件。'}
    primary={{ label: '選擇我的車', to: '/my-car' }}
    secondary={{ label: '逛逛全部零件', onClick: () => refetchWithFilters({ category: '', brand: '', search: '' }) }}
  />
)}
```

### A2. 修好移動端圖層（`Navbar.jsx` / `index.css` / `FloatingFeedbackWidget.jsx`）

```jsx
// Navbar.jsx：刪掉這一行（它現在出現在頁面內容之前）
// <div className="md:hidden h-16" aria-hidden="true" />
```

```css
/* index.css */
@media (max-width: 767px) {
  body { padding-bottom: calc(4.5rem + env(safe-area-inset-bottom)); }
}
```

```jsx
// FloatingFeedbackWidget.jsx
if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/garage')) return null;
// className
className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end"
```

### A3. 車廠卡不再謊報 5 星（`GarageList.jsx`）

```jsx
{/* 移除行尾多餘的逗號 */}
<div className="mb-6 ...">…</div>

{/* 星等 */}
<StarRating value={g.rating} count={g.review_count || 0} />
// StarRating 內：
{count > 0 ? <>{stars} <span>{Number(value).toFixed(1)}</span><span>({count} 則評價)</span></> : <span className="text-slate-400 text-sm">尚無評價</span>}

{/* 地址 */}
<span className="line-clamp-1">{g.garage_address || '地址待補'}</span>

{/* 卡片改連到詳情 */}
onClick={() => navigate(`/garages/${g.id}`)}
```

### A4. 圖片 fallback（新元件 `PartImage.jsx`）

```jsx
import { useState } from 'react';

export default function PartImage({ src, alt, className = '' }) {
  const [broken, setBroken] = useState(!src);
  if (broken) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[#1a232e] ${className}`}>
        <svg className="h-10 w-10 text-slate-500" /* … */ />
        <span className="text-[11px] text-slate-500">圖片準備中</span>
      </div>
    );
  }
  return (
    <img
      src={src} alt={alt} loading="lazy" decoding="async"
      width="600" height="600"
      className={`h-full w-full object-contain ${className}`}
      onError={() => setBroken(true)}
    />
  );
}
```

### A5. 對比與焦點（`index.css`）

```css
:root { --text-muted: #94a3b8; }        /* slate-400：7.5:1，取代 slate-500 */
.text-muted { color: var(--text-muted); }

/* 只用 focus-visible，避免雙圈 */
.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.field:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}
.field:focus { outline: none; }         /* 移除舊的雙層 ring */
```

---

## 8. 附錄 B：截圖索引（`audit/shots/`）

| 檔案 | 內容 | 對應問題 |
|---|---|---|
| `home-desktop.png` / `home-mobile.png` | 訪客首頁空白、手機篩選佔滿首屏 | P0-1 |
| `part-detail-desktop.png` / `m-part-mobile.png` | 商品圖破圖、白塊 | P0-2 |
| `vp-1024-shop.png` / `vp-768-shop.png` | 平板水平溢出、導覽被切 | P0-3 |
| `m-my-car-mobile.png` | 底部 Tab 與客服球重疊、按鈕換行 | P0-3 |
| `gp-dashboard-desktop.png` / `gp-dashboard-mobile.png` | 車廠後台兩種崩壞 | P0-4 |
| `garages-desktop.png` | 5.0 星 0 評價、地址空白、頁面「,」 | P0-5 |
| `a-booking-desktop.png` | 預約頁無車廠資訊 | P0-5 |
| `a-my-car-desktop.png` | 愛車頁重複車輛清單、提醒藏分頁 | P0-6 / 3.1 |
| `a-profile-desktop.png` | mock VIP／點數／優惠券 | P0-7 |
| `flow-checkout-filled.png` | 匯款資訊卡住、兩個總額、綠 CTA | P0-8 / 3.5 |
| `a-service-records-desktop.png` | 工單載入失敗 | P0-8 |
| `login-desktop.png` / `gp-login-desktop.png` | 兩種登入設計 | 3.3 / 3.7 |
| `a-orders-desktop.png` / `a-appointments-desktop.png` | 空狀態無 CTA | 3.1 |
| `gp-calendar-desktop.png` | 月曆空白、無議程 | P0-4 |
| `flow-cart-filled.png` / `flow-cart-mobile.png` | 清空購物車與結帳同權重 | 3.5 |

---

## 9. 附錄 C：一句話帶走

> **先把「壞掉的」修好（圖、500、溢出、假資料），再把「第一次來的客人」接住（首頁、選車、車廠詳情），最後才是「做得更漂亮」（設計系統、動效、無障礙）。**

目前團隊的執行力很強（功能迭代速度快、已有測試與截圖腳本），建議把這次稽核的 P0 當成一個「上線阻擋清單」跑完，再進 P1 的資訊架構調整；不要先做視覺改版，否則會把現有的流程問題一起放大。
