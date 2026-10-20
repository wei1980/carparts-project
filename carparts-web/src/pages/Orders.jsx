// src/pages/Orders.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../api'; // eslint-disable-line no-unused-vars
import { consumerClient as api } from '../api/client';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';
import toast from 'react-hot-toast';
import { confirmDialog } from '../components/ConfirmDialog';

import {
  statusMap,
  statusColor,
  orderTypeMap,
  PROGRESS_STEPS,
  STATUS_STEP_INDEX,
  RETURN_REASON_MAP,
  RETURN_STATUS_MAP,
  RETURN_STATUS_COLOR,
  returnDeadline,
  canReturnOrder,
  BANK_NAME_BY_CODE,
  carrierTrackUrl,
} from '../constants/orders';
import IssueReportModal from '../components/orders/IssueReportModal';
import IssueEditModal from '../components/orders/IssueEditModal';
import ReturnRequestModal from '../components/orders/ReturnRequestModal';
import BankInfoModal from '../components/orders/BankInfoModal';

function OrderProgress({ status, items }) {
  if (status === 'CANCELLED') {
    return (
      <div className="mb-2 text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-1.5 inline-block">
        ✕ 此訂單已取消
      </div>
    );
  }
  
  let current = STATUS_STEP_INDEX[status] ?? 0;

  // 🆕 已完成：全部 6 步皆打勾（最後一步「完成」也顯示 ✓）
  if (status === 'COMPLETED') current = PROGRESS_STEPS.length;
  
  // 🆕 根據商品實際狀態，強制推進進度條
  if (items && items.length > 0) {
    // 如果所有商品都已出貨，至少推進到「已出貨」(索引 4)
    if (items.every(i => i.shipped_at)) {
      current = Math.max(current, 4);
    } 
    // 如果所有商品都已到貨（但還沒全出貨），至少推進到「到貨」(索引 3)
    else if (items.every(i => i.arrived_at)) {
      current = Math.max(current, 3);
    }
  }

  return (
    <div className="mb-2 flex items-center">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition',
                done ? 'bg-green-600 border-green-500 text-white'
                : active ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20'
                : 'bg-gray-700 border-gray-600 text-gray-500',
              ].join(' ')}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`mt-1 text-xs whitespace-nowrap ${active ? 'text-blue-300 font-bold' : done ? 'text-green-400/80' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${i < current ? 'bg-green-600' : 'bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== 🆕 附件燈箱（Lightbox 點擊放大）=====
function Lightbox({ url, onClose }) {
  const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-10" onClick={onClose} role="dialog" aria-label="附件放大預覽">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
      <div className="relative w-full max-w-5xl" onClick={e => e.stopPropagation()}>
        {isVideo ? (
          <video src={url} controls autoPlay className="w-full max-h-[85vh] rounded-xl bg-black" />
        ) : (
          <img src={url} alt="附件放大預覽" className="w-full max-h-[85vh] object-contain rounded-xl" />
        )}
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white text-3xl leading-none transition" aria-label="關閉">✕</button>
      </div>
    </div>
  );
}

// ===== 🆕 售後進度軌跡（步驟條）=====
function StepTracker({ steps, current }) {
  return (
    <div className="flex items-start mb-2.5">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 ${done ? 'bg-amber-500 border-amber-400' : active ? 'bg-blue-500 border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-700 border-gray-600'}`} />
              <span className={`mt-1 text-xs whitespace-nowrap ${active ? 'text-blue-300 font-bold' : done ? 'text-amber-400/90' : 'text-gray-500'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[9px] min-w-3 ${i < current ? 'bg-amber-500' : 'bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrackingLink({ code, carrier }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 複製失敗忽略 */ }
  };
  return (
    <span className="inline-flex items-center gap-1">
      <a href={carrierTrackUrl(carrier, code)} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-cyan-100 transition" title={carrier ? `至「${carrier.name}」查詢物流` : '點擊查詢物流'}>
        {code}
      </a>
      <button type="button" onClick={copy} className="px-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-cyan-200 transition" title="複製單號">
        {copied ? '✓ 已複製' : '⧉'}
      </button>
    </span>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOrder, setModalOrder] = useState(null);
  const [reportModalOrder, setReportModalOrder] = useState(null); // 🆕 售後回報 Modal 狀態
  const [editingIssue, setEditingIssue] = useState(null);        // 🆕 { order, issue }
  const [returnModalOrder, setReturnModalOrder] = useState(null); // 🆕 退貨申請 Modal 狀態
  const [cancellingId, setCancellingId] = useState(null);
  const [cancellingReturnId, setCancellingReturnId] = useState(null); // 🆕 撤回退貨中
  const [lightboxUrl, setLightboxUrl] = useState(null); // 🆕 附件燈箱
  const [followupDrafts, setFollowupDrafts] = useState({}); // 🆕 售後回覆草稿 { issueId: text }
  const [followupSubmitting, setFollowupSubmitting] = useState({}); // 🆕 回覆送出中 { issueId: bool }
  // 🆕 P1 售後區摺疊 { [orderId-issueId]: bool }
  const [collapsed, setCollapsed] = useState({});
  
  // 下單成功通知（從 Checkout sessionStorage 讀取，一次性）
  const [placedInfo, setPlacedInfo] = useState(() => {
    try {
      const raw = sessionStorage.getItem('orderJustPlaced');
      if (raw) { sessionStorage.removeItem('orderJustPlaced'); return JSON.parse(raw); }
    } catch { /* ignore */ }
    return null;
  });
  const navigate = useNavigate();

  const loadOrders = (p = page) => {
    setLoading(true);
    setLoadError(false);
    api.get('/consumer/orders', {
      params: { page: p, pageSize: 10 },
    })
      .then(res => {
        // 分頁格式 { orders, pagination }；相容舊純陣列格式
        if (Array.isArray(res.data)) {
          setOrders(res.data);
          setPagination(null);
        } else {
          setOrders(res.data.orders || []);
          setPagination(res.data.pagination || null);
        }
      })
      .catch(err => { console.warn('載入失敗:', err?.message); setLoadError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // 可補登匯款的狀態（分次匯款：待付款／待審核／已付訂金／待補尾款皆可繼續匯款累加）
  const canSubmitBank = (o) =>
    ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE'].includes(o.status);

  // 代購單：訂金已付且到貨 → 可補尾款（此流程由管理端推進到 AWAITING_BALANCE）
  const canPayBalance = (o) => o.status === 'AWAITING_BALANCE';

  // 🆕 取消訂單（待付款／匯款審核中可取消，後端會回補庫存）
  const cancelOrder = async (order) => {
    const confirmed = await confirmDialog({
      message: `確定要取消訂單 #${order.order_number} 嗎？\n\n` +
      `⚠️ 取消後此訂單無法恢復，庫存將自動回補。`
    });
    if (!confirmed) return;

    setCancellingId(order.id);
    try {
      await api.patch(`/consumer/orders/${order.id}/cancel`, {});
      toast.success(`✅ 訂單 #${order.order_number} 已取消`);
      loadOrders();
    } catch (err) {
      toast.error('取消失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setCancellingId(null);
    }
  };

  // 可取消條件：待付款／匯款審核中（入款確認前）／已付訂金但尚未入款確認（與後端 orderCancellation 一致）
  const canCancel = (o) =>
    o.status === 'PENDING_PAYMENT' ||
    o.status === 'PAYMENT_REVIEW' ||
    (o.status === 'DEPOSIT_PAID' && !o.depositPaidAt);

  // 🆕 刪除售後回報
  const deleteIssue = async (order, issue) => {
    const confirmed = await confirmDialog({
      message: `確定要刪除這筆售後回報嗎？\n\n` +
      `⚠️ 刪除後無法恢復，附件也會一併移除。`
    });
    if (!confirmed) return;

    try {
      await api.delete(`/consumer/orders/${order.id}/issues/${issue.id}`);
      toast.success('✅ 回報已刪除');
      loadOrders(page);
    } catch (err) {
      toast.error('刪除失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 撤回退貨申請（僅待審核）
  const cancelReturn = async (order, ret) => {
    const confirmed = await confirmDialog({
      message: `確定要撤回退貨申請 #${ret.id} 嗎？\n\n` +
      `⚠️ 撤回後無法恢復，需重新申請。`
    });
    if (!confirmed) return;

    setCancellingReturnId(ret.id);
    try {
      await api.delete(`/consumer/orders/${order.id}/returns/${ret.id}`);
      toast.success('✅ 退貨申請已撤回');
      loadOrders(page);
    } catch (err) {
      toast.error('撤回失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setCancellingReturnId(null);
    }
  };

  // 🆕 買家針對售後回報追蹤回覆（延續對話）
  const submitFollowup = async (order, issue) => {
    const text = (followupDrafts[issue.id] || '').trim();
    if (!text) return;
    setFollowupSubmitting(prev => ({ ...prev, [issue.id]: true }));
    try {
      await api.post(`/consumer/orders/${order.id}/issues/${issue.id}/notes`, { text });
      setFollowupDrafts(prev => ({ ...prev, [issue.id]: '' }));
      loadOrders(page);
    } catch (err) {
      toast.error('回覆失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setFollowupSubmitting(prev => ({ ...prev, [issue.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <main className="p-8 pt-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">📋 我的訂單</h1>

        {/* 下單成功通知（Checkout 跳轉過來時顯示完整匯款資訊） */}
        {placedInfo && (
          <div className="mb-6 bg-emerald-900/20 border border-emerald-500/40 rounded-xl p-5" role="status">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-bold text-emerald-300">✅ 訂單已成立！{placedInfo.is_import ? '（進口代購）' : ''}</p>
              <button onClick={() => setPlacedInfo(null)} aria-label="關閉通知" className="text-emerald-400/60 hover:text-emerald-200 transition">✕</button>
            </div>
            <div className="text-sm text-emerald-100 space-y-1">
              <p>訂單編號：<span className="font-mono font-bold">{placedInfo.order_number}</span></p>
              <p>💰 本次應付{placedInfo.is_import ? '（含代購訂金）' : ''}金額：<b>{placedInfo.payable_amount}</b></p>
              <p>🏦 匯款帳戶 銀行：<span className="font-mono font-bold">{placedInfo.bank_code}</span> ({BANK_NAME_BY_CODE[placedInfo.bank_code]?.replace('商業銀行', '') || '中國信託'}) 帳號：{placedInfo.account_number && <span className="font-mono font-bold tracking-wider">{placedInfo.account_number}</span>}</p>
              <p className="text-xs text-emerald-200/70 mt-1.5">
                📌 匯款後請在本頁點「補登匯款資料」
                {placedInfo.is_import ? ' · 📦 進口商品預計 2–3 週到貨' : ''}
                {placedInfo.need_installation ? ' · 🔧 安裝服務可從 [車廠預約] 選擇車廠與時間' : ''}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-400">載入訂單中...</div>
        ) : loadError ? (
          <ErrorState message="訂單載入失敗" onRetry={() => loadOrders(page)} />
        ) : orders.length === 0 ? (
          <div className="bg-gray-800 p-10 rounded-xl text-center border border-gray-700">
            <p className="text-gray-400 text-lg mb-4">尚無訂單記錄</p>
            <button onClick={() => navigate('/shop')} className="text-blue-400 hover:text-blue-300 transition underline">
              前往商城購物 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-bold text-blue-400">#{order.order_number}</span>
                  {/* 🆕 P2 訂單編號複製 */}
                  <button
                    type="button"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(order.order_number); } catch { /* ignore */ }
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 transition"
                    title="複製訂單編號"
                  >⧉</button>
                  {(() => {
                    // 🆕 狀態優先級：訂單觸發售後（問題回報或進行中退貨）時，最上面只顯示「最新狀態」（售後階段），原訂單狀態移入 tooltip
                    const activeAftersale =
                      (order.issues && order.issues.length > 0) ||
                      (order.returns && order.returns.some(r => ['PENDING', 'APPROVED', 'RECEIVED'].includes(r.status)));
                    const label = statusMap[order.status] || order.status;
                    // 最新售後狀態：進行中退貨以最進階的一筆為準，否則為售後處理中
                    const latestAftersaleLabel = (() => {
                      const activeReturn = (order.returns || [])
                        .filter(r => ['PENDING', 'APPROVED', 'RECEIVED'].includes(r.status))
                        .sort((a, b) => ['PENDING', 'APPROVED', 'RECEIVED'].indexOf(a.status) - ['PENDING', 'APPROVED', 'RECEIVED'].indexOf(b.status))
                        .pop();
                      if (activeReturn) {
                        return { PENDING: '退貨待審核', APPROVED: '退貨已核可', RECEIVED: '退貨已收貨' }[activeReturn.status];
                      }
                      return '售後處理中';
                    })();
                    return activeAftersale ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-amber-400 bg-amber-900/30 border border-amber-700/50" title={`訂單有進行中的售後處理（原訂單狀態：${label}）`}>
                        {latestAftersaleLabel}
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[order.status] || 'text-gray-400'}`}>
                        {label}
                      </span>
                    );
                  })()}
                  {/* 🆕 P1 售後中時仍顯示原訂單狀態（mobile 無 hover，tooltip 看不到） */}
                  {(() => {
                    const activeAftersale =
                      (order.issues && order.issues.length > 0) ||
                      (order.returns && order.returns.some(r => ['PENDING', 'APPROVED', 'RECEIVED'].includes(r.status)));
                    return activeAftersale ? (
                      <span className="text-xs text-gray-500">
                        原訂單狀態：{statusMap[order.status] || order.status}
                      </span>
                    ) : null;
                  })()}
                  {/* 訂單類型（中性屬性：外框風格） */}
                  <span className="px-2.5 py-0.5 rounded-full text-xs text-gray-400 border border-gray-600/60">
                    {orderTypeMap[order.orderType] || '現貨'}
                  </span>
                  {/* 🆕 售後問題標籤 */}
                  {order.issues && order.issues.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-red-900/40 text-red-300 border border-red-700/50 font-bold">
                      🛠️ 商品異常/售後中
                    </span>
                  )}
                  {/* 🆕 退貨中標籤 */}
                  {order.returns && order.returns.some(r => ['PENDING', 'APPROVED', 'RECEIVED'].includes(r.status)) && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-orange-900/40 text-orange-300 border border-orange-700/50 font-bold">
                      🔄 退貨處理中
                    </span>
                  )}
                  {order.returns && order.returns.some(r => r.status === 'REFUNDED') && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-green-900/40 text-green-300 border border-green-700/50 font-bold">
                      🔄 已退款
                    </span>
                  )}
                  {/* 訂單日期 */}
                  <span className="text-xs text-gray-500 ml-auto">
                    🗓️ {new Date(order.created_at).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* 訂單進度條（置於訂單卡最上方）🆕 傳入 items */}
                <OrderProgress status={order.status} items={order.items} />

                <div className="text-sm text-gray-400 flex flex-wrap gap-x-2 gap-y-0.5 items-baseline">
                  <span>{order.items?.length || 0} 項商品</span>
                  {Number(order.shipping_fee) > 0 || Number(order.tax_amount) > 0 ? (
                    <>
                      <span className="text-gray-600">|</span>
                      <span>商品 NT$ {Number(order.subtotal_amount || 0).toLocaleString()}</span>
                      {Number(order.shipping_fee) > 0 && (
                        <>
                          <span className="text-gray-600">|</span>
                          <span>🚚 運費 NT$ {Number(order.shipping_fee).toLocaleString()}</span>
                        </>
                      )}
                      {Number(order.tax_amount) > 0 && (
                        <>
                          <span className="text-gray-600">|</span>
                          <span>🧾 稅金 NT$ {Number(order.tax_amount).toLocaleString()}</span>
                        </>
                      )}
                    </>
                  ) : null}
                  <span className="text-gray-600">|</span>
                  {/* 總額：最大字級加粗，一眼確認 */}
                  <span className="text-sm font-bold text-white">總額 NT$ {Number(order.total_amount || 0).toLocaleString()}</span>
                  {Number(order.bankDepositActualAmount) > 0 && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span className="text-green-300">✅ 已匯累計：NT$ {Number(order.bankDepositActualAmount).toLocaleString()}</span>
                      {Number(order.bankDepositActualAmount) >= Number(order.total_amount || 0) && (
                        <span className="ml-1 px-2 py-0.5 rounded text-xs bg-green-900/50 text-green-200 border border-green-600/50 font-bold" title="累計匯款已達應付總額">✅ 已付清</span>
                      )}
                    </>
                  )}
                </div>

                {/* 商品明細：商品 / 品牌 / 狀態 / 數量 / 單價 / 小計 */}
                {order.items?.length > 0 && (
                  <div className="mt-2 bg-gray-900/40 rounded-xl border border-gray-700/40 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-left text-xs">
                          <th className="px-3 py-1 font-medium">商品</th>
                          <th className="px-3 py-1 font-medium">品牌</th>
                          <th className="px-3 py-1 font-medium">狀態</th>
                          <th className="px-3 py-1 font-medium text-center">數量</th>
                          <th className="px-3 py-1 font-medium text-right">單價</th>
                          <th className="px-3 py-1 font-medium text-right pr-4">小計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map(it => (
                          <tr key={it.id} className="border-t border-gray-700/30">
                            <td className="px-3 py-1">
                              <span className="text-gray-200">{it.name_snapshot || it.part?.name}</span>
                              {/* 代購（特殊訂購）商品標籤 */}
                              {it.is_preorder && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs text-gray-400 bg-gray-800/60 border border-gray-600/50 whitespace-nowrap">
                                  {it.promised_weeks_min && it.promised_weeks_max
                                    ? `代購 預計${it.promised_weeks_min}-${it.promised_weeks_max}週`
                                    : (it.promised_weeks ? `代購 ${it.promised_weeks}週` : '代購')}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1 text-gray-500 text-xs">{it.part?.brand || '—'}</td>
                            <td className="px-3 py-1">
                              {(() => {
                                // 商品級單號優先；無商品級單號時回退訂單級國內單號（訂單已出貨，其餘商品視同已出貨）
                                const trackCode = it.tracking_code || order.trackingCodeDomestic;
                                const shipped = !!it.shipped_at || (['SHIPPED', 'COMPLETED'].includes(order.status) && !!order.trackingCodeDomestic);
                                if (shipped) {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded text-xs text-gray-300 bg-gray-800/60 border border-gray-600/50 whitespace-nowrap">
                                      🚚 已出貨{order.domesticCarrier ? `（${order.domesticCarrier.name}）` : ''} {trackCode && (
                                        <TrackingLink code={trackCode} carrier={order.domesticCarrier} />
                                      )}
                                    </span>
                                  );
                                }
                                if (it.arrived_at) {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-green-900/40 text-green-300 border border-green-700/40 whitespace-nowrap">
                                      ✓ 已到貨
                                    </span>
                                  );
                                }
                                return <span className="text-xs text-gray-600">備貨中</span>;
                              })()}
                            </td>
                            <td className="px-3 py-1 text-center text-gray-400">×{it.qty}</td>
                            <td className="px-3 py-1 text-right text-gray-400">NT$ {Number(it.price_snapshot).toLocaleString()}</td>
                            <td className="px-3 py-1 text-right text-gray-200 pr-4">NT$ {(Number(it.price_snapshot) * it.qty).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 🆕 客戶自己的售後回報紀錄（可摺疊） */}
                {order.issues && order.issues.length > 0 && (
                  <div className="mt-2 bg-red-900/10 border border-red-700/30 rounded-xl p-3">
                    <h4 className="text-sm font-bold text-red-300 mb-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCollapsed(prev => ({ ...prev, [`issues-${order.id}`]: !prev[`issues-${order.id}`] }))}
                        className="flex items-center gap-1.5"
                        title={collapsed[`issues-${order.id}`] ? '展開' : '摺疊'}
                      >
                        <span className={`inline-block transition-transform ${collapsed[`issues-${order.id}`] ? '' : 'rotate-90'}`}>▸</span>
                        🛠️ 您的售後回報紀錄
                      </button>
                      <span className="text-xs font-normal text-gray-400">
                        （共 {order.issues.length} 筆{order.issues.some(i => i.status === 'RESOLVED') ? '，已結案' : order.issues.some(i => i.status === 'PROCESSING') ? '，客服處理中' : '，待處理'}）
                      </span>
                    </h4>
                    {!collapsed[`issues-${order.id}`] && (
                    <div className="space-y-2">
                      {order.issues.map(issue => (
                        <div key={issue.id} className="bg-slate-900/60 rounded-lg p-2.5 text-xs">
                          <div className="flex justify-between items-center mb-1 gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-200 font-bold">
                              {issue.issueType === 'DEFECT' ? '商品瑕疵/損壞' : '規格/型號不符'}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-bold ${issue.status === 'RESOLVED' ? 'bg-green-900/50 text-green-200' : issue.status === 'PROCESSING' ? 'bg-amber-900/50 text-amber-200' : 'bg-slate-700/60 text-gray-300'}`}>
                              {issue.status === 'RESOLVED' ? '結案' : issue.status === 'PROCESSING' ? '客服處理中' : '已回報'}
                            </span>
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-gray-400">
                                {new Date(issue.createdAt).toLocaleString('zh-TW')}
                              </span>
                              {/* 🆕 編輯 / 刪除按鈕 */}
                              <button
                                type="button"
                                onClick={() => setEditingIssue({ order, issue })}
                                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-cyan-300 border border-slate-600 transition text-xs font-medium"
                              >
                                ✏️ 編輯
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteIssue(order, issue)}
                                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-red-800/60 text-red-300 border border-slate-600 hover:border-red-500 transition text-xs font-medium"
                              >
                                🗑️ 刪除
                              </button>
                            </div>
                          </div>
                          {/* 售後進度軌跡：已回報 → 客服處理中 → 結案 */}
                          <StepTracker
                            steps={['已回報', '客服處理中', '結案']}
                            current={issue.status === 'RESOLVED' ? 2 : issue.status === 'PROCESSING' ? 1 : 0}
                          />
                          <p className="text-gray-300 whitespace-pre-wrap">{issue.description}</p>
                          
                          {/* 🆕 顯示附件縮圖（圖片直接顯示預覽，影片與其他顯示圖示） */}
                          {issue.mediaUrls && issue.mediaUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {issue.mediaUrls.map((url, idx) => {
                                const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
                                const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                return (
                                  <a
                                    key={idx}
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => { if (isImage || isVideo) { e.preventDefault(); setLightboxUrl(fullUrl); } }}
                                    className="relative block w-24 h-24 rounded-lg overflow-hidden border border-slate-600 hover:border-cyan-400 transition group cursor-zoom-in"
                                    title={`附件 ${idx + 1}（點擊放大）`}
                                  >
                                    {isImage ? (
                                      <img
                                        src={fullUrl}
                                        alt={`附件 ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : isVideo ? (
                                      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                                        <span className="text-2xl">🎬</span>
                                        <span className="text-xs mt-0.5">影片</span>
                                      </div>
                                    ) : (
                                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl">
                                        📎
                                      </div>
                                    )}
                                    {/* Hover 覆蓋層 */}
                                    <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/20 transition flex items-center justify-center">
                                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/60 px-1.5 py-0.5 rounded">
                                        查看
                                      </span>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {/* 🆕 客服回覆紀錄（客戶端檢視） */}
                          {Array.isArray(issue.adminNotes) && issue.adminNotes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-amber-700/30">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-amber-300 font-bold text-xs">💬 客服回覆</span>
                                <span className="text-gray-500 text-xs">{issue.adminNotes.length} 筆</span>
                              </div>
                              <div className="space-y-1">
                                {issue.adminNotes.map((note, i) => (
                                  <div key={i} className="bg-amber-900/10 border border-amber-700/30 rounded px-2 py-1 text-xs">
                                    <div className="flex justify-between text-gray-400 mb-0.5">
                                      <span>👤 {note.byName || '客服'}</span>
                                      <span>{new Date(note.at).toLocaleString('zh-TW')}</span>
                                    </div>
                                    <p className="text-amber-100 whitespace-pre-wrap">{note.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 🆕 買家回覆入口（延續對話） */}
                          <div className="mt-2 pt-2 border-t border-slate-700/40">
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={followupDrafts[issue.id] || ''}
                                onChange={e => setFollowupDrafts(prev => ({ ...prev, [issue.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') submitFollowup(order, issue); }}
                                placeholder="回覆客服，延續對話…"
                                className="flex-1 min-w-0 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
                              />
                              <button
                                type="button"
                                onClick={() => submitFollowup(order, issue)}
                                disabled={followupSubmitting[issue.id] || !(followupDrafts[issue.id] || '').trim()}
                                className="px-2.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-bold text-white transition whitespace-nowrap"
                              >
                                {followupSubmitting[issue.id] ? '送出中…' : '回覆'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                )}

                {/* 🆕 退貨申請紀錄（可摺疊） */}
                {order.returns && order.returns.length > 0 && (
                  <div className="mt-2 bg-orange-900/10 border border-orange-700/30 rounded-xl p-3">
                    <h4 className="text-sm font-bold text-orange-300 mb-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCollapsed(prev => ({ ...prev, [`returns-${order.id}`]: !prev[`returns-${order.id}`] }))}
                        className="flex items-center gap-1.5"
                        title={collapsed[`returns-${order.id}`] ? '展開' : '摺疊'}
                      >
                        <span className={`inline-block transition-transform ${collapsed[`returns-${order.id}`] ? '' : 'rotate-90'}`}>▸</span>
                        🔄 退貨申請紀錄
                      </button>
                      <span className="text-xs font-normal text-gray-400">（共 {order.returns.length} 筆）</span>
                    </h4>
                    {!collapsed[`returns-${order.id}`] && (
                    <div className="space-y-2">
                      {order.returns.map(ret => {
                        // 🆕 退貨商品明細（新格式：items 陣列；舊格式：單品或整單）
                        const retItemList = ret.items && ret.items.length > 0 ? ret.items : null;
                        const itemName = ret.orderItemId
                          ? order.items?.find(it => it.id === ret.orderItemId)?.name_snapshot || '未知商品'
                          : '整單退貨（全部商品）';
                        return (
                          <div key={ret.id} className="bg-slate-900/60 rounded-lg p-2.5 text-xs">
                            <div className="flex justify-between items-center mb-1 gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded font-bold ${RETURN_STATUS_COLOR[ret.status] || 'text-gray-400'}`}>
                                {RETURN_STATUS_MAP[ret.status] || ret.status}
                              </span>
                              <span className="text-gray-500">{ret.returnReason ? RETURN_REASON_MAP[ret.returnReason] || ret.returnReason : ''}</span>
                              <div className="flex items-center gap-2 ml-auto">
                                <span className="text-gray-400">
                                  {new Date(ret.createdAt).toLocaleString('zh-TW')}
                                </span>
                                {ret.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={() => cancelReturn(order, ret)}
                                    disabled={cancellingReturnId === ret.id}
                                    className="px-2 py-0.5 rounded bg-slate-700 hover:bg-red-800/60 text-red-300 border border-slate-600 hover:border-red-500 transition text-xs font-medium disabled:opacity-50"
                                  >
                                    {cancellingReturnId === ret.id ? '撤回中…' : '🗑️ 撤回'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* 退貨進度軌跡（換貨：待審核 → 已核可 → 已收貨 → 換貨完成） */}
                            {ret.status !== 'REJECTED' && (
                              ret.isExchange ? (
                                <StepTracker
                                  steps={['待審核', '已核可', '已收貨', '換貨完成']}
                                  current={['PENDING', 'APPROVED', 'RECEIVED', 'EXCHANGED'].indexOf(ret.status)}
                                />
                              ) : (
                                <StepTracker
                                  steps={['待審核', '已核可', '已收貨', '已退款']}
                                  current={['PENDING', 'APPROVED', 'RECEIVED', 'REFUNDED'].indexOf(ret.status)}
                                />
                              )
                            )}
                            {/* 退貨商品明細 */}
                            {retItemList ? (
                              <ul className="text-gray-400 mb-1 space-y-0.5">
                                {retItemList.map(ri => (
                                  <li key={ri.id}>
                                    📦 {ri.orderItem?.name_snapshot || '未知商品'} ×{ri.qty}
                                    <span className="text-gray-500"> ｜ NT$ {(Number(ri.price) * ri.qty).toLocaleString()}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-gray-400 mb-1">📦 {itemName}</p>
                            )}
                            <p className="text-gray-300 whitespace-pre-wrap">{ret.description}</p>
                            {ret.isExchange ? (
                              <p className="text-cyan-300 mt-1 font-bold">
                                🔄 換貨單（免退款，將寄送新品）
                              </p>
                            ) : (
                              <p className="text-green-300 mt-1 font-bold">
                                💰 退款金額：NT$ {Number(ret.refundAmount || 0).toLocaleString()}
                              </p>
                            )}
                            {Number(ret.returnShippingFee || 0) > 0 && (
                              <p className="text-gray-500 mt-0.5">
                                🚚 退貨運費：NT$ {Number(ret.returnShippingFee).toLocaleString()}（客戶負擔，已自退款扣除）
                              </p>
                            )}
                            {ret.isExchange && ret.exchangeTrackingCode && (
                              <p className="text-cyan-400 mt-0.5">
                                🔄 換貨出貨單號：<TrackingLink code={ret.exchangeTrackingCode} carrier={order.domesticCarrier} />
                                {ret.exchangeShippedAt && <span className="text-gray-500 ml-1">（{new Date(ret.exchangeShippedAt).toLocaleString('zh-TW')}）</span>}
                              </p>
                            )}
                            {ret.refundAccount && !ret.isExchange && (
                              <p className="text-gray-400 mt-0.5">
                                🏦 退款帳戶：{ret.refundBankCode}-{String(ret.refundAccount).length > 5 ? '****' + String(ret.refundAccount).slice(-5) : '****'}｜{ret.refundAccountName}
                              </p>
                            )}

                            {/* 附件縮圖 */}
                            {ret.mediaUrls && ret.mediaUrls.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {ret.mediaUrls.map((url, idx) => {
                                  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
                                  const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);
                                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                  return (
                                    <a
                                      key={idx}
                                      href={fullUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => { if (isImage || isVideo) { e.preventDefault(); setLightboxUrl(fullUrl); } }}
                                      className="relative block w-24 h-24 rounded-lg overflow-hidden border border-slate-600 hover:border-orange-400 transition cursor-zoom-in"
                                      title={`附件 ${idx + 1}（點擊放大）`}
                                    >
                                      {isImage ? (
                                        <img src={fullUrl} alt={`附件 ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                      ) : isVideo ? (
                                        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                                          <span className="text-2xl">🎬</span>
                                          <span className="text-xs mt-0.5">影片</span>
                                        </div>
                                      ) : (
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl">📎</div>
                                      )}
                                    </a>
                                  );
                                })}
                              </div>
                            )}

                            {/* 客服回覆紀錄 */}
                            {Array.isArray(ret.adminNotes) && ret.adminNotes.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-amber-700/30">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-amber-300 font-bold text-xs">💬 客服回覆</span>
                                  <span className="text-gray-500 text-xs">{ret.adminNotes.length} 筆</span>
                                </div>
                                <div className="space-y-1">
                                  {ret.adminNotes.map((note, i) => (
                                    <div key={i} className="bg-amber-900/10 border border-amber-700/30 rounded px-2 py-1 text-xs">
                                      <div className="flex justify-between text-gray-400 mb-0.5">
                                        <span>👤 {note.byName || '客服'}</span>
                                        <span>{new Date(note.at).toLocaleString('zh-TW')}</span>
                                      </div>
                                      <p className="text-amber-100 whitespace-pre-wrap">{note.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                )}

                {/* 匯款明細（入賬=綠色已確認、待核=黃色等待後台對帳） */}
                {order.remittances?.length > 0 && (
                  <div className="mt-2 text-xs text-gray-300 bg-gray-900/40 border border-gray-700/40 rounded-lg px-3 py-1.5">
                    💵 匯款明細：
                    {order.remittances.map((r, i) => (
                      <div key={i} className="ml-3 flex justify-between">
                        <span>
                          {r.transactionDate || '—'} 末五碼 {r.last5 || order.bankLastFiveDigits || '—'} 金額 <span className="font-mono">{Number(r.amount).toLocaleString()}</span>元
                        </span>
                        {r.verified
                          ? <span className="text-green-400 font-bold">✔ 入賬</span>
                          : <span className="text-amber-400 font-bold">⏳ 待核</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* 到貨通知：待補尾款 → 提示客戶支付尾款 */}
                {order.status === 'AWAITING_BALANCE' && (
                  <div className="mt-2 bg-purple-900/20 border border-purple-600/30 rounded-lg px-3 py-2 text-sm text-purple-200">
                    📦 商品已到貨！請支付尾款 <span className="font-bold text-purple-100">NT$ {Number(order.balanceAmount || 0).toLocaleString()}</span>
                    {Number(order.bankDepositActualAmount) > 0 && (
                      <>（已匯累計 NT$ {Number(order.bankDepositActualAmount).toLocaleString()}）</>
                    )}
                    {/* 🆕 P3 已到貨項目對照表 */}
                    {order.items?.some(it => it.arrived_at) && (
                      <div className="mt-2 pt-2 border-t border-purple-600/30 text-xs">
                        <span className="font-bold text-purple-100">已到貨項目：</span>
                        <ul className="mt-1 space-y-0.5">
                          {order.items.filter(it => it.arrived_at).map(it => (
                            <li key={it.id}>
                              ✅ {it.name_snapshot || it.part?.name}
                              {it.sku_snapshot && <span className="font-mono text-gray-400 ml-1">{it.sku_snapshot}</span>}
                              <span className="text-gray-300"> ×{it.qty}</span>
                            </li>
                          ))}
                        </ul>
                        {order.items.some(it => !it.arrived_at && !it.shipped_at) && (
                          <p className="text-gray-400 mt-1">⏳ 其餘 {order.items.filter(it => !it.arrived_at && !it.shipped_at).length} 項仍待到貨</p>
                        )}
                      </div>
                    )}
                    {order.payment_method === 'COD' && (
                      <div className="mt-1 text-orange-200">
                        🚚 已選擇貨到付款（含 2% 手續費 NT$ {Number(order.cod_fee || 0).toLocaleString()}），到貨時付款即可。
                      </div>
                    )}
                  </div>
                )}

                {/* 尾款支付方式：貨到付款（僅待補尾款、尚未選擇 COD） */}
                {order.status === 'AWAITING_BALANCE' && order.payment_method !== 'COD' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await api.post(`/consumer/orders/${order.id}/payment-method`, { method: 'COD' });
                          loadOrders(page);
                        } catch (err) { toast.error(err.response?.data?.error || err.message); }
                      }}
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold transition"
                    >🚚 貨到付款（尾款 + 2% 手續費 = NT$ {Math.round(Number(order.balanceAmount || 0) * 1.02).toLocaleString()}）</button>
                  </div>
                )}

                {/* 下單備註顯示 */}
                {order.note && (
                  <div className="mt-2 text-sm text-gray-300 bg-gray-900/40 border border-gray-700/40 rounded-lg px-3 py-2">
                    📝 備註：{order.note}
                  </div>
                )}

                {/* 物流追蹤碼顯示（國內單號已併入商品列「已出貨」標籤，其餘商品共用訂單級單號） */}
                {order.trackingCodeInternational && (
                  <div className="text-sm text-gray-300 mt-1">🌐 國際物流單號：<TrackingLink code={order.trackingCodeInternational} /></div>
                )}
                {!order.trackingCodeDomestic && !order.trackingCodeInternational && order.shipping_address && (
                  <div className="text-sm text-gray-500 mt-1">收件地址：{order.shipping_address}</div>
                )}

                {/* 補登匯款與其他操作按鈕 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(canSubmitBank(order) || canPayBalance(order)) && (
                    <button
                      onClick={() => setModalOrder(order)}
                      className="w-full sm:w-auto px-5 py-2 bg-green-600 hover:bg-green-500 active:bg-green-700 rounded-xl text-sm font-bold transition"
                    >
                      {canPayBalance(order) ? '💳 補繳尾款' : Number(order.bankDepositActualAmount) > 0 ? '➕ 新增匯款（分次）' : (order.bankDepositDate ? '✏️ 修改匯款資料' : '💳 補登匯款資料')}
                    </button>
                  )}

                  {/* 🆕 確認收貨按鈕（僅已出貨） */}
                  {order.status === 'SHIPPED' && (
                    <button
                      onClick={async () => {
                        const confirmed = await confirmDialog({ message: '確定要確認收貨嗎？確認後訂單將標記為「已完成」。' });
                        if (!confirmed) return;
                        try {
                          await api.patch(`/consumer/orders/${order.id}/complete`, {});
                          toast.success('✅ 已確認收貨，感謝您的購買！');
                          loadOrders(page);
                        } catch (err) {
                          toast.error('確認失敗：' + (err.response?.data?.error || err.message));
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-sm font-bold transition"
                    >
                      ✅ 確認收貨
                    </button>
                  )}

                  {/* 🆕 售後回報按鈕（已出貨或已完成皆可回報） */}
                  {['SHIPPED', 'COMPLETED'].includes(order.status) && (
                    <button
                      onClick={() => setReportModalOrder(order)}
                      className="w-full sm:w-auto px-5 py-2 bg-slate-700 border border-slate-500 hover:bg-slate-600 hover:text-white rounded-xl text-sm font-medium transition text-slate-200"
                    >
                      🛠️ 商品瑕疵/規格不符回報
                    </button>
                  )}

                  {/* 🆕 退貨按鈕（已出貨/已完成且收貨 7 天內；次色，避免與確認收貨搶主視線） */}
                  {canReturnOrder(order) && !order.returns?.some(r => r.status === 'PENDING') && (
                    <button
                      onClick={() => setReturnModalOrder(order)}
                      className="w-full sm:w-auto px-5 py-2 bg-slate-700 border border-orange-500/50 hover:bg-slate-600 active:bg-slate-800 rounded-xl text-sm font-medium text-orange-200 transition"
                    >
                      🔄 申請退貨
                    </button>
                  )}
                  {/* 🆕 P0 退貨期限提示（7 天時限透明化） */}
                  {(() => {
                    const d = returnDeadline(order);
                    if (!['SHIPPED', 'COMPLETED'].includes(order.status) || !d) return null;
                    if (new Date() <= d) {
                      return (
                        <span className="text-xs text-gray-400 self-center">
                          （退貨期限至 {d.toLocaleDateString('zh-TW')}）
                        </span>
                      );
                    }
                    return <span className="text-xs text-gray-600 self-center">（退貨期限已過）</span>;
                  })()}

                  {/* 取消訂單按鈕（待付款／匯款審核中／訂金未入款） */}
                  {canCancel(order) && (
                    <button
                      onClick={() => cancelOrder(order)}
                      disabled={cancellingId === order.id}
                      className="w-full sm:w-auto px-5 py-2 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-900/30 hover:border-red-400 active:bg-red-900/50 rounded-xl text-sm font-medium transition disabled:opacity-50"
                    >
                      {cancellingId === order.id ? '取消中…' : '✕ 取消訂單'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分頁控制 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm disabled:opacity-40 hover:border-gray-500 transition"
            >
              ← 上一頁
            </button>
            <span className="text-sm text-gray-400">
              第 {pagination.page} / {pagination.totalPages} 頁（共 {pagination.total} 筆）
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm disabled:opacity-40 hover:border-gray-500 transition"
            >
              下一頁 →
            </button>
          </div>
        )}

        <button onClick={() => navigate('/')} className="mt-8 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition">
          ← 回首頁
        </button>
      </main>

      {/* 補登匯款 Modal */}
      {modalOrder && (
        <BankInfoModal
          order={modalOrder}
          onClose={() => setModalOrder(null)}
          onSuccess={() => { setModalOrder(null); loadOrders(); toast.success('✅ 匯款資料已送出，等待商家對帳確認'); }}
        />
      )}

      {/* 🆕 售後問題回報 Modal */}
      {reportModalOrder && (
        <IssueReportModal 
          order={reportModalOrder} 
          onClose={() => setReportModalOrder(null)} 
          onSuccess={() => { 
            setReportModalOrder(null); 
            loadOrders(); // 🆕 重新載入訂單，讓「商品異常」標籤與紀錄立即顯示
            toast.success('✅ 問題回報已送出，客服人員將儘速與您聯繫並為您處理！'); 
          }} 
        />
      )}

      {/* 🆕 售後回報編輯 Modal */}
      {editingIssue && (
        <IssueEditModal
          order={editingIssue.order}
          issue={editingIssue.issue}
          onClose={() => setEditingIssue(null)}
          onSuccess={() => {
            setEditingIssue(null);
            loadOrders(page);
            toast.success('✅ 回報已更新');
          }}
        />
      )}

      {/* 🆕 退貨申請 Modal */}
      {returnModalOrder && (
        <ReturnRequestModal
          order={returnModalOrder}
          onClose={() => setReturnModalOrder(null)}
          onSuccess={() => {
            setReturnModalOrder(null);
            loadOrders(page);
            toast.success('✅ 退貨申請已送出，客服人員將儘速審核！');
          }}
        />
      )}

      {/* 🆕 附件燈箱（點擊縮圖放大） */}
      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}