// src/pages/MyAppointments.jsx — 車主：我的預約（含取消功能）
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { confirmDialog } from '../components/ConfirmDialog';

export default function MyAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  // 🆕 客戶同意車廠提議的時間
  const acceptProposal = async (id) => {
    if (!(await confirmDialog({ message: '確定接受車廠建議的時間嗎？' }))) return;
    setAcceptingId(id);
    try {
      await api.post(`/appointments/${id}/accept-proposal`, {});
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '確認失敗，請重試');
    } finally {
      setAcceptingId(null);
    }
  };

  const load = () => {
    setLoadError(false);
    api.get('/appointments')
      .then(res => setAppointments(res.data))
      .catch(err => { console.warn('載入失敗:', err?.message || err); setLoadError(true); });
  };

  useEffect(() => { load(); }, []);

  // 🆕 取消預約：僅待確認/已確認狀態可取消
  const cancelAppointment = async (id) => {
    if (!(await confirmDialog({ message: '確定要取消這筆預約嗎？' }))) return;
    setCancellingId(id);
    try {
      await api.patch(`/appointments/${id}`, {});
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a));
    } catch (err) {
      toast.error(err.response?.data?.error || '取消失敗，請重試');
    } finally {
      setCancellingId(null);
    }
  };

  const statusMap = {
    PENDING: '待確認',
    CONFIRMED: '已確認',
    ARRIVED: '已到店',
    IN_PROGRESS: '施工中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };

  const statusColor = {
    PENDING: 'text-yellow-400',
    CONFIRMED: 'text-blue-400',
    COMPLETED: 'text-green-400',
    CANCELLED: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      <main className="p-8 page-shell max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">📋 我的預約</h1>
        {loadError ? (
          <ErrorState message="預約記錄載入失敗" onRetry={load} />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={<span className="text-6xl">📋</span>}
            title="尚無預約記錄"
            description="預約保養或到店安裝，車廠會先與你確認時程"
            primaryAction={{ label: '找車廠保養', onClick: () => navigate('/garages') }}
          />
        ) : (
          <div className="space-y-4">
            {appointments.map(a => (
              <div key={a.id} className="bg-surface-800 p-6 rounded-xl">
                <div className="flex justify-between">
                  <h3 className="font-bold">{a.vehicle?.make} {a.vehicle?.model}</h3>
                  <span className={statusColor[a.status] || 'text-surface-400'}>
                    {statusMap[a.status] || a.status}
                  </span>
                </div>
                <p className="text-surface-400">{a.garage?.garage_name} - {a.garage?.garage_address}</p>
                <p className="text-surface-500">預約時間：{new Date(a.scheduled_at).toLocaleString()}</p>
                <p className="text-surface-500">項目：{a.service_type || '—'}</p>

                {/* 🆕 安裝項目清單 */}
                {Array.isArray(a.install_items) && a.install_items.length > 0 && (
                  <div className="mt-3 bg-surface-700/40 rounded-lg px-3 py-2">
                    <p className="text-xs text-surface-400 mb-1">🔧 安裝項目：</p>
                    {a.install_items.map((it, i) => (
                      <p key={i} className="text-sm text-surface-300">· {it.name} ×{it.qty}</p>
                    ))}
                  </div>
                )}

                {/* 🆕 車廠報價卡 */}
                {a.quote_amount != null && a.status === 'PENDING' && (
                  <div className="mt-3 bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
                    <p className="text-sm text-amber-300 font-bold mb-1">💰 車廠工資報價</p>
                    <p className="text-lg font-black text-white">NT$ {Number(a.quote_amount).toLocaleString()}</p>
                    {a.quote_note && <p className="text-xs text-amber-200/70 mt-0.5">{a.quote_note}</p>}
                  </div>
                )}

                {/* 🆕 車廠提議新時間 → 客戶確認 */}
                {a.proposed_at && a.status === 'PENDING' && (
                  <div className="mt-3 bg-purple-900/20 border border-purple-600/30 rounded-lg p-3">
                    <p className="text-sm text-purple-300 font-bold mb-1">📅 車廠建議時間</p>
                    <p className="text-white font-medium">{new Date(a.proposed_at).toLocaleString('zh-TW')}</p>
                    <p className="text-xs text-surface-500 mt-0.5">（原指定：{new Date(a.scheduled_at).toLocaleString()}）</p>
                    <button
                      onClick={() => acceptProposal(a.id)}
                      disabled={acceptingId === a.id}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 rounded-lg text-sm font-bold transition"
                    >
                      {acceptingId === a.id ? '確認中…' : '✓ 同意此時間'}
                    </button>
                  </div>
                )}

                {/* 🆕 取消按鈕：僅 PENDING / CONFIRMED 可取消 */}
                {['PENDING', 'CONFIRMED'].includes(a.status) && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => cancelAppointment(a.id)}
                      disabled={cancellingId === a.id}
                      className="bg-surface-700 hover:bg-red-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium text-surface-300 hover:text-white transition"
                    >
                      {cancellingId === a.id ? '取消中…' : '✕ 取消預約'}
                    </button>
                  </div>
                )}

                {/* 🆕 評價：完工後可評分（一預約一評） */}
                {a.status === 'COMPLETED' && (
                  <ReviewSection appointmentId={a.id} garageName={a.garage?.garage_name} onSaved={load} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ========== 🆕 評價區塊（COMPLETED 預約顯示；已評則顯示已送出內容） ========== */
function ReviewSection({ appointmentId, garageName, onSaved }) {
  const [reviewed, setReviewed] = useState(null); // 已存在的評價
  const [checked, setChecked] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/reviews/mine?appointmentId=${appointmentId}`)
      .then(res => {
        if (res.data) { setReviewed(res.data); setRating(res.data.rating); }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [appointmentId]);

  if (!checked) return null;

  // 已評價 → 顯示已送出內容
  if (reviewed) {
    return (
      <div className="mt-4 bg-emerald-900/15 border border-emerald-600/25 rounded-lg p-3">
        <p className="text-xs text-emerald-300 mb-1">
          ⭐ 你對{garageName || '此車廠'}的評價
        </p>
        <p className="text-amber-400 text-sm">{'★'.repeat(reviewed.rating)}{'☆'.repeat(5 - reviewed.rating)}</p>
        {reviewed.comment && <p className="text-sm text-slate-300 mt-1">{reviewed.comment}</p>}
      </div>
    );
  }

  const submit = async () => {
    if (rating === 0) { setError('請選擇星等'); return; }
    setSaving(true);
    try {
      await api.post('/reviews', { appointmentId, rating, comment });
      setReviewed({ rating, comment });
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.response?.data?.error || '送出失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 bg-surface-700/30 border border-surface-600/40 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-2">⭐ 評價{garageName || ''}的服務</p>
      {/* 星等選擇 */}
      <div className="flex gap-1 mb-2" role="radiogroup" aria-label="選擇星等">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button"
            onClick={() => { setRating(n); setError(''); }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} 星`}
            className={`text-2xl transition-colors ${(hover || rating) >= n ? 'text-amber-400' : 'text-slate-600 hover:text-amber-200'}`}>
            ★
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value.slice(0, 200))}
        rows={2} maxLength={200}
        placeholder="分享你的安裝體驗（選填，最多 200 字）"
        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-surface-600">{comment.length}/200</p>
        <button onClick={submit} disabled={saving || rating === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-1.5 rounded-lg text-sm font-bold transition">
          {saving ? '送出中…' : '送出評價'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
