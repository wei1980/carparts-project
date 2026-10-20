const { PrismaClient } = require("@prisma/client");

// 非負整數轉換器
const toIntNonNeg = (v, d = 0) => {
  if (v === null || v === undefined || v === "") return d;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : d;
};

// 可為空整數
const toNullableInt = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

/** 預載入 Workshop 配額 */
async function prepareWorkshopQuota(workshopId) {
  if (!workshopId) return null;
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const limit = 100; 

  const prisma = new PrismaClient();
  const usage = await prisma.workshopQueryUsage.upsert({
    where: { workshop_id_year_month: { workshop_id: workshopId, year_month: yearMonth } },
    create: { workshop_id: workshopId, year_month: yearMonth, query_count: 0, rows_returned: 0 },
    update: {},
  });

  if (limit != null && usage.query_count >= limit) {
    return { allowed: false, limit, remaining: 0, usageKey: { workshop_id: workshopId, year_month: yearMonth }, maxRowsPerQuery: 50 };
  }
  return { allowed: true, limit, remaining: Math.max(0, limit - usage.query_count), usageKey: { workshop_id: workshopId, year_month: yearMonth }, maxRowsPerQuery: 50 };
}

/** 結算 Workshop 配額 */
async function finalizeWorkshopQuota(quotaCtx, rowsReturned) {
  if (!quotaCtx?.usageKey) return;
  const count = Math.max(0, rowsReturned != null ? Number(rowsReturned) : 0);
  const prisma = new PrismaClient();
  await prisma.workshopQueryUsage.update({
    where: { workshop_id_year_month: quotaCtx.usageKey },
    data: { query_count: { increment: 1 }, rows_returned: { increment: count }, last_query_at: new Date() },
  });
}

/** 裝飾零件數據 */
async function decorateParts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const partIds = rows.map(r => r.id);

  const subcategoryIds = Array.from(new Set(rows.map(r => r.subcategory_id).filter(Boolean)));
  const subcategories = subcategoryIds.length
    ? await require("@prisma/client").prisma.subcategories.findMany({ where: { id: { in: subcategoryIds } }, select: { id: true, name: true } })
    : [];
  const subMap = new Map(subcategories.map(sc => [sc.id, sc]));

  const pc = await require("@prisma/client").prisma.partCompatibility.findMany({
    where: { part_id: { in: partIds } }, select: { part_id: true, vehicle_id: true }
  });
  const vIds = Array.from(new Set(pc.map(p => p.vehicle_id)));
  
  let vMap = new Map();
  if (vIds.length > 0) {
    const vInfo = await require("@prisma/client").prisma.vehicleVariant.findMany({ where: { id: { in: vIds } }, select: { id: true, make: true, model: true, generation: true, variant_name: true } });
    vMap = new Map(vInfo.map(v => [v.id, v]));
  }

  return rows.map(r => {
    const vList = pc.filter(x => x.part_id === r.id).map(x => vMap.get(x.vehicle_id)).filter(Boolean);
    return {
      ...r,
      subcategory_name: subMap.get(r.subcategory_id)?.name || "Other",
      compatible_vehicles: vList.map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        generation: v.generation,
        variant_name: v.variant_name
      }))
    };
  });
}

module.exports = { toIntNonNeg, toNullableInt, prepareWorkshopQuota, finalizeWorkshopQuota, decorateParts };
