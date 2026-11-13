/**
 * Query Optimizer & Connection Pool Configuration
 * 優化 Prisma 查詢效能與連線池設定
 */

// 延遲載入共用 Prisma 單例（src/lib/prisma.js）。
// 這個模組未被任何路由使用，但保留可作為查詢工具的預設 client；
// 關鍵是**不要再自行 new PrismaClient()** — 那會多一個獨立連線池。
let prismaInstance = null;

function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = require('../lib/prisma');
  }
  return prismaInstance;
}

/**
 * 查詢優化工具類
 */
class QueryOptimizer {
  constructor(prisma = null) {
    this.prisma = prisma || getPrismaClient();
  }

  /**
   * 批次查詢優化：使用 Promise.all 並行執行
   */
  async batchQueries(queries) {
    return Promise.all(queries.map(q => q()));
  }

  /**
   * 分頁查詢優化：使用 cursor-based pagination (大量資料時)
   * @param {Object} options
   * @param {Function} options.query - 查詢函數 (cursor, limit) => Promise<results>
   * @param {number} options.limit - 每頁筆數
   * @param {any} options.initialCursor - 初始游標
   * @param {Function} options.getCursor - 從結果取得下一個游標
   * @param {number} options.maxPages - 最大頁數
   */
  async *cursorPaginate({ query, limit = 50, initialCursor = null, getCursor, maxPages = 100 }) {
    let cursor = initialCursor;
    let page = 0;

    while (page < maxPages) {
      const results = await query(cursor, limit);
      if (!results.length) break;

      yield results;

      cursor = getCursor(results[results.length - 1]);
      if (!cursor) break;
      page++;
    }
  }

  /**
   * 關聯預載入優化：避免 N+1 查詢
   * 使用 Prisma 的 include/select 精確指定需要的欄位
   */
  buildInclude(relations, depth = 2) {
    const build = (rel, currentDepth) => {
      if (currentDepth >= depth) return true;
      if (typeof rel === 'string') return true;
      if (Array.isArray(rel)) {
        const obj = {};
        rel.forEach(r => {
          if (typeof r === 'string') obj[r] = true;
          else Object.assign(obj, build(r, currentDepth + 1));
        });
        return obj;
      }
      if (typeof rel === 'object') {
        const obj = {};
        Object.entries(rel).forEach(([key, value]) => {
          obj[key] = build(value, currentDepth + 1);
        });
        return obj;
      }
      return true;
    };
    return build(relations, 0);
  }

  /**
   * 批次插入/更新優化
   * 使用 createMany/updateMany 替代迴圈
   */
  async batchCreate(model, data, options = {}) {
    const { batchSize = 100, skipDuplicates = false } = options;
    const results = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const result = await this.prisma[model].createMany({
        data: batch,
        skipDuplicates,
      });
      results.push(result);
    }
    return results;
  }

  async batchUpdate(model, updates) {
    // Prisma 不直接支援 batch update，使用 transaction
    return this.prisma.$transaction(
      updates.map(u => this.prisma[model].update({
        where: u.where,
        data: u.data,
      }))
    );
  }

  /**
   * 原始 SQL 查詢優化 (複雜報表查詢)
   */
  async rawQuery(sql, params = []) {
    return this.prisma.$queryRawUnsafe(sql, ...params);
  }

  /**
   * 統計查詢優化：使用 aggregate 而非查全部再計算
   */
  async getStats(model, where = {}, aggregations = {}) {
    const defaultAggregations = {
      _count: true,
    };
    return this.prisma[model].aggregate({
      where,
      ...defaultAggregations,
      ...aggregations,
    });
  }

  /**
   * 存在性檢查優化：使用 findFirst 配合 select: { id: true }
   */
  async exists(model, where) {
    const result = await this.prisma[model].findFirst({
      where,
      select: { id: true },
    });
    return !!result;
  }

  /**
   * 計數優化：使用 count 而非 findMany.length
   */
  async count(model, where = {}) {
    return this.prisma[model].count({ where });
  }

  /**
   * 連線池健康檢查
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (err) {
      return { status: 'unhealthy', error: err.message, timestamp: new Date() };
    }
  }

  /**
   * 斷開連線
   */
  async disconnect() {
    await this.prisma.$disconnect();
    prismaInstance = null;
  }
}

/**
 * 連線池監控中介軟
 */
function poolMonitorMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    // 記錄慢查詢 (> 1 秒)
    if (duration > 1000) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  
  next();
}

/**
 * 查詢效能記錄器
 */
class QueryPerformanceLogger {
  constructor() {
    this.slowQueries = [];
    this.maxRecords = 1000;
  }

  log(query, duration, meta = {}) {
    if (duration > 100) { // 記錄 > 100ms 的查詢
      this.slowQueries.push({
        query: query.substring(0, 200),
        duration,
        timestamp: new Date(),
        ...meta,
      });
      
      // 保持最多 maxRecords 筆
      if (this.slowQueries.length > this.maxRecords) {
        this.slowQueries.shift();
      }
    }
  }

  getSlowQueries(limit = 50) {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getStats() {
    const durations = this.slowQueries.map(q => q.duration);
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
      max: Math.max(...durations) || 0,
      min: Math.min(...durations) || 0,
    };
  }

  clear() {
    this.slowQueries = [];
  }
}

const queryLogger = new QueryPerformanceLogger();

module.exports = {
  getPrismaClient,
  QueryOptimizer,
  QueryOptimizer: new QueryOptimizer(),
  poolMonitorMiddleware,
  queryLogger,
  queryPerformanceLogger: queryLogger,
};