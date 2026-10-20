// src/utils/recommendations.js
// 智慧改裝與零件推薦引擎
// 輸入：currentMileage（當前里程）、manufactureYear（出廠年份）、installedModifications（已安裝改裝）、modelCode（車型）
// 排序規則：
//   1. 專車專用件優先（依里程視窗與車齡門檻，與視窗中心距離越近越前）
//   2. 已安裝項目自動排空（比對改裝 category / partType / brand），順延下一項專用件
//   3. 通用型零件（isUniversal 耗材）強制排序在最末端

export const TAG_MILESTONE = '🔥 必改里程碑';
export const TAG_UPGRADE = '⚠️ 專車升級';
export const TAG_UNIVERSAL = '🔧 通用保養/耗材';

/** 專車專用里程碑目錄 */
const SPECIFIC_CATALOG = [
  {
    id: 'coilover',
    modCategory: 'suspension',   // 已安裝「懸吊系統」→ 排空
    modPartType: 'coilovers',
    partCategory: '底盤',
    subcategory: '避震器',
    search: '避震器',
    brands: ['KW', 'BC Racing', 'Ohlins', 'Bilstein'],
    mileageWindow: [35000, 55000],
    minAgeYears: 2,
    tag: TAG_MILESTONE,
    title: '專用避震器升級',
    reason: ({ mileage }) =>
      `已行駛 ${mileage.toLocaleString()} km，進入避震器黃金檢查區間（35,000–55,000 km），原廠避震阻尼隨里程衰退，建議升級專用競技避震器（KW V3 / BC Racing）`,
  },
  {
    id: 'intercooler',
    modCategory: 'intake',       // 已安裝「進氣與動力系統－大容量中冷器」→ 排空
    modPartType: 'intercooler',
    partCategory: '冷卻',
    subcategory: '冷卻器',
    search: '中冷器',
    brands: ['Forge', 'Mishimoto'],
    mileageWindow: [35000, 55000],
    minAgeYears: 2,
    tag: TAG_UPGRADE,
    title: '專用大容量中冷器',
    reason: ({ mileage }) =>
      `已行駛 ${mileage.toLocaleString()} km，隨車齡與里程累積進氣溫度上升，建議換裝專用大容量中冷器（Forge）提升進氣效率與動力穩定性`,
  },
  {
    id: 'brake_pads',
    modCategory: 'brake',        // 已安裝「煞車系統」→ 排空
    modPartType: 'brake_pads',
    partCategory: '煞車',
    subcategory: '來令片',
    search: '來令片',
    brands: ['EBC Brakes', 'Ferodo', 'Endless', 'Pagid'],
    mileageWindow: [20000, 35000],
    minAgeYears: 1,
    tag: TAG_UPGRADE,
    title: '專用競技煞車皮',
    reason: ({ mileage }) =>
      `已行駛 ${mileage.toLocaleString()} km，原廠煞車皮進入磨耗期（20,000–35,000 km），建議換上專用競技煞車皮（EBC Brakes 專用片）`,
  },
  {
    id: 'intake_kit',
    modCategory: 'intake',       // 已安裝「進氣系統」→ 排空
    modPartType: 'intake_kit',
    partCategory: '進氣',
    subcategory: '進氣套件',
    search: '進氣',
    brands: ['K&N', 'BMC', 'AFE', 'Eventuri'],
    mileageWindow: [15000, 30000],
    minAgeYears: 1,
    tag: TAG_UPGRADE,
    title: '高流量進氣套件',
    reason: ({ mileage }) =>
      `已行駛 ${mileage.toLocaleString()} km，原廠進氣濾芯風阻隨里程上升，建議升級高流量進氣套件（K&N / BMC）提升進氣量`,
  },
];

/** 通用型耗材目錄（任何里程／車齡皆適用，強制排最後） */
const UNIVERSAL_CATALOG = [
  {
    id: 'brake_fluid',
    partCategory: '煞車',
    subcategory: '煞車油管',
    search: '煞車油',
    title: '高階煞車油',
    reason: () => '煞車油具有吸水性，建議每 2 年或 40,000 km 換一次，維持煞車力道穩定，通用全車系',
  },
  {
    id: 'air_filter_care',
    partCategory: '進氣',
    subcategory: '濾芯',
    search: '空濾清潔',
    title: 'K&N 空濾清潔保養組',
    reason: () => '高流量空濾需定期清潔保養以維持濾芯風量與濾芯壽命，通用全車系',
  },
  {
    id: 'tpms',
    partCategory: '電子',
    subcategory: '其他',
    search: '胎壓偵測',
    title: '胎壓偵測器',
    reason: () => '即時監控四輪胎壓，提升行車安全並延長輪胎壽命，通用全車系',
  },
  {
    id: 'car_care',
    partCategory: '外觀',
    subcategory: '其他',
    search: '洗車護理',
    title: '洗車護理用品',
    reason: () => '日常洗車護理，延長車漆與內裝壽命，通用全車系',
  },
];

