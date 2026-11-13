// src/routes/adminBank.js — 管理端銀行對帳（汽車零件保養 O2O 金流模組）
// 流程：客戶匯款 → 補登後五碼/金額 → 管理員上傳銀行 Excel → 自動比對 → 確認/人工審核
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
// 🔒 Excel 讀取統一走 bankExcelService（exceljs，已移除有 CVE 的 xlsx 套件）
const { readBankExcel, EXCEL_PATH } = require('../services/bankExcelService');
const { recordAudit } = require('../services/auditLog');
// 訂單管理工作簿：入帳在 C（公司）與 W（個人）工作表；帳號工作表含密碼，永遠排除。
const WORKBOOK_PATH = process.env.BANK_EXCEL_PATH || 'C:/carparts/訂單管理.xlsm';

const { fingerprintTransaction, claimBankPayment } = require('../services/bankClaim');
const prisma = require('../lib/prisma');
const { notifyOrderUpdate } = require('../services/lineService');
router.use(adminAuth);

// ===== 金流狀態推進 =====
// 現貨：PAYMENT_REVIEW → PAID
// 代購：DEPOSIT_PAID →（到貨後）AWAITING_BALANCE →（尾款確認）PAID
// 條件式轉換：只在訂單仍處於預期來源狀態時更新，防止併發／重複認列覆寫。
const STAGE_FROM_STATUS = {
  deposit: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID'],
  balance: ['DEPOSIT_PAID', 'AWAITING_BALANCE'],
  // 分次匯款：代購訂單在 DEPOSIT_PAID / AWAITING_BALANCE 時客戶可能已匯滿全額，需可從這些狀態推進為 PAID
  full: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE'],
};

async function advanceStatus(order, stage, prismaClient = prisma) {
  const isPreorder = order.orderType === 'PREORDER' || order.orderType === 'MIXED';
  const data = {};

  if (stage === 'deposit') {
    data.depositPaidAt = new Date();
    // 訂金確認：代購保持 DEPOSIT_PAID（已確認）；現貨直接 PAID
    data.status = isPreorder ? 'DEPOSIT_PAID' : 'PAID';
  } else if (stage === 'balance') {
    data.balancePaidAt = new Date();
    data.status = 'PAID';
  } else if (stage === 'full') {
    data.depositPaidAt = new Date();
    data.status = 'PAID';
  }
  const result = await prismaClient.consumerOrder.updateMany({
    where: {
      id: order.id, status: { in: STAGE_FROM_STATUS[stage] },
      // Submitted deposits keep DEPOSIT_PAID after confirmation; guard the timestamp atomically.
      ...(stage === 'deposit' ? { depositPaidAt: null } : {}),
    },
    data,
  });
  if (result.count !== 1) {
    throw Object.assign(new Error(`訂單 ${order.id} 狀態已變動，${stage} 認列未執行`), { code: 'STATUS_TRANSITION_RACE' });
  }
  return prismaClient.consumerOrder.findUnique({ where: { id: order.id } });
}

/**
 * 判定對帳階段。尾款（balance）一律回人工審核：
 * 訂金與尾款金額可能相等（50% 代購單），同一筆匯款會被重複認列，必須人工比對。
 * @returns {{stage: 'deposit'|'full'|'balance', autoConfirm: boolean}}
 */
function decideStage(order) {
  const isPreorder = order.orderType === 'PREORDER' || order.orderType === 'MIXED';
  const alreadyDepositPaid = !!order.depositPaidAt;
  if (isPreorder && alreadyDepositPaid) return { stage: 'balance', autoConfirm: false };
  if (isPreorder) return { stage: 'deposit', autoConfirm: false };
  return { stage: 'full', autoConfirm: false };
}

