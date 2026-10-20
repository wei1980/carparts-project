// src/services/logger.js
// 集中式日誌聚合 - 支援 Loki、ELK、Console

const { createLogger, format, transports } = require('winston');
const LokiTransport = require('winston-loki');
// const ElasticsearchTransport = require('winston-elasticsearch'); // 可選依賴

const { combine, timestamp, printf, colorize, json, errors } = format;

// 自訂格式
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(meta).length > 0 && meta.service) {
    msg += ` | ${JSON.stringify(meta)}`;
  }
  if (stack) msg += `\n${stack}`;
  return msg;
});

const jsonFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json()
);

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  logFormat
);

// 建立 logger
function createAppLogger(serviceName = 'carparts-api') {
  const loggerTransports = [
    new transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info'
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    new transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10
    })
  ];

  // Loki 整合 (Grafana Loki)
  if (process.env.LOKI_URL) {
    loggerTransports.push(new LokiTransport({
      host: process.env.LOKI_URL,
      labels: { service: serviceName, env: process.env.NODE_ENV || 'development' },
      json: true,
      format: jsonFormat,
      replaceTimestamp: true,
      onConnectionError: (err) => console.error('Loki connection error:', err.message)
    }));
    console.log('✅ Loki 日誌聚合已啟用');
  }

  // Elasticsearch 整合 (ELK Stack) - 可選
  if (process.env.ELASTICSEARCH_URL) {
    try {
      const ElasticsearchTransport = require('winston-elasticsearch');
      loggerTransports.push(new ElasticsearchTransport({
        level: 'info',
        clientOpts: {
          node: process.env.ELASTICSEARCH_URL,
          auth: process.env.ELASTICSEARCH_AUTH ? {
            username: process.env.ELASTICSEARCH_USER || 'elastic',
            password: process.env.ELASTICSEARCH_AUTH
          } : undefined
        },
        indexPrefix: `carparts-${serviceName}`,
        format: jsonFormat,
        flushInterval: 5000
      }));
      console.log('✅ Elasticsearch 日誌聚合已啟用');
    } catch (e) {
      console.warn('⚠️ winston-elasticsearch 未安裝，跳過 Elasticsearch 整合');
    }
  }

  const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    transports: loggerTransports,
    exitOnError: false
  });

  // 攔獲未處理的錯誤
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason: reason?.message || reason, stack: reason?.stack });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
    // 給日誌寫入時間
    setTimeout(() => process.exit(1), 1000);
  });

  return logger;
}

// 建立預設 logger
const logger = createAppLogger();

// 封裝常用方法
module.exports = {
  logger,
  createAppLogger,
  
  // 結構化日誌方法
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  http: (message, meta = {}) => logger.http(message, meta),
  
  // 請求日誌中間件
  requestLogger: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.userId || null,
        workshopId: req.workshopId || null
      };
      
      if (res.statusCode >= 500) {
        logger.error('HTTP Request', logData);
      } else if (res.statusCode >= 400) {
        logger.warn('HTTP Request', logData);
      } else {
        logger.http('HTTP Request', logData);
      }
    });
    next();
  },
  
  // 業務事件日誌
  logBusinessEvent: (event, data = {}) => {
    logger.info(`BUSINESS: ${event}`, { event, ...data, timestamp: new Date().toISOString() });
  },
  
  // 效能日誌
  logPerformance: (operation, durationMs, meta = {}) => {
    logger.info(`PERFORMANCE: ${operation}`, { 
      operation, 
      durationMs, 
      ...meta,
      timestamp: new Date().toISOString() 
    });
  },
  
  // 資料庫查詢日誌
  logQuery: (query, params, durationMs) => {
    if (process.env.LOG_QUERIES === 'true') {
      logger.debug('DB Query', { 
        query: query.substring(0, 500), 
        params: JSON.stringify(params).substring(0, 500),
        durationMs 
      });
    }
  }
};