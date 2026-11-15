@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title 車大師服務啟動器 (Hermes Agent 版)

echo ==========================================
echo    車大師平台 - 啟動前後端服務
echo    AI 由 Hermes Agent 提供
echo ==========================================
echo.

set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"
set "API_DIR=%CURRENT_DIR%\carparts-api"
set "WEB_DIR=%CURRENT_DIR%\carparts-web"

if not exist "%API_DIR%" (
    echo [錯誤] 找不到後端目錄 %API_DIR%
    pause ^& exit /b 1
)
if not exist "%WEB_DIR%" (
    echo [錯誤] 找不到前端目錄 %WEB_DIR%
    pause ^& exit /b 1
)

:: Step 0: 確保 Redis 啟動（排程 / 快取用）
echo [0/5] 檢查 Redis (WSL: Ubuntu-24.04)...
wsl -d Ubuntu-24.04 -- redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo    啟動 Redis 服務中...
    wsl -d Ubuntu-24.04 -- sudo service redis-server start >nul 2>&1
    if errorlevel 1 wsl -d Ubuntu-24.04 -- redis-server --daemonize yes >nul 2>&1
    timeout /t 2 >nul
)
wsl -d Ubuntu-24.04 -- redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo    [警告] Redis 未啟動，排程將降級為直接呼叫
) else (
    echo    OK Redis 運作正常 ^(PONG^)
)

:: Step 1: 檢查 Hermes Agent（AI 大腦）
echo.
echo [1/5] 檢查 Hermes Agent（llama-server）...
set "HERMES_BASE=http://127.0.0.1:18434"
curl -sf %HERMES_BASE%/v1/models >nul 2>&1
if errorlevel 1 (
    echo    [警告] 未偵測到 Hermes llama-server ^(18434^)
    echo           AI 功能（ai-recognise / ai-ask）會暫時無法使用
    echo           請確認 Hermes 桌面程式已啟動
) else (
    echo    OK Hermes Agent 運作正常 ^(%HERMES_BASE%/v1^)
)

:: Step 2: 後端 API
echo.
echo [2/5] 檢查後端 API (port 3000)...
curl -sf http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo    後端未回應，準備啟動...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
        echo    [清理] 釋放 Port 3000 ^(PID: %%a^)
        taskkill /F /PID %%a >nul 2>&1
        timeout /t 1 >nul
    )
    start "車大師後端 API" cmd /k "cd /d %API_DIR% && npm run dev"
    echo [3/5] 等待後端就緒...
    call :wait_backend
) else (
    echo    後端已在運行中 ^(http://localhost:3000^)
)

:: Step 3: 前端網頁
echo.
echo [4/5] 檢查前端網頁 (port 5173)...
curl -sf http://localhost:5173/ >nul 2>&1
if errorlevel 1 (
    echo    前端未運行，正在啟動...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
        echo    [清理] 釋放 Port 5173 ^(PID: %%a^)
        taskkill /F /PID %%a >nul 2>&1
        timeout /t 1 >nul
    )
    start "車大師前端網頁" cmd /k "cd /d %WEB_DIR% && npm run dev"
    echo [5/5] 等待前端就緒...
    call :wait_frontend
) else (
    echo    前端已在運行中 ^(http://localhost:5173^)
)

echo.
echo ==========================================
echo 所有服務啟動流程結束！
echo   後端 API      http://localhost:3000
echo   前端網頁      http://localhost:5173
echo   API 健康檢查  http://localhost:3000/health
echo   Hermes AI     %HERMES_BASE%/v1
echo   Swagger UI    http://localhost:3000/api-docs/
echo ==========================================
echo.
echo 按任意鍵開啟前端網頁...
pause >nul
start "" http://localhost:5173
exit /b 0

:: ==========================================
:: 副程式
:: ==========================================
:wait_backend
set retry_backend=0
:loop_backend
timeout /t 2 >nul
curl -sf http://localhost:3000/health >nul 2>&1
if not errorlevel 1 (
    echo    OK 後端已就緒 ^(http://localhost:3000^)
    exit /b 0
)
set /a retry_backend+=1
if !retry_backend! GEQ 30 (
    echo    [警告] 後端啟動超時 ^(60秒^)，請檢查跳出的視窗
    exit /b 0
)
goto loop_backend

:wait_frontend
set retry_frontend=0
:loop_frontend
timeout /t 2 >nul
curl -sf http://localhost:5173/ >nul 2>&1
if not errorlevel 1 (
    echo    OK 前端已就緒 ^(http://localhost:5173^)
    exit /b 0
)
set /a retry_frontend+=1
if !retry_frontend! GEQ 30 (
    echo    [警告] 前端啟動超時 ^(60秒^)，請檢查跳出的視窗
    exit /b 0
)
goto loop_frontend
