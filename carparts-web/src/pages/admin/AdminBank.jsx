// src/pages/admin/AdminBank.jsx — 管理端：銀行對帳
import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';

export default function AdminBank() {
  const [data, setData] = useState(null);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState('');
  const [selectedTransfers, setSelectedTransfers] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  // ⚠️ 一次可回 6000+ 筆交易，全量渲染會讓 DOM 節點爆量（實測 190K 字元、凍結數秒）。
  //    加搜尋 + 顯示上限，預設只畫前 300 筆。
  const [txSearch, setTxSearch] = useState('');
  const TX_PREVIEW_LIMIT = 300;

  const importExcel = async () => {
    setImporting(true);
    try {
      const res = await adminClient.post('/bank/import-excel');
      toast.success(res.data.message);
      setData(null);
      loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally { setImporting(false); }
  };

  const loadTransactions = () => {
    setLoading(true);
    adminClient.get('/bank/transactions')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, []);

  // 🆕 自動同步預選的銀行交易到 state，避免「手動確認」按鈕因狀態未同步而無法點擊
  useEffect(() => {
    if (reconcileResult?.manual_review && data?.transactions) {
      const initialSelected = {};
      reconcileResult.manual_review.forEach(o => {
        if (o.excel_rows) {
          const fps = data.transactions
            .filter(t => o.excel_rows.some(r => r.row === t.row))
            .map(t => t.fingerprint)
            .filter(Boolean);
          if (fps.length > 0) {
            initialSelected[o.order_id] = fps;
          }
        }
      });
      setSelectedTransfers(prev => ({ ...initialSelected, ...prev }));
    }
  }, [reconcileResult, data]);

  const runReconcile = async () => {
    setReconciling(true);
    setError('');
    try {
      const res = await adminClient.post('/bank/reconcile');
      setReconcileResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setReconciling(false);
    }
  };

  const manualConfirm = async (orderId, stage) => {
    const fingerprints = selectedTransfers[orderId] || [];
    if (!fingerprints.length || !reviewed[orderId] || confirming) return;
    setConfirming(true);
    try {
      await adminClient.post(`/orders/${orderId}/manual-confirm`, { 
        stage, 
        transactionFingerprints: fingerprints, 
        historyReviewed: true 
      });
      toast.success('已手動確認');
      // 從待審核清單移除
      setReconcileResult(prev => prev ? ({
        ...prev,
        manual_review: prev.manual_review.filter(o => o.order_id !== orderId),
      }) : prev);
      // 清除該筆訂單的選取狀態
      setSelectedTransfers(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setReviewed(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (err) {
      const errorData = err.response?.data;
      toast.error(errorData?.error || err.message);
      // 🆕 發生併發衝突或已被認列時，自動重新整理對帳結果
      if (errorData?.code === 'STATUS_TRANSITION_RACE' || errorData?.code === 'BANK_TRANSFER_CLAIMED') {
        runReconcile();
      }
    } finally { setConfirming(false); }
  };

  // 交易搜尋：金額 / 匯款人 / 備註（不分大小寫）
  const txKeyword = txSearch.trim().toLowerCase();
  const filteredTx = (data?.transactions || []).filter(t => {
    if (!txKeyword) return true;
    return [t.amount, t.remitter, t.memo]
      .some(v => String(v ?? '').toLowerCase().includes(txKeyword));
  });


  return (
    <div className="p-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">🏦 銀行對帳</h1>
        <div className="flex gap-3">
          <button
            onClick={importExcel}
            disabled={importing || loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-sm font-bold"
          >
            {importing ? '匯入中…' : '📥 匯入/更新匯款資料'}
          </button>
          <button
            onClick={runReconcile}
            disabled={reconciling || loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-bold"
          >
            {reconciling ? '比對中…' : '▶ 執行候選比對'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 p-4 rounded-xl mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Excel 來源資訊 */}
      {data && (
        <div className="bg-surface-800/60 border border-surface-700 rounded-xl p-4 mb-6 text-sm text-surface-400">
          📄 Excel 來源：<span className="font-mono text-surface-300">{data.excel_path}</span>
          ｜共 <span className="text-white font-bold">{data.transactions.length}</span> 筆存款交易
          ｜等待收款訂單：<span className="text-white font-bold">{data.pending_orders.length}</span> 筆
        </div>
      )}

      {/* ===== 區塊一：自動比對結果 ===== */}
      {reconcileResult && (
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              ['比對成功', reconcileResult.summary.matched, 'text-green-400'],
              ['待人工審核', reconcileResult.summary.manual_review, 'text-yellow-400'],
              ['未匹配交易', reconcileResult.summary.unmatched_transactions, 'text-surface-400'],
              ['Excel 總交易', reconcileResult.summary.total_transactions, 'text-blue-400'],
            ].map(([label, val, color]) => (
              <div key={label} className="bg-surface-800 rounded-xl p-4 border border-surface-700">
                <p className="text-xs text-surface-500">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
              </div>
            ))}
          </div>

          {/* 比對成功清單 */}
          {reconcileResult.matched.length > 0 && (
            <div className="bg-surface-800 rounded-xl border border-green-700/40 p-5 mb-4">
              <h3 className="font-bold text-green-400 mb-3">✅ 系統自動比對成功</h3>
              <div className="space-y-2">
                {reconcileResult.matched.map(m => (
                  <div key={m.order_id} className="bg-surface-900/60 rounded-lg p-3 text-sm flex flex-wrap justify-between gap-2">
                    <div>
                      <span className="text-blue-400 font-bold">#{m.order_number}</span>
                      <span className="text-surface-400 ml-2">{m.user}</span>
                      <span className="ml-2 px-2 py-0.5 rounded bg-green-900/40 text-green-300 text-xs">
                        已比對到匯款人：{m.remitter || '（Excel 未提供）'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-bold">NT$ {m.expected_amount.toLocaleString()}</span>
                      {m.excel_rows && (
                        <span className="text-surface-500 text-xs ml-2">
                          Excel 第 {m.excel_rows.map(r => r.row).join('+')} 列
                          {m.excel_rows.length > 1 && `（分次匯款 ${m.excel_rows.length} 筆合計）`}
                        </span>
                      )}
                      <span className="ml-2 px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 text-xs">{m.new_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 待人工審核清單 */}
          {reconcileResult.manual_review.length > 0 && (
            <div className="bg-surface-800 rounded-xl border border-yellow-700/40 p-5">
              <h3 className="font-bold text-yellow-400 mb-3">⚠️ 待人工審核（比對失敗）</h3>
              <div className="space-y-2">
                {reconcileResult.manual_review.map(o => {
                  // 🆕 計算該筆訂單目前的選取指紋與金額合計
                  const selectedFPs = selectedTransfers[o.order_id] ||
                    (o.excel_rows
                      ? (data?.transactions || []).filter(t => o.excel_rows.some(r => r.row === t.row)).map(t => t.fingerprint).filter(Boolean)
                      : []);
                  const sum = (data?.transactions || [])
                    .filter(t => selectedFPs.includes(t.fingerprint))
                    .reduce((s, t) => s + Number(t.amount), 0);
                  const isAmountMatch = sum === Number(o.expected_amount);
                  const hasSelection = selectedFPs.length > 0;

                  return (
                    <div key={o.order_id} className="bg-surface-900/60 rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-blue-400 font-bold">#{o.order_number}</span>
                        <span className="text-surface-400 ml-2">{o.user}</span>
                        <div className="text-xs text-surface-500 mt-0.5">{o.reason}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold">NT$ {o.expected_amount.toLocaleString()}</span>
                        <span className="text-xs text-surface-500">末五碼 {o.expected_last5}</span>
                        <select
                          aria-label="銀行交易（可多選，分次匯款）"
                          multiple
                          size={Math.min(4, (data?.transactions || []).filter(t => t.fingerprint && !t.claimed && !t.ambiguous).length || 1)}
                          className="bg-surface-900 text-white min-w-40"
                          value={selectedFPs}
                          onChange={e => {
                            const vals = Array.from(e.target.selectedOptions).map(op => op.value);
                            setSelectedTransfers(prev => {
                              const prevVals = prev[o.order_id] || [];
                              // 🆕 只有當選取內容真的改變時，才重設 reviewed
                              if (JSON.stringify([...prevVals].sort()) !== JSON.stringify([...vals].sort())) {
                                setReviewed(r => ({ ...r, [o.order_id]: false }));
                              }
                              return { ...prev, [o.order_id]: vals };
                            });
                          }}
                        >
                          {(data?.transactions || []).filter(t => t.fingerprint && !t.claimed && !t.ambiguous).map(t => (
                            <option key={t.fingerprint} value={t.fingerprint}>
                              {t.date}｜{t.amount}｜{t.memo}
                            </option>
                          ))}
                        </select>
                        {hasSelection && (
                          <span className={`text-xs font-bold ${isAmountMatch ? 'text-green-400' : 'text-red-400'}`}>
                            已選合計 NT$ {sum.toLocaleString()}
                            {isAmountMatch ? ' ✅' : ` ≠ 應付 ${o.expected_amount.toLocaleString()}`}
                          </span>
                        )}
                        {o.excel_rows && (
                          <div className="w-full text-xs text-blue-300 bg-blue-900/20 rounded-lg px-2 py-1">
                            💡 系統比對到分次匯款：{o.excel_rows.map(r => `${r.date}｜NT$ ${Number(r.amount).toLocaleString()}`).join(' + ')}
                          </div>
                        )}
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!reviewed[o.order_id]}
                            onChange={e => setReviewed(prev => ({ ...prev, [o.order_id]: e.target.checked }))}
                          />
                          <span className="text-xs text-surface-300">已核對銀行原始紀錄及歷史收款，確認未重複認列</span>
                        </label>
                        <button
                          disabled={confirming || !hasSelection || !reviewed[o.order_id] || !isAmountMatch}
                          onClick={() => manualConfirm(o.order_id, o.stage)}
                          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition"
                        >
                          手動確認
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 區塊二：Excel 原始交易 + 等款訂單 ===== */}
      {loading ? (
        <p className="text-surface-400">載入中…</p>
      ) : data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Excel 交易 */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
            <h3 className="font-bold text-white mb-3">📄 Excel 存款交易</h3>
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {/* 搜尋：6000+ 筆無法用眼睛找，且全量渲染會卡住 */}
              <input
                type="text"
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                placeholder="🔍 搜尋金額 / 匯款人 / 備註（例：9000、王小明）"
                className="mb-2 w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:border-blue-500 focus:outline-none"
              />
              {data.transactions.length === 0 && <p className="text-surface-500 text-sm">無交易資料</p>}
              {data.transactions.length > 0 && filteredTx.length === 0 && (
                <p className="text-surface-500 text-sm">找不到符合「{txSearch}」的交易</p>
              )}
              {filteredTx.slice(0, TX_PREVIEW_LIMIT)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(t => (
                <div key={t.row} className="bg-surface-900/60 rounded-lg px-3 py-2 text-sm grid grid-cols-[6rem_minmax(9rem,1fr)] sm:grid-cols-[6rem_9rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
                  <span className="text-surface-400 whitespace-nowrap">{t.date}</span>
                  <span className="text-green-400 font-mono tabular-nums text-right whitespace-nowrap">NT$ {t.amount.toLocaleString()}</span>
                  <span className="text-surface-500 truncate min-w-0 col-span-2 sm:col-span-1">{t.memo || t.remitter}</span>
                </div>
              ))}
              {filteredTx.length > TX_PREVIEW_LIMIT && (
                <p className="pt-2 text-center text-xs text-surface-500">
                  僅顯示前 {TX_PREVIEW_LIMIT} 筆（共 {filteredTx.length.toLocaleString()} 筆符合），
                  請用上方搜尋縮小範圍
                </p>
              )}
            </div>
          </div>

          {/* 等待收款訂單 */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
            <h3 className="font-bold text-white mb-3">⏳ 等待收款訂單</h3>
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {data.pending_orders.length === 0 && <p className="text-surface-500 text-sm">無待收款訂單</p>}
              {data.pending_orders.map(o => {
                const remitted = Number(o.bankDepositActualAmount || 0);
                const claimedSum = (o.remittance_claims || []).reduce((s, c) => s + Number(c.amount), 0);
                const isCOD = o.payment_method === 'COD';
                const codPending = isCOD ? Math.max(0, Number(o.balanceAmount || 0) - claimedSum) : 0;
                const pendingRemit = Math.max(0, remitted - claimedSum);
                return (
                <div key={o.id} className="bg-surface-900/60 rounded-lg px-3 py-2 text-sm">
                  <div className="flex justify-between flex-wrap gap-1">
                    <span className="text-blue-400 font-bold">
                      #{o.order_number}
                      <span className="text-white font-mono ml-2 text-sm">總額 NT$ {Number(o.total_amount).toLocaleString()}</span>
                    </span>
                    {remitted > 0 && (
                      <span className={`text-xs font-bold ${remitted >= Number(o.total_amount) ? 'text-green-400' : 'text-yellow-400'}`}>
                        ✅ 已匯累計：NT$ {remitted.toLocaleString()}
                        {remitted >= Number(o.total_amount) ? ' ｜ 🎉 金額已足' : ` ｜ ⏳ 尚欠 NT$ ${(Number(o.total_amount) - remitted).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    訂購人：{o.receiver_name || o.user?.name || '—'}｜{o.receiver_phone || o.user?.phone || '—'}｜{o.shipping_address || '—'}
                  </div>
                  {(o.remittance_claims?.length > 0 || pendingRemit > 0 || codPending > 0) && (
                    <div className="text-xs text-blue-300/80 mt-0.5">
                      匯款清單：
                      {(o.remittance_claims || []).map((c, i) => (
                        <div key={i} className="ml-3">
                          {c.transactionDate} 末五碼 {c.last5 || o.bankLastFiveDigits || '—'} 金額 {Number(c.amount).toLocaleString()}元 入帳
                        </div>
                      ))}
                      {pendingRemit > 0 && !isCOD && (
                        <div className="ml-3 text-yellow-400">
                          {o.bankDepositDate ? new Date(o.bankDepositDate).toLocaleDateString('zh-TW') : '—'} 末五碼 {o.bankLastFiveDigits || '—'} 金額 {pendingRemit.toLocaleString()}元 待核（客戶已補登，等待銀行入帳）
                        </div>
                      )}
                      {codPending > 0 && (
                        <div className="ml-3 text-orange-300">
                          🚚 貨到付款 金額 {Number(o.balanceAmount || 0).toLocaleString()}元（含 2% 手續費 NT$ {Number(o.cod_fee || 0).toLocaleString()}），出貨後收款
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}