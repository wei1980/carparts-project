/**
 * Inventory & Pricing Service
 * 負責處理所有的 B2B 商業邏輯轉換
 */

/**
 * 格式化零件資料給前端
 * @param {Object} part - DB 中的零件 Row
 * @param {String} userRole - 使用者角色 ('TRIAL' | 'VERIFIED' | 'ADMIN')
 * @returns {Object} 格式化後的 DTO
 */
function formatPartForClient(part, userRole) {
  const stockQty = part.stock_qty || 0;
  const isStock = stockQty > 0;
  
  // 1. 計算供應狀態 (Supply Status)
  let status = 'DISCONTINUED';
  let displayStatusText = '缺貨';
  let leadWeeks = 0;

  if (part.is_active) {
    if (isStock) {
      status = 'IN_STOCK';
      displayStatusText = `現貨 (剩餘 ${stockQty} 件)`;
    } else {
      status = 'PREORDER';
      // 邏輯變更：天數轉週數，無條件進位
      leadWeeks = Math.ceil((part.preorder_lead_time_days || 21) / 7);
      displayStatusText = `預訂 (約 ${leadWeeks} 週)`;
    }
  }

  // 2. 價格策略 (Pricing Strategy)
  // TRIAL 會員看不到批發價
  const canSeeWholesale = ['VERIFIED', 'ADMIN'].includes(userRole);
  
  const priceData = {
    msrp: Number(part.msrp_price),
    wholesale: canSeeWholesale ? Number(part.wholesale_price) : null,
    currency: 'TWD'
  };

  // 3. 預購訂金邏輯
  // 若為預購狀態，標記需要訂金
  const requiresDeposit = status === 'PREORDER';

  return {
    id: part.id,
    sku: part.sku,
    name: part.name,
    brand: part.brand,
    image_url: part.image_url,
    category: {
      main: part.category_main,
      sub: part.category_sub
    },
    // 扁平化的庫存顯示資訊，方便前端直接渲染
    inventory: {
      status: status,           // IN_STOCK, PREORDER
      qty: stockQty,
      lead_weeks: leadWeeks,    // 前端直接顯示 "3" 週
      display_text: displayStatusText,
      requires_deposit: requiresDeposit
    },
    price: priceData,
    locked: !canSeeWholesale // 標記是否被鎖定價格
  };
}

module.exports = {
  formatPartForClient
};