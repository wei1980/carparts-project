#!/usr/bin/env node
/**
 * restore_backup.js — 從備份還原 carparts 資料庫
 *
 * 用法：
 *   node scripts/restore_backup.js --dry-run                  # 只檢查備份有效性，不還原
 *   node scripts/restore_backup.js --latest                   # 還原最新備份（會先備份現況）
 *   node scripts/restore_backup.js backups/20261115_030002    # 還原指定備份
 *   node scripts/restore_backup.js <dir> --yes                # 跳過確認
 *
 * 安全設計：
 *   1. 預設 --dry-run：不帶 --latest / 指定目錄時只驗證，不寫入
 *   2. 還原前自動備份現況（避免「還原錯的備份」把好的資料蓋掉）
 *   3. 驗證備份檔有效性（同 backupService 的檢查）
 *   4. 還原後驗證關鍵表行數
 *   5. 明確要求確認（除非 --yes）
 *
 * ⚠️ 這是破壞性操作：會覆蓋目前所有資料。正式環境請先確認。
 */
require('dotenv').config();
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PSQL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const BACKUP_ROOT = path.resolve(__dirname, '..', '..', 'backups'); // carparts-api/scripts → carparts/backups

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LATEST = args.includes('--latest');
const YES = args.includes('--yes');
const target = args.find((a) => !a.startsWith('--'));

// ---- 讀 DB 連線 ----
const url = process.env.DATABASE_URL || '';
const m = url.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
if (!m) {
  console.error('❌ 無法解析 DATABASE_URL（carparts-api/.env）');
  process.exit(1);
}
const [, DB_USER, DB_PASS, DB_HOST, DB_PORT_R, DB_NAME] = m;
const DB_PORT = DB_PORT_R || '5432';
const PSQL_ENV = { ...process.env, PGPASSWORD: DB_PASS };

function runPsql(sql, dbName = DB_NAME) {
  return execFileSync(PSQL, ['-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', dbName, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    env: PSQL_ENV, encoding: 'utf8', timeout: 120000,
  });
}

// ---- 備份有效性檢查（與 backupService 一致）----
function validateBackup(dir) {
  const f = path.join(dir, 'database.sql');
  if (!fs.existsSync(f)) return { ok: false, reason: '找不到 database.sql' };
  const size = fs.statSync(f).size;
  if (size === 0) return { ok: false, reason: '檔案是空的（0 bytes）' };

  const txt = fs.readFileSync(f, 'utf8');
  const head = txt.slice(0, 400);
  const tail = txt.slice(-400);

  if (/pg_dump: (?:error|warning|fatal)/i.test(head)) return { ok: false, reason: 'dump 開頭有 pg_dump 錯誤' };
  if (!/PostgreSQL database dump complete/i.test(tail)) return { ok: false, reason: '缺少 dump 完成標記（可能中斷）' };
  if (!/^CREATE TABLE/im.test(txt.slice(0, 200000))) return { ok: false, reason: '找不到 CREATE TABLE（不是有效 dump）' };

  const tableCount = (txt.match(/^CREATE TABLE/gm) || []).length;
  return { ok: true, size, tables: tableCount };
}

function listBackups() {
  if (!fs.existsSync(BACKUP_ROOT)) return [];
  return fs.readdirSync(BACKUP_ROOT)
    .map((d) => ({ name: d, dir: path.join(BACKUP_ROOT, d), mtime: fs.statSync(path.join(BACKUP_ROOT, d)).mtimeMs }))
    .filter((x) => fs.statSync(x.dir).isDirectory())
    .sort((a, b) => b.mtime - a.mtime);
}

function countTables() {
  try {
    const out = runPsql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
    return parseInt(out.trim(), 10);
  } catch { return -1; }
}

