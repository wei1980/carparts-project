// src/pages/VehicleDetail.jsx — 車系/世代介紹頁（Phase 2：適配零件清單）
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';
import { PartCard } from './Shop';

export default function VehicleDetail() {
  const { variantId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();

  const make = searchParams.get('make') || '';
  const model = searchParams.get('model') || '';
  const year = searchParams.get('year') || '';

  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 載入車款世代/引擎資訊（/api/vehicles/variants；未提供 make/model 時略過）
  const loadVehicle = useCallback(async () => {
    if (!make || !model) { setVehicle(null); return; }
    setVehicleLoading(true);
    try {
      const res = await api.get('/vehicles/variants', { params: { make, model, year } });
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find(v => String(v.id) === String(variantId));
      setVehicle(found
        ? { id: found.id, make: found.make, model: found.model, year_start: found.year_start, year_end: found.year_end, generation: found.generation, engine_code: found.engine_code }
        : null);
    } catch { setVehicle(null); }
    finally { setVehicleLoading(false); }
  }, [make, model, year, variantId]);

  // 載入此車款適配零件（/api/parts/recommended?variantId=...）
  const loadParts = useCallback(() => {
    setLoading(true);
    setError(false);
    api.get('/parts/recommended', { params: { variantId, sort: 'hot', pageSize: 12 } })
      .then(res => setParts(res.data?.parts || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [variantId]);

  useEffect(() => { loadParts(); }, [loadParts]);
  useEffect(() => { loadVehicle(); }, [loadVehicle]);

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

  const title = vehicle ? `${vehicle.make} ${vehicle.model}` : `車款 #${variantId}`;

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-white">
      <Navbar />
      <main className="page-shell">
        <button onClick={() => navigate('/shop')} className="text-sm text-blue-400 hover:text-blue-300 font-bold">
          ← 回商品列表
        </button>

        <h1 className="text-3xl lg:text-4xl font-black text-white mt-4">🚗 {title}</h1>
        <p className="text-slate-400 mt-2">此車款適配的零件清單，快速進入商品細頁。</p>

        {vehicle && (
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="chip">適用世代 {vehicle.year_start} ~ {vehicle.year_end}</span>
            <span className="chip">引擎 {vehicle.engine_code}</span>
          </div>
        )}

        {error ? (
          <ErrorState message="此車款適配零件載入失敗" onRetry={loadParts} />
        ) : parts.length === 0 ? (
          <p className="text-slate-400 mt-8">此車款目前暫無上架可顯示的適配零件。</p>
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
