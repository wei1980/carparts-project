/**
 * 取消訂單服務 — 單一交易內完成狀態轉換 + 庫存回補 + 銷量對稱 + InventoryLog
 * 契約（見 tests/orderCancellation.test.js）：
 * 1. 只有 PENDING_PAYMENT 可取消；其他狀態拋 ORDER_NOT_CANCELLABLE
 * 2. 只回補實際扣過庫存的品項（非代購、非進口單），寫 CONSUMER_ORDER_CANCEL log
 * 3. sales_count 只對實際扣庫存品項遞減（與 decrementStock 的 increment 對稱）
 * 4. 併發安全：狀態轉換用條件式 updateMany（count===1 才繼續），搶輸拋 ORDER_ALREADY_CANCELLED
 * 5. 訂單不存在或非本人 → ORDER_NOT_FOUND
 *
 * @param {Object} tx - Prisma transaction client（或 prisma 本體）
 * @param {{id: number, userId: string}} target
 * @returns {Promise<{cancelled: boolean, orderId: number}>}
 */
async function cancelConsumerOrder(tx, { id, userId }) {
  const order = await tx.consumerOrder.findFirst({
    where: { id: Number(id), userId: String(userId) },
    select: { id: true, status: true, is_import_order: true, order_number: true, depositPaidAt: true },
  });

  if (!order) {
    throw Object.assign(new Error('訂單不存在'), { code: 'ORDER_NOT_FOUND' });
  }
  // 🆕 可取消狀態：PENDING_PAYMENT, PAYMENT_REVIEW, DEPOSIT_PAID（未入款確認）
  const canCancel = order.status === 'PENDING_PAYMENT' ||
    order.status === 'PAYMENT_REVIEW' ||
    (order.status === 'DEPOSIT_PAID' && !order.depositPaidAt);
  if (!canCancel) {
    throw Object.assign(new Error('此狀態的訂單無法取消'), { code: 'ORDER_NOT_CANCELLABLE' });
  }

  // 🆕 條件式狀態轉換：併發下只有一個請求能成功 — 使用當前狀態 + depositPaidAt 保證
  const transition = await tx.consumerOrder.updateMany({
    where: {
      id: order.id,
      status: order.status,
      ...(order.status === 'DEPOSIT_PAID' ? { depositPaidAt: null } : {}),
    },
    data: { status: 'CANCELLED' },
  });
  if (transition.count !== 1) {
    throw Object.assign(new Error('訂單已被取消'), { code: 'ORDER_ALREADY_CANCELLED' });
  }

  const items = await tx.consumerOrderItem.findMany({
    where: { order_id: order.id },
    select: { part_id: true, qty: true, is_preorder: true },
  });

  // 只回補實際扣過庫存的品項：非代購、非進口單
  if (!order.is_import_order) {
    for (const item of items) {
      if (item.is_preorder) continue;
      const updated = await tx.part.update({
        where: { id: item.part_id },
        data: { stock_qty: { increment: item.qty }, sales_count: { decrement: item.qty } },
        select: { stock_qty: true },
      });
      await tx.inventoryLog.create({
        data: {
          part_id: item.part_id,
          qty_change: item.qty,
          qty_after: updated.stock_qty,
          type: 'CONSUMER_ORDER_CANCEL',
          note: `order:${order.order_number} cancel`,
        },
      });
    }
  }

  return { cancelled: true, orderId: order.id };
}

module.exports = { cancelConsumerOrder };
