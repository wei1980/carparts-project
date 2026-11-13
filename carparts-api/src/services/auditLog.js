// src/services/auditLog.js
// 高風險操作的審計紀錄（append-only）。寫入失敗不得阻斷原操作：記錄錯誤後放行。
const logger = require('./logger').logger;

/**
 * 記錄一筆審計事件
 * @param {PrismaClient} prisma
 * @param {Object} entry
 * @param {string} entry.action - 例如 MANUAL_PAYMENT_CONFIRM / INVENTORY_ADJUST
 * @param {string} entry.entityType - 例如 ConsumerOrder / Part
 * @param {string|number} entry.entityId
 * @param {Object} [entry.before] - 操作前關鍵欄位
 * @param {Object} [entry.after] - 操作後關鍵欄位
 * @param {Object} [entry.detail] - 補充資訊（交易指紋、備註等）
 * @param {Object} [req] - Express request（取 actor、requestId、ip）
 * @param {string} [actorType='ADMIN']
 */
async function recordAudit(prisma, entry, req = null, actorType = 'ADMIN') {
  try {
    await prisma.auditLog.create({
      data: {
        // AuditLog.id 沒有 @default，必須由呼叫端提供；
        // 先前所有 recordAudit 呼叫都因缺 id 而靜默失敗（只寫進 AUDIT_WRITE_FAILURE log）。
        id: require('crypto').randomUUID(),
        action: entry.action,
        entityType: entry.entityType,
        entityId: String(entry.entityId),
        actorId: req?.admin?.id || req?.user?.id || req?.workshopId ? String(req.admin?.id || req.user?.id || req.workshopId) : null,
        actorType,
        before: entry.before ?? undefined,
        after: entry.after ?? undefined,
        detail: entry.detail ?? undefined,
        requestId: req?.requestId || req?.headers?.['x-request-id'] || null,
        ip: req?.ip || null,
      },
    });
  } catch (error) {
    // 審計失敗需醒目標記，但不影響業務操作
    console.error(`🚨 [AUDIT_WRITE_FAILURE] action=${entry.action} entity=${entry.entityType}:${entry.entityId} error=${error.message}`);
    if (logger && logger.error) logger.error('audit write failure', { error: error.message });
  }
}

module.exports = { recordAudit };
