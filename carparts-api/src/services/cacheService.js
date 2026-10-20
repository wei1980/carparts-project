/**
 * Cache Service with Fallback
 * 使用 Redis 作為主要快取，記憶體 Map 作為備用
 */
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map(); // 記憶體備用
    this.isRedisConnected = false;
    this.defaultTTL = 300; // 5分鐘預設
    this.prefix = 'carparts:';
    this.useFallback = false;
  }

  /**
   * 初始化 Redis 連線
   */
  async connect() {
    if (this.redisClient) return this.redisClient;

    // 硬編碼 WSL Redis IP，避免 dotenv 載入順序問題
    const redisUrl = 'redis://172.31.120.62:6379';
    
    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // 停止重試
        return Math.min(times * 200, 2000);
      },
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000, // 5秒連線超時
    });

    this.redisClient.on('connect', () => {
      this.isRedisConnected = true;
      this.useFallback = false;
      console.log('✅ Redis connected');
    });

    this.redisClient.on('error', (err) => {
      this.isRedisConnected = false;
      console.error('❌ Redis error:', err.message);
    });

    this.redisClient.on('close', () => {
      this.isRedisConnected = false;
      console.log('⚠️ Redis connection closed, using memory fallback');
    });

    // 嘗試連線，有超時限制
    try {
      await Promise.race([
        this.redisClient.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
      ]);
    } catch (err) {
      console.warn('⚠️ Redis connection failed, using memory fallback:', err.message);
      this.useFallback = true;
    }

    return this;
  }

  /**
   * 獲取可用的儲存介面
   */
  _getStore() {
    if (this.useFallback || !this.isRedisConnected) {
      return 'memory';
    }
    return 'redis';
  }

  // ========== 基礎操作 ==========

  async set(key, value, ttl = this.defaultTTL) {
    const prefixedKey = this.prefix + key;
    const serialized = JSON.stringify(value);
    const store = this._getStore();

    try {
      if (store === 'redis') {
        const client = this.redisClient;
        if (ttl > 0) {
          await client.setex(prefixedKey, ttl, serialized);
        } else {
          await client.set(prefixedKey, serialized);
        }
      } else {
        // 記憶體快取
        this.memoryCache.set(prefixedKey, {
          value: serialized,
          expiry: ttl > 0 ? Date.now() + ttl * 1000 : null
        });
      }
      return true;
    } catch (err) {
      console.warn('Cache set failed, falling back to memory:', err.message);
      this.useFallback = true;
      return this.set(key, value, ttl); // 重試記憶體
    }
  }

  async get(key) {
    const prefixedKey = this.prefix + key;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        const client = this.redisClient;
        const data = await client.get(prefixedKey);
        if (!data) return null;
        try { return JSON.parse(data); } catch { return data; }
      } else {
        // 記憶體快取
        const entry = this.memoryCache.get(prefixedKey);
        if (!entry) return null;
        if (entry.expiry && Date.now() > entry.expiry) {
          this.memoryCache.delete(prefixedKey);
          return null;
        }
        try { return JSON.parse(entry.value); } catch { return entry.value; }
      }
    } catch (err) {
      console.warn('Cache get failed, falling back to memory:', err.message);
      this.useFallback = true;
      return this.get(key);
    }
  }

  async del(key) {
    const prefixedKey = this.prefix + key;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        await this.redisClient.del(prefixedKey);
      } else {
        this.memoryCache.delete(prefixedKey);
      }
    } catch (err) {
      console.warn('Cache del failed:', err.message);
    }
  }

  async delPattern(pattern) {
    const prefixedPattern = this.prefix + pattern;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        const client = this.redisClient;
        const keys = await client.keys(prefixedPattern);
        if (keys.length > 0) {
          await client.del(...keys);
        }
        return keys.length;
      } else {
        let count = 0;
        const regex = new RegExp('^' + prefixedPattern.replace(/\*/g, '.*') + '$');
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            count++;
          }
        }
        return count;
      }
    } catch (err) {
      console.warn('Cache delPattern failed:', err.message);
      return 0;
    }
  }

  async exists(key) {
    const prefixedKey = this.prefix + key;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        return await this.redisClient.exists(prefixedKey);
      } else {
        const entry = this.memoryCache.get(prefixedKey);
        return entry ? 1 : 0;
      }
    } catch {
      return 0;
    }
  }

  async expire(key, ttl) {
    const prefixedKey = this.prefix + key;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        return await this.redisClient.expire(prefixedKey, ttl);
      } else {
        const entry = this.memoryCache.get(prefixedKey);
        if (entry) {
          entry.expiry = Date.now() + ttl * 1000;
          return 1;
        }
        return 0;
      }
    } catch {
      return 0;
    }
  }

  // ========== Hash 操作 ==========

  async hset(key, field, value, ttl = this.defaultTTL) {
    const prefixedKey = this.prefix + key;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        await this.redisClient.hset(prefixedKey, field, JSON.stringify(value));
        if (ttl > 0) await this.redisClient.expire(prefixedKey, ttl);
      } else {
        if (!this.memoryCache.has(prefixedKey)) {
          this.memoryCache.set(prefixedKey, { value: {}, expiry: ttl > 0 ? Date.now() + ttl * 1000 : null });
        }
        const entry = this.memoryCache.get(prefixedKey);
        entry.value[field] = JSON.stringify(value);
      }
    } catch (err) {
      console.warn('Cache hset failed:', err.message);
    }
  }

  async hget(key, field) {
    const prefixedKey = this.prefix + key;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        const data = await this.redisClient.hget(prefixedKey, field);
        if (!data) return null;
        try { return JSON.parse(data); } catch { return data; }
      } else {
        const entry = this.memoryCache.get(prefixedKey);
        if (!entry || !entry.value[field]) return null;
        try { return JSON.parse(entry.value[field]); } catch { return entry.value[field]; }
      }
    } catch {
      return null;
    }
  }

  async hgetall(key) {
    const prefixedKey = this.prefix + key;
    const store = this._getStore();

    try {
      if (store === 'redis') {
        const data = await this.redisClient.hgetall(prefixedKey);
        const result = {};
        for (const [k, v] of Object.entries(data)) {
          try { result[k] = JSON.parse(v); } catch { result[k] = v; }
        }
        return result;
      } else {
        const entry = this.memoryCache.get(prefixedKey);
        if (!entry) return {};
        const result = {};
        for (const [k, v] of Object.entries(entry.value)) {
          try { result[k] = JSON.parse(v); } catch { result[k] = v; }
        }
        return result;
      }
    } catch {
      return {};
    }
  }

  // ========== 快取策略封裝 ==========

  async getOrSet(key, fetcher, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  }

  async invalidateByTags(tags) {
    if (!Array.isArray(tags)) tags = [tags];
    let total = 0;
    for (const tag of tags) {
      total += await this.delPattern(`tag:${tag}:*`);
      total += await this.delPattern(`*:tag:${tag}`);
    }
    return total;
  }

  async disconnect() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
      this.isRedisConnected = false;
    }
    this.memoryCache.clear();
  }

  // ========== 健康檢查 ==========
  async healthCheck() {
    try {
      if (this.useFallback) return { status: 'fallback', redis: false, memory: this.memoryCache.size };
      const client = this.redisClient;
      const result = await client.ping();
      return { status: 'ok', redis: result === 'PONG', memory: this.memoryCache.size };
    } catch {
      return { status: 'fallback', redis: false, memory: this.memoryCache.size };
    }
  }

  // 清理過期記憶體快取
  _cleanupMemory() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// 定期清理記憶體快取 (每 5 分鐘) - 僅在非測試環境啟動
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    if (global.cacheService) {
      global.cacheService._cleanupMemory();
    }
  }, 5 * 60 * 1000);
}

// Singleton instance
const cacheService = new CacheService();
global.cacheService = cacheService;

module.exports = cacheService;