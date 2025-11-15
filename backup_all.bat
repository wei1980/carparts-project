@echo off
chcp 65001 >NUL

@echo off
setlocal

REM === 路徑設定 ===
set "API_DIR=C:\carparts\carparts-api"
set "ADMIN_DIR=C:\carparts\carparts-admin"
set "BACKUP_DIR=C:\carparts\backups"

REM PostgreSQL：依你的版本調整 bin 目錄
set "PG_BIN=C:\Program Files\PostgreSQL\17\bin"
set "PGHOST=localhost"
set "PGUSER=postgres"
set "PGDATABASE=carparts"
REM 若你有密碼，取消下一行註解並改成你的密碼
set "PGPASSWORD=760211"

REM === 產生時間戳 ===
for /f %%i in ('powershell -NoP -C "(Get-Date).ToString('yyyyMMdd_HHmmss')"') do set "TS=%%i"
set "OUT_DIR=%BACKUP_DIR%\snapshot_%TS%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
mkdir "%OUT_DIR%"

echo [1/4] 匯出資料庫...
REM Custom 格式（建議 / 可用 pg_restore 還原）
"%PG_BIN%\pg_dump.exe" -h %PGHOST% -U %PGUSER% -d %PGDATABASE% -Fc -f "%OUT_DIR%\carparts_%TS%.dump"
REM 純 SQL（通用備援）
"%PG_BIN%\pg_dump.exe" -h %PGHOST% -U %PGUSER% -d %PGDATABASE% -Fp > "%OUT_DIR%\carparts_%TS%.sql"

echo [2/4] 複製後端檔案（排除 node_modules / dist / .git）...
robocopy "%API_DIR%" "%OUT_DIR%\carparts-api" /E /NFL /NDL /NJH /NJS /XD node_modules dist .git .next .turbo /XF *.log

echo [3/4] 複製前端檔案（排除 node_modules / dist / .git）...
robocopy "%ADMIN_DIR%" "%OUT_DIR%\carparts-admin" /E /NFL /NDL /NJH /NJS /XD node_modules dist .git .next .turbo /XF *.log

echo [4/4] 壓縮 ZIP...
powershell -NoP -C "Compress-Archive -Path '%OUT_DIR%\*' -DestinationPath '%BACKUP_DIR%\carparts_backup_%TS%.zip' -Force"

echo.
echo ✅ 備份完成：%BACKUP_DIR%\carparts_backup_%TS%.zip
echo    暫存快照：%OUT_DIR%
echo.
pause

endlocal
