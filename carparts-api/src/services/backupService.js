// src/services/backupService.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_ROOT = path.join(__dirname, '../../backups');
const PG_DUMP = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';

function executeBackup() {
  return new Promise((resolve, reject) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    const backupDir = path.join(BACKUP_ROOT, `${date}_${time}`);
    fs.mkdirSync(backupDir, { recursive: true });

    const DB_PASSWORD = process.env.DATABASE_URL?.match(/postgres:(.*?)@/)?.[1] || '';

    // 1. 備份資料庫
    // ⚠️ 不可用 `set PGPASSWORD=... &&`：cmd 會把 && 前的尾隨空格設進變數導致認證失敗
    // → 改用 exec 的 env 選項傳遞 PGPASSWORD
    const dbCmd = `"${PG_DUMP}" -U postgres -h localhost carparts > "${path.join(backupDir, 'database.sql')}"`;

    exec(dbCmd, { shell: 'cmd.exe', env: { ...process.env, PGPASSWORD: DB_PASSWORD } }, (dbError) => {
      if (dbError) {
        reject(dbError);
        return;
      }

      // 2. 備份後端程式
      const apiCmd = `powershell -Command "Compress-Archive -Path 'C:\\carparts\\carparts-api\\src', 'C:\\carparts\\carparts-api\\prisma', 'C:\\carparts\\carparts-api\\package.json', 'C:\\carparts\\carparts-api\\.env' -DestinationPath '${path.join(backupDir, 'carparts-api.zip')}' -Force"`;

      exec(apiCmd, { shell: 'cmd.exe' }, (apiError) => {
        if (apiError) {
          console.error('後端備份失敗:', apiError.message);
        }

        // 3. 備份前端程式
        const webCmd = `powershell -Command "Compress-Archive -Path 'C:\\carparts\\carparts-web\\src', 'C:\\carparts\\carparts-web\\public', 'C:\\carparts\\carparts-web\\package.json', 'C:\\carparts\\carparts-web\\vite.config.js', 'C:\\carparts\\carparts-web\\index.html' -DestinationPath '${path.join(backupDir, 'carparts-web.zip')}' -Force"`;

        exec(webCmd, { shell: 'cmd.exe' }, (webError) => {
          if (webError) {
            console.error('前端備份失敗:', webError.message);
          }

          resolve({
            dir: backupDir,
            files: [
              'database.sql',
              'carparts-api.zip',
              'carparts-web.zip'
            ]
          });
        });
      });
    });
  });
}

// 清理 7 天前的備份
function cleanOldBackups() {
  if (!fs.existsSync(BACKUP_ROOT)) return;

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  fs.readdirSync(BACKUP_ROOT).forEach(dir => {
    const dirPath = path.join(BACKUP_ROOT, dir);
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory() && now - stat.mtimeMs > sevenDays) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.debug(`🗑️ 已刪除舊備份: ${dir}`);
    }
  });
}

module.exports = { executeBackup, cleanOldBackups };