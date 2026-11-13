// 卡鉗主檔重整：以「Make+Model」為唯一卡鉗（用戶規格），PadCode 併入說明
// 1. 刪除舊 375 筆 CAL-* 卡鉗（含其 fitment 連結）
// 2. 以 Make+Model 重建 347 筆卡鉗主檔（改裝件>煞車系統-卡鉗，is_active=false）
// 3. 重建 PartCaliperFitment：來令片 ↔ 卡鉗(Make+Model)
// 用法: node rebuild-calipers.js --analyze / --apply
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const MODE = process.argv.includes('--apply') ? 'apply' : 'analyze';
const DATA = path.join(__dirname, '../../media/parts/Brake/pads/EBC/EBC_data');

(async () => {
  const lines = fs.readFileSync(path.join(DATA, 'EBC_Caliper.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim());
  const hdr = lines[0].split(',');
  const ci = n => hdr.indexOf(n);
  const CALIPER_SERIES = [
    'EBC YellowStuff', 'EBC BlueStuff', 'EBC OrangeStuff', 'EBC RP1', 'EBC RPX', 'EBC SR11', 'EBC SR21',
  ];

  // ── 解析 CSV ──
  const calipers = new Map(); // make|model → { make, model, padCodes:Set, codesBySeries: Map(series→Set(code)) }
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const make = (c[ci('Make')] || '').trim(), model = (c[ci('Model')] || '').trim();
    const padCode = (c[ci('PadCode')] || '').trim();
    if (!make || !model) continue;
    const k = make + '|' + model;
    if (!calipers.has(k)) calipers.set(k, { make, model, padCodes: new Set(), codesBySeries: new Map() });
    const cp = calipers.get(k);
    if (padCode) cp.padCodes.add(padCode);
    for (const s of CALIPER_SERIES) {
      const code = (c[ci(s)] || '').trim();
      if (!code) continue;
      if (!cp.codesBySeries.has(s)) cp.codesBySeries.set(s, new Set());
      cp.codesBySeries.get(s).add(code);
    }
  }
  console.log(`CSV 唯一 Make+Model 卡鉗: ${calipers.size}`);

  // ── code → Set(make|model)（重建 fitment 用）──
  const codeToCalipers = new Map();
  for (const [k, cp] of calipers) {
    for (const [, codes] of cp.codesBySeries) {
      for (const code of codes) {
        if (!codeToCalipers.has(code)) codeToCalipers.set(code, new Set());
        codeToCalipers.get(code).add(k);
      }
    }
  }
  console.log(`卡鉗來令片 code: ${codeToCalipers.size}`);

  if (MODE === 'analyze') {
    console.log('\n(analyze 模式。套用將執行: 刪 375 筆舊卡鉗+fitment → 建 347 筆 Make+Model 卡鉗 → 重建 fitment)');
    // 抽樣顯示
    let i = 0;
    for (const [k, cp] of calipers) {
      console.log(`  ${cp.make} ${cp.model} | padCodes: ${[...cp.padCodes].join('/') || '-'} | 來令片系列: ${cp.codesBySeries.size}`);
      if (++i >= 5) break;
    }
    await prisma.$disconnect();
    return;
  }

  // ── apply ──
  // 1. 刪舊 fitment + 舊卡鉗
  const oldCals = await prisma.part.findMany({ where: { sku: { startsWith: 'CAL-' } }, select: { id: true } });
  const oldIds = oldCals.map(c => c.id);
  const dFit = await prisma.partCaliperFitment.deleteMany({ where: { caliper_id: { in: oldIds } } });
  const dCal = await prisma.part.deleteMany({ where: { id: { in: oldIds } } });
  console.log(`刪除舊卡鉗 ${dCal.count} 筆、其 fitment ${dFit.count} 條`);

  // 2. 重建卡鉗主檔（Make+Model 粒度）
  const caliperIdByKey = new Map(); // make|model → part id
  for (const [k, cp] of calipers) {
    const sku = `CAL-${cp.make.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${cp.model.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`.slice(0, 60);
    const padText = cp.padCodes.size ? `卡鉗型號（PadCode）：${[...cp.padCodes].join('、')}。` : '';
    const seriesList = [...cp.codesBySeries.keys()].map(s => s.replace('EBC ', '')).join('、');
    const name = `${cp.make} ${cp.model.trim()}`;
    const part = await prisma.part.upsert({
      where: { sku },
      create: {
        sku, name, brand: cp.make,
        subcategory_id: (await prisma.subcategories.findFirst({ where: { name: '煞車系統-卡鉗' } })).id,
        description: `改裝卡鉗（${cp.make} ${cp.model.trim()}）。${padText}EBC 卡鉗專用來令片對應系列：${seriesList}。`,
        is_universal: true, is_active: false,
      },
      update: { name, brand: cp.make, description: `改裝卡鉗（${cp.make} ${cp.model.trim()}）。${padText}EBC 卡鉗專用來令片對應系列：${seriesList}。` },
    });
    caliperIdByKey.set(k, part.id);
  }
  console.log(`重建卡鉗主檔: ${caliperIdByKey.size}`);

  // 3. 重建 fitment：每個 code 的來令片 ↔ 其適用卡鉗
  let fit = 0;
  for (const [code, calKeys] of codeToCalipers) {
    // 找此 code 的來令片 part（EBC-CP-* sku 尾碼是 code 去符號）
    const skuSuffix = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const padPart = await prisma.part.findFirst({ where: { AND: [{ sku: { endsWith: skuSuffix } }, { sku: { startsWith: 'EBC-CP-' } }] }, select: { id: true } });
    if (!padPart) continue;
    for (const k of calKeys) {
      const calId = caliperIdByKey.get(k);
      if (!calId) continue;
      await prisma.partCaliperFitment.upsert({
        where: { pad_id_caliper_id: { pad_id: padPart.id, caliper_id: calId } },
        create: { pad_id: padPart.id, caliper_id: calId },
        update: {},
      });
      fit++;
    }
  }
  console.log(`重建 fitment: ${fit} 條`);

  // 終態統計
  const calCount = await prisma.part.count({ where: { sku: { startsWith: 'CAL-' } } });
  const fitCount = await prisma.partCaliperFitment.count();
  console.log(`\n終態: 卡鉗 ${calCount}、fitment ${fitCount}`);
  await prisma.$disconnect();
  process.exitCode = 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