// ============================================================
// POST /api/admin/bank/import-excel — 匯入銀行 Excel 到資料庫
// ============================================================
router.post(['/bank/import-excel', '/import-excel'], async (req, res) => {
  try {
    const transactions = await readBankExcel(WORKBOOK_PATH);
    const claims = await prisma.bankRemittanceClaim.findMany({ select: { fingerprint: true } });
    const claimed = new Set(claims.map(c => c.fingerprint));
    const counts = new Map();
    for (const t of transactions) {
      try { const fp = fingerprintTransaction(t); if (fp) counts.set(fp, (counts.get(fp) || 0) + 1); } catch { }
    }
    const enriched = transactions.map(t => ({
      date: t.date || null,
      amount: t.amount,
      memo: t.memo || null,
      remitter: t.remitter || null,
      row: t.row,
      fingerprint: (() => { try { return fingerprintTransaction(t); } catch { return null; } })(),
    }));
    await prisma.bankTransaction.deleteMany({});
    await prisma.bankTransaction.createMany({ data: enriched, skipDuplicates: true });
    res.json({ message: `已匯入 ${enriched.length} 筆銀行交易到資料庫`, count: enriched.length });
  } catch (error) {
    console.error('Bank import error:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// GET /api/admin/bank/transactions — 讀取銀行交易（DB 優先，Excel 備援）
// ============================================================
router.get(['/bank/transactions', '/transactions'], async (req, res) => {
  try {
    let transactions;
    const dbCount = await prisma.bankTransaction.count();
    if (dbCount > 0) {
      transactions = (await prisma.bankTransaction.findMany({ orderBy: { row: 'asc' } }))
        .map(t => ({ date: t.date, amount: t.amount, memo: t.memo, remitter: t.remitter, row: t.row }));
    } else {
      transactions = await readBankExcel(WORKBOOK_PATH);
    }

    // 附帶比對資訊：哪些訂單正在等錢
    const pendingOrders = await prisma.consumerOrder.findMany({
      where: { status: { in: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE'] } },
      select: {
        id: true, order_number: true, status: true, total_amount: true,
        depositAmount: true, balanceAmount: true, bankLastFiveDigits: true, bankDepositActualAmount: true, bankDepositDate: true, orderType: true,
        depositPaidAt: true,
        payment_method: true, cod_fee: true,
        receiver_name: true, receiver_phone: true, shipping_address: true,
        user: { select: { name: true, phone: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // 🆕 每筆訂單的匯款明細（後台已認列的銀行交易）
    const claimRows = await prisma.bankRemittanceClaim.findMany({
      where: { orderId: { in: pendingOrders.map(o => o.id) } },
      orderBy: { createdAt: 'asc' },
    });
    const claimsByOrder = new Map();
    for (const c of claimRows) {
      if (!claimsByOrder.has(c.orderId)) claimsByOrder.set(c.orderId, []);
      claimsByOrder.get(c.orderId).push({ amount: Number(c.amount), transactionDate: c.transactionDate, last5: c.last5, stage: c.stage, actorId: c.actorId });
    }
    const pendingOrdersWithClaims = pendingOrders.map(o => ({ ...o, remittance_claims: claimsByOrder.get(o.id) || [] }));

    const claims = await prisma.bankRemittanceClaim.findMany({ select: { fingerprint: true } });
    const claimed = new Set(claims.map(c => c.fingerprint));
    const enriched = transactions.map(t => {
      try { return { ...t, fingerprint: fingerprintTransaction(t) }; } catch { return { ...t, fingerprint: null }; }
    });
    const counts = new Map();
    for (const t of enriched) counts.set(t.fingerprint, (counts.get(t.fingerprint) || 0) + 1);
    res.json({ excel_path: WORKBOOK_PATH, transactions: enriched.map(t => ({ ...t, claimed: claimed.has(t.fingerprint), ambiguous: counts.get(t.fingerprint) > 1 })), pending_orders: pendingOrdersWithClaims });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// POST /api/admin/bank/reconcile — 核心自動比對
// 比對條件：訂單後五碼 === Excel 註記中的後五碼，且金額完全相等（誤差 0）
// 🆕 runReconcile 抽成函式：客戶送出匯款資料時也會自動觸發
// ============================================================
const runReconcile = async () => {
  try {
    let transactions;
    const dbCount = await prisma.bankTransaction.count();
    if (dbCount > 0) {
      transactions = (await prisma.bankTransaction.findMany({ orderBy: { row: 'asc' } }))
        .map(t => ({ date: t.date, amount: t.amount, memo: t.memo, remitter: t.remitter, row: t.row }));
    } else {
      transactions = await readBankExcel(WORKBOOK_PATH);
    }

    // 等錢的訂單（已補登後五碼者）
    const pendingOrders = await prisma.consumerOrder.findMany({
      where: {
        status: { in: ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE'] },
        bankLastFiveDigits: { not: null },
      },
      include: { user: { select: { name: true, phone: true } } },
    });

    const results = { matched: [], manual_review: [], unmatched_transactions: [] };
    const usedTxRows = new Set();

    // 🆕 自動認列安全檢查用：已認列指紋 + 指紋出現次數（重複明細不可自動認列）
    const claimRows = await prisma.bankRemittanceClaim.findMany({ select: { fingerprint: true, orderId: true, amount: true } });
    const claimedSet = new Set(claimRows.map(c => c.fingerprint));
    // 每筆訂單已認列合計（避免已全額認列的訂單重複進入比對）
    const claimedSumByOrder = new Map();
    for (const c of claimRows) {
      claimedSumByOrder.set(c.orderId, (claimedSumByOrder.get(c.orderId) || 0) + Number(c.amount));
    }
    const fpCounts = new Map();
    for (const t of transactions) {
      try { const fp = fingerprintTransaction(t); fpCounts.set(fp, (fpCounts.get(fp) || 0) + 1); } catch { }
    }
    // 備註比對：銀行明細格式如 000054087**3054*（末碼被遮罩為 *），數字化後永遠不含完整末五碼
    // → 若備註不含完整末五碼，改比對末五碼的「前 4 碼」是否為備註數字結尾
    const memoMatchesLast5 = (memo, last5) => {
      const digits = (memo || '').replace(/\D/g, '');
      return digits.includes(last5) || (last5.length >= 4 && digits.endsWith(last5.slice(0, 4)));
    };
    // 自動認列條件：每筆交易指紋存在、未被認列過、非重複明細
    // requireMemo=true（第 1 層註記組合）另要求註記含訂單末五碼（含遮罩格式）；
    // 第 2 層（匯款日期 ±3 天）金額+日期已足夠精準，不強制註記
    const canAutoConfirm = (txList, last5, requireMemo) => txList.every(t => {
      let fp = null;
      try { fp = fingerprintTransaction(t); } catch { return false; }
      return fp && !claimedSet.has(fp) && fpCounts.get(fp) === 1 &&
        (!requireMemo || memoMatchesLast5(t.memo, last5));
    });
    // 執行自動認列（含狀態推進與 LINE 通知）；失敗回傳 false 交由人工審核
    // 每筆認列記錄末五碼：備註相符 → 訂單末五碼；否則由備註末 4 碼推導（末碼被遮罩，補 0）
    const withLast5 = (order, t) => {
      const memoDigits = (t.memo || '').replace(/\D/g, '');
      const last5 = memoMatchesLast5(t.memo, order.bankLastFiveDigits || '') ? order.bankLastFiveDigits : (memoDigits.slice(-4) + '0');
      return { ...t, last5: last5 || null };
    };
    const autoClaim = async (order, stage, txList, expectedAmount) => {
      try {
        const updated = await claimBankPayment(prisma, { orderId: order.id, stage, transfers: txList.map(t => withLast5(order, t)), actorId: 'system-reconcile', advance: advanceStatus });
        try { await notifyOrderUpdate({ ...updated, user: order.user }); } catch (err) { console.error('LINE 通知失敗:', err.message); }
        results.matched.push({
          order_id: order.id, order_number: order.order_number,
          user: order.user?.name || order.user?.phone,
          expected_amount: expectedAmount,
          excel_rows: txList.map(t => ({ row: t.row, date: t.date, amount: t.amount })),
          remitter: txList[0].remitter, new_status: updated.status, stage, auto: true,
        });
        return true;
      } catch (err) {
        if (!['BANK_TRANSFER_CLAIMED', 'STATUS_TRANSITION_RACE', 'BANK_AMOUNT_MISMATCH', 'INVALID_PAYMENT_STAGE'].includes(err.code)) throw err;
        return false;
      }
    };

    for (const order of pendingOrders) {
      // 這筆訂單現在該收多少錢？
      // 🆕 比對目標：優先用「客戶補登的實際匯款累計」（分次匯款總和），無補登才退回訂金/尾款/總額
      const isPreorder = order.orderType === 'PREORDER' || order.orderType === 'MIXED';
      const alreadyDepositPaid = !!order.depositPaidAt;
      const declared = Number(order.bankDepositActualAmount || 0);
      // 🆕 已認列合計：比對目標只找「尚未認列的餘額」，且排除已認列交易
      const claimedSum = claimedSumByOrder.get(order.id) || 0;
      const stageExpected = Number(
        isPreorder
          ? (alreadyDepositPaid ? order.balanceAmount : order.depositAmount)
          : order.total_amount
      );
      // 客戶已匯滿訂單總額 → 應推進為全額付款（full）
      const fullyRemitted = declared > 0 && declared >= Number(order.total_amount);
      const unclaimedRemainder = Math.max(0, declared - claimedSum);
      const expectedAmount = declared > 0 && unclaimedRemainder > 0 ? unclaimedRemainder : stageExpected;
      const expectedLast5 = String(order.bankLastFiveDigits);

      // 🆕 客戶宣稱的匯款已全部認列完成 → 跳過，不重複進入比對（避免已認列交易落回比對失敗）
      if (declared > 0 && unclaimedRemainder === 0) {
        continue;
      }

      // 找 Excel 中：後五碼出現在註記 + 金額相等（誤差 0）+ 尚未使用且未認列的交易
      const isUnclaimed = (t) => {
        if (usedTxRows.has(t.row)) return false;
        let fp = null;
        try { fp = fingerprintTransaction(t); } catch { return false; }
        return fp && !claimedSet.has(fp);
      };
      const hit = transactions.find(t => {
        if (!isUnclaimed(t)) return false;
        if (Math.abs(t.amount - expectedAmount) !== 0) return false;
        // 註記中要包含後五碼（含銀行遮罩格式 000054087**3054* → 比末五碼前 4 碼）
        return memoMatchesLast5(t.memo, expectedLast5);
      });

      if (hit) {
        usedTxRows.add(hit.row);
        // 🆕 客戶已匯滿訂單總額（分次匯款）→ 直接以 full（全額付款）認列
        const { stage: baseStage } = decideStage(order);
        const stage = fullyRemitted ? 'full' : baseStage;
        const txList = [hit];

        if (canAutoConfirm(txList, expectedLast5) && await autoClaim(order, stage, txList, expectedAmount)) {
          continue; // 自動認列成功
        }

        results.manual_review.push({
          order_id: order.id,
          order_number: order.order_number,
          user: order.user?.name || order.user?.phone,
          expected_amount: expectedAmount,
          expected_last5: expectedLast5,
          excel_rows: [{ row: hit.row, date: hit.date, amount: hit.amount, memo: hit.memo }],
          excel_row: hit.row,
          excel_date: hit.date,
          remitter: hit.remitter,
          reason: '交易有重複明細或已認列風險，請人工核對日期、金額及歷史收款後確認。',
          stage,
        });
        continue;
      } else {
        // 🆕 分次匯款比對：找 2~3 筆「合計 = 應收金額」的未使用交易組合（分層搜尋）
        // 第 1 層：註記含後五碼 → 第 2 層：客戶匯款日期前後 3 天 → 第 3 層：全部未使用交易
        const nearDate = order.bankDepositDate ? new Date(order.bankDepositDate) : null;
        const pools = [
          transactions.filter(t => isUnclaimed(t) && memoMatchesLast5(t.memo, expectedLast5)),
          nearDate && !isNaN(nearDate)
            ? transactions.filter(t => {
                if (!isUnclaimed(t)) return false;
                const d = new Date(t.date);
                return !isNaN(d) && Math.abs(d - nearDate) <= 3 * 86400000;
              })
            : [],
          transactions.filter(t => isUnclaimed(t)),
        ];
        let combo = null;
        let comboLayer = -1;
        outer:
        for (let li = 0; li < pools.length; li++) {
          const pool = pools[li];
          for (let i = 0; i < pool.length; i++) {
            for (let j = i + 1; j < pool.length; j++) {
              if (Math.abs(Number(pool[i].amount) + Number(pool[j].amount) - expectedAmount) === 0) {
                combo = [pool[i], pool[j]]; comboLayer = li; break outer;
              }
              for (let k = j + 1; k < pool.length; k++) {
                if (Math.abs(Number(pool[i].amount) + Number(pool[j].amount) + Number(pool[k].amount) - expectedAmount) === 0) {
                  combo = [pool[i], pool[j], pool[k]]; comboLayer = li; break outer;
                }
              }
            }
          }
          if (combo) break;
        }
        // 🆕 比對成功且交易安全（未重複、未認列、第 1 層註記含末五碼）→ 直接自動認列
        if (combo) {
          combo.forEach(t => usedTxRows.add(t.row));
          const { stage: baseStage } = decideStage(order);
          const stage = fullyRemitted ? 'full' : baseStage;
          if (combo && comboLayer < 2 && canAutoConfirm(combo, expectedLast5, comboLayer === 0) && await autoClaim(order, stage, combo, expectedAmount)) {
            continue; // 自動認列成功
          }
        }
        // 進人工審核
        results.manual_review.push({
          order_id: order.id,
          order_number: order.order_number,
          user: order.user?.name || order.user?.phone,
          expected_amount: expectedAmount,
          expected_last5: expectedLast5,
          ...(combo ? {
            excel_rows: combo.map(t => ({ row: t.row, date: t.date, amount: t.amount, memo: t.memo })),
            reason: `比對到 ${combo.length} 筆分次匯款合計相符（NT$ ${combo.reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}），但交易明細有重複或備註未含末五碼，請人工核對後多選確認。`,
          } : {
            reason: 'Excel 中找不到金額+後五碼皆相符的交易',
          }),
        });
      }
    }

    results.unmatched_transactions = transactions
      .filter(t => !usedTxRows.has(t.row))
      .map(t => ({ row: t.row, date: t.date, amount: t.amount, memo: t.memo, remitter: t.remitter }));

    return {
      summary: {
        total_transactions: transactions.length,
        matched: results.matched.length,
        manual_review: results.manual_review.length,
        unmatched_transactions: results.unmatched_transactions.length,
      },
      ...results,
    };
  } catch (error) {
    console.error('對帳失敗:', error);
    throw error;
  }
};

// POST /api/admin/bank/reconcile — 手動觸發對帳（客戶送出匯款資料時也會自動觸發）
router.post(['/bank/reconcile', '/reconcile'], async (req, res) => {
  try {
    res.json(await runReconcile());
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// POST /api/admin/orders/:orderId/manual-confirm — 手動強制確認收款
// 跳過比對邏輯直接確認。body: { stage: 'deposit'|'balance'|'full' }
// ============================================================
router.post('/orders/:orderId/manual-confirm', async (req, res) => {
  try {
    // 分次匯款：transactionFingerprints 為多筆交易指紋陣列（合計須等於應收金額）；相容單筆 transactionFingerprint
    const rawPrints = Array.isArray(req.body.transactionFingerprints) ? req.body.transactionFingerprints : [req.body.transactionFingerprint];
    const prints = (rawPrints || []).filter(Boolean);
    if (prints.length === 0 || prints.some(fp => !/^[a-f0-9]{64}$/.test(fp)) || req.body.historyReviewed !== true) {
      return res.status(400).json({ error: '請選擇銀行交易（可多選，分次匯款合計），並確認未曾用於歷史訂單收款' });
    }
    let transactions;
    const dbCount = await prisma.bankTransaction.count();
    if (dbCount > 0) {
      transactions = (await prisma.bankTransaction.findMany({ orderBy: { row: 'asc' } }))
        .map(t => ({ date: t.date, amount: t.amount, memo: t.memo, remitter: t.remitter, row: t.row }));
    } else {
      transactions = await readBankExcel(WORKBOOK_PATH);
    }
    const matchedTransfers = [];
    for (const fp of prints) {
      const matches = transactions.filter(t => {
        try { return fingerprintTransaction(t) === fp; } catch { return false; }
      });
      if (matches.length !== 1) return res.status(409).json({ error: '交易不存在、已變更或存在重複明細，請先核對銀行原始紀錄' });
      matchedTransfers.push(matches[0]);
    }
    const order = await prisma.consumerOrder.findUnique({
      where: { id: parseInt(req.params.orderId) },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    const isPreorder = order.orderType === 'PREORDER' || order.orderType === 'MIXED';
    const alreadyDepositPaid = !!order.depositPaidAt;
    // 自動判斷 stage：代購未付訂金 → deposit；代購已付訂金 → balance；現貨 → full
    // 🆕 客戶已匯滿訂單總額（分次匯款）→ 直接以 full（全額付款）認列
    const declared = Number(order.bankDepositActualAmount || 0);
    const fullyRemitted = declared > 0 && declared >= Number(order.total_amount);
    const stage = req.body.stage || (fullyRemitted ? 'full' : (isPreorder ? (alreadyDepositPaid ? 'balance' : 'deposit') : 'full'));

    if (stage === 'balance' && !alreadyDepositPaid) {
      return res.status(400).json({ error: '代購訂單必須先確認訂金，才能確認尾款' });
    }

    // 🆕 修復：計算已認列金額，求出實際應收餘額（與 runReconcile 相同邏輯）
    // 分次匯款時，手動確認最後一筆不能再用訂單總額硬比對，必須扣除已認列金額。
    const claimRows = await prisma.bankRemittanceClaim.findMany({
      where: { orderId: order.id },
      select: { amount: true },
    });
    const claimedSum = claimRows.reduce((s, c) => s + Number(c.amount), 0);
    const expectedRemaining = declared > 0 ? Math.max(0, declared - claimedSum) : null;
    const stageExpected = stage === 'full'
      ? Number(order.total_amount)
      : stage === 'balance'
        ? Number(order.balanceAmount)
        : Number(order.depositAmount);
    const targetAmount = expectedRemaining !== null ? expectedRemaining : stageExpected;
    const selectedTotal = matchedTransfers.reduce((s, t) => s + Number(t.amount), 0);
    if (targetAmount <= 0) {
      return res.status(400).json({ error: '此訂單已無未認列的應收餘額，請勿重複確認' });
    }
    if (Math.abs(selectedTotal - targetAmount) !== 0) {
      return res.status(400).json({ error: `交易金額合計 NT$ ${selectedTotal} 與應收 NT$ ${targetAmount} 不符` });
    }

    const updated = await claimBankPayment(prisma, { orderId: order.id, stage, transfers: matchedTransfers.map(t => {
      const memoDigits = (t.memo || '').replace(/\D/g, '');
      const digits = (order.bankLastFiveDigits || '').replace(/\D/g, '');
      const match = digits && (memoDigits.includes(digits) || (digits.length >= 4 && memoDigits.endsWith(digits.slice(0, 4))));
      return { ...t, last5: match ? order.bankLastFiveDigits : (memoDigits.slice(-4) + '0') };
    }), actorId: req.admin?.id || req.user?.id, advance: advanceStatus });

    // 審計：手動確認收款（來源、操作者、前後狀態、交易指紋）
    await recordAudit(prisma, {
      action: 'MANUAL_PAYMENT_CONFIRM',
      entityType: 'ConsumerOrder',
      entityId: order.id,
      before: { status: order.status, depositPaidAt: order.depositPaidAt || null, balancePaidAt: order.balancePaidAt || null },
      after: { status: updated.status },
      detail: { stage, transactionFingerprints: prints, bankMatch: { amount_total: matchedTransfers.reduce((s, t) => s + Number(t.amount), 0), count: matchedTransfers.length, dates: matchedTransfers.map(t => t.date) } },
    }, req);

    // 🆕 手動確認收款 → LINE 通知車主（審核完成/已付款）
    try {
      const withUser = await prisma.consumerOrder.findUnique({
        where: { id: order.id },
        include: { user: { select: { lineId: true } } },
      });
      await notifyOrderUpdate(withUser);
    } catch (err) { console.error('LINE 通知失敗:', err.message); }

    res.json({ message: `已手動確認（${stage}）`, status: updated.status });
  } catch (error) {
    const statuses = { BANK_TRANSFER_CLAIMED: 409, STATUS_TRANSITION_RACE: 409, INVALID_PAYMENT_STAGE: 400, INVALID_BANK_TRANSFER: 400, BANK_AMOUNT_MISMATCH: 400, ORDER_NOT_FOUND: 404 };
    if (statuses[error.code]) return res.status(statuses[error.code]).json({ code: error.code, error: error.message });
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// PUT /api/admin/orders/:orderId/tracking — 輸入物流追蹤碼
// body: { trackingCodeDomestic?, trackingCodeInternational? }
// ============================================================
router.put('/orders/:orderId/tracking', async (req, res) => {
  try {
    const order = await prisma.consumerOrder.findUnique({
      where: { id: parseInt(req.params.orderId) },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    const { trackingCodeDomestic, trackingCodeInternational, carrierId } = req.body;
    if (!trackingCodeDomestic && !trackingCodeInternational) {
      return res.status(400).json({ error: '請至少填寫一個追蹤碼' });
    }

    const data = {};
    if (trackingCodeDomestic) data.trackingCodeDomestic = trackingCodeDomestic;
    if (trackingCodeInternational) data.trackingCodeInternational = trackingCodeInternational;
    // 🆕 國內物流業者（可選，驗證業者存在且啟用）
    if (carrierId !== undefined && carrierId !== null && carrierId !== '') {
      const carrier = await prisma.carrier.findUnique({ where: { id: parseInt(carrierId) } });
      if (!carrier || !carrier.enabled) {
        return res.status(400).json({ error: '物流業者不存在或已停用' });
      }
      data.domesticCarrierId = carrier.id;
    }
    // 填了國內追蹤碼 → 出貨（代購需先收齊款項）
    if (trackingCodeDomestic) {
      const isPreorder = order.orderType === 'PREORDER' || order.orderType === 'MIXED';
      if (isPreorder && order.status !== 'PAID') {
        return res.status(400).json({ error: '代購訂單需收齊尾款（PAID）後才能出貨' });
      }
      data.status = 'SHIPPED';
    }

    const updated = await prisma.consumerOrder.update({
      where: { id: order.id },
      data,
      include: { user: { select: { lineId: true } } },
    });

    // 🆕 訂單級出貨單號適用於「其餘商品」：尚未個別出貨（無商品級單號）的商品一併標記已出貨
    if (trackingCodeDomestic) {
      await prisma.consumerOrderItem.updateMany({
        where: { order_id: order.id, shipped_at: null, tracking_code: null },
        data: { shipped_at: new Date() },
      });
    }

    try {
      await notifyOrderUpdate(updated); // 出貨通知
    } catch (err) { console.error('LINE 通知失敗:', err.message); }

    res.json({ message: '追蹤碼已更新', status: updated.status, tracking: {
      domestic: updated.trackingCodeDomestic,
      international: updated.trackingCodeInternational,
    }});
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// PATCH /api/admin/orders/:orderId — 管理端訂單狀態調整
// 金流狀態（PENDING_PAYMENT / PAYMENT_REVIEW / DEPOSIT_PAID /
// AWAITING_BALANCE / PAID）一律走銀行對帳流程，此處拒絕。
// 允許：SHIPPED → COMPLETED（條件式轉換）、CANCELLED（走共用取消服務，回補庫存）。
// ============================================================
router.patch('/orders/:orderId', async (req, res) => {
  try {
    const { status } = req.body;
    const PAYMENT_STATUSES = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE', 'PAID'];
    if (PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({ code: 'PAYMENT_STATUS_VIA_BANK', error: '金流狀態請由銀行對帳頁確認，不可手動設定' });
    }
    if (status === 'CANCELLED') {
      const order = await prisma.consumerOrder.findUnique({
        where: { id: parseInt(req.params.orderId) },
        select: { id: true, userId: true },
      });
      if (!order) return res.status(404).json({ error: '訂單不存在' });
      const { cancelConsumerOrder } = require('../services/orderCancellation');
      await prisma.$transaction(tx => cancelConsumerOrder(tx, { id: order.id, userId: order.userId }));
      return res.status(200).json({ message: '訂單已取消，庫存已回補', status: 'CANCELLED' });
    }
    if (status === 'COMPLETED') {
      const transition = await prisma.consumerOrder.updateMany({
        where: { id: parseInt(req.params.orderId), status: 'SHIPPED' },
        data: { status: 'COMPLETED' },
      });
      if (transition.count !== 1) {
        return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', error: '只有已出貨（SHIPPED）訂單可以標記完成' });
      }
      return res.status(200).json({ message: '訂單已完成', status: 'COMPLETED' });
    }
    return res.status(400).json({ code: 'UNSUPPORTED_STATUS', error: '不支援的訂單狀態' });
  } catch (error) {
    const statuses = { ORDER_NOT_FOUND: 404, ORDER_NOT_CANCELLABLE: 409, ORDER_ALREADY_CANCELLED: 409 };
    if (statuses[error.code]) return res.status(statuses[error.code]).json({ code: error.code, error: error.message });
    console.error('PATCH /api/admin/orders/:orderId error:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/admin/orders — 取得所有訂單（管理端）
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.consumerOrder.findMany({
      include: {
        user: { select: { name: true, phone: true, lineId: true } },
        items: { select: { id: true, name_snapshot: true, sku_snapshot: true, price_snapshot: true, qty: true, is_preorder: true, arrived_at: true, shipped_at: true, tracking_code: true } },
        // 🆕 加入售後問題回報（含 adminNotes 處理紀錄）
        issues: {
          orderBy: { createdAt: 'desc' },
        },
        // 🆕 加入退貨申請（含 adminNotes 處理紀錄與商品明細）
        returns: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { orderItem: true } } },
        },
        // 🆕 國內物流業者
        domesticCarrier: { select: { id: true, name: true, code: true, trackingUrl: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    // 🆕 客戶車型（ConsumerOrder.vehicle_id 無 relation field，另行查詢）
    const vehicleIds = [...new Set(orders.map(o => o.vehicle_id).filter(Boolean))];
    const vehicles = vehicleIds.length > 0 ? await prisma.vehicleProfile.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, licensePlate: true, make: true, model: true, generation: true, year: true, engine: true },
    }) : [];
    const vehicleById = new Map(vehicles.map(v => [v.id, v]));
    for (const o of orders) o.customer_vehicle = o.vehicle_id ? (vehicleById.get(o.vehicle_id) || null) : null;
    // 🆕 每筆訂單的匯款認證明細（同 /admin/bank）
    const claimRows = await prisma.bankRemittanceClaim.findMany({
      where: { orderId: { in: orders.map(o => o.id) } },
      orderBy: { createdAt: 'asc' },
    });
    const claimsByOrder = new Map();
    for (const c of claimRows) {
      if (!claimsByOrder.has(c.orderId)) claimsByOrder.set(c.orderId, []);
      claimsByOrder.get(c.orderId).push({ amount: Number(c.amount), transactionDate: c.transactionDate, last5: c.last5, stage: c.stage });
    }
    res.json(orders.map(o => ({ ...o, remittance_claims: claimsByOrder.get(o.id) || [] })));
  } catch (error) {
    console.error('GET /api/admin/orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// 🆕 物流業者管理（carriers CRUD）
// GET    /api/admin/carriers        清單
// POST   /api/admin/carriers        新增 { name, code, trackingUrl, enabled, sortOrder }
// PATCH  /api/admin/carriers/:id    更新 { name, code, trackingUrl, enabled, sortOrder }
// DELETE /api/admin/carriers/:id    刪除（未使用才可刪）
// trackingUrl 支援 {number} 併入單號；不含則僅連到查貨首頁
// ============================================================
router.get('/carriers', async (req, res) => {
  try {
    const carriers = await prisma.carrier.findMany({
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
    res.json(carriers);
  } catch (error) {
    console.error('GET /api/admin/carriers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/carriers', async (req, res) => {
  try {
    const { name, code, trackingUrl, enabled, sortOrder } = req.body;
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ error: '請填寫業者名稱與代碼' });
    }
    const carrier = await prisma.carrier.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        trackingUrl: trackingUrl?.trim() || null,
        enabled: enabled !== false,
        sort_order: parseInt(sortOrder, 10) || 0,
      },
    });
    await recordAudit(prisma, {
      action: 'CARRIER_CREATE',
      entityType: 'Carrier',
      entityId: carrier.id,
      detail: { name: carrier.name, code: carrier.code },
    }, req);
    res.status(201).json(carrier);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '業者代碼已存在' });
    }
    console.error('POST /api/admin/carriers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/carriers/:id', async (req, res) => {
  try {
    const { name, code, trackingUrl, enabled, sortOrder } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (code !== undefined) data.code = code.trim().toUpperCase();
    if (trackingUrl !== undefined) data.trackingUrl = trackingUrl.trim() || null;
    if (enabled !== undefined) data.enabled = !!enabled;
    if (sortOrder !== undefined) data.sort_order = parseInt(sortOrder, 10) || 0;
    const carrier = await prisma.carrier.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    await recordAudit(prisma, {
      action: 'CARRIER_UPDATE',
      entityType: 'Carrier',
      entityId: carrier.id,
      detail: { name: carrier.name, trackingUrl: carrier.trackingUrl },
    }, req);
    res.json(carrier);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '業者代碼已存在' });
    }
    console.error('PATCH /api/admin/carriers/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/carriers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // 已被訂單使用的業者不可刪（外鍋限制）；改用停用
    const used = await prisma.consumerOrder.count({ where: { domesticCarrierId: id } });
    if (used > 0) {
      return res.status(400).json({ error: `已有 ${used} 筆訂單使用此業者，請改為停用` });
    }
    await prisma.carrier.delete({ where: { id } });
    await recordAudit(prisma, {
      action: 'CARRIER_DELETE',
      entityType: 'Carrier',
      entityId: id,
      detail: {},
    }, req);
    res.json({ message: '已刪除' });
  } catch (error) {
    console.error('DELETE /api/admin/carriers/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// 🆕 POST /api/admin/orders/:orderId/issues/:issueId/reply
// 管理員新增處理紀錄（可累積多筆，形成處理歷程）
// Body: { text: string }
// ============================================================
router.post('/orders/:orderId/issues/:issueId/reply', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const issueId = parseInt(req.params.issueId);
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: '請填寫處理紀錄內容' });
    }

    // 確認 issue 存在且屬於該訂單
    const issue = await prisma.orderIssue.findFirst({
      where: { id: issueId, orderId },
    });
    if (!issue) return res.status(404).json({ error: '售後回報不存在' });

    // 讀取現有紀錄（若為 null 或非陣列則視為空陣列）
    const existing = Array.isArray(issue.adminNotes) ? issue.adminNotes : [];

    // 管理員資訊（依 adminAuth middleware 提供）
    const adminId = String(req.admin?.id || req.user?.id || 'unknown');
    const adminName = String(req.admin?.name || req.admin?.email || req.admin?.username || '管理員');

    const newNote = {
      at: new Date().toISOString(),
      by: adminId,
      byName: adminName,
      text: String(text).trim(),
    };

    const updated = await prisma.orderIssue.update({
      where: { id: issueId },
      data: { adminNotes: [...existing, newNote] },
    });

    // 審計紀錄（可選，方便日後追蹤）
    await recordAudit(prisma, {
      action: 'ORDER_ISSUE_REPLY',
      entityType: 'OrderIssue',
      entityId: issueId,
      detail: { orderId, text: String(text).trim() },
    }, req);

    res.json({ message: '已新增處理紀錄', issue: updated });
  } catch (error) {
    console.error('新增售後處理紀錄失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ===========================================================
// 🆕 PATCH /api/admin/orders/:orderId/issues/:issueId/status
// 售後流程：REPORTED(已回報) → PROCESSING(客服處理中) → RESOLVED(結案)
// Body: { status: 'PROCESSING' | 'RESOLVED' }
// ===========================================================
router.patch('/orders/:orderId/issues/:issueId/status', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const issueId = parseInt(req.params.issueId);
    const { status } = req.body;

    if (!['PROCESSING', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: '無效的狀態（僅支援 PROCESSING / RESOLVED）' });
    }

    // 確認 issue 存在且屬於該訂單
    const issue = await prisma.orderIssue.findFirst({
      where: { id: issueId, orderId },
    });
    if (!issue) return res.status(404).json({ error: '售後回報不存在' });

    if (issue.status === status) {
      return res.json({ message: '狀態未變更', issue });
    }

    const updated = await prisma.orderIssue.update({
      where: { id: issueId },
      data: { status },
    });

    // 自動 appended 處理紀錄，讓客戶端也能看到流程變化
    const adminId = String(req.admin?.id || req.user?.id || 'unknown');
    const adminName = String(req.admin?.name || req.admin?.email || req.admin?.username || '管理員');
    const statusLabel = status === 'PROCESSING' ? '客服處理中' : '結案';
    const existing = Array.isArray(updated.adminNotes) ? updated.adminNotes : [];
    await prisma.orderIssue.update({
      where: { id: issueId },
      data: {
        adminNotes: [...existing, {
          at: new Date().toISOString(),
          by: adminId,
          byName: adminName,
          text: `📋 狀態變更：${statusLabel}`,
        }],
      },
    });
    const final = await prisma.orderIssue.findUnique({ where: { id: issueId } });

    // 審計紀錄
    await recordAudit(prisma, {
      action: 'ORDER_ISSUE_STATUS',
      entityType: 'OrderIssue',
      entityId: issueId,
      detail: { orderId, from: issue.status, to: status },
    }, req);

    res.json({ message: `已標記為「${statusLabel}」`, issue: final });
  } catch (error) {
    console.error('售後狀態更新失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ===========================================================
// 🆕 退貨審核流程（2026-10-03）
// 流程：PENDING → APPROVED（核可）→ RECEIVED（收到退回商品＋回補庫存）→ REFUNDED（退款完成）
//                ↘ REJECTED（駁回）
// ===========================================================
const { incrementStock, InventoryLogType } = require('../services/inventoryTransaction');

// 共用：讀取退貨申請並附加管理員處理紀錄
async function appendReturnNote(returnRecord, text, req) {
  const existing = Array.isArray(returnRecord.adminNotes) ? returnRecord.adminNotes : [];
  const adminId = String(req.admin?.id || req.user?.id || 'unknown');
  const adminName = String(req.admin?.name || req.admin?.email || req.admin?.username || '管理員');
  return [...existing, { at: new Date().toISOString(), by: adminId, byName: adminName, text: String(text).trim() }];
}

// POST /api/admin/orders/:orderId/returns/:returnId/approve — 核可退貨／換貨
// body: { refundAmount?, returnShippingFee?, isExchange? }
// 🆕 運費規則：瑕疵/規格不符 → 公司吸收（運費 0）；其他原因 → 客戶負擔
// 🆕 換貨（isExchange）→ 不退款，改寄新品；退款金額預設 0
router.post('/orders/:orderId/returns/:returnId/approve', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const returnId = parseInt(req.params.returnId);
    const { refundAmount, returnShippingFee, isExchange } = req.body;

    const order = await prisma.consumerOrder.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    const returnRecord = await prisma.orderReturn.findFirst({ where: { id: returnId, orderId } });
    if (!returnRecord) return res.status(404).json({ error: '退貨申請不存在' });
    if (returnRecord.status !== 'PENDING') {
      return res.status(400).json({ error: `退貨申請狀態為 ${returnRecord.status}，無法核可` });
    }

    // 退貨運費（客戶負擔金額；瑕疵/規格不符建議 0）
    const shipping = Math.max(0, Number(returnShippingFee) || 0);
    const exchange = !!isExchange;

    // 退款金額：換貨預設 0；退貨預設 = 商品合計 − 退貨運費
    const returnItems = await prisma.orderReturnItem.findMany({ where: { returnId } });
    const itemTotal = returnItems.reduce((sum, it) => sum + Number(it.qty) * Number(it.price), 0);
    let finalAmount;
    if (exchange) {
      finalAmount = refundAmount !== undefined ? Number(refundAmount) : 0;
    } else {
      finalAmount = refundAmount !== undefined ? Number(refundAmount) : Math.max(0, itemTotal - shipping);
    }
    if (!(finalAmount >= 0)) return res.status(400).json({ error: '退款金額不得為負數' });

    const feeNote = shipping > 0 ? `（扣除退貨運費 NT$ ${shipping}）` : '';
    const updated = await prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'APPROVED',
        refundAmount: finalAmount,
        returnShippingFee: shipping,
        isExchange: exchange,
        adminNotes: await appendReturnNote(
          returnRecord,
          exchange
            ? `核可換貨，退貨運費 NT$ ${shipping}${shipping > 0 ? '（客戶負擔）' : '（公司吸收）'}，將寄送新品`
            : `核可退貨，退款金額 NT$ ${finalAmount}${feeNote}`,
          req,
        ),
      },
    });

    await recordAudit(prisma, {
      action: 'ORDER_RETURN_APPROVE',
      entityType: 'OrderReturn',
      entityId: returnId,
      detail: { orderId, refundAmount: finalAmount, returnShippingFee: shipping, isExchange: exchange },
    }, req);

    res.json({
      message: exchange ? '換貨申請已核可，請通知客戶寄回商品' : '退貨申請已核可，請通知客戶寄回商品',
      return: updated,
    });
  } catch (error) {
    console.error('核可退貨失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/orders/:orderId/returns/:returnId/exchange-ship — 🆕 換貨出貨
// body: { trackingCode } — 填換貨出貨單號，完成換貨（需已收到退回商品）
router.post('/orders/:orderId/returns/:returnId/exchange-ship', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const returnId = parseInt(req.params.returnId);
    const { trackingCode } = req.body;
    if (!trackingCode || !String(trackingCode).trim()) {
      return res.status(400).json({ error: '請填寫換貨出貨單號' });
    }

    const returnRecord = await prisma.orderReturn.findFirst({ where: { id: returnId, orderId } });
    if (!returnRecord) return res.status(404).json({ error: '退貨申請不存在' });
    if (!returnRecord.isExchange) {
      return res.status(400).json({ error: '此退貨申請非換貨單，無法填寫換貨出貨' });
    }
    if (returnRecord.status !== 'RECEIVED') {
      return res.status(400).json({ error: `換貨出貨需待收到退回商品（目前狀態：${returnRecord.status}）` });
    }

    const code = String(trackingCode).trim();
    const updated = await prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        exchangeTrackingCode: code,
        exchangeShippedAt: new Date(),
        status: 'EXCHANGED',
        adminNotes: await appendReturnNote(returnRecord, `換貨出貨，單號 ${code}`, req),
      },
    });

    await recordAudit(prisma, {
      action: 'ORDER_RETURN_EXCHANGE_SHIP',
      entityType: 'OrderReturn',
      entityId: returnId,
      detail: { orderId, trackingCode: code },
    }, req);

    res.json({ message: '換貨已出貨', return: updated });
  } catch (error) {
    console.error('換貨出貨失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/orders/:orderId/returns/:returnId/reject — 駁回退貨
// body: { reason: string }
router.post('/orders/:orderId/returns/:returnId/reject', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const returnId = parseInt(req.params.returnId);
    const { reason } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: '請填寫駁回原因' });
    }

    const order = await prisma.consumerOrder.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    const returnRecord = await prisma.orderReturn.findFirst({ where: { id: returnId, orderId } });
    if (!returnRecord) return res.status(404).json({ error: '退貨申請不存在' });
    if (returnRecord.status !== 'PENDING') {
      return res.status(400).json({ error: `退貨申請狀態為 ${returnRecord.status}，無法駁回` });
    }

    const updated = await prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'REJECTED',
        resolvedAt: new Date(),
        adminNotes: await appendReturnNote(returnRecord, `駁回退貨：${reason}`, req),
      },
    });

    await recordAudit(prisma, {
      action: 'ORDER_RETURN_REJECT',
      entityType: 'OrderReturn',
      entityId: returnId,
      detail: { orderId, reason: String(reason).trim() },
    }, req);

    res.json({ message: '退貨申請已駁回', return: updated });
  } catch (error) {
    console.error('駁回退貨失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/orders/:orderId/returns/:returnId/receive — 收到退回商品（回補庫存）
router.post('/orders/:orderId/returns/:returnId/receive', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const returnId = parseInt(req.params.returnId);

    const order = await prisma.consumerOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    const returnRecord = await prisma.orderReturn.findFirst({ where: { id: returnId, orderId } });
    if (!returnRecord) return res.status(404).json({ error: '退貨申請不存在' });
    if (returnRecord.status !== 'APPROVED') {
      return res.status(400).json({ error: '僅已核可的退貨申請可進行收貨' });
    }

    // 退貨範圍：依退貨明細（新格式）／單品（舊格式）／整單
    const returnItemRows = await prisma.orderReturnItem.findMany({ where: { returnId } });
    let targetItems;
    if (returnItemRows.length > 0) {
      targetItems = returnItemRows
        .map(ri => {
          const orderItem = order.items.find(i => i.id === ri.orderItemId);
          return orderItem ? { ...orderItem, returnQty: ri.qty } : null;
        })
        .filter(Boolean);
    } else if (returnRecord.orderItemId) {
      targetItems = order.items.filter(i => i.id === returnRecord.orderItemId);
    } else {
      targetItems = order.items;
    }
    if (targetItems.length === 0) {
      return res.status(400).json({ error: '找不到退貨商品項目' });
    }

    // 單一 transaction：回補庫存 + 寫入 InventoryLog（SHIPMENT_RETURN 退貨入庫）
    await prisma.$transaction(async (tx) => {
      for (const item of targetItems) {
        await incrementStock(
          tx,
          item.part_id,
          item.returnQty ?? item.qty,
          InventoryLogType.SHIPMENT_RETURN,
          `退貨入庫 order:${order.order_number} return:${returnId}`,
        );
      }
    });

    const updated = await prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'RECEIVED',
        adminNotes: await appendReturnNote(returnRecord, `已收到退回商品（${targetItems.length} 項，庫存已回補）`, req),
      },
    });

    await recordAudit(prisma, {
      action: 'ORDER_RETURN_RECEIVE',
      entityType: 'OrderReturn',
      entityId: returnId,
      detail: { orderId, items: targetItems.map(i => ({ partId: i.part_id, qty: i.returnQty ?? i.qty })) },
    }, req);

    res.json({ message: '已收到退回商品，庫存已回補', return: updated });
  } catch (error) {
    console.error('退貨收貨失敗:', error);
    if (error.code === 'PART_INACTIVE') {
      return res.status(400).json({ error: '商品已下架，無法自動回補庫存，請手動調整庫存' });
    }
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/orders/:orderId/returns/:returnId/refund — 確認退款完成
// body: { note? }（退款紀錄，如匯款日期／銀行回覆）
router.post('/orders/:orderId/returns/:returnId/refund', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const returnId = parseInt(req.params.returnId);
    const { note } = req.body;

    const order = await prisma.consumerOrder.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    const returnRecord = await prisma.orderReturn.findFirst({ where: { id: returnId, orderId } });
    if (!returnRecord) return res.status(404).json({ error: '退貨申請不存在' });
    if (returnRecord.status !== 'RECEIVED') {
      return res.status(400).json({ error: '須待收到退回商品（RECEIVED）後才能確認退款' });
    }

    const notes = await appendReturnNote(
      returnRecord,
      note?.trim() ? `退款完成（${note.trim()}）` : '退款完成',
      req,
    );

    const updated = await prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'REFUNDED',
        resolvedAt: new Date(),
        adminNotes: notes,
      },
    });

    await recordAudit(prisma, {
      action: 'ORDER_RETURN_REFUND',
      entityType: 'OrderReturn',
      entityId: returnId,
      detail: { orderId, refundAmount: Number(returnRecord.refundAmount) },
    }, req);

    res.json({ message: '退款已確認完成', return: updated });
  } catch (error) {
    console.error('退款確認失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
Object.assign(module.exports, { decideStage, STAGE_FROM_STATUS, advanceStatus, runReconcile });

// ============================================================
// PATCH /api/admin/orders/:orderId/items/:itemId — 商品項目層級：到貨 / 出貨
// body: { action: 'arrive' | 'ship', trackingCode? }
// 每個商品可單獨到貨與出貨；全部到貨 → 訂單推進 AWAITING_BALANCE（通知支付尾款）
// 全部出貨 → 訂單推進 SHIPPED
// ============================================================
router.patch('/orders/:orderId/items/:itemId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);
    const { action, trackingCode } = req.body;

    const item = await prisma.consumerOrderItem.findFirst({ where: { id: itemId, order_id: orderId } });
    if (!item) return res.status(404).json({ error: '商品項目不存在' });
    const order = await prisma.consumerOrder.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    const data = {};
    if (action === 'arrive') {
      if (item.arrived_at) return res.status(400).json({ error: '此商品已標記到貨' });
      data.arrived_at = new Date();
    } else if (action === 'ship') {
      if (!item.arrived_at) return res.status(400).json({ error: '此商品尚未標記到貨，無法出貨' });
      if (item.shipped_at) return res.status(400).json({ error: '此商品已出貨' });
      if (!trackingCode) return res.status(400).json({ error: '請填寫追蹤碼' });
      data.shipped_at = new Date();
      data.tracking_code = String(trackingCode).trim();
    } else {
      return res.status(400).json({ error: '無效的 action' });
    }

    const updatedItem = await prisma.consumerOrderItem.update({ where: { id: itemId }, data });

    // 訂單層級推進
    const allItems = await prisma.consumerOrderItem.findMany({ where: { order_id: orderId } });
    const allArrived = allItems.every(i => i.arrived_at);
    const allShipped = allItems.every(i => i.shipped_at);

    let orderStatus = order.status;
    let notification = null;
    if (action === 'arrive' && allArrived && order.status === 'DEPOSIT_PAID') {
      // 全部到貨 → 待補尾款（通知客戶支付尾款 / 選擇貨到付款）
      const updated = await prisma.consumerOrder.update({
        where: { id: orderId },
        data: { status: 'AWAITING_BALANCE' },
        include: { user: { select: { lineId: true } } },
      });
      orderStatus = 'AWAITING_BALANCE';
      notification = updated;
    } else if (action === 'ship' && allShipped && ['DEPOSIT_PAID', 'AWAITING_BALANCE', 'PAID'].includes(order.status)) {
      const updated = await prisma.consumerOrder.update({
        where: { id: orderId },
        data: { status: 'SHIPPED', tracking_number: trackingCode || order.tracking_number },
        include: { user: { select: { lineId: true } } },
      });
      orderStatus = 'SHIPPED';
      notification = updated;
    }

    if (notification) {
      try { await notifyOrderUpdate(notification); } catch (err) { console.error('LINE 通知失敗:', err.message); }
    }

    res.json({ message: action === 'arrive' ? '商品已標記到貨' : '商品已出貨', item: updatedItem, order_status: orderStatus });
  } catch (error) {
    console.error('PATCH items error:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// POST /api/consumer/orders/:orderId/payment-method — 客戶選擇尾款支付方式
// body: { method: 'BANK' | 'COD' }（僅 AWAITING_BALANCE 可設定）
// COD（貨到付款）：手續費 2% → 尾款金額 = 原尾款 × 1.02
// ============================================================
router.post('/orders/:orderId/payment-method', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { method } = req.body;
    if (!['BANK', 'COD'].includes(method)) return res.status(400).json({ error: '無效的支付方式' });

    const order = await prisma.consumerOrder.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: '訂單不存在' });
    if (order.status !== 'AWAITING_BALANCE') return res.status(400).json({ error: '目前狀態無法設定尾款支付方式' });

    const baseBalance = Number(order.balanceAmount || 0) - Number(order.cod_fee || 0); // 原尾款（扣回之前加的手續費）
    const update = method === 'COD'
      ? { payment_method: 'COD', cod_fee: Math.round(baseBalance * 0.02), balanceAmount: Math.round(baseBalance * 1.02) }
      : { payment_method: 'BANK', cod_fee: 0, balanceAmount: baseBalance };
    const updated = await prisma.consumerOrder.update({
      where: { id: orderId },
      data: update,
      include: { user: { select: { lineId: true } } },
    });
    try { await notifyOrderUpdate(updated); } catch (err) { console.error('LINE 通知失敗:', err.message); }
    res.json({ message: method === 'COD' ? '已選擇貨到付款（尾款含 2% 手續費）' : '已選擇匯款支付尾款', order: updated });
  } catch (error) {
    console.error('payment-method error:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});