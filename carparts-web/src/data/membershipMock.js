// src/data/membershipMock.js
// ===== 會員系統 Mock Data（介面串接前過渡用）=====
import { calcMembershipStatus } from '../types/membership';

/** @type {MembershipStatus} 當前用戶：金卡會員，年度累積消費 $68,000 */
export const mockMembership = calcMembershipStatus('GOLD', 68000);

/** 可用紅利點數 */
export const mockAvailablePoints = 1250;

/** @type {PointRecord[]} 點數紀錄（明細合計 = 1,250 點） */
export const mockPointHistory = [
  { id: 'pt-01', type: 'EARN', amount: 150, title: '訂單 #C20260928-1042 發放', createdAt: '2026-09-28', expireAt: '2027-09-30' },
  { id: 'pt-02', type: 'EARN', amount: 320, title: '訂單 #C20260915-0871 發放（金卡 1.2x）', createdAt: '2026-09-15', expireAt: '2027-09-30' },
  { id: 'pt-03', type: 'REDEEM', amount: -300, title: 'GR Yaris 保養折抵', createdAt: '2026-09-02' },
  { id: 'pt-04', type: 'EARN', amount: 180, title: '訂單 #C20260820-0655 發放', createdAt: '2026-08-20', expireAt: '2026-12-31' },
  { id: 'pt-05', type: 'REDEEM', amount: -120, title: '更換煞車片折抵', createdAt: '2026-08-05' },
  { id: 'pt-06', type: 'EARN', amount: 250, title: '訂單 #C20260730-0512 發放', createdAt: '2026-07-30', expireAt: '2026-12-31' },
  { id: 'pt-07', type: 'EXPIRED', amount: -80, title: '2025 年度點數到期', createdAt: '2026-07-10' },
  { id: 'pt-08', type: 'EARN', amount: 400, title: '訂單 #C20260618-0389 發放', createdAt: '2026-06-18', expireAt: '2026-12-31' },
  { id: 'pt-09', type: 'EARN', amount: 450, title: '訂單 #C20260522-0245 發放', createdAt: '2026-05-22', expireAt: '2026-12-31' },
];

/**
 * 即將到期（90 天內）點數——依 expireAt 過濾
 * @param {PointRecord[]} history
 * @param {number} days
 * @returns {PointRecord[]}
 */
export function filterExpiringSoon(history, days = 90) {
  const now = new Date();
  const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return history.filter(r =>
    r.type === 'EARN' && r.expireAt && new Date(r.expireAt) <= limit,
  );
}

/** @type {Coupon[]} 優惠券（3 張可使用 + 2 張已使用/失效） */
export const mockCoupons = [
  {
    id: 'cp-01', code: 'VIPFREE26Q4', title: '金卡會員季贈免運券',
    type: 'FREE_SHIPPING', discountValue: 0, minPurchase: 1000,
    validFrom: '2026-10-01', validUntil: '2026-12-31', isUsed: false,
  },
  {
    id: 'cp-02', code: 'SAVE300', title: '滿 $3,000 折 $300',
    type: 'FIXED_AMOUNT', discountValue: 300, minPurchase: 3000,
    validFrom: '2026-09-01', validUntil: '2026-10-31', isUsed: false,
  },
  {
    id: 'cp-03', code: 'MOD90', title: '全站改裝品 9 折',
    type: 'PERCENTAGE', discountValue: 10, minPurchase: 0, maxDiscount: 1000,
    validFrom: '2026-08-15', validUntil: '2026-11-15', isUsed: false, categoryLimit: '改裝',
  },
  {
    id: 'cp-04', code: 'WELCOME10', title: '新會員歡迎免運券',
    type: 'FREE_SHIPPING', discountValue: 0, minPurchase: 0,
    validFrom: '2026-01-01', validUntil: '2026-12-31', isUsed: true, usedAt: '2026-08-01',
  },
  {
    id: 'cp-05', code: 'FESTIVAL200', title: '夏日祭滿 $2,000 折 $200',
    type: 'FIXED_AMOUNT', discountValue: 200, minPurchase: 2000,
    validFrom: '2026-06-01', validUntil: '2026-07-31', isUsed: false,
  },
];

/**
 * 優惠券狀態：可使用的未使用且未過期；已使用/失效为其余
 * @param {Coupon[]} coupons
 * @returns {{ usable: Coupon[], archived: Coupon[] }}
 */
export function partitionCoupons(coupons) {
  const today = new Date().toISOString().slice(0, 10);
  const usable = coupons.filter(c => !c.isUsed && c.validUntil >= today);
  const archived = coupons.filter(c => c.isUsed || c.validUntil < today);
  return { usable, archived };
}

/** 優惠券門檻描述（卡片顯示用） */
export function couponConditionText(coupon) {
  switch (coupon.type) {
    case 'FREE_SHIPPING':
      return coupon.minPurchase > 0 ? `滿 NT$ ${coupon.minPurchase.toLocaleString()} 免運` : '免運（無門檻）';
    case 'FIXED_AMOUNT':
      return `滿 NT$ ${coupon.minPurchase.toLocaleString()} 折 NT$ ${coupon.discountValue.toLocaleString()}`;
    case 'PERCENTAGE': {
      const cap = coupon.maxDiscount ? `（上限 NT$ ${coupon.maxDiscount.toLocaleString()}）` : '';
      const cat = coupon.categoryLimit ? `限${coupon.categoryLimit}品類` : '全站適用';
      // 中文折數＝(100 - 折扣%) / 10，例如 10% off → 9 折
      return `${cat} ${(100 - coupon.discountValue) / 10} 折${cap}`;
    }
    default:
      return '';
  }
}
