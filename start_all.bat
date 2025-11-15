@echo off
chcp 65001 >NUL
title Carparts 一鍵啟動

REM ====== 路徑設定 ======
set "ROOT=C:\carparts"
set "API_DIR=%ROOT%\carparts-api"
set "ADMIN_DIR=%ROOT%\carparts-admin"

REM ====== 連接埠（可改）======
set "API_PORT=3000"
set "WEB_PORT=5173"

echo.
echo ============================================
echo   Carparts 一鍵啟動腳本
echo   API:   %API_DIR%  (http://localhost:%API_PORT%)
echo   FE :   %ADMIN_DIR% (http://localhost:%WEB_PORT%)
echo ============================================
echo.

REM ====== 1) 可選：清掉殘留 node 行程，避免 Port 被占用 ======
echo [1/6] 清理殘留 Node 行程...
taskkill /F /IM node.exe >NUL 2>&1
timeout /t 1 >NUL

REM ====== 2) 檢查 Node / npm ======
where node >NUL 2>&1 || (echo ✖ 未找到 Node.js，請先安裝，再重試。& pause & exit /b 1)
where npm  >NUL 2>&1 || (echo ✖ 未找到 npm，請先安裝，再重試。& pause & exit /b 1)

REM ====== 3) 後端：npm install（若 node_modules 不存在）======
echo [2/6] 檢查後端依賴...
if not exist "%API_DIR%\node_modules" (
  echo  → 安裝後端套件...
  pushd "%API_DIR%"
  call npm install || (echo ✖ 後端 npm install 失敗 & popd & pause & exit /b 1)
  popd
)

REM ====== 4) 後端：補齊資料庫欄位（若有檔案就執行）======
echo [3/6] 檢查資料庫欄位修補腳本...
if exist "%API_DIR%\prisma\migrations\parts_supply_columns.sql" (
  echo  → 執行 parts_supply_columns.sql
  pushd "%API_DIR%"
  call npx prisma db execute --file ./prisma/migrations/parts_supply_columns.sql --schema ./prisma/schema.prisma || (
    echo ！提醒：欄位修補執行失敗，請稍後手動檢查。
  )
  popd
) else (
  echo  → 略過（找不到 prisma\migrations\parts_supply_columns.sql）
)

REM ====== 5) 啟動後端 ======
echo [4/6] 啟動後端 API...
pushd "%API_DIR%"
REM 把輸出也存到 logs\api.log（保留歷史）
if not exist "%API_DIR%\logs" mkdir "%API_DIR%\logs"
start "Carparts API" cmd /k "node index.js 1>>logs\api.log 2>>&1"
popd

REM ====== 6) 前端：npm install（若 node_modules 不存在）======
echo [5/6] 檢查前端依賴...
if not exist "%ADMIN_DIR%\node_modules" (
  echo  → 安裝前端套件...
  pushd "%ADMIN_DIR%"
  call npm install || (echo ✖ 前端 npm install 失敗 & popd & pause & exit /b 1)
  popd
)

REM ====== 7) 啟動前端 ======
echo [6/6] 啟動前端（Vite）...
pushd "%ADMIN_DIR%"
if not exist "%ADMIN_DIR%\logs" mkdir "%ADMIN_DIR%\logs"
start "Carparts FE (Vite)" cmd /k "npm run dev 1>>logs\vite.log 2>>&1"
popd

REM ====== 自動開啟瀏覽器頁面（可依喜好增減）======
timeout /t 2 >NUL
start "" http://localhost:%WEB_PORT%/shop
start "" http://localhost:%WEB_PORT%/admin
start "" http://localhost:%API_PORT%/health

echo.
echo ✓ 已在兩個視窗啟動：後端 API 與前端 Vite
echo   - 商城： http://localhost:%WEB_PORT%/shop
echo   - 後台： http://localhost:%WEB_PORT%/admin
echo   - 健康檢查： http://localhost:%API_PORT%/health
echo.
echo （遇到占用可重新執行本批次檔；它會先嘗試關閉殘留 node.exe）
echo.
pause
