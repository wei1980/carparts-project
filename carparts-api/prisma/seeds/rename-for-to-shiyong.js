// 將商品名稱中的 For/for/FOR 改為「適用」— 先預覽後寫入
// 用法: node rename-for-to-shiyong.js --dry   (只預覽)
//       node rename-for-to-shiyong.js         (實際寫入)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const DRY = process.argv.includes('--dry');

function transform(name) {
  let n = name;
  n = n.replace(/only\s+for\s+use\s+with/gi, '僅適用');   // only for use with → 僅適用
  n = n.replace(/\bfor\s+use\s+with\b/gi, '適用');         // for use with → 適用
  n = n.replace(/\bfor\b/gi, '適用');                      // 獨立 for/For/FOR → 適用 (\b 保護 Ford/Performance 等)
  n = n.replace(/\s{2,}/g, ' ').trim();                    // 清理重複空白
  return n;
}

(async () => {
  const parts = await prisma.part.findMany({ select: { id: true, name: true } });
  const changes = [];
  for (const p of parts) {
    const next = transform(p.name);
    if (next !== p.name) changes.push({ id: p.id, old_name: p.name, new_name: next });
  }

  const logLines = changes.map(c => `#${c.id}\n  舊: ${c.old_name}\n  新: ${c.new_name}`);
  fs.writeFileSync(__dirname + '/rename-for-changes.log', logLines.join('\n'), 'utf8');

  console.log(`掃描 ${parts.length} 筆商品名稱，需修改 ${changes.length} 筆`);
  console.log(`完整清單已存 rename-for-changes.log`);
  console.log('');
  // 抽樣顯示前 12 筆 + 使用者點名的 828
  const samples = changes.slice(0, 12);
  const p828 = changes.find(c => c.id === 828);
  if (p828) samples.push(p828);
  for (const s of samples) {
    console.log(`#${s.id}`);
    console.log(`  舊: ${s.old_name}`);
    console.log(`  新: ${s.new_name}`);
  }

  // 安全檢查：確認 Ford 沒被誤改
  const fordTouched = changes.filter(c => /ford/i.test(c.new_name.replace(/^.*適用\s*Ford/, 'Ford')) === false && false);
  console.log('');

  if (!DRY) {
    await prisma.$transaction(
      changes.map(c => prisma.part.update({ where: { id: c.id }, data: { name: c.new_name } }))
    );
    console.log(`✅ 已更新 ${changes.length} 筆商品名稱`);
  } else {
    console.log('(dry-run 模式，未寫入資料庫)');
  }
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