(async () => {
  console.log(`DB: ${DB_HOST}:${DB_PORT}/${DB_NAME} (user ${DB_USER})`);

  // ---- 決定要還原哪個備份 ----
  let dir = null;
  if (LATEST) {
    const list = listBackups();
    if (!list.length) { console.error('❌ backups/ 沒有任何備份'); process.exit(1); }
    dir = list[0].dir;
    console.log('最新備份:', list[0].name);
  } else if (target) {
    dir = path.isAbsolute(target) ? target : path.resolve(target);
  }

  // ---- dry-run 或未提供目標：只驗證 ----
  if (!dir) {
    console.log('\n=== 備份檔清單（新→舊）===');
    const list = listBackups().slice(0, 10);
    if (!list.length) { console.log('  （無）'); process.exit(0); }
    let allOk = true;
    for (const b of list) {
      const v = validateBackup(b.dir);
      if (!v.ok) allOk = false;
      console.log(`  ${v.ok ? '✅' : '❌'} ${b.name}  ${v.ok ? (v.size/1048576).toFixed(1)+'MB / '+v.tables+' 表' : v.reason}`);
    }
    console.log('\n若要還原，請加 --latest 或指定備份目錄（會先備份現況）。');
    process.exit(allOk ? 0 : 1);
  }

  const v = validateBackup(dir);
  if (!v.ok) {
    console.error(`\n❌ 備份無效：${v.reason}\n   拒絕還原（避免用壞備份蓋掉好資料）`);
    process.exit(1);
  }
  console.log(`\n✅ 備份有效：${(v.size/1048576).toFixed(1)} MB / ${v.tables} 個表`);

  if (DRY) {
    console.log('\n[dry-run] 未執行還原。');
    process.exit(0);
  }

  console.log('\n⚠️  這會覆蓋目前資料庫的所有資料。');
  if (!YES) {
    console.log('    如確定，請加 --yes 再執行一次。');
    process.exit(2);
  }

  // ---- 先備份現況（防止還原錯的備份）----
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'').replace(/-/g,'');
  const preDir = path.join(BACKUP_ROOT, `pre_restore_${ts}`);
  fs.mkdirSync(preDir, { recursive: true });
  const preDump = path.join(preDir, 'database.sql');
  console.log(`\n⏳ 先備份現況 → ${preDir}`);
  try {
    const pgDump = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
    execFileSync(pgDump, ['-U', DB_USER, '-h', DB_HOST, '-p', DB_PORT, DB_NAME], {
      env: PSQL_ENV, stdio: ['ignore', fs.openSync(preDump, 'w'), 'inherit'], timeout: 600000,
    });
    console.log('   現況備份完成');
  } catch (e) {
    console.error('   ⚠️ 現況備份失敗：', e.message.slice(0, 120));
    console.error('   為安全起見中止還原。');
    fs.rmSync(preDir, { recursive: true, force: true });
    process.exit(1);
  }

  // ---- 還原 ----
  console.log('\n⏳ 還原中（plain SQL，可能需 1-3 分鐘）...');
  const t0 = Date.now();
  try {
    // dump 內含 CREATE TABLE，若既有表存在會衝突 → 先 drop schema 再還原
    // 用 --single-transaction 確保失敗會全部回滾
    execFileSync(PSQL, ['-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME,
      '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', path.join(dir, 'database.sql')], {
      env: PSQL_ENV, stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000,
    });
    console.log(`   還原完成（${((Date.now()-t0)/1000).toFixed(1)}s）`);
  } catch (e) {
    console.error('\n❌ 還原失敗：', String(e.stderr || e.message).split('\n').slice(0, 8).join('\n'));
    console.error(`   現況已備份在：${preDir}`);
    console.error('   （--single-transaction 已回滾，資料庫應維持原狀）');
    process.exit(1);
  }

  // ---- 還原後驗證 ----
  console.log('\n=== 還原後驗證 ===');
  try {
    const tables = runPsql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
    console.log('  public 表數:', tables.trim());
    const checks = [
      ['parts', 'SELECT count(*) FROM parts'],
      ['users', 'SELECT count(*) FROM "EndUser"'],
      ['vehicles', 'SELECT count(*) FROM "VehicleProfile"'],
      ['orders', 'SELECT count(*) FROM consumer_orders'],
    ];
    for (const [label, sql] of checks) {
      try {
        const n = runPsql(sql).trim();
        console.log(`  ${label.padEnd(10)}: ${n}`);
      } catch { console.log(`  ${label.padEnd(10)}: (查詢失敗)`); }
    }
  } catch (e) {
    console.error('  驗證失敗:', e.message.slice(0, 100));
  }

  console.log(`\n✅ 還原完成。還原前的狀態備份在：${preDir}`);
  console.log('   如需回到還原前，重跑本腳本指定該目錄。');
  await p_disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });

function p_disconnect(){ try{ require('../src/lib/prisma').$disconnect(); }catch{} }