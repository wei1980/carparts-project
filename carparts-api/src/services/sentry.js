// src/services/sentry.js
// Sentry 錯誤追蹤與效能監控整合 (Sentry v10+)

const Sentry = require('@sentry/node');

let isInitialized = false;

function initSentry(app) {
  if (isInitialized) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('⚠️ SENTRY_DSN 未設定，跳過 Sentry 初始化');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      Sentry.expressIntegration({ app }),
      Sentry.profilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    debug: process.env.NODE_ENV === 'development',
    beforeSend(event, hint) {
      // 過濾敏感資料
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers?.authorization) delete event.request.headers.authorization;
      if (event.user?.ip_address) delete event.user.ip_address;
      return event;
    },
    beforeSendTransaction(event) {
      // 過濾健康檢查等雜訊交易
      if (event.transaction?.includes('/health')) return null;
      return event;
    }
  });

  isInitialized = true;
  console.log('✅ Sentry 初始化完成');
}

function trackError(error, context = {}) {
  if (!isInitialized) return;
  
  if (context.user) Sentry.setUser(context.user);
  if (context.breadcrumbs) {
    context.breadcrumbs.forEach(b => Sentry.addBreadcrumb(b));
  }
  if (context.extra) {
    Object.entries(context.extra).forEach(([key, value]) => {
      Sentry.setContext(key, value);
    });
  }
  
  Sentry.captureException(error);
}

function trackMessage(message, level = 'info', context = {}) {
  if (!isInitialized) return;
  
  if (context.user) Sentry.setUser(context.user);
  Sentry.captureMessage(message, level);
}

function startPerformanceSpan(name, op = 'function', context = {}) {
  if (!isInitialized) return null;
  
  const transaction = Sentry.startTransaction({
    name,
    op,
    ...context
  });
  
  return transaction;
}

function trackCustomMetric(name, value, tags = {}) {
  if (!isInitialized) return;
  Sentry.addBreadcrumb({
    category: 'metric',
    message: `${name}: ${value}`,
    level: 'info',
    data: tags
  });
}

module.exports = {
  initSentry,
  trackError,
  trackMessage,
  startPerformanceSpan,
  trackCustomMetric
};