/** 將車輛 modifications JSON 攤平為 [{ category, partType, brand, model }] */
export function flattenInstalledModifications(modificationsJson) {
  const mods = [];
  if (!modificationsJson || typeof modificationsJson !== 'object') return mods;
  for (const [category, partTypes] of Object.entries(modificationsJson)) {
    if (!partTypes || typeof partTypes !== 'object') continue;
    for (const [partType, mod] of Object.entries(partTypes)) {
      if (!mod) continue;
      mods.push({ category, partType, brand: mod.brand || '', model: mod.model || '' });
    }
  }
  return mods;
}

/** 舊版改裝 key → 新版（排空判定同時相容資料庫新旧紀錄） */
const MOD_KEY_ALIAS = {
  brakes: 'brake',
  wheels: 'wheels_tires',
  coilover: 'coilovers',
  rotor: 'brake_disc',
  pad: 'brake_pads',
  spring: 'lowering_springs',
  wheel_set: 'wheels',
};
const normModKey = (k) => MOD_KEY_ALIAS[k] || k;

/** 已安裝判定：category 相符且（未指定 partType 或 partType 相符）且（未指定 brands 或 brand 相符） */
function isInstalled(entry, installedMods) {
  if (!entry.modCategory) return false;
  const cat = normModKey(entry.modCategory);
  const pt = entry.modPartType ? normModKey(entry.modPartType) : null;
  return installedMods.some(m =>
    normModKey(m.category) === cat &&
    (!pt || normModKey(m.partType) === pt) &&
    (!entry.brands?.length ||
      !m.brand ||
      entry.brands.some(b => m.brand.toLowerCase().includes(b.toLowerCase())))
  );
}

/**
 * 建立推薦清單
 * @param {{ currentMileage?: number, manufactureYear?: number, installedModifications?: Array, modelCode?: string }} input
 * @returns {Array} 排序後的推薦（專用件在前，通用件強制最後）
 */
export function buildRecommendations({ currentMileage = 0, manufactureYear, installedModifications = [], modelCode = '' } = {}) {
  const now = new Date().getFullYear();
  const age = manufactureYear ? Math.max(0, now - Number(manufactureYear)) : 0;
  const mileage = Number(currentMileage) || 0;
  const ctx = { mileage, age, modelCode };

  // 第一優先順位：專車專用件（依里程視窗與車齡門檻）
  const specific = [];
  for (const entry of SPECIFIC_CATALOG) {
    if (isInstalled(entry, installedModifications)) continue; // 自動排空機制
    const [lo, hi] = entry.mileageWindow;
    const inWindow = mileage >= lo * 0.8 && mileage <= hi * 1.2;
    const ageOk = age >= entry.minAgeYears;
    if (!inWindow && !ageOk) continue; // 未達門檻不推薦
    const center = (lo + hi) / 2;
    specific.push({ ...entry, type: 'specific', reason: entry.reason(ctx), distance: Math.abs(mileage - center) });
  }
  // 與里程視窗中心距離越近越前
  specific.sort((a, b) => a.distance - b.distance);

  // 最後順位：通用型零件／泛用耗材（mandatory at the end）
  const universal = UNIVERSAL_CATALOG.map(e => ({
    ...e, type: 'universal', tag: TAG_UNIVERSAL, reason: e.reason(ctx),
  }));

  return [
    ...specific.map((e, i) => ({ ...e, rank: i + 1 })),
    ...universal.map((e, i) => ({ ...e, rank: 99 + i })),
  ];
}

/** 目前里程命中的專車專用分類集合（商城頁「適合您當前里程」徽章用） */
export function activeSpecificCategories(input) {
  return new Set(
    buildRecommendations(input)
      .filter(r => r.type === 'specific')
      .map(r => r.partCategory)
  );
}
