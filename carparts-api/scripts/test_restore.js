/**
 * 還原測試：把備份還原到「臨時 DB」，驗證備份檔可用，全程不碰正式庫。
 *
 * 用法：
 *   node scripts/test_restore.js backups/20261114_030001/database.sql
 *
 * 做的事：
 *   1. 讀 .env 拿正式庫連線資訊（user/host/port）
 *   2. 建立臨時庫 carparts_restore_test_<ts>
 *   3. psql 還原備份到臨時庫
 *   4. 比對關鍵表行數
 *   5. 無論成敗都 DROP 臨時庫
 *
 * ⚠️ 正式庫只被讀取（拿連線資訊），不會被寫入或刪除。
 */

require('dotenv').config();
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PSQL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const CREATEDB = 'C:\\Program Files\\PostgreSQL\\18\\bin\\createdb.exe';
const DROPDB = 'C:\\Program Files\\PostgreSQL\\18\\bin\\dropdb.exe';

const backupFile = process.argv[2];
if (!backupFile || !fs.existsSync(backupFile)) {
  console.error('用法: node scripts/test_restore.js <備份 .sql 路徑>');
  process.exit(1);
}

const url = process.env.DATABASE_URL || '';
const m = url.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
if (!m) {
  console.error('無法解析 DATABASE_URL');
  process.exit(1);
}
const [, user, password, host, portRaw, db] = m;
const port = portRaw || '5432';

const tmpDb = `carparts_restore_test_${Date.now()}`;
const env = { ...process.env, PGPASSWORD: password };

function run(exe, args, label) {
  try {
    const out = execFileSync(exe, args, {
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000,
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, err: String(e.stderr || e.message).slice(0, 400) };
  }
}

(async () => {
  console.log(`備份檔    : ${backupFile} (${(fs.statSync(backupFile).size / 1048576).toFixed(1)} MB)`);
  console.log(`正式庫    : ${host}:${port}/${db}（只讀連線資訊，不寫入）`);
  console.log(`臨時庫    : ${tmpDb}`);

  // 1) 建臨時庫
  const created = run(CREATEDB, ['-h', host, '-p', port, '-U', user, tmpDb], 'createdb');
  if (!created.ok) {
    console.error('❌ 建立臨時庫失敗:', created.err);
    process.exit(1);
  }
  console.log('✅ 臨時庫已建立');

  try {
    // 2) 還原
    console.log('⏳ 還原中（可能需 1–2 分鐘）...');
    const restored = run(
      PSQL,
      ['-h', host, '-p', port, '-U', user, '-d', tmpDb, '-v', 'ON_ERROR_STOP=0', '-f', backupFile],
      'psql'
    );
    // psql 對既有物件報錯是正常的（備份沒帶 --clean），只看有沒有讀取到資料
    const errText = restored.err || '';
    const errCount = (errText.match(/ERROR/g) || []).length;
    console.log(`   還原完成（psql 訊息中的 ERROR 行數: ${errCount}）`);

    // 3) 比對關鍵表
    // 表名依 @@map 為準（不是 model 名）
    // 表名依 schema 的 @@map / model 名（Prisma 未設 @@map 的 model 用 PascalCase 原樣）
    const tables = ['EndUser', 'parts', 'VehicleProfile', 'appointments', 'consumer_orders',
      'service_records', 'workshops', 'work_orders', 'purchase_orders', 'WishItem',
      'workshop_customers', 'maintenance_reminders', 'support_conversations', 'AuditLog'];
    console.log('\n=== 臨時庫行數 ===');
    let totalOk = 0;
    for (const t of tables) {
      // 一定要用雙引號：Prisma 未設 @@map 的 model 在 DB 是 PascalCase，
      // 不加引號會被 PostgreSQL 折成小寫 → 「無此表」誤判。
      const q = run(PSQL, ['-h', host, '-p', port, '-U', user, '-d', tmpDb, '-t', '-A', '-c',
        `SELECT count(*) FROM "${t}"`], 'count');
      let n = q.ok ? q.out.trim() : 'ERR';
      if (n === 'ERR') n = '無此表';
      const ok = /^\d+$/.test(n) && Number(n) > 0;
      if (ok) totalOk++;
      console.log(`  ${t.padEnd(22)} ${n}`);
    }
    console.log(`\n有資料的表: ${totalOk}/${tables.length}`);
    console.log(totalOk >= 5 ? '✅ 備份檔可用（可還原出多數表）' : '⚠️ 備份檔可能不完整');
  } finally {
    // 4) 一定要清掉臨時庫
    const dropped = run(DROPDB, ['-h', host, '-p', port, '-U', user, '--if-exists', tmpDb], 'dropdb');
    console.log(`\n${dropped.ok ? '✅' : '⚠️'} 臨時庫已${dropped.ok ? '' : '嘗試'}刪除 (${tmpDb})`);
    if (!dropped.ok) console.log('   錯誤:', String(dropped.err||'').slice(0, 200));
  }
})();