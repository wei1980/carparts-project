@echo off
chcp 65001 >NUL
setlocal enabledelayedexpansion

title Carparts 系統啟動器 (穩定版)

:: ================= 路徑設定 =================
set "CURRENT_DIR=%~dp0"
:: 移除最後的反斜線
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

set "API_DIR=%CURRENT_DIR%\carparts-api"
set "WEB_DIR=%CURRENT_DIR%\carparts-admin"
set "WEB_URL=http://localhost:5173"
:: ===========================================

echo.
echo ========================================================
echo   🚗 Carparts B2B Platform - 系統啟動
echo   目前目錄: "%CURRENT_DIR%"
echo ========================================================
echo.

:: 1. 檢查 Node.js
echo [檢查 1/3] 正在確認 Node.js...
where node >NUL 2>&1
if %errorlevel% neq 0 goto ERROR_NODE
echo   -> Node.js 已安裝。

:: 2. 檢查後端目錄
echo [檢查 2/3] 正在確認後端目錄...
if not exist "%API_DIR%" goto ERROR_API
echo   -> 後端目錄確認: %API_DIR%

:: 3. 檢查前端目錄
echo [檢查 3/3] 正在確認前端目錄...
if not exist "%WEB_DIR%" goto ERROR_WEB
echo   -> 前端目錄確認: %WEB_DIR%

:: 4. 強制清理舊程序
echo.
echo [步驟 1/4] 清理舊程序...
taskkill /F /IM node.exe >NUL 2>&1
echo   -> 清理完成。

:: 5. 啟動後端
echo.
echo [步驟 2/4] 準備後端伺服器...
cd /d "%API_DIR%"

if not exist "node_modules" (
    echo   -> [API] 初次執行，安裝套件中...
    call npm install
)

if not exist "node_modules\.prisma" (
    echo   -> [API] 產生資料庫客戶端...
    call npx prisma generate
)

echo   -> 啟動後端視窗...
start "Carparts Backend (API)" cmd /k "color 0A && echo [後端 API] 啟動中... && npm run dev"

:: 6. 啟動前端
echo.
echo [步驟 3/4] 準備前端網頁...
cd /d "%WEB_DIR%"

if not exist "node_modules" (
    echo   -> [Web] 初次執行，安裝套件中...
    call npm install
)

echo   -> 啟動前端視窗...
start "Carparts Frontend (Web)" cmd /k "color 0B && echo [前端網頁] 啟動中... && npm run dev"

:: 7. 開啟瀏覽器
echo.
echo [步驟 4/4] 等待服務啟動 (5秒)...
timeout /t 5 >NUL
start "" "%WEB_URL%"

echo.
echo ========================================================
echo   ✅ 啟動成功！
echo      - 請勿關閉跳出的兩個黑底視窗
echo ========================================================
echo.
pause
exit /b

:: ====== 錯誤處理區 ======

:ERROR_NODE
echo.
echo [❌ 錯誤] 找不到 Node.js！
echo 請先安裝 Node.js: https://nodejs.org/
echo.
pause
exit /b

:ERROR_API
echo.
echo [❌ 錯誤] 找不到後端資料夾！
echo 預期路徑: "%API_DIR%"
echo 請確認資料夾名稱是否為 "carparts-api"
echo.
pause
exit /b

:ERROR_WEB
echo.
echo [❌ 錯誤] 找不到前端資料夾！
echo 預期路徑: "%WEB_DIR%"
echo 請確認資料夾名稱是否為 "carparts-admin"
echo.
pause
exit /b