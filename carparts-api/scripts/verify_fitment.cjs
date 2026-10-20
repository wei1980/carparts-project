// KW 適配重建驗證工具
// 用途：比較兩份 resolved 結果（variant|line → sku），客觀評估新結果是否較合理
// 用法：node verify_fitment.cjs <舊檔.json> <新檔.json>
//   判定依據：新舊 SKU 在 KW.xlsx 中對應記錄的「底盤碼符合度 + 年份符合度」
//   （符合度越高代表該 SKU 與該變體的世代/年份越吻合）
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const deAccent = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[´`']/g, '');
const norm = s => deAccent(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const normMake = s => { const m = norm(s); return m === 'MERCEDESBENZ' ? 'Mercedes-Benz' : m === 'VOLKSWAGEN' ? 'Volkswagen' : m; };

(async () => {
  const API = 'C:/carparts/carparts-api';
  const [oldFile, newFile] = process.argv.slice(2);
  if (!oldFile || !newFile) { console.error('用法: node verify_fitment.cjs <舊.json> <新.json>'); process.exit(1); }
  const load = f => new Map(JSON.parse(fs.readFileSync(f, 'utf8')));
  const oldM = load(path.isAbsolute(oldFile) ? oldFile : path.join(API, oldFile));
  const newM = load(path.isAbsolute(newFile) ? newFile : path.join(API, newFile));

  const fit = JSON.parse(fs.readFileSync(path.join(API, 'scratch_v7_fit.json'), 'utf8'));
  const skuRec = new Map();
  for (const r of fit) {
    for (const [line, sku] of Object.entries(r.prod || {})) {
      if (sku && line !== 'WAY') {
        if (!skuRec.has(sku)) skuRec.set(sku, []);
        skuRec.get(sku).push(r);
      }
    }
  }

  const changed = [...newM.keys()].filter(k => oldM.has(k) && oldM.get(k) !== newM.get(k));
  const ids = [...new Set(changed.map(k => Number(k.split('|')[0])))];
  const rows = ids.length ? await p.vehicleVariant.findMany({
    where: { id: { in: ids } },
    select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true },
  }) : [];
  const vmap = new Map(rows.map(v => [v.id, v]));

  const score = (skus, v) => {
    let best = 0;
    for (const sku of skus) for (const r of (skuRec.get(sku) || [])) {
      if (normMake(r.make) !== normMake(v.make)) continue;
      const ch = (r.chassis || []).map(norm).filter(Boolean);
      const g = norm(v.generation);
      if (ch.some(c => c === g || g.startsWith(c) || c.startsWith(g))) best += 2;
      if (r.yFrom && v.year_end && v.year_end >= r.yFrom && (!r.yTo || v.year_start <= r.yTo)) best += 1;
    }
    return best;
  };

  let better = 0, worse = 0, tie = 0;
  for (const k of changed) {
    const v = vmap.get(Number(k.split('|')[0]));
    if (!v) { tie++; continue; }
    const so = score([oldM.get(k)], v), sn = score([newM.get(k)], v);
    if (sn > so) better++; else if (so > sn) worse++; else tie++;
  }

  // 過度配對偵測：單一 SKU 連到過多變體
  const perSku = new Map();
  for (const [k, sku] of newM) {
    if (!perSku.has(sku)) perSku.set(sku, 0);
    perSku.set(sku, perSku.get(sku) + 1);
  }
  const over = [...perSku.entries()].filter(([, n]) => n > 120);

  console.log('=== 適配重建驗證 ===');
  console.log('舊結果 key:', oldM.size, '| 新結果 key:', newM.size);
  console.log('新增 key:', [...newM.keys()].filter(k => !oldM.has(k)).length,
    '| 移除 key:', [...oldM.keys()].filter(k => !newM.has(k)).length,
    '| SKU 改變:', changed.length);
  console.log('\n改變的客觀評估（底盤碼+年份符合度）:');
  console.log('  新結果較合理:', better, '| 舊結果較合理:', worse, '| 難以判定:', tie);
  console.log('  淨改善:', better - worse);
  console.log('\n過度配對檢查（單一 SKU >120 個變體）:', over.length);
  for (const [sku, n] of over.slice(0, 5)) console.log('   ', sku, n, '條');
  const verdict = better > worse && over.length === 0 ? 'PASS' : '需人工檢視';
  console.log('\n結論:', verdict);
  await p.$disconnect();
})();
