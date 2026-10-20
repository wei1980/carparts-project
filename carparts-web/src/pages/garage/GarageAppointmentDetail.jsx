// src/pages/garage/GarageAppointmentDetail.jsx — 車廠：預約詳情 / 報價 / 改時間 / 狀態流轉
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { garageClient as api } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

const statusMap = {
  PENDING: '待確認',
  CONFIRMED: '已確認',
  ARRIVED: '已到店',
  IN_PROGRESS: '施工中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const statusStyle = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CONFIRMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ARRIVED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status] || 'bg-gray-500/20 text-gray-400';
};

export default function GarageAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [proposedAt, setProposedAt] = useState('');
  const [laborFees, setLaborFees] = useState([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/garage/appointments/${id}`);
      setAppt(res.data);
      if (res.data.labor_fees) setLaborFees(res.data.labor_fees || []);
    } catch (err) {
      toast.error('載入失敗：' + (err.response?.data?.error || err.message));
      navigate('/garage/calendar');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (newStatus) => {
    if (!(await confirmDialog({ message: `確定要${statusMap[newStatus] || '更新狀態'}嗎？` }))) return;
    setUpdating(true);
    try {
      await api.patch(`/garage/appointments/${id}`, { status: newStatus });
      toast.success(`${statusMap[newStatus]}完成`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '更新失敗');
    } finally {
      setUpdating(false);
    }
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if ((!quoteAmount && !proposedAt)) return toast.error('請填寫報價金額或提議時間');
    
    setUpdating(true);
    try {
      const data = {};
      if (quoteAmount) data.quoteAmount = parseInt(quoteAmount);
      if (quoteNote) data.quoteNote = quoteNote;
      if (proposedAt) data.proposedAt = proposedAt;
      
      await api.patch(`/garage/appointments/${id}/quote`, data);
      toast.success('報價/提議時間已送出，客戶將收到 LINE 通知');
      setShowQuoteModal(false);
      setQuoteAmount(''); setQuoteNote(''); setProposedAt('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '送出失敗');
    } finally {
      setUpdating(false);
    }
  };

  const handleFeeToggle = (feeId) => {
    setSelectedFeeIds(prev => prev.includes(feeId) ? prev.filter(x => x !== feeId) : [...prev, feeId]);
  };

  const openQuoteModal = () => {
    setQuoteAmount(appt.quote_amount || '');
    setQuoteNote(appt.quote_note || '');
    setProposedAt(appt.proposed_at ? new Date(appt.proposed_at).toISOString().slice(0, 16) : '');
    setShowQuoteModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-3 border-gray-600 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (!appt) return null;

  const canConfirm = appt.status === 'PENDING';
  const canArrive = appt.status === 'CONFIRMED';
  const canStartWork = appt.status === 'ARRIVED';
  const canComplete = appt.status === 'IN_PROGRESS';
  const canQuote = ['PENDING', 'CONFIRMED'].includes(appt.status);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 頂部導航 */}
      <nav className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/garage/calendar')}>
          <span className="text-xl font-bold tracking-wider">🏎️ 車大師車廠</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/garage/calendar')} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-medium text-sm">← 返回行事曆</button>
          <button onClick={() => navigate('/garage/dashboard')} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-medium text-sm">儀表板</button>
        </div>
      </nav>

      <main className="p-4 sm:p-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">預約詳情 #{appt.id}</h1>
            <p className="text-gray-400 mt-1">{appt.vehicle?.make} {appt.vehicle?.model} {appt.vehicle?.licensePlate ? `(${appt.vehicle.licensePlate})` : ''}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle(appt.status)}`}>
            {statusMap[appt.status] || appt.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：基本資訊 + 安裝項目 + 報價/提議時間 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本資訊卡片 */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
              <h2 className="font-bold text-lg mb-4">基本資訊</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">預約時間</p>
                  <p className="font-medium">{new Date(appt.scheduled_at).toLocaleString('zh-TW')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">車主</p>
                  <p className="font-medium">{appt.user?.name || appt.user?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">服務類型</p>
                  <p className="font-medium">{appt.service_type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">車輛</p>
                  <p className="font-medium">{appt.vehicle?.make} {appt.vehicle?.model} {appt.vehicle?.generation ? `(${appt.vehicle.generation})` : ''}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">車牌</p>
                  <p className="font-medium text-blue-400">{appt.vehicle?.licensePlate || '未提供'}</p>
                </div>
                {appt.note && !appt.note.startsWith('{') && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">備註</p>
                    <p className="font-medium">{appt.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 安裝項目 */}
            {Array.isArray(appt.install_items) && appt.install_items.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                <h2 className="font-bold text-lg mb-4">🔧 客戶勾選的安裝項目</h2>
                <ul className="space-y-2">
                  {appt.install_items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between p-3 bg-gray-700/40 rounded-lg">
                      <span>{it.name} {it.sku ? `(${it.sku})` : ''}</span>
                      <span className="text-gray-400">×{it.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 車廠報價顯示 */}
            {(appt.quote_amount != null || appt.proposed_at) && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                <h2 className="font-bold text-lg mb-4">💰 報價與時間協商</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appt.quote_amount != null && (
                    <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                      <p className="text-xs text-amber-400 mb-1">工資報價</p>
                      <p className="text-2xl font-bold text-white">NT$ {Number(appt.quote_amount).toLocaleString()}</p>
                      {appt.quote_note && <p className="text-xs text-amber-300/70 mt-1">{appt.quote_note}</p>}
                    </div>
                  )}
                  {appt.proposed_at && (
                    <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                      <p className="text-xs text-purple-400 mb-1">建議時間</p>
                      <p className="text-lg font-bold text-white">{new Date(appt.proposed_at).toLocaleString('zh-TW')}</p>
                      <p className="text-xs text-gray-500 mt-0.5">（原：{new Date(appt.scheduled_at).toLocaleString('zh-TW')}）</p>
                    </div>
                  )}
                </div>
                {appt.status === 'PENDING' && !appt.proposed_at && (
                  <p className="text-xs text-gray-500 mt-3 text-center">等待客戶確認新時間...</p>
                )}
              </div>
            )}

            {/* 報價/提議時間 Modal 觸發 */}
            {canQuote && (
              <button onClick={openQuoteModal} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                <span>💰</span> 報價工資 / 📅 提議其他時間
              </button>
            )}
          </div>

          {/* 右側：狀態操作 + 標準工資表 */}
          <div className="space-y-6">
            {/* 狀態流轉按鈕 */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50 sticky top-24 h-fit">
              <h2 className="font-bold text-lg mb-4">狀態操作</h2>
              <div className="space-y-3">
                {canConfirm && (
                  <button onClick={() => handleStatusUpdate('CONFIRMED')} disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-lg font-medium text-lg">
                    ✓ 接受預約 (→ 已確認)
                  </button>
                )}
                {canArrive && (
                  <button onClick={() => handleStatusUpdate('ARRIVED')} disabled={updating}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 py-3 rounded-lg font-medium text-lg">
                    🅿️ 車主已到店 (→ 已到店)
                  </button>
                )}
                {canStartWork && (
                  <button onClick={() => handleStatusUpdate('IN_PROGRESS')} disabled={updating}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-3 rounded-lg font-medium text-lg">
                    🔧 開始施工 (→ 施工中)
                  </button>
                )}
                {canComplete && (
                  <button onClick={() => handleStatusUpdate('COMPLETED')} disabled={updating}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 rounded-lg font-medium text-lg">
                    ✅ 標記完工 (→ 已完成)
                  </button>
                )}
                {['PENDING', 'CONFIRMED'].includes(appt.status) && (
                  <button onClick={() => handleStatusUpdate('CANCELLED')} disabled={updating}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 py-3 rounded-lg font-medium text-lg">
                    ✕ 取消預約
                  </button>
                )}
              </div>

              {/* 快速工單連結 */}
              {['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'].includes(appt.status) && (
                <div className="mt-6 pt-6 border-t border-gray-700/50">
                  <button onClick={() => navigate('/garage/work-orders')} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-medium text-lg">
                    📋 開工單 / 前往工單
                  </button>
                </div>
              )}
            </div>

            {/* 標準工資表（快速帶價） */}
            {laborFees.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                <h2 className="font-bold text-lg mb-4">💰 標準工資表（點選加入報價）</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {laborFees.map(f => (
                    <label key={f.id} className={`flex items-center gap-3 p-3 rounded-lg border transition ${selectedFeeIds.includes(f.id) ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                      <input type="checkbox" checked={selectedFeeIds.includes(f.id)} onChange={() => handleFeeToggle(f.id)} className="w-4 h-4 accent-blue-500" />
                      <span className="flex-1 min-w-0 truncate">{f.name}{f.note && <span className="ml-2 text-xs text-amber-400">{f.note}</span>}</span>
                      <span className="font-mono text-emerald-400 shrink-0">${Number(f.price).toLocaleString()}</span>
                    </label>
                  ))}
                </div>
                {selectedFeeIds.length > 0 && (
                  <p className="text-xs text-blue-300 mt-2">已選 {selectedFeeIds.length} 項，報價時將自動帶入總價</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 報價/提議時間 Modal */}
        {showQuoteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700 animate-slide-in">
              <form onSubmit={handleQuoteSubmit}>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">報價 / 提議時間</h3>
                    <button type="button" onClick={() => setShowQuoteModal(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">工資報價 (元)</label>
                    <input type="number" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)} className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="如：1500" />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">報價說明</label>
                    <textarea value={quoteNote} onChange={e => setQuoteNote(e.target.value)} rows={2} className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" placeholder="如：特殊零件另議、含材料費..." />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">建議時間 (可選)</label>
                    <input type="datetime-local" value={proposedAt} onChange={e => setProposedAt(e.target.value)} className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white" />
                    <p className="text-xs text-gray-500 mt-1">不填則維持原預約時間</p>
                  </div>

                  {/* 快速帶入標準工資 */}
                  {selectedFeeIds.length > 0 && laborFees.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-xs text-blue-400 mb-2">已選標準工資：</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedFeeIds.map(fid => {
                          const f = laborFees.find(x => x.id === fid);
                          return f ? <span key={fid} className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">{f.name} ${Number(f.price).toLocaleString()}</span> : null;
                        })}
                      </div>
                      <button type="button" onClick={() => {
                        const total = selectedFeeIds.reduce((sum, fid) => {
                          const f = laborFees.find(x => x.id === fid);
                          return sum + (f?.price || 0);
                        }, 0);
                        setQuoteAmount(String(total));
                      }} className="mt-2 w-full text-sm text-blue-400 hover:text-blue-300 underline">
                        自動填入總價：NT$ {selectedFeeIds.reduce((sum, fid) => sum + (laborFees.find(x => x.id === fid)?.price || 0), 0).toLocaleString()}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowQuoteModal(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 font-medium">取消</button>
                    <button type="submit" disabled={updating} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium disabled:opacity-50">
                      {updating ? '送出中…' : '送出通知客戶'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}