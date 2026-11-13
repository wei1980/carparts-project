// 商品描述修復：HTML 裸露 → 純文字、移除 Markdown 殘留、中國用語 → 台灣用語
// 用法: node fix-descriptions.js --dry   (只預覽)
//       node fix-descriptions.js         (實際寫入)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const DRY = process.argv.includes('--dry');

// 中國用語 → 台灣用語（汽車零件）
const TERM_MAP = [
  [/攪牙避震器|攪牙避震|绞牙避震器|绞牙避震|搅牙避震器|搅牙避震/g, '高低可調避震器'],
  [/攪牙|绞牙|搅牙/g, '高低可調'],
  [/皮卡/g, '貨卡'],
  [/视频/g, '影片'],
  [/质保/g, '保固'],
  [/方向盘/g, '方向盤'],
  [/变速箱/g, '變速箱'],
  [/刹车片/g, '來令片'],
  [/刹车/g, '煞車'],
  [/悬挂/g, '懸吊'],
  [/减震器/g, '避震器'],
  [/减震/g, '避震'],
  [/轮毂/g, '輪框'],
  [/传感器/g, '感知器'],
  [/火花塞/g, '火星塞'],
  [/高压包/g, '點火線圈'],
  [/雨刮/g, '雨刷'],
  [/后备箱/g, '後行李箱'],
  [/保险杠/g, '保險桿'],
  [/衬套/g, '襯套'],
  [/卡钳/g, '卡鉗'],
];

function transform(desc) {
  let d = desc;

  // 1. HTML → 純文字結構
  d = d.replace(/<br\s*\/?>/gi, '\n');                 // <br> → 換行
  d = d.replace(/<\/(p|h[1-6]|div|tr)>/gi, '\n\n');    // 區塊結尾 → 空行
  d = d.replace(/<h[1-6][^>]*>/gi, '');                // 標題開頭標籤移除（保留文字）
  d = d.replace(/<\/li>/gi, '\n');                     // 清單項結尾 → 換行
  d = d.replace(/<li[^>]*>/gi, '・ ');                 // 清單項開頭 → 圓點
  d = d.replace(/<[^>]+>/g, '');                       // 其餘標籤全數移除

  // 2. Markdown 殘留
  d = d.replace(/\*\*/g, '');                          // **粗體** 標記
  d = d.replace(/^#{1,6}\s+/gm, '');                   // 行首 # 標題

  // 3. HTML entities
  d = d.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // 4. 用語轉換
  for (const [re, tw] of TERM_MAP) d = d.replace(re, tw);

  // 5. 排版清理：每行內連續空白壓一個、去行尾空白、3+ 換行壓成一空行
  d = d.split('\n').map(l => l.replace(/[ \t]{2,}/g, ' ').trimEnd()).join('\n');
  d = d.replace(/\n{3,}/g, '\n\n').trim();

  return d;
}

(async () => {
  const parts = await prisma.part.findMany({
    select: { id: true, sku: true, name: true, description: true },
    where: { is_active: true },
    orderBy: { id: 'asc' },
  });

  const changes = [];
  const termHits = [];
  for (const p of parts) {
    if (!p.description) continue;
    const next = transform(p.description);
    if (next !== p.description) {
      changes.push({ id: p.id, sku: p.sku, name: p.name, old: p.description, new: next });
      for (const [re] of TERM_MAP) {
        const m = p.description.match(new RegExp(re.source, 'g'));
        if (m) termHits.push(`#${p.id} ${[...new Set(m)].join(',')}`);
      }
    }
  }

  // 存完整 log
  const logLines = changes.map(c =>
    `#${c.id} [${c.sku}] ${c.name}\n--- 舊 ---\n${c.old}\n--- 新 ---\n${c.new}\n`);
  fs.writeFileSync(__dirname + '/fix-descriptions-changes.log', logLines.join('\n=====\n'), 'utf8');

  console.log(`掃描 ${parts.length} 筆，需修改 ${changes.length} 筆（完整前後對照已存 fix-descriptions-changes.log）`);
  console.log(`\n用語轉換命中 ${termHits.length} 處：`);
  console.log([...new Set(termHits)].join('\n') || '（無）');

  // 抽樣：#1142（使用者點名）+ 前 3 筆
  console.log('\n========== 抽樣預覽 ==========');
  const samples = changes.filter(c => c.id === 1142).concat(changes.slice(0, 3));
  const seen = new Set();
  for (const s of samples) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    console.log(`\n----- #${s.id} [${s.sku}] ${s.name} -----`);
    console.log(`【舊】${s.old.slice(0, 300)}${s.old.length > 300 ? '…' : ''}`);
    console.log(`【新】${s.new.slice(0, 300)}${s.new.length > 300 ? '…' : ''}`);
  }

  if (!DRY) {
    let updated = 0;
    for (const c of changes) {
      await prisma.part.update({ where: { id: c.id }, data: { description: c.new } });
      updated++;
    }
    console.log(`\n✅ 已更新 ${updated} 筆商品描述`);
  } else {
    console.log('\n(dry-run 模式，未寫入資料庫)');
  }
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
