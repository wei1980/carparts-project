// src/services/accountDeletion.js — 帳號刪除 / 匿名化
//
// 隱私權政策承諾「可請求刪除個人資料」，但平台先前沒有任何 API 可以履行。
//
// 為什麼不是一律硬刪：
//   ConsumerOrder 等交易紀錄綁著金流、對帳與稅務，法律與會計上必須保留，
//   不能因為使用者要求刪帳號就消失。因此採兩軌：
//   1) 有交易紀錄 → 匿名化（anonymize）：個資欄位清空、帳號停用、保留訂單數字。
//   2) 完全沒有交易紀錄 → 硬刪（hard delete）：連同車輛、提醒、工單一起移除。
//
// 兩種情況都會寫入 AuditLog，留下「誰在何時要求刪除」的軌跡。
const prisma = require('../lib/prisma');
const { recordAudit } = require('./auditLog');

// 需要保留的交易表（有金流/對帳意義，只能匿名化）
async function hasFinancialRecords(userId) {
  const [orders, records] = await Promise.all([
    prisma.consumerOrder.count({ where: { userId } }),
    prisma.serviceRecord.count({ where: { user_id: userId } }),
  ]);
  return orders > 0 || records > 0;
}

// 硬刪：依 FK 依序清掉，最後刪 EndUser
async function hardDelete(userId) {
  const orderIds = (await prisma.consumerOrder.findMany({
    where: { userId },
    select: { id: true },
  })).map((o) => o.id);

  if (orderIds.length > 0) {
    await prisma.consumerOrderItem.deleteMany({ where: { order_id: { in: orderIds } } });
    await prisma.consumerOrder.deleteMany({ where: { id: { in: orderIds } } });
  }
  await prisma.appointment.deleteMany({ where: { user_id: userId } });
  await prisma.serviceRecord.deleteMany({ where: { user_id: userId } });
  await prisma.maintenanceReminder.deleteMany({ where: { user_id: userId } });
  await prisma.wishItem.deleteMany({ where: { userId } });
  await prisma.aiPartDraft.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.partImageRecognitionLog.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.vehicleProfile.deleteMany({ where: { userId } });
  await prisma.endUser.delete({ where: { id: userId } });
}

// 匿名化：保留交易數字，清除所有可辨識個資
async function anonymize(userId) {
  const crypto = require('crypto');
  const tombstonePhone = `deleted-${crypto.randomBytes(6).toString('hex')}@invalid.local`;
  const randomHash = `deleted:${crypto.randomBytes(16).toString('hex')}`;

  await prisma.endUser.update({
    where: { id: userId },
    data: {
      name: null,
      phone: tombstonePhone,
      email: null,
      address: null,
      lineId: null,
      avatar_url: null,
      passwordHash: randomHash, // 無法再登入（bcrypt 無法比對成功）
      resetCodeHash: null,
      resetCodeExpires: null,
      currentVehicleId: null,
      is_active: false,
      is_approved: false,
    },
  });

  await prisma.vehicleProfile.deleteMany({ where: { userId } });
  await prisma.wishItem.deleteMany({ where: { userId } });
  await prisma.maintenanceReminder.deleteMany({ where: { user_id: userId } });
  await prisma.appointment.deleteMany({ where: { user_id: userId } });
}

/**
 * 刪除（或匿名化）指定帳號。
 * @returns {Promise<{mode:'deleted'|'anonymized', retainedOrders:number}>}
 */
async function deleteAccount({ userId, actorId = null, actorType = 'USER', requestId = null, ip = null }) {
  const user = await prisma.endUser.findUnique({
    where: { id: userId },
    select: { id: true, phone: true },
  });
  if (!user) return { mode: 'not_found', retainedOrders: 0 };

  const keep = await hasFinancialRecords(userId);

  if (keep) {
    await anonymize(userId);
  } else {
    await hardDelete(userId);
  }

  const retainedOrders = keep
    ? await prisma.consumerOrder.count({ where: { userId } })
    : 0;

  await recordAudit(prisma, {
    action: keep ? 'ACCOUNT_ANONYMIZE' : 'ACCOUNT_DELETE',
    entityType: 'EndUser',
    entityId: userId,
    detail: { mode: keep ? 'anonymized' : 'deleted', retainedOrders },
  }, {
    admin: actorId ? { id: actorId } : null,
    requestId,
    headers: {},
    ip,
  }, actorType);

  return { mode: keep ? 'anonymized' : 'deleted', retainedOrders };
}

module.exports = { deleteAccount, hasFinancialRecords, hardDelete, anonymize };