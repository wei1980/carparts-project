// src/pages/admin/AdminOrders.jsx
import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';
import { inputDialog } from '../../components/InputDialog';
import { useNavigate } from 'react-router-dom';
import { getUserFriendlyError } from '../../utils/userFriendlyErrors';

const statusMap = {
  PENDING_PAYMENT: '待付款',
  PAYMENT_REVIEW: '匯款審核中',
  DEPOSIT_PAID: '訂金已付',
  AWAITING_BALANCE: '待補尾款',
  PAID: '已付款',
  SHIPPED: '已出貨',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const statusColor = {
  PENDING_PAYMENT: 'text-yellow-400',
  PAYMENT_REVIEW: 'text-orange-400',
  DEPOSIT_PAID: 'text-orange-400',
  AWAITING_BALANCE: 'text-purple-400',
  PAID: 'text-blue-400',
  SHIPPED: 'text-cyan-400',
  COMPLETED: 'text-green-400',
  CANCELLED: 'text-red-400',
};

const allStatuses = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
const orderTypeMap = { INSTOCK: '現貨', PREORDER: '代購', MIXED: '混合' };

// 🆕 退貨
const RETURN_REASON_MAP = {
  DEFECT: '商品瑕疵/損壞',
  MISMATCH: '規格/型號不符',
  CHANGE_MIND: '不想要了',
  OTHER: '其他原因',
};
const RETURN_STATUS_MAP = {
  PENDING: '待審核',
  APPROVED: '已核可（待寄回）',
  REJECTED: '已駁回',
  RECEIVED: '已收到商品',
  REFUNDED: '已退款',
  EXCHANGED: '換貨完成',
};
const RETURN_STATUS_COLOR = {
  PENDING: 'text-yellow-400',
  APPROVED: 'text-blue-400',
  REJECTED: 'text-red-400',
  RECEIVED: 'text-cyan-400',
  REFUNDED: 'text-green-400',
  EXCHANGED: 'text-cyan-300',
};

// 🆕 核可退貨/換貨對話盒（退款金額／退貨運費／換貨）
function ReturnApproveModal({ data, onChange, onClose, onSubmit }) {
  if (!data) return null;
  const itemTotal = Number(data.itemTotal) || 0;
  const shipping = Number(data.shippingFee) || 0;
  const calcRefund = Math.max(0, itemTotal - shipping);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-label="核可退貨">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-gray-800 border border-gray-600 rounded-xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">核可{data.isExchange ? '換貨' : '退貨'}</h3>

        {/* 換貨切換 */}
        <label className="flex items-center gap-2 mb-4 text-sm text-gray-200 cursor-pointer">
          <input
            type="checkbox"
            checked={data.isExchange}
            onChange={e => {
              const isExchange = e.target.checked;
              onChange({
                ...data,
                isExchange,
                refundAmount: isExchange ? 0 : (data.refundTouched ? data.refundAmount : calcRefund),
                refundTouched: isExchange ? false : data.refundTouched,
              });
            }}
            className="rounded"
          />
          🔄 換貨（寄送新品，免退款）
        </label>

        {/* 退貨運費 */}
        <label className="block text-xs text-gray-400 mb-1">退貨運費（客戶負擔金額，NT$）</label>
        <input
          type="number"
          min="0"
          value={data.shippingFee}
          onChange={e => {
            const shippingFee = e.target.value;
            const newRefund = (data.refundTouched || data.isExchange)
              ? data.refundAmount
              : Math.max(0, itemTotal - (Number(shippingFee) || 0));
            onChange({ ...data, shippingFee, refundAmount: newRefund });
          }}
          placeholder="0"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm mb-1"
        />
        <p className="text-xs text-gray-500 mb-3">
          瑕疵／規格不符設 0（公司吸收）；其他原因填客戶負擔運費（例：60／100，費率表待新竹物流提供）
        </p>

        {/* 退款金額（換貨時免填） */}
        {!data.isExchange && (
          <>
            <label className="block text-xs text-gray-400 mb-1">退款金額（NT$）</label>
            <input
              type="number"
              min="0"
              value={data.refundAmount}
              onChange={e => onChange({ ...data, refundAmount: e.target.value, refundTouched: true })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm mb-1"
            />
            <p className="text-xs text-gray-500 mb-4">
              預設 = 商品合計 NT$ {itemTotal.toLocaleString()} − 退貨運費 NT$ {shipping.toLocaleString()}
            </p>
          </>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">取消</button>
          <button onClick={onSubmit} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-bold">✅ 核可</button>
        </div>
      </div>
    </div>
  );
}

// 🆕 附件燈箱（Lightbox 點擊放大）
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

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [trackingEdit, setTrackingEdit] = useState({}); // { orderId: {domestic, intl, carrierId} }
  // 🆕 售後處理紀錄的草稿與送出狀態
  const [replyDrafts, setReplyDrafts] = useState({});        // { [issueId]: text }
  const [replySubmitting, setReplySubmitting] = useState({}); // { [issueId]: boolean }
  // 🆕 售後流程狀態（已回報 → 客服處理中 → 結案）送出狀態
  const [issueStatusSubmitting, setIssueStatusSubmitting] = useState({}); // { [issueId]: boolean }
  const [lightboxUrl, setLightboxUrl] = useState(null); // 🆕 附件燈箱
  const [returnApprove, setReturnApprove] = useState(null); // 🆕 核可退貨/換貨對話盒 { orderId, returnId, itemTotal, isExchange, refundAmount, shippingFee, refundTouched }
  const [exchangeShip, setExchangeShip] = useState({}); // 🆕 { [returnId]: 換貨出貨單號 }
  // 🆕 物流業者清單（出貨表單下拉用；管理介面在「系統設定」頁）
  const [carriers, setCarriers] = useState([]);

  // 🆕 售後流程：推進狀態（REPORTED → PROCESSING → RESOLVED）
  const updateIssueStatus = async (orderId, issueId, status) => {
    setIssueStatusSubmitting(prev => ({ ...prev, [issueId]: true }));
    try {
      const r = await adminClient.patch(`/orders/${orderId}/issues/${issueId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, issues: (o.issues || []).map(i => i.id === issueId ? r.data.issue : i) }
        : o));
    } catch (err) {
      console.warn('售後狀態更新失敗:', err?.message || err);
    } finally {
      setIssueStatusSubmitting(prev => ({ ...prev, [issueId]: false }));
    }
  };

  const loadOrders = () => {
    adminClient.get('/orders')
      .then(res => setOrders(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
  };

  // 🆕 載入物流業者清單
  const loadCarriers = () => {
    adminClient.get('/carriers')
      .then(res => setCarriers(res.data))
      .catch(err => console.warn('載入業者失敗:', err?.message || err));
  };

  // 🆕 商品項目層級：到貨 / 出貨（每個商品可單獨操作；全部到貨→AWAITING_BALANCE，全部出貨→SHIPPED）
  const arriveItem = async (orderId, itemId) => {
    try {
      const res = await adminClient.patch(`/orders/${orderId}/items/${itemId}`, { action: 'arrive' });
      toast.success(res.data.message + (res.data.order_status === 'AWAITING_BALANCE' ? '｜訂單已推進為待補尾款' : ''));
      loadOrders();
    } catch (err) {
      toast.error('操作失敗：' + (err.response?.data?.error || err.message));
    }
  };
  const shipItem = async (orderId, itemId, trackingCode) => {
    try {
      const res = await adminClient.patch(`/orders/${orderId}/items/${itemId}`, { action: 'ship', trackingCode });
      toast.success(res.data.message + (res.data.order_status === 'SHIPPED' ? '｜訂單已推進為已出貨' : ''));
      loadOrders();
    } catch (err) {
      toast.error('操作失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 送出處理紀錄
  const submitReply = async (orderId, issueId) => {
    const text = (replyDrafts[issueId] || '').trim();
    if (!text) {
      toast.error('請填寫處理紀錄內容');
      return;
    }
    setReplySubmitting(prev => ({ ...prev, [issueId]: true }));
    try {
      await adminClient.post(`/orders/${orderId}/issues/${issueId}/reply`, { text });
      toast.success('已新增處理紀錄');
      setReplyDrafts(prev => ({ ...prev, [issueId]: '' }));
      loadOrders();
    } catch (err) {
      toast.error('送出失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setReplySubmitting(prev => ({ ...prev, [issueId]: false }));
    }
  };

  // 🆕 退貨審核：核可（開啟對話盒設定退款金額／退貨運費／換貨）
  const openApproveReturn = (orderId, returnId, itemTotal) => {
    setReturnApprove({ orderId, returnId, itemTotal, isExchange: false, refundAmount: itemTotal, shippingFee: 0, refundTouched: false });
  };

  // 🆕 核可退貨/換貨：送出
  const submitApproveReturn = async () => {
    const ra = returnApprove;
    if (!ra) return;
    try {
      const res = await adminClient.post(`/orders/${ra.orderId}/returns/${ra.returnId}/approve`, {
        refundAmount: Number(ra.refundAmount) || 0,
        returnShippingFee: Number(ra.shippingFee) || 0,
        isExchange: ra.isExchange,
      });
      toast.success(res.data.message);
      setReturnApprove(null);
      loadOrders();
    } catch (err) {
      toast.error('核可失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 換貨出貨：填單號完成換貨
  const exchangeShipReturn = async (orderId, returnId) => {
    const code = (exchangeShip[returnId] || '').trim();
    if (!code) { toast.error('請填寫換貨出貨單號'); return; }
    try {
      const res = await adminClient.post(`/orders/${orderId}/returns/${returnId}/exchange-ship`, { trackingCode: code });
      toast.success(res.data.message);
      loadOrders();
    } catch (err) {
      toast.error('換貨出貨失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 退貨審核：駁回
  const rejectReturn = async (orderId, returnId) => {
    const reason = await inputDialog({
      message: '駁回原因（將顯示給客戶）：',
      placeholder: '例如：商品與訂單不符 / 退貨已逾期',
      confirmText: '駁回',
      danger: true,
    });
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('請填寫駁回原因');
      return;
    }
    try {
      const res = await adminClient.post(`/orders/${orderId}/returns/${returnId}/reject`, { reason: reason.trim() });
      toast.success(res.data.message);
      loadOrders();
    } catch (err) {
      toast.error('駁回失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 退貨審核：收到退回商品（回補庫存）
  const receiveReturn = async (orderId, returnId) => {
    if (!(await confirmDialog({ message: '確認已收到退回商品？\n\n庫存將自動回補。' }))) return;
    try {
      const res = await adminClient.post(`/orders/${orderId}/returns/${returnId}/receive`);
      toast.success(res.data.message);
      loadOrders();
    } catch (err) {
      toast.error('收貨失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 退貨審核：確認退款
  const refundReturn = async (orderId, returnId) => {
    const note = (await inputDialog({
      message: '退款備註（可留空，如匯款日期）：',
      placeholder: '例如：已於 2026-10-20 匯出',
      confirmText: '確認退款',
      allowEmpty: true,
    })) ?? '';
    try {
      const res = await adminClient.post(`/orders/${orderId}/returns/${returnId}/refund`, { note: note.trim() });
      toast.success(res.data.message);
      loadOrders();
    } catch (err) {
      toast.error('確認失敗：' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => { loadOrders(); loadCarriers(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await adminClient.patch(`/orders/${id}`, { status });
      loadOrders();
    } catch (err) {
      toast.error('更新失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // Payment confirmation must select a bank transfer and review historical claims.
  const manualConfirm = () => navigate('/admin/bank');

  // 🆕 儲存物流追蹤碼
  const saveTracking = async (order) => {
    const edit = trackingEdit[order.id] || {};
    try {
      const res = await adminClient.put(`/orders/${order.id}/tracking`, {
        trackingCodeDomestic: edit.domestic,
        trackingCodeInternational: edit.intl,
        carrierId: edit.carrierId, // 🆕 國內物流業者
      });
      toast.success(`物流追蹤已更新：${res.data.status}`);
      setTrackingEdit(prev => ({ ...prev, [order.id]: undefined }));
      loadOrders();
    } catch (err) {
      const friendlyError = getUserFriendlyError(err, '更新物流失敗：');
      toast.error(friendlyError.message);
    }
  };

  // 手動確認按鈕顯示條件：未付款/審核中/待尾款
  const canManualConfirm = (o) =>
    ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE'].includes(o.status);

  // 出貨按鈕：已付清且未出貨
  const canShip = (o) => o.status === 'PAID' && !o.trackingCodeDomestic;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">📦 訂單管理</h1>

      {orders.length === 0 ? (
        <p className="text-gray-400">尚無訂單</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isPreorder = order.orderType === 'PREORDER' || order.orderType === 'MIXED';
            const edit = trackingEdit[order.id] || {};
            return (
              <div key={order.id} className="bg-gray-800 p-6 rounded-xl">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white">{order.order_number}</h3>
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{orderTypeMap[order.orderType] || '現貨'}</span>
                      {isPreorder && Number(order.depositAmount) > 0 && (
                        <span className="text-xs text-gray-500">訂金 NT$ {Number(order.depositAmount).toLocaleString()} / 尾款 NT$ {Number(order.balanceAmount).toLocaleString()}</span>
                      )}
                      {/* 🆕 售後異常標籤 */}
                      {order.issues && order.issues.length > 0 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-200 border border-red-600/50 font-bold">
                          ⚠️ 售後問題 {order.issues.length}
                        </span>
                      )}
                      {/* 🆕 退貨標籤 */}
                      {order.returns && order.returns.some(r => ['PENDING', 'APPROVED', 'RECEIVED'].includes(r.status)) && (
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-900/50 text-orange-200 border border-orange-600/50 font-bold">
                          🔄 退貨 {order.returns.filter(r => ['PENDING', 'APPROVED', 'RECEIVED'].includes(r.status)).length}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      金額：NT$ {Number(order.total_amount).toLocaleString()}
                      {order.bankLastFiveDigits && <span className="ml-3">匯款末五碼：{order.bankLastFiveDigits}</span>}
                      {order.bankDepositActualAmount != null && (
                        <span className="ml-3 text-cyan-400">匯款金額：NT$ {Number(order.bankDepositActualAmount).toLocaleString()}</span>
                      )}
                      {order.bankDepositDate && (
                        <span className="ml-3 text-gray-500">匯款日：{new Date(order.bankDepositDate).toLocaleDateString('zh-TW')}</span>
                      )}
                      {order.bankRemitterName && <span className="ml-3 text-green-400">匯款人：{order.bankRemitterName}</span>}
                    </p>
                    {Number(order.bankDepositActualAmount) > 0 && (() => {
                      const payable = Number(order.status === 'AWAITING_BALANCE' ? order.balanceAmount : (order.orderType !== 'INSTOCK' && order.depositAmount) ? order.depositAmount : order.total_amount);
                      const remitted = Number(order.bankDepositActualAmount);
                      return (
                        <p className={`text-xs mt-0.5 ${remitted >= payable ? 'text-green-400' : 'text-yellow-400'}`}>
                          ✅ 已匯累計：NT$ {remitted.toLocaleString()}
                          {remitted < payable ? ` ｜ ⏳ 尚欠 NT$ ${(payable - remitted).toLocaleString()}` : ' ｜ 🎉 金額已足'}
                        </p>
                      );
                    })()}
                    {order.remittance_claims?.length > 0 && (
                      <div className="text-xs text-blue-300/80 mt-0.5">
                        💵 {order.order_number} 總額：{Number(order.total_amount).toLocaleString()}元｜ 訂購人：{order.user?.name || order.user?.phone || '—'}
                        {order.remittance_claims.map((c, i) => (
                          <div key={i} className="ml-3">
                            {c.transactionDate} 末五碼 {c.last5 || order.bankLastFiveDigits || '—'} 金額 {Number(c.amount).toLocaleString()}元 入帳
                          </div>
                        ))}
                      </div>
                    )}
                    {order.items?.length > 0 && (
                      <div className="text-xs text-gray-300 mt-1 bg-slate-900/60 rounded-lg px-2.5 py-1.5">
                        🛒 商品清單：
                        {order.items.map((it, i) => (
                          <div key={i} className="ml-3 flex justify-between items-center gap-2">
                            <span>
                              <span className="font-mono text-cyan-300 mr-2">{it.sku_snapshot}</span>
                              {it.name_snapshot} × {it.qty}{it.is_preorder && <span className="text-amber-400 ml-1">（代購）</span>}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-gray-400">NT$ {(Number(it.price_snapshot) * it.qty).toLocaleString()}</span>
                              {it.shipped_at ? (
                                <span className="text-cyan-400">🚚 已出貨<span className="font-mono ml-1">{it.tracking_code}</span></span>
                              ) : it.arrived_at ? (
                                <>
                                  <span className="text-green-400">✓ 已到貨</span>
                                  {['DEPOSIT_PAID', 'AWAITING_BALANCE', 'PAID'].includes(order.status) && (
                                    <button
                                      onClick={async () => {
                                        const code = await inputDialog({
                                          message: `填寫「${it.name_snapshot}」出貨追蹤碼：`,
                                          placeholder: '例如：755123456789',
                                          confirmText: '確認出貨',
                                        });
                                        if (code) shipItem(order.id, it.id, code);
                                      }}
                                      className="px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white"
                                    >出貨</button>
                                  )}
                                </>
                              ) : (
                                ['DEPOSIT_PAID', 'AWAITING_BALANCE', 'PAID'].includes(order.status) && (
                                  <button
                                    onClick={() => arriveItem(order.id, it.id)}
                                    className="px-2 py-0.5 rounded bg-green-700 hover:bg-green-600 text-white"
                                  >到貨</button>
                                )
                              )}
                            </span>
                          </div>
                        ))}
                        {order.customer_vehicle && (
                          <div className="ml-3 mt-1 text-purple-300">
                            🚗 客戶車型：{[order.customer_vehicle.year, order.customer_vehicle.make, order.customer_vehicle.model, order.customer_vehicle.generation, order.customer_vehicle.engine].filter(Boolean).join(' ')}
                            {order.customer_vehicle.licensePlate && <span className="ml-2">（車牌 {order.customer_vehicle.licensePlate}）</span>}
                          </div>
                        )}
                        {order.payment_method === 'COD' && (
                          <div className="ml-3 mt-1 text-orange-300">
                            🚚 貨到付款：尾款 NT$ {Number(order.balanceAmount || 0).toLocaleString()}（含手續費 2%：NT$ {Number(order.cod_fee || 0).toLocaleString()}）
                          </div>
                        )}
                      </div>
                    )}

                    {/* 🆕 售後問題回報（管理員查看 + 回覆） */}
                    {order.issues && order.issues.length > 0 && (
                      <div className="mt-3 bg-red-900/10 border border-red-700/40 rounded-xl p-3">
                        <h4 className="font-bold text-red-400 mb-2 flex items-center gap-1.5 text-sm">
                          ⚠️ 售後問題回報
                          <span className="text-xs font-normal text-gray-400">（共 {order.issues.length} 筆）</span>
                        </h4>
                        <div className="space-y-3">
                          {order.issues.map(issue => {
                            const notes = Array.isArray(issue.adminNotes) ? issue.adminNotes : [];
                            return (
                              <div key={issue.id} className="bg-slate-900/60 border border-red-700/30 rounded-lg p-2.5 text-xs">
                                <div className="flex justify-between items-start gap-2 mb-1 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-200 text-xs font-bold">
                                      {issue.issueType === 'DEFECT' ? '商品瑕疵/損壞' : '規格/型號不符'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${issue.status === 'RESOLVED' ? 'bg-green-900/50 text-green-200' : issue.status === 'PROCESSING' ? 'bg-amber-900/50 text-amber-200' : 'bg-slate-700/60 text-gray-300'}`}>
                                      {issue.status === 'RESOLVED' ? '結案' : issue.status === 'PROCESSING' ? '客服處理中' : '已回報'}
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                      商品：{order.items?.find(it => it.id === issue.orderItemId)?.name_snapshot || '未知商品'}
                                    </span>
                                  </div>
                                  <span className="text-gray-500 text-xs whitespace-nowrap">
                                    {new Date(issue.createdAt).toLocaleString('zh-TW')}
                                  </span>
                                </div>

                                <p className="text-gray-200 mt-1 bg-slate-800/60 rounded px-2 py-1 whitespace-pre-wrap">
                                  {issue.description}
                                </p>

                                {/* 附件縮圖 */}
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
                                          className="relative block w-20 h-20 rounded-lg overflow-hidden border border-slate-600 hover:border-cyan-400 transition group cursor-zoom-in"
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
                                              <span className="text-[9px] mt-0.5">影片</span>
                                            </div>
                                          ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl">
                                              📎
                                            </div>
                                          )}
                                          <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/20 transition flex items-center justify-center">
                                            <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded">
                                              查看
                                            </span>
                                          </div>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* 🆕 管理員處理紀錄 */}
                                <div className="mt-2 pt-2 border-t border-amber-700/30">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="text-amber-300 font-bold text-[11px]">📝 處理紀錄</span>
                                    <span className="text-gray-500 text-[10px]">{notes.length} 筆</span>
                                    {/* 🆕 售後流程操作：已回報 → 客服處理中 → 結案 */}
                                    {issue.status !== 'RESOLVED' && (
                                      <span className="flex gap-1.5 ml-auto">
                                        {issue.status === 'REPORTED' && (
                                          <button
                                            type="button"
                                            onClick={() => updateIssueStatus(order.id, issue.id, 'PROCESSING')}
                                            disabled={!!issueStatusSubmitting[issue.id]}
                                            className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-[11px] font-bold"
                                          >
                                            {issueStatusSubmitting[issue.id] ? '…' : '▶ 開始處理（客服處理中）'}
                                          </button>
                                        )}
                                        {issue.status === 'PROCESSING' && (
                                          <button
                                            type="button"
                                            onClick={() => updateIssueStatus(order.id, issue.id, 'RESOLVED')}
                                            disabled={!!issueStatusSubmitting[issue.id]}
                                            className="px-2 py-0.5 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-[11px] font-bold"
                                          >
                                            {issueStatusSubmitting[issue.id] ? '…' : '✅ 結案'}
                                          </button>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {/* 歷史紀錄 */}
                                  {notes.length > 0 && (
                                    <div className="space-y-1 mb-2">
                                      {notes.map((note, i) => (
                                        <div key={i} className="bg-amber-900/10 border border-amber-700/30 rounded px-2 py-1 text-[11px]">
                                          <div className="flex justify-between text-gray-400 mb-0.5">
                                            <span>👤 {note.byName || '管理員'}</span>
                                            <span>{new Date(note.at).toLocaleString('zh-TW')}</span>
                                          </div>
                                          <p className="text-amber-100 whitespace-pre-wrap">{note.text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 新增紀錄輸入框 */}
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={replyDrafts[issue.id] || ''}
                                      onChange={e => setReplyDrafts(prev => ({ ...prev, [issue.id]: e.target.value }))}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          submitReply(order.id, issue.id);
                                        }
                                      }}
                                      placeholder="輸入處理紀錄，按 Enter 送出…"
                                      className="flex-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white focus:border-amber-500 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => submitReply(order.id, issue.id)}
                                      disabled={!replyDrafts[issue.id]?.trim() || replySubmitting[issue.id]}
                                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold"
                                    >
                                      {replySubmitting[issue.id] ? '…' : '送出'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 🆕 退貨申請（管理員審核：核可/駁回/收貨/退款） */}
                    {order.returns && order.returns.length > 0 && (
                      <div className="mt-3 bg-orange-900/10 border border-orange-700/40 rounded-xl p-3">
                        <h4 className="font-bold text-orange-400 mb-2 flex items-center gap-1.5 text-sm">
                          🔄 退貨申請
                          <span className="text-xs font-normal text-gray-400">（共 {order.returns.length} 筆）</span>
                        </h4>
                        <div className="space-y-3">
                          {order.returns.map(ret => {
                            const notes = Array.isArray(ret.adminNotes) ? ret.adminNotes : [];
                            // 🆕 退貨商品明細（新格式：items 陣列；舊格式：單品或整單）
                            const retItemList = ret.items && ret.items.length > 0 ? ret.items : null;
                            const itemName = ret.orderItemId
                              ? order.items?.find(it => it.id === ret.orderItemId)?.name_snapshot || '未知商品'
                              : '整單退貨（全部商品）';
                            return (
                              <div key={ret.id} className="bg-slate-900/60 border border-orange-700/30 rounded-lg p-2.5 text-xs">
                                <div className="flex justify-between items-start gap-2 mb-1 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded bg-orange-900/50 text-xs font-bold ${RETURN_STATUS_COLOR[ret.status] || 'text-gray-400'}`}>
                                      {RETURN_STATUS_MAP[ret.status] || ret.status}
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                      {RETURN_REASON_MAP[ret.returnReason] || ret.returnReason}
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                      商品：{retItemList ? `${retItemList.length} 項` : itemName}
                                    </span>
                                  </div>
                                  <span className="text-gray-500 text-xs whitespace-nowrap">
                                    {new Date(ret.createdAt).toLocaleString('zh-TW')}
                                  </span>
                                </div>

                                {/* 🆕 退貨商品明細（勾選商品 × 數量 × 單價） */}
                                {retItemList && (
                                  <ul className="mt-1 space-y-0.5">
                                    {retItemList.map(ri => (
                                      <li key={ri.id}>
                                        📦 {ri.orderItem?.name_snapshot || '未知商品'} ×{ri.qty}
                                        <span className="text-gray-500"> ｜ NT$ {(Number(ri.price) * ri.qty).toLocaleString()}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                <p className="text-gray-200 mt-1 bg-slate-800/60 rounded px-2 py-1 whitespace-pre-wrap">
                                  {ret.description}
                                </p>

                                {ret.isExchange ? (
                                  <p className="text-cyan-300 font-bold mt-1">
                                    🔄 換貨單（免退款，將寄送新品）
                                  </p>
                                ) : (
                                  <p className="text-green-400 font-bold mt-1">
                                    💰 退款金額：NT$ {Number(ret.refundAmount || 0).toLocaleString()}
                                  </p>
                                )}
                                {Number(ret.returnShippingFee || 0) > 0 && (
                                  <p className="text-gray-500 mt-0.5">
                                    🚚 退貨運費：NT$ {Number(ret.returnShippingFee).toLocaleString()}（客戶負擔，已自退款扣除）
                                  </p>
                                )}
                                {/* 🆕 換貨出貨（收到退回商品後填單號） */}
                                {ret.isExchange && ret.status === 'RECEIVED' && (
                                  <div className="flex gap-1.5 mt-1.5">
                                    <input
                                      value={exchangeShip[ret.id] || ''}
                                      onChange={e => setExchangeShip(prev => ({ ...prev, [ret.id]: e.target.value }))}
                                      placeholder="換貨出貨單號"
                                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs"
                                    />
                                    <button
                                      onClick={() => exchangeShipReturn(order.id, ret.id)}
                                      className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold whitespace-nowrap"
                                    >
                                      🔄 換貨出貨
                                    </button>
                                  </div>
                                )}
                                {ret.isExchange && ret.status === 'EXCHANGED' && (
                                  <p className="text-cyan-400 mt-0.5">
                                    🔄 換貨已出貨：<span className="font-mono">{ret.exchangeTrackingCode}</span>
                                    {ret.exchangeShippedAt && <span className="text-gray-500 ml-1">（{new Date(ret.exchangeShippedAt).toLocaleString('zh-TW')}）</span>}
                                  </p>
                                )}
                                {ret.refundAccount && !ret.isExchange && (
                                  <p className="text-gray-500 mt-0.5">
                                    🏦 退款帳戶：{ret.refundBankCode}-{ret.refundAccount}｜{ret.refundAccountName}
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
                                          className="relative block w-20 h-20 rounded-lg overflow-hidden border border-slate-600 hover:border-orange-400 transition cursor-zoom-in"
                                          title={`附件 ${idx + 1}（點擊放大）`}
                                        >
                                          {isImage ? (
                                            <img src={fullUrl} alt={`附件 ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                          ) : isVideo ? (
                                            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                                              <span className="text-2xl">🎬</span>
                                              <span className="text-[9px] mt-0.5">影片</span>
                                            </div>
                                          ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl">📎</div>
                                          )}
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* 管理員處理紀錄 */}
                                {notes.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-amber-700/30">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-amber-300 font-bold text-[11px]">📝 處理紀錄</span>
                                      <span className="text-gray-500 text-[10px]">{notes.length} 筆</span>
                                    </div>
                                    <div className="space-y-1">
                                      {notes.map((note, i) => (
                                        <div key={i} className="bg-amber-900/10 border border-amber-700/30 rounded px-2 py-1 text-[11px]">
                                          <div className="flex justify-between text-gray-400 mb-0.5">
                                            <span>👤 {note.byName || '管理員'}</span>
                                            <span>{new Date(note.at).toLocaleString('zh-TW')}</span>
                                          </div>
                                          <p className="text-amber-100 whitespace-pre-wrap">{note.text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 審核動作按鈕 */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {ret.status === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => openApproveReturn(order.id, ret.id, (ret.items || []).reduce((s, ri) => s + Number(ri.qty) * Number(ri.price), 0))}
                                        className="px-2.5 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold"
                                      >
                                        ✅ 核可（退貨／換貨）
                                      </button>
                                      <button
                                        onClick={() => rejectReturn(order.id, ret.id)}
                                        className="px-2.5 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-bold"
                                      >
                                        ✕ 駁回
                                      </button>
                                    </>
                                  )}
                                  {ret.status === 'APPROVED' && (
                                    <button
                                      onClick={() => receiveReturn(order.id, ret.id)}
                                      className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                                    >
                                      📦 收到退回商品（回補庫存）
                                    </button>
                                  )}
                                  {ret.status === 'RECEIVED' && !ret.isExchange && (
                                    <button
                                      onClick={() => refundReturn(order.id, ret.id)}
                                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                                    >
                                      💰 確認退款完成
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-gray-500 text-sm mt-2">
                      {order.receiver_name}｜{order.receiver_phone}｜{order.shipping_address}
                    </p>
                    {/* 🆕 下單備註顯示 */}
                    {order.note && (
                      <p className="text-sm text-amber-200 bg-amber-900/20 border border-amber-600/30 rounded-lg px-2.5 py-1.5 mt-1.5 inline-block">
                        📝 備註：{order.note}
                      </p>
                    )}
                    <p className="text-gray-500 text-sm">{new Date(order.created_at).toLocaleString()}</p>
                    {(order.trackingCodeDomestic || order.trackingCodeInternational) && (
                      <p className="text-cyan-400 text-sm mt-1">
                        📦 {order.trackingCodeDomestic && <>國內{order.domesticCarrier ? `（${order.domesticCarrier.name}）` : ''} <a className="font-mono underline decoration-dotted underline-offset-2 hover:text-cyan-100" href={order.domesticCarrier?.trackingUrl?.includes('{number}') ? order.domesticCarrier.trackingUrl.replace('{number}', encodeURIComponent(order.trackingCodeDomestic)) : (order.domesticCarrier?.trackingUrl || `https://www.17track.net/zh-tw/track?nums=${encodeURIComponent(order.trackingCodeDomestic)}`)} target="_blank" rel="noopener noreferrer">{order.trackingCodeDomestic}</a></>}
                        {order.trackingCodeInternational && <> 國際 <span className="font-mono">{order.trackingCodeInternational}</span></>}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className={`font-bold mb-2 ${statusColor[order.status] || 'text-gray-400'}`}>
                      {statusMap[order.status] || order.status}
                    </p>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="p-2 rounded bg-gray-700 text-white text-sm mb-2"
                    >
                      {allStatuses.map(s => <option key={s} value={s}>{statusMap[s]}</option>)}
                    </select>

                    {/* 🆕 動作按鈕 */}
                    <div className="flex flex-col gap-1.5">
                      {canManualConfirm(order) && (
                        <button
                          onClick={() => manualConfirm(order)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold"
                        >
                          前往銀行對帳
                        </button>
                      )}
                      {canShip(order) && (
                        <button
                          onClick={() => setTrackingEdit(prev => ({ ...prev, [order.id]: { domestic: '', intl: order.trackingCodeInternational || '', carrierId: carriers[0]?.id || '' } }))}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold"
                        >
                          🚚 出貨（填追蹤碼）
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 🆕 追蹤碼輸入區 */}
                {trackingEdit[order.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">物流業者</label>
                      <select
                        value={edit.carrierId || ''}
                        onChange={e => setTrackingEdit(prev => ({ ...prev, [order.id]: { ...edit, carrierId: e.target.value } }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                      >
                        <option value="">未指定</option>
                        {carriers.filter(c => c.enabled).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">國內追蹤碼（填寫後自動出貨）</label>
                      <input
                        value={edit.domestic || ''}
                        onChange={e => setTrackingEdit(prev => ({ ...prev, [order.id]: { ...edit, domestic: e.target.value } }))}
                        placeholder="例：ZEC-123456789"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">國際追蹤碼（代購用）</label>
                      <input
                        value={edit.intl || ''}
                        onChange={e => setTrackingEdit(prev => ({ ...prev, [order.id]: { ...edit, intl: e.target.value } }))}
                        placeholder="例：EE123456789TW"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveTracking(order)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold">儲存並出貨</button>
                      <button onClick={() => setTrackingEdit(prev => ({ ...prev, [order.id]: undefined }))} className="px-3 py-2 bg-gray-700 rounded-lg text-xs">取消</button>
                    </div>
                  </div>
                )}

              {/* 🆕 客戶車型與改裝項目顯示區 */}
              {order.vehicle && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="font-bold text-white mb-3">🚗 客戶車型與改裝項目 (人工確認規格)</h4>
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-400">品牌 / 車系</p>
                        <p className="text-white font-medium">{order.vehicle.make} {order.vehicle.model}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">世代 / 年份</p>
                        <p className="text-white">{order.vehicle.generation || '—'} {order.vehicle.year ? `· ${order.vehicle.year}` : ''}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">引擎 / 車牌</p>
                        <p className="text-white">{order.vehicle.engine || '—'} / {order.vehicle.licensePlate || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">目前里程</p>
                        <p className="text-white">{order.mileage_km ? Number(order.mileage_km).toLocaleString() + ' km' : '—'}</p>
                      </div>
                    </div>

                    {/* 改裝項目 */}
                    {order.modifications && order.modifications.length > 0 ? (
                      <div className="space-y-2">
                        <h5 className="font-medium text-emerald-400 mb-2">🔧 改裝項目</h5>
                        <div className="space-y-2">
                          {order.modifications.map(mod => (
                            <div key={mod.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-emerald-400">{mod.category} - {mod.partType}</span>
                                <span className="text-slate-400 text-sm">{mod.brand} {mod.model}</span>
                              </div>
                              <div className="text-xs text-slate-400">
                                {mod.specJson && Object.entries(mod.specJson).map(([k, v]) => (
                                  <span key={k} className="mr-3">{k}: {v}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">無改裝項目記錄</p>
                    )}
                  </div>
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🆕 附件燈箱（點擊縮圖放大） */}
      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      {/* 🆕 核可退貨/換貨對話盒 */}
      <ReturnApproveModal
        data={returnApprove}
        onChange={setReturnApprove}
        onClose={() => setReturnApprove(null)}
        onSubmit={submitApproveReturn}
      />
    </div>
  );
}