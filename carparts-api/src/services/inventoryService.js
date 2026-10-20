/**
 * Inventory Service - Redis Cache + PostgreSQL Dual Write
 * 防止超賣：使用 Lua 腳本實現原子性扣減庫存
 */

const { PrismaClient } = require('@prisma/client');
const cacheService = require('./cacheService');

const prisma = new PrismaClient();

// Redis Lua 腳本：原子性扣減庫存
const DECREMENT_STOCK_SCRIPT = `
local key = KEYS[1]
local qty = tonumber(ARGV[1])
local current = redis.call('GET', key)
if current == false then
    return -1  -- key 不存在
end
local current_qty = tonumber(current)
if current_qty < qty then
    return -2  -- 庫存不足
end
local new_qty = current_qty - qty
redis.call('SET', key, new_qty)
return new_qty
`;

const INCREMENT_STOCK_SCRIPT = `
local key = KEYS[1]
local qty = tonumber(ARGV[1])
local current = redis.call('GET', key)
if current == false then
    return -1
end
local new_qty = tonumber(current) + qty
redis.call('SET', key, new_qty)
return new_qty
`;

// Lua 腳本 SHA 緩存
let decrementScriptSha = null;
let incrementScriptSha = null;

/**
 * 初始化 Lua 腳本
 */
async function initScripts() {
  try {
    decrementScriptSha = await cacheService.script('LOAD', DECREMENT_STOCK_SCRIPT);
    incrementScriptSha = await cacheService.script('LOAD', INCREMENT_STOCK_SCRIPT);
    console.log('✅ Inventory Lua scripts loaded');
  } catch (error) {
    console.error('Failed to load inventory scripts:', error);
  }
}

/**
 * 獲取庫存鍵名
 */
function getStockKey(partId) {
  return `stock:part:${partId}`;
}

/**
 * 同步 PostgreSQL 庫存到 Redis
 */
async function syncStockToRedis(partId) {
  try {
    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: { stock_qty: true }
    });
    
    if (part) {
      const key = getStockKey(part.id);
      await cacheService.set(`stock:part:${part.id}`, part.stock_qty, 86400); // 24小時 TTL
      return part.stock_qty;
    }
    return null;
  } catch (error) {
    console.error(`同步庫存到 Redis 失敗 (partId: ${partId}):`, error);
    return null;
  }
}

/**
 * 批量同步庫存到 Redis
 */
async function syncAllStockToRedis() {
  try {
    const parts = await prisma.part.findMany({
      where: { is_active: true },
      select: { id: true, stock_qty: true }
    });
    
    const pipeline = cacheService.client.pipeline();
    parts.forEach(part => {
      pipeline.set(`stock:part:${part.id}`, part.stock_qty, 'EX', 86400);
    });
    await pipeline.exec();
    
    console.log(`✅ 同步 ${parts.length} 個商品庫存到 Redis`);
    return parts.length;
  } catch (error) {
    console.error('批量同步庫存失敗:', error);
    return 0;
  }
}

/**
 * 原子性扣減庫存（Redis + PostgreSQL 雙寫）
 * @param {number} partId - 商品 ID
 * @param {number} qty - 扣減數量
 * @param {Object} options - 選項
 * @returns {Object} { success, remaining, error }
 */
async function decrementStock(partId, qty, options = {}) {
  const { useTransaction = true, skipRedis = false } = options;
  const key = `stock:part:${partId}`;
  
  try {
    // 1. 嘗試從 Redis 原子性扣減
    if (!skipRedis) {
      try {
        let result;
        if (decrementScriptSha) {
          result = await cacheService.client.evalsha(decrementScriptSha, 1, `stock:part:${partId}`, qty);
        } else {
          // 腳本未載入，使用 EVAL
          result = await cacheService.client.eval(DECREMENT_STOCK_SCRIPT, 1, `stock:part:${partId}`, qty);
        }
        
        const resultNum = parseInt(result);
        if (resultNum === -1) {
          // Redis 中無庫存鍵，需同步
          await syncStockToRedis(partId);
          // 重試一次
          result = await cacheService.client.evalsha(decrementScriptSha, 1, `stock:part:${partId}`, qty);
        }
        
        if (result === -2) {
          return { success: false, error: '庫存不足', code: 'INSUFFICIENT_STOCK' };
        }
        
        if (result >= 0) {
          // Redis 扣減成功，異步同步到 PostgreSQL
          if (useTransaction) {
            await decrementStockPostgres(partId, qty);
          } else {
            // 異步寫入，不阻塞
            setImmediate(() => decrementStockPostgres(partId, qty));
          }
          
          return { success: true, remaining: parseInt(result) };
        }
      } catch (redisError) {
        console.warn('Redis 扣減失敗，降級到 PostgreSQL:', redisError.message);
      }
    }
    
    // 2. 降級方案：直接使用 PostgreSQL 事務
    return await decrementStockPostgres(partId, qty);
  } catch (error) {
    console.error('扣減庫存失敗:', error);
    return { success: false, error: '扣減庫存失敗', code: 'DECREMENT_FAILED' };
  }
}

/**
 * PostgreSQL 扣減庫存（事務）
 */
async function decrementStockPostgres(partId, qty) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const part = await tx.part.findUnique({
        where: { id: partId },
        select: { stock_qty: true }
      });
      
      if (!part) {
        throw new Error('商品不存在');
      }
      
      if (part.stock_qty < qty) {
        throw new Error('庫存不足');
      }
      
      const updated = await tx.part.update({
        where: { id: partId },
        data: { stock_qty: { decrement: qty } },
        select: { stock_qty: true }
      });
      
      return { success: true, remaining: updated.stock_qty };
    });
    
    return { success: true, remaining: result.stock_qty };
  } catch (error) {
    console.error('PostgreSQL 扣減庫存失敗:', error);
    throw error;
  }
}

/**
 * 原子性增加庫存（Redis + PostgreSQL 雙寫）
 */
async function incrementStock(partId, qty) {
  try {
    const key = `stock:part:${partId}`;
    
    // 1. 嘗試 Redis 原子性增加
    try {
      let result;
      if (incrementScriptSha) {
        result = await cacheService.client.evalsha(incrementScriptSha, 1, `stock:part:${partId}`, qty);
      } else {
        result = await cacheService.client.eval(INCREMENT_STOCK_SCRIPT, 1, `stock:part:${partId}`, qty);
      }
      
      if (result !== -1) {
        // Redis 增加成功，異步同步到 PostgreSQL
        setImmediate(() => incrementStockPostgres(partId, qty));
        return { success: true, remaining: parseInt(result) };
      }
    } catch (redisError) {
      console.warn('Redis 增加失敗，降級到 PostgreSQL:', redisError.message);
    }
    
    // 2. 降級方案：PostgreSQL
    return await incrementStockPostgres(partId, qty);
  } catch (error) {
    console.error('增加庫存失敗:', error);
    return { success: false, error: '增加庫存失敗', code: 'INCREMENT_FAILED' };
  }
}

/**
 * PostgreSQL 增加庫存
 */
async function incrementStockPostgres(partId, qty) {
  try {
    const updated = await prisma.part.update({
      where: { id: partId },
      data: { stock_qty: { increment: qty } },
      select: { stock_qty: true }
    });
    
    return { success: true, remaining: updated.stock_qty };
  } catch (error) {
    console.error('PostgreSQL 增加庫存失敗:', error);
    throw error;
  }
}

/**
 * 獲取庫存（優先從 Redis 讀取）
 */
async function getStock(partId) {
  try {
    // 優先從 Redis 讀取
    const cached = await cacheService.get(`stock:part:${partId}`);
    if (cached !== null) {
      return { success: true, stock: parseInt(cached), source: 'redis' };
    }
    
    // Redis 無數據，從 PostgreSQL 讀取並同步到 Redis
    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: { stock_qty: true }
    });
    
    if (part) {
      await cacheService.set(`stock:part:${partId}`, part.stock_qty, 86400);
      return { success: true, stock: part.stock_qty, source: 'postgres' };
    }
    
    return { success: false, error: '商品不存在' };
  } catch (error) {
    console.error('獲取庫存失敗:', error);
    return { success: false, error: '獲取庫存失敗' };
  }
}

