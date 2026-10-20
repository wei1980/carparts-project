// Conditional write prevents a stale submission from reviving a cancelled/paid order.
// 分次匯款：DEPOSIT_PAID / AWAITING_BALANCE 狀態下客戶可繼續補登匯款（金額累加），
// 且不得回退狀態（訂金已確認後 status 維持原狀，由後台對帳推進）。
async function saveBankSubmission(prismaClient, params) {
  const { orderId, userId, isPreorder, bankDepositDate, bankLastFiveDigits, actualAmount } = params;

  const allowed = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE'];
  const current = await prismaClient.consumerOrder.findUnique({ where: { id: orderId } });
  if (!current || (userId && current.userId !== userId) || !allowed.includes(current.status)) {
    throw Object.assign(new Error('訂單狀態已變更，請重新整理後再試'), { code: 'ORDER_STATE_CHANGED' });
  }

  // 狀態推進規則：未確認付款的訂單才會改變狀態；DEPOSIT_PAID / AWAITING_BALANCE 維持原狀
  let nextStatus;
  if (current.status === 'PENDING_PAYMENT' || current.status === 'PAYMENT_REVIEW') {
    nextStatus = isPreorder ? 'DEPOSIT_PAID' : 'PAYMENT_REVIEW';
  }

  const result = await prismaClient.consumerOrder.updateMany({
    where: {
      id: orderId, userId,
      status: { in: allowed },
    },
    data: {
      bankDepositDate: new Date(bankDepositDate),
      bankLastFiveDigits: String(bankLastFiveDigits),
      payment_last_5_digits: String(bankLastFiveDigits),
      // 分次匯款：每次提交的金額「累加」到已匯總額（而非覆寫）
      bankDepositActualAmount: actualAmount ? { increment: Number(actualAmount) } : undefined,
      ...(nextStatus ? { status: nextStatus } : {}),
    },
  });
  if (result.count !== 1) {
    throw Object.assign(new Error('訂單狀態已變更，請重新整理後再試'), { code: 'ORDER_STATE_CHANGED' });
  }
  return prismaClient.consumerOrder.findUnique({
    where: { id: orderId },
    include: { user: { select: { lineId: true } } },
  });
}
module.exports = { saveBankSubmission };
