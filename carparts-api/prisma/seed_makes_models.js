function normalizeGenName(name) {
  if (!name) return "";
  let s = String(name).trim();
  // 常見別名統一（視你慣例，可調整）
  s = s.replace(/^mk\s*([ivx\d]+)/i, "MK$1"); // mk7、MK 7 → MK7
  s = s.replace(/[\s\-]+/g, "");
  // 你要用「7代 / 8代」或「MK7 / MK8」都可以，挑一種最常用的統一
  // 這裡示範全轉成 MK7/MK8
  s = s.replace(/^(\d)\s*代$/i, (m,p)=>`MK${p}`);
  return s.toUpperCase(); // 統一大小寫
}

function normalizeGenName(s) {
  s = s.trim().toUpperCase();
  // 把「5代」「六代」「Mk5」「MK 6」等都轉成 MK5、MK6
  s = s.replace(/(\d+)\s*代/i, (m, p1) => `MK${p1}`);
  s = s.replace(/^MK\s*([IVX\d]+)/i, (m, p1) => `MK${p1}`);
  s = s.replace(/(?:世代|GEN|GENERATION)\s*(\d+)/i, (m, p1) => `MK${p1}`);
  return s;
}

async function findOrCreateGeneration(model_id, name, year_from, year_to) {
  const norm = normalizeGenName(name);
  // 先用 expression index 的同義條件查（用 JS 查等價）
  const exists = await prisma.generations.findFirst({
    where: {
      model_id,
      OR: [
        { name: name },
        { name: { equals: name, mode: 'insensitive' } }
      ]
    },
    orderBy: { id: 'asc' }
  });

  if (exists) return exists;

  // 若不存在，直接 create；若區間與既有重疊，會被 DB 的 exclusion constraint 拒絕
  return prisma.generations.create({
    data: {
      model_id,
      name: norm,             // 存統一後的名字
      year_from: Number(year_from),
      year_to: Number(year_to ?? year_from),
    }
  });
}
