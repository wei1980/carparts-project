// src/components/orders/ReturnRequestModal.jsx — 抽離自 src/pages/Orders.jsx
import { useState } from 'react';
import { useEffect } from 'react';
import { consumerClient as api } from '../../api/client';
import {
  RETURN_REASON_OPTIONS, BANK_LIST, BANK_NAME_BY_CODE, findBank, returnDeadline,
} from '../../constants/orders';
export default function ReturnRequestModal({ order, onClose, onSuccess }) {
  const [selectedItems, setSelectedItems] = useState({}); // 🆕 退貨範圍 { [orderItemId]: qty }
  const [returnReason, setReturnReason] = useState('DEFECT');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [refundBankCode, setRefundBankCode] = useState('');
  const [refundAccount, setRefundAccount] = useState('');
  const [refundAccountName, setRefundAccountName] = useState('');
  // 🆕 重複申請免再填：自動載入上次退款帳戶
  const [refundPrefilled, setRefundPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 🆕 開啟表單時載入客戶最近一次退貨的退款帳戶（有重複就不必再輸入）
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/consumer/orders/refund-account');
        const acct = r.data;
        if (acct && acct.refundBankCode) {
          setRefundBankCode(acct.refundBankCode);
          setRefundPrefilled(true);
        }
        if (acct && acct.refundAccount) setRefundAccount(acct.refundAccount);
        if (acct && acct.refundAccountName) setRefundAccountName(acct.refundAccountName);
      } catch { /* 無歷史帳戶則留空 */ }
    })();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // 🆕 退貨範圍：勾選商品與數量，自動計算退款金額
  const toggleItem = (it) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[it.id]) delete next[it.id];
      else next[it.id] = it.qty; // 預設全數退貨
      return next;
    });
  };
  const setItemQty = (it, value) => {
    const q = Math.max(1, Math.min(it.qty, parseInt(value, 10) || 1));
    setSelectedItems(prev => ({ ...prev, [it.id]: q }));
  };
  const isFullOrder = (order.items?.length || 0) > 0 && order.items.every(it => selectedItems[it.id] === it.qty);
  const toggleAllItems = () => {
    if (isFullOrder) {
      setSelectedItems({});
    } else {
      setSelectedItems(Object.fromEntries((order.items || []).map(it => [it.id, it.qty])));
    }
  };
  const selectedCount = Object.keys(selectedItems).length;
  const refundPreview = (order.items || []).reduce(
    (sum, it) => sum + (selectedItems[it.id] ? Number(it.price_snapshot) * selectedItems[it.id] : 0),
    0,
  );

  // 選取範圍內的代購商品（特殊訂購商品僅瑕疵/規格錯誤可退）
  const hasPreorder = (order.items || []).some(it => selectedItems[it.id] && it.is_preorder);
  const preorderOnlyReasons = ['DEFECT', 'MISMATCH'];

  const deadline = returnDeadline(order);

  const submit = async () => {
    setError('');
    if (selectedCount === 0) return setError('請勾選退貨商品');
    if (!description.trim()) return setError('請填寫退貨原因說明');
    if (hasPreorder && !preorderOnlyReasons.includes(returnReason)) {
      return setError('代購商品為特殊訂購商品，僅商品瑕疵或規格錯誤可申請退貨');
    }
    if (!refundBankCode.trim() || !refundAccount.trim() || !refundAccountName.trim()) {
      return setError('請填寫退款帳戶資料（銀行、帳號、戶名）');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      // 🆕 退貨範圍：勾選商品與數量
      formData.append('items', JSON.stringify(
        Object.entries(selectedItems).map(([orderItemId, qty]) => ({ orderItemId: Number(orderItemId), qty })),
      ));
      formData.append('returnReason', returnReason);
      formData.append('description', description);
      formData.append('refundBankCode', refundBankCode.trim());
      formData.append('refundAccount', refundAccount.trim());
      formData.append('refundAccountName', refundAccountName.trim());
      files.forEach(file => formData.append('media', file));

      await api.post(`/consumer/orders/${order.id}/returns`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
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
      <div className="relative bg-gray-800 rounded-2xl border border-gray-600 max-w-md w-full p-4 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
          <h3 className="text-lg font-bold">🔄 申請退貨</h3>
          <p className="text-sm text-gray-400">訂單 #{order.order_number}</p>
          {deadline && (
            <span className="text-xs text-blue-300 bg-blue-900/20 border border-blue-600/30 rounded-lg px-2 py-0.5 whitespace-nowrap">
              📅 退貨期限：{deadline.toLocaleDateString('zh-TW')}（收貨後 7 天內）
            </span>
          )}
        </div>

        <div className="space-y-3">

          {/* 退貨範圍：勾選商品與數量 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">退貨範圍 *（勾選商品與數量）</label>
            {/* 整單退貨（全選） */}
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={isFullOrder}
                onChange={toggleAllItems}
                className="text-orange-500"
              />
              <span className="font-medium">整單退貨（全部商品）</span>
              <span className="text-xs text-gray-500">NT$ {Number(order.total_amount || 0).toLocaleString()}</span>
            </label>
            <div className="space-y-1.5">
              {order.items?.map(it => {
                const selQty = selectedItems[it.id] || 0;
                return (
                  <div key={it.id} className={`border rounded-lg p-1.5 transition ${selQty ? 'border-orange-500/60 bg-orange-900/10' : 'border-gray-700/60'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selQty > 0}
                        onChange={() => toggleItem(it)}
                        className="text-orange-500"
                      />
                      <span className="flex-1 text-sm">
                        {it.name_snapshot || it.part?.name}
                        <span className="text-xs text-gray-500"> ×{it.qty} ｜ 單價 NT$ {Number(it.price_snapshot).toLocaleString()}</span>
                        {it.is_preorder && (
                          <span className="ml-1.5 px-1 py-0.5 rounded text-xs text-gray-400 bg-gray-800/60 border border-gray-600/50">代購</span>
                        )}
                      </span>
                      {selQty > 0 && (
                        <span className="text-xs text-green-300 font-bold whitespace-nowrap">
                          NT$ {(Number(it.price_snapshot) * selQty).toLocaleString()}
                        </span>
                      )}
                    </label>
                    {selQty > 0 && (
                      <div className="flex items-center gap-2 mt-1.5 ml-6">
                        <span className="text-xs text-gray-400">退貨數量</span>
                        <input
                          type="number"
                          min="1"
                          max={it.qty}
                          value={selQty}
                          onChange={e => setItemQty(it, e.target.value)}
                          className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm font-mono text-center"
                        />
                        <span className="text-xs text-gray-500">/ {it.qty}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hasPreorder && (
              <p className="text-xs text-orange-300 mt-1.5">
                ⚠️ 含代購商品：特殊訂購商品不接受退貨、取消或退款，僅商品規格錯誤或瑕疵可申請。
              </p>
            )}
          </div>

          {/* 退貨原因 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">退貨原因 *</label>
            <div className="grid grid-cols-2 gap-2">
              {RETURN_REASON_OPTIONS.map(opt => {
                const disabled = hasPreorder && !preorderOnlyReasons.includes(opt.key);
                const lockTip = '🔒 代購商品為特殊訂購商品，不接受退貨、取消或退款，僅商品規格錯誤或瑕疵可申請';
                return (
                  <label
                    key={opt.key}
                    title={disabled ? lockTip : opt.hint}
                    className={`flex items-start gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="radio"
                      name="returnReason"
                      value={opt.key}
                      checked={returnReason === opt.key}
                      disabled={disabled}
                      onChange={() => setReturnReason(opt.key)}
                      className="mt-1 text-blue-500"
                    />
                    <span>
                      <span className="text-sm">
                        {opt.label}
                        {disabled && <span className="ml-1 text-xs" aria-hidden="true">🔒</span>}
                      </span>
                      <span className="block text-xs text-gray-500">{opt.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 退款金額預覽 */}
          <div className="bg-gray-900/40 border border-gray-700/40 rounded-xl p-2 text-sm">
            💰 預估退款金額：<span className="font-bold text-green-300">NT$ {refundPreview.toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-2">（最終以客服核可為主）</span>
          </div>

          {/* 說明 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400">退貨說明 *</label>
              {/* 🆕 字數統計，引導寫出具體描述 */}
              <span className={`text-xs ${description.length >= 200 ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                {description.length}/200
              </span>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 200))}
              maxLength={200}
              placeholder="請具體描述退貨原因（如瑕疵位置、規格差異），方便客服快速審核"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-sm min-h-[72px]"
            />
          </div>

          {/* 退款帳戶 */}
          <div className="bg-green-900/10 border border-green-700/30 rounded-xl p-2.5 space-y-2">
            <p className="text-xs text-green-300 font-bold">🏦 退款帳戶資料（退款將匯入此帳戶）*</p>
            {refundPrefilled && (
              <p className="text-xs text-green-400">✔ 已自動填入上次退款帳戶，如未變更可直接使用</p>
            )}
            {/* 🆕 銀行代碼：下拉選單，選擇後同時顯示代碼與銀行名稱 */}
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">銀行 *（下拉選擇）</label>
              <select
                value={refundBankCode}
                onChange={e => setRefundBankCode(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
              >
                <option value="">請選擇銀行</option>
                {BANK_LIST.map(b => (
                  <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
                ))}
              </select>
              {refundBankCode && (
                <p className="text-xs mt-0.5 font-medium">
                  {findBank(refundBankCode)
                    ? <span className="text-gray-300">✔ {refundBankCode} - {BANK_NAME_BY_CODE[refundBankCode]}</span>
                    : <span className="text-red-400">⚠️ 未列於清單，請洽客服確認代碼</span>}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-0.5">帳號</label>
                <input
                  value={refundAccount}
                  onChange={e => setRefundAccount(e.target.value.replace(/\D/g, '').slice(0, 20))}
                  inputMode="numeric"
                  placeholder="請輸入退款帳號"
                  className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-0.5">戶名</label>
                <input
                  value={refundAccountName}
                  onChange={e => setRefundAccountName(e.target.value)}
                  placeholder="請輸入帳戶戶名"
                  className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* 附件 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">上傳照片或影片 (可多選，每檔上限 20 MB)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800"
            />
            {files.length > 0 && (
              <p className="text-xs text-cyan-400 mt-2">已選擇 {files.length} 個檔案</p>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium">取消</button>
          <button onClick={submit} disabled={submitting}
            className="flex-[2] py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-sm font-bold">
            {submitting ? '送出中…' : '送出退貨申請'}
          </button>
        </div>
      </div>
    </div>
  );
}
