// src/components/orders/BankInfoModal.jsx — 抽離自 src/pages/Orders.jsx
import { useState } from 'react';
import { consumerClient as api } from '../../api/client';
// ===== 補登匯款 Modal =====
export default function BankInfoModal({ order, onClose, onSuccess }) {
  const [depositDate, setDepositDate] = useState(order.bankDepositDate ? new Date(order.bankDepositDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [last5, setLast5] = useState(order.bankLastFiveDigits || '');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 預期金額（分次匯款累計制）：
  // 代購且已匯未達訂金 → 目標訂金；已達訂金（含待補尾款）→ 目標全額；現貨 → 全額
  const remittedSoFar = Number(order.bankDepositActualAmount || 0);
  const depositTarget = Number(order.depositAmount || order.total_amount);
  const isPreorderType = order.orderType === 'PREORDER' || order.orderType === 'MIXED';
  const expected = isPreorderType && remittedSoFar < depositTarget
    ? depositTarget
    : Number(order.total_amount);

  // 🆕 分次匯款：已匯累計與剩餘金額
  const remitted = Number(order.bankDepositActualAmount || 0);
  const remaining = Math.max(0, expected - remitted);
  const isAdditional = remitted > 0;

  const submit = async () => {
    setError('');
    if (!depositDate) return setError('請選擇匯款日期');
    if (!/^\d{5}$/.test(last5)) return setError('帳號後五碼需為 5 位數字');
    if (!Number(amount)) return setError('請填寫匯款金額');
    // 🆕 僅驗證金額為正整數，實際金額由客戶填入，admin 對帳時確認
    if (Number(amount) <= 0) return setError('請填寫正確的金額');

    setSubmitting(true);
    try {
      await api.post(`/consumer/orders/${order.id}/bank-info`, {
        bankDepositDate: depositDate,
        bankLastFiveDigits: last5,
        actualAmount: Number(amount),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-800 rounded-2xl border border-surface-600 max-w-md w-full p-6 text-white">
        <h3 className="text-lg font-bold mb-1">{isAdditional ? '➕ 新增匯款（分次匯款）' : order.bankDepositDate ? '✏️ 修改匯款資料' : '💳 補登匯款資料'}</h3>
        <p className="text-sm text-surface-400 mb-4">訂單 #{order.order_number}</p>

        {/* 🆕 分次匯款進度 */}
        {isAdditional && (
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-3 mb-4 text-sm text-blue-100 space-y-0.5">
            <p>💰 應付金額：NT$ {expected.toLocaleString()}</p>
            <p>✅ 已匯款累計：NT$ {remitted.toLocaleString()}</p>
            <p className={remaining > 0 ? 'text-yellow-300' : 'text-green-300'}>
              {remaining > 0 ? `⏳ 尚欠：NT$ ${remaining.toLocaleString()}` : '🎉 已達應付金額'}
            </p>
            <p className="text-xs text-blue-300/70 mt-1">📝 銀行單筆匯款有上限時，可分多次匯款：每次匯完後在此填入「該次匯款金額」，系統會自動累加。</p>
          </div>
        )}

        {/* 匯款帳戶提醒 */}
        <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-3 mb-4 text-sm text-green-100">
          <p>🏦 匯款帳戶 銀行：<span className="font-mono font-bold">822</span> (中國信託) 帳號：<span className="font-mono font-bold tracking-wider">189540154285</span></p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-surface-400 mb-1">匯款日期 *</label>
            <input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-700 border border-surface-600 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">匯款帳號後五碼 *（銀行簿子上的）</label>
            <input value={last5} onChange={e => setLast5(e.target.value.replace(/\D/g,'').slice(0,5))}
              inputMode="numeric" maxLength={5} placeholder="例：12345"
              className="w-full px-3 py-2.5 bg-surface-700 border border-surface-600 rounded-xl text-sm font-mono tracking-widest" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">
              {isAdditional ? '本次匯款金額 *' : '匯款金額 *'}（應付 NT$ {expected.toLocaleString()}
              {isAdditional && <>｜已匯 {remitted.toLocaleString()}｜尚欠 <span className="text-yellow-300 font-bold">{remaining.toLocaleString()}</span></>}）
            </label>
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,''))}
              inputMode="numeric" placeholder={String(isAdditional ? (remaining || expected) : expected)}
              className="w-full px-3 py-2.5 bg-surface-700 border border-surface-600 rounded-xl text-sm font-mono" />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-sm font-medium">取消</button>
          <button onClick={submit} disabled={submitting}
            className="flex-[2] py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-bold">
            {submitting ? '提交中…' : '確認送出'}
          </button>
        </div>
      </div>
    </div>
  );
}
