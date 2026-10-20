// src/types/membership.js
// ===== 會員系統型別定義 =====
// 專案為 JSX（React 19 + Vite），以 JSDoc 提供型別提示。
// 對應 TypeScript Interface 如下（日後迁移至 .ts/.tsx 可直接使用）：
//
// /** VIP 等級代碼 */
// type TierCode = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
//
// /** VIP 會員等級 */
// interface VipTier {
//   tier: TierCode;
//   name: string;                 // 顯示名稱
//   minAnnualSpent: number;       // 年度累積消費門檻（NT$）
//   pointMultiplier: number;      // 點數回饋倍數
//   benefits: string[];           // 專屬權益
//   quarterlyFreeShipping: number; // 每季自動贈送免運券張數
// }
//
// /** 會員等級狀態 */
// interface MembershipStatus {
//   currentTier: TierCode;
//   currentYearSpent: number;      // 本年度累積消費
//   nextTierThreshold: number;     // 下一等級門檻（最高等級為 null）
//   progressPercentage: number;    // currentYearSpent / nextTierThreshold
//   pointMultiplier: number;       // 當前等級倍數
//   benefits: string[];            // 當前等級權益
//   quarterlyFreeShippingCount: number;
// }
//
// /** 紅利點數紀錄 */
// type PointRecordType = 'EARN' | 'REDEEM' | 'EXPIRED';
// interface PointRecord {
//   id: string;
//   type: PointRecordType;
//   amount: number;        // 正數=獲得，負數=折抵/到期
//   title: string;         // 例：「訂單 #OR1029 發放」、「GR Yaris 保養折抵」
//   createdAt: string;     // ISO date
//   expireAt?: string;     // ISO date（EARN 紀錄的到期日）
// }
//
// /** 優惠券種類 */
// type CouponType = 'FREE_SHIPPING' | 'FIXED_AMOUNT' | 'PERCENTAGE';
// /** FREE_SHIPPING: 滿 minPurchase 免運｜FIXED_AMOUNT: 滿 minPurchase 折 discountValue｜PERCENTAGE: 折 discountValue%（9折=10），上限 maxDiscount */
// interface Coupon {
//   id: string;
//   code: string;
//   title: string;
//   type: CouponType;
//   discountValue: number;   // FIXED_AMOUNT: 金額；PERCENTAGE: 折扣百分比
//   minPurchase: number;     // 門檻金額
//   maxDiscount?: number;    // PERCENTAGE 折抵上限
//   validFrom: string;       // ISO date
//   validUntil: string;      // ISO date
//   isUsed: boolean;
//   usedAt?: string;
//   categoryLimit?: string;  // 適用品類限制（可選）
// }

/** @typedef {'BRONZE'|'SILVER'|'GOLD'|'DIAMOND'} TierCode */
/** @typedef {'EARN'|'REDEEM'|'EXPIRED'} PointRecordType */
/** @typedef {'FREE_SHIPPING'|'FIXED_AMOUNT'|'PERCENTAGE'} CouponType */

/** 1 點 = NT$ 1 元折抵 */
export const POINT_VALUE_NTD = 1;
/** 點數折抵上限＝訂單金額 30% */
export const MAX_POINT_REDEEM_RATIO = 0.3;
/** 每消費滿 $100 獲得 1 點（再乘等級倍數） */
export const POINTS_PER_100 = 100;
/** 點數有效期（年） */
export const POINT_EXPIRE_YEARS = 1;

/** @type {VipTier[]} 等級與權益設定 */
export const VIP_TIERS = [
  {
    tier: 'BRONZE',
    name: '一般會員',
    minAnnualSpent: 0,
    pointMultiplier: 1.0,
    benefits: ['基本點數回饋 (1.0x)'],
    quarterlyFreeShipping: 0,
  },
  {
    tier: 'SILVER',
    name: '銀卡會員',
    minAnnualSpent: 20000,
    pointMultiplier: 1.1,
    benefits: ['點數回饋 1.1x'],
    quarterlyFreeShipping: 0,
  },
  {
    tier: 'GOLD',
    name: '金卡會員',
    minAnnualSpent: 50000,
    pointMultiplier: 1.2,
    benefits: ['點數回饋 1.2x', '每季自動贈送免運券 1 張'],
    quarterlyFreeShipping: 1,
  },
  {
    tier: 'DIAMOND',
    name: '鑽石卡車神',
    minAnnualSpent: 120000,
    pointMultiplier: 1.3,
    benefits: ['點數回饋 1.3x', '專屬維修預約優先權', '每季自動贈送免運券 1 張'],
    quarterlyFreeShipping: 1,
  },
];

/** 等級排序（BRONZE → DIAMOND） */
export const TIER_ORDER = VIP_TIERS.map(t => t.tier);

/**
 * 取得等級詳情
 * @param {TierCode} tier
 * @returns {VipTier}
 */
export function getTier(tier) {
  return VIP_TIERS.find(t => t.tier === tier) || VIP_TIERS[0];
}

/**
 * 計算會員等級狀態（進度＝年度累積消費 ÷ 下一等級門檻）
 * @param {TierCode} currentTier
 * @param {number} currentYearSpent
 * @returns {MembershipStatus}
 */
export function calcMembershipStatus(currentTier, currentYearSpent) {
  const idx = TIER_ORDER.indexOf(currentTier);
  const tier = getTier(currentTier);
  const next = TIER_ORDER[idx + 1] ? getTier(TIER_ORDER[idx + 1]) : null;
  const nextTierThreshold = next ? next.minAnnualSpent : null;
  const progressPercentage = next
    ? Math.min(100, Math.round((currentYearSpent / nextTierThreshold) * 100))
    : 100;
  return {
    currentTier,
    currentYearSpent,
    nextTierThreshold,
    progressPercentage,
    pointMultiplier: tier.pointMultiplier,
    benefits: tier.benefits,
    quarterlyFreeShippingCount: tier.quarterlyFreeShipping,
    _next: next,
  };
}

/**
 * 消費可獲得點數＝floor(金額/100) × 等級倍數
 * @param {number} amountSpent
 * @param {TierCode} tier
 * @returns {number}
 */
export function calcPointsEarn(amountSpent, tier) {
  const base = Math.floor(Number(amountSpent) / POINTS_PER_100);
  return Math.round(base * getTier(tier).pointMultiplier);
}

/**
 * 點數折抵上限＝訂單金額 30%（且不得超過可用點數）
 * @param {number} orderAmount
 * @param {number} availablePoints
 * @returns {number}
 */
export function calcMaxPointRedeem(orderAmount, availablePoints) {
  return Math.min(
    availablePoints,
    Math.floor(Number(orderAmount) * MAX_POINT_REDEEM_RATIO),
  );
}
