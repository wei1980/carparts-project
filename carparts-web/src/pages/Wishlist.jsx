// src/pages/Wishlist.jsx — 願望清單：追蹤商品 + 期望價降價通知
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wishlistAPI } from '../api';
import Navbar from '../components/Navbar';
import PartImage from '../components/PartImage';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { confirmDialog } from '../components/ConfirmDialog';

const NT = (n) => `NT$ ${Number(n || 0).toLocaleString()}`;

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const navigate = useNavigate();

  const load = () => {
    wishlistAPI.list()
      .then(res => { setItems(res.data); setError(''); })
      .catch(err => {
        console.warn('載入失敗:', err?.message || err);
        setError('願望清單載入失敗，請重新整理再試');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRemove = async (id) => {
    if (!(await confirmDialog({ message: '確定要從願望清單移除嗎？' }))) return;
    try {
      await wishlistAPI.remove(id);
      setItems(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      toast.error('移除失敗');
    }
  };

  const handleSavePrice = async (id) => {
    try {
      await wishlistAPI.update(id, { targetPrice: editPrice === '' ? null : editPrice });
      setEditingId(null);
      load();
    } catch (err) {
      toast.error('更新期望價失敗');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Navbar />
      <main className="page-shell max-w-4xl">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">❤️ 願望清單</h1>
            <p className="text-slate-400 text-sm mt-1">設定期望價，降價時透過 LINE 通知你</p>
          </div>
          <button onClick={() => navigate('/shop')} className="btn-secondary px-4 py-2 text-sm font-medium">
            去逛商城 →
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3">
            <span className="text-sm">{error}</span>
            <button onClick={() => window.location.reload()} className="ml-auto text-sm underline underline-offset-2 hover:text-red-200">重試</button>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={<span className="text-6xl">💔</span>}
            title="願望清單是空的"
            description="標記你心儀的零件，降價時會透過 LINE 通知你"
            primaryAction={{ label: '去逛逛零件商城', onClick: () => navigate('/shop') }}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="space-y-4">
            {items.map(w => {
              const reached = w.price_reached;
              return (
                <li key={w.id} className={`bg-[#131a22] rounded-xl border p-4 flex flex-col sm:flex-row items-center gap-4 transition ${reached ? 'border-emerald-500/50' : 'border-[#26313d]'}`}>
                  {/* 商品圖 */}
                  <div className="product-image-container w-24 h-24 rounded-lg shrink-0 cursor-pointer hover:opacity-90 transition">
                    <PartImage
                      src={w.part?.image_url}
                      alt={w.part?.name || '商品'}
                      onClick={() => w.part && navigate(`/part/${w.part.id}`)}
                    />
                  </div>

                  {/* 資訊 */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">{w.part?.brand || ''}</p>
                    <h3 className="font-bold truncate cursor-pointer hover:text-blue-400 transition"
                      onClick={() => w.part && navigate(`/part/${w.part.id}`)}>
                      {w.part?.name || w.description}
                    </h3>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2 justify-center sm:justify-start">
                      <span className={`font-black ${reached ? 'text-emerald-400' : 'text-white'}`}>
                        現價 {NT(w.current_price)}
                      </span>
                      {w.target_price != null && (
                        <span className="text-sm text-slate-500">
                          期望價 {NT(w.target_price)}
                          {!reached && <span className="ml-1">(再降 {NT(Number(w.current_price) - Number(w.target_price))})</span>}
                        </span>
                      )}
                    </div>

                    {/* 狀態徽章 */}
                    <div className="mt-2 flex gap-2 justify-center sm:justify-start">
                      {reached && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/90 text-white rounded-md animate-pulse">
                          🔥 已達期望價
                        </span>
                      )}
                      {w.status !== 'PENDING' && <span className="chip">{w.status}</span>}
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === w.id ? (
                      <>
                        <input
                          type="number" min="0" autoFocus value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSavePrice(w.id)}
                          placeholder="期望價"
                          aria-label="期望價格"
                          className="field w-28 h-10"
                        />
                        <button onClick={() => handleSavePrice(w.id)} className="btn-primary px-3 h-10 text-sm font-bold">存</button>
                        <button onClick={() => setEditingId(null)} className="btn-secondary px-3 h-10 text-sm">取消</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(w.id); setEditPrice(w.target_price ?? ''); }}
                          className="btn-secondary px-3 h-10 text-xs font-medium"
                        >
                          {w.target_price != null ? '✏️ 改期望價' : '🔔 設期望價'}
                        </button>
                        <button
                          onClick={() => handleRemove(w.id)}
                          aria-label="移除此項目"
                          className="px-2 h-10 text-slate-500 hover:text-red-400 transition"
                        >✕</button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