/**
 * 批量檢查庫存（用於下單前驗證）
 */
async function checkStockAvailability(items) {
  try {
    const partIds = items.map(item => item.part_id || item.partId);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true, stock_qty: true, name: true }
    });
    
    const partMap = {};
    parts.forEach(p => { partMap[p.id] = p; });
    
    const insufficient = [];
    for (const item of items) {
      const partId = item.part_id || item.partId;
      const qty = item.quantity || item.qty || 1;
      const part = partMap[partId];
      
      if (!part) {
        insufficient.push({ partId, reason: '商品不存在' });
        continue;
      }
      
      if (part.stock_qty < qty) {
        insufficient.push({ partId, partName: part.name, available: part.stock_qty, required: qty });
      }
    }
    
    return {
      sufficient: insufficient.length === 0,
      insufficient
    };
  } catch (error) {
    console.error('檢查庫存失敗:', error);
    return { success: false, error: '檢查庫存失敗' };
  }
}

/**
 * 庫存預留（下單時預扣，支付成功確認，失敗釋放）
 */
async function reserveStock(orderId, items) {
  try {
    const reservations = [];
    
    for (const item of items) {
      const partId = item.part_id || item.partId;
      const qty = item.quantity || item.qty || 1;
      
      const result = await decrementStock(partId, qty, { useTransaction: false });
      if (!result.success) {
        // 釋放已預留的庫存
        for (const reservation of reservations) {
          await incrementStock(reservation.partId, reservation.qty);
        }
        return { success: false, error: '庫存不足' };
      }
      reservations.push({ partId, qty });
    }
    
    // 儲存預留記錄（可選：存入 Redis 設過期時間）
    await cacheService.set(`reservation:${orderId}`, JSON.stringify(reservations), 1800); // 30分鐘過期
    
    return { success: true, reservations };
  } catch (error) {
    console.error('預留庫存失敗:', error);
    return { success: false, error: '預留庫存失敗' };
  }
}

/**
 * 釋放預留庫存（支付失敗/取消訂單時）
 */
async function releaseReservedStock(orderId) {
  try {
    const reservationData = await cacheService.get(`reservation:${orderId}`);
    if (!reservationData) return { success: true };
    
    const reservations = JSON.parse(reservationData);
    
    for (const reservation of reservations) {
      await incrementStock(reservation.partId, reservation.qty);
    }
    
    await cacheService.del(`reservation:${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('釋放預留庫存失敗:', error);
    return { success: false, error: '釋放預留庫存失敗' };
  }
}

/**
 * 確認預留庫存（支付成功後）
 */
async function confirmReservedStock(orderId) {
  try {
    // 只需刪除預留記錄，庫存已在下單時扣減
    await cacheService.del(`reservation:${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('確認預留庫存失敗:', error);
    return { success: false, error: '確認預留庫存失敗' };
  }
}

/**
 * 庫存預警檢查
 */
async function checkLowStock() {
  try {
    const lowStockParts = await prisma.part.findMany({
      where: {
        is_active: true,
        stock_qty: { lte: prisma.raw('low_stock_threshold') } // 假設有低庫存閾值欄位
      },
      select: { id: true, name: true, stock_qty: true, sku: true }
    });
    
    return { success: true, lowStockParts };
  } catch (error) {
    console.error('庫存預警檢查失敗:', error);
    return { success: false, error: '庫存預警檢查失敗' };
  }
}

// 初始化腳本
initScripts().catch(console.error);

module.exports = {
  initScripts,
  decrementStock,
  incrementStock,
  getStock,
  checkStockAvailability,
  reserveStock,
  releaseReservedStock,
  confirmReservedStock,
  syncStockToRedis,
  syncAllStockToRedis,
  checkLowStock,
  decrementStockPostgres,
  incrementStockPostgres
};