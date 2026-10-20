// src/services/bankClaim.js
const { createHash } = require('node:crypto');
const fail = (code, message) => Object.assign(new Error(message), { code });

// No bank reference is available. This conservative fingerprint may collapse two
// identical transfers; do not auto-confirm them or use Excel row numbers as identity.
function fingerprintTransaction(transfer) {
  const date = String(transfer.date || '').trim().replaceAll('/', '-');
  const amount = Number(transfer.amount);
  const memo = String(transfer.memo || '').normalize('NFKC').replace(/\s/g, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount) || amount <= 0 || !memo) {
    throw fail('INVALID_BANK_TRANSFER', '交易日期須為 YYYY-MM-DD，且需正金額與銀行備註');
  }
  return createHash('sha256').update(JSON.stringify([date, amount.toFixed(2), memo])).digest('hex');
}

async function claimBankPayment(prisma, { orderId, stage, transfer, transfers, actorId, advance }) {
  if (!['deposit', 'balance', 'full'].includes(stage)) throw fail('INVALID_PAYMENT_STAGE', '無效的收款階段');
  // 分次匯款：transfers 為多筆交易陣列（合計須等於應收金額）；單筆走原本 transfer 參數
  const list = Array.isArray(transfers) && transfers.length > 0 ? transfers : [transfer];
  const prints = list.map(transfer => ({ transfer, fingerprint: fingerprintTransaction(transfer) }));

  try {
    return await prisma.$transaction(async tx => {
      const order = await tx.consumerOrder.findUnique({ where: { id: orderId } });
      if (!order) throw fail('ORDER_NOT_FOUND', '訂單不存在');
      const preorder = ['PREORDER', 'MIXED'].includes(order.orderType);

      // 🆕 關鍵修復：查詢該訂單已經認列過的金額，避免重複全額校驗
      const previousClaims = await tx.bankRemittanceClaim.findMany({
        where: { orderId },
        select: { amount: true }
      });
      const alreadyClaimed = previousClaims.reduce((s, c) => s + Number(c.amount), 0);

      // 🆕 客戶補登的實際匯款累計：分次匯款時以此為比對目標
      const declared = Number(order.bankDepositActualAmount || 0);
      const fullyRemitted = declared > 0 && declared >= Number(order.total_amount);
      
      if ((preorder && stage === 'full' && !fullyRemitted) || (!preorder && stage !== 'full') || (stage === 'balance' && !order.depositPaidAt)) {
        throw fail('INVALID_PAYMENT_STAGE', '訂單類型或訂金狀態不允許此收款階段');
      }

      const stageExpected = Number(stage === 'full' ? order.total_amount : stage === 'deposit' ? order.depositAmount : order.balanceAmount);
      
      // 🆕 計算本次應收金額：優先使用客戶申報總額，其次使用階段金額，並扣除已認列金額
      let target = declared > 0 ? declared : stageExpected;
      if (alreadyClaimed > 0) {
        target = Math.max(0, target - alreadyClaimed);
      }

      const total = prints.reduce((s, p) => s + Number(p.transfer.amount), 0);
      
      // 如果已經全額認列完畢，或者傳入的金額與剩餘應收不符，則拋出錯誤
      if (!(target > 0) || total !== target) {
        throw fail('BANK_AMOUNT_MISMATCH', `交易金額合計 NT$ ${total.toLocaleString()} 與應收 NT$ ${target.toLocaleString()} 不符`);
      }

      // 每筆交易各自認列（分次匯款：同一訂單同一階段可有多筆 claim）
      for (const p of prints) {
        await tx.bankRemittanceClaim.create({
          data: { 
            fingerprint: p.fingerprint, 
            orderId, 
            stage, 
            amount: Number(p.transfer.amount), 
            transactionDate: String(p.transfer.date), 
            last5: p.transfer.last5 || null, 
            actorId: String(actorId || 'admin') 
          },
        });
      }

      const updated = await advance(order, stage, tx);
      await tx.consumerOrder.updateMany({ where: { id: orderId }, data: { bankRemitterName: list[0].remitter || null } });
      return updated;
    });
  } catch (error) {
    if (error.code === 'P2002') throw fail('BANK_TRANSFER_CLAIMED', '此匯款或訂單收款階段已認列，請勿重複確認');
    throw error;
  }
}

module.exports = { fingerprintTransaction, claimBankPayment };