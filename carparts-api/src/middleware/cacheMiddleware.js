/**
 * Cache Middleware for Express Routes
 * 自動快取 GET 請求回應
 */
const cacheService = require('../services/cacheService');
const { KEYS, TTL, TAGS } = require('../config/cacheKeys');

/**
 * 通用快取中間件
 * @param {Object} options
 * @param {Function} options.keyGenerator - 生成快取鍵的函數 (req) => string
 * @param {number} options.ttl - TTL 秒數
 * @param {string[]} options.tags - 快取標籤 (用於批次失效)
 * @param {Function} options.condition - 判斷是否快取的條件 (req) => boolean
 * @param {Function} options.onCacheHit - 快取命中時的 callback (req, res, cachedData)
 * @param {Function} options.onCacheMiss - 快取未命中時的 callback (req)
 */
function cacheMiddleware(options = {}) {
  const {
    keyGenerator,
    ttl = 300,
    tags = [],
    condition = (req) => req.method === 'GET',
    onCacheHit,
    onCacheMiss,
  } = options;

  return async (req, res, next) => {
    // 檢查是否應該快取
    if (!condition(req)) return next();

    // 生成快取鍵
    const cacheKey = keyGenerator ? keyGenerator(req) : req.originalUrl;
    if (!cacheKey) return next();

    try {
      // 嘗試從快取取得
      const cached = await cacheService.get(cacheKey);
      
      if (cached !== null) {
        // 快取命中
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        if (onCacheHit) onCacheHit(req, res, cached);
        
        return res.json(cached);
      }

      // 快取未命中 - 攔截 res.json 來儲存回應
      const originalJson = res.json.bind(res);
      res.json = async function(data) {
        // 只快取成功回應
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            await cacheService.set(cacheKey, data, ttl);
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('X-Cache-Key', cacheKey);
            
            if (onCacheMiss) onCacheMiss(req, data);
          } catch (err) {
            console.warn('Cache set failed:', err.message);
          }
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.warn('Cache middleware error:', err.message);
      next(); // 發生錯誤時跳過快取，直接執行路由
    }
  };
}

/**
 * 專用快取中間件 - 車型資料
 */
function vehicleCacheMiddleware(ttl = 600) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      // 從查詢參數生成鍵
      const params = { ...req.query };
      return `vehicle:search:${JSON.stringify(params)}`;
    },
    ttl,
    tags: ['vehicle_data'],
  });
}

/**
 * 專用快取中間件 - 零件推薦
 */
function partRecommendationCacheMiddleware(ttl = 300) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const params = { ...req.query };
      // 包含 variantId 等關鍵參數
      return `part:reco:${JSON.stringify(params)}`;
    },
    ttl,
    tags: ['part_data', 'compatibility'],
  });
}

/**
 * 專用快取中間件 - 車廠列表
 */
function garageListCacheMiddleware(ttl = 300) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const params = { ...req.query };
      return `garage:list:${JSON.stringify(params)}`;
    },
    ttl,
    tags: ['garage_list'],
  });
}

/**
 * 專用快取中間件 - 車廠詳情
 */
function garageDetailCacheMiddleware(ttl = 600) {
  return cacheMiddleware({
    keyGenerator: (req) => `garage:detail:${req.params.id}`,
    ttl,
    tags: ['garage_data'],
  });
}

/**
 * 專用快取中間件 - 零件推薦 (車主端)
 */
function consumerPartRecommendationCacheMiddleware(ttl = 300) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const params = { ...req.query };
      // 包含車輛 ID
      if (req.query.vehicleId) params.vehicleId = req.query.vehicleId;
      return `part:reco:${JSON.stringify(params)}`;
    },
    ttl,
    tags: ['part_data', 'compatibility'],
  });
}

/**
 * 快取失效中間件 - 用於 POST/PATCH/DELETE 後自動清除相關快取
 * @param {string[]} tagsToInvalidate - 要失效的標籤
 */
function invalidateCacheMiddleware(tagsToInvalidate = []) {
  return async (req, res, next) => {
    // 執行原路由
    const originalJson = res.json.bind(res);
    res.json = async function(data) {
      // 只在成功時清除快取
      if (res.statusCode >= 200 && res.statusCode < 300 && tagsToInvalidate.length > 0) {
        try {
          await cacheService.invalidateByTags(tagsToInvalidate);
          console.log(`🗑️ Invalidated cache tags: ${tagsToInvalidate.join(', ')}`);
        } catch (err) {
          console.warn('Cache invalidation failed:', err.message);
        }
      }
      return originalJson(data);
    };
    next();
  };
}

/**
 * 手動快取失效工具
 */
async function invalidateCache(tags) {
  return await cacheService.invalidateByTags(tags);
}

/**
 * 手動設定快取
 */
async function setCache(key, data, ttl = 300) {
  return await cacheService.set(key, data, ttl);
}

/**
 * 手動獲取快取
 */
async function getCache(key) {
  return await cacheService.get(key);
}

module.exports = {
  cacheMiddleware,
  vehicleCacheMiddleware,
  partRecommendationCacheMiddleware,
  garageListCacheMiddleware,
  garageDetailCacheMiddleware,
  consumerPartRecommendationCacheMiddleware,
  invalidateCacheMiddleware,
  invalidateCache,
  setCache,
  getCache,
  cacheService,
};