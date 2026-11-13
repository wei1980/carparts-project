// src/pages/BrandDetail.jsx — 品牌介紹頁（Phase 1：該品牌熱門零件）
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';
import { PartCard } from './Shop';

export default function BrandDetail() {
  const { brand } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api.get('/parts/recommended', { params: { brand, sort: 'hot', pageSize: 12 } })
      .then(res => setParts(res.data?.parts || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [brand]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] text-white">
        <Navbar />
        <main className="page-shell">
          <div className="skeleton h-10 w-64 rounded-xl mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-[380px] rounded-2xl" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-white">
      <Navbar />
      <main className="page-shell">
        <button onClick={() => navigate('/shop')} className="text-sm text-blue-400 hover:text-blue-300 font-bold">
          ← 回商品列表
        </button>
        <h1 className="text-3xl lg:text-4xl font-black text-white mt-4">🏭 {brand}</h1>
        <p className="text-slate-400 mt-2">此品牌熱門零件與適配情境，快速進入商品細頁。</p>

        {error ? (
          <ErrorState message="品牌零件載入失敗" onRetry={load} />
        ) : parts.length === 0 ? (
          <p className="text-slate-400 mt-8">此品牌目前暫無上架可顯示的零件。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {parts.map((p) => (
              <PartCard key={p.id} part={p} onAdd={addToCart} onOpen={(id) => navigate(`/part/${id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
