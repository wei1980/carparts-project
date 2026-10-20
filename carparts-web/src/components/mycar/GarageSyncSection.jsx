// src/components/mycar/GarageSyncSection.jsx — 車廠工單同步區塊
// 抽離自 src/pages/MyCar.jsx（第一階段重構：模組化與瘦身）
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { myCarAPI } from '../../api';
import { consumerClient as api } from '../../api/client';

const DT = (d) => (d ? new Date(d).toLocaleDateString('zh-TW') : '—');
// ===== 車廠工單同步區塊 =====
export default function GarageSyncSection({ vehicleId, onSynced }) {
  const navigate = useNavigate();
  const [syncOrders, setSyncOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    loadCompletedOrders();
  }, [vehicleId]);

  const loadCompletedOrders = async () => {
    try {
      const res = await api.get(`/vehicles/${vehicleId}/completed-work-orders`);
      setSyncOrders(res.data || []);
    } catch (err) {
      console.warn('載入完工工單失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (orderId, itemId) => {
    setSelectedItems(prev => {
      const orderItems = prev[orderId] || new Set();
      const next = new Set(orderItems);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { ...prev, [orderId]: next };
    });
  };

  const handleSync = async (order) => {
    const itemsToSync = (selectedItems[order.id] || []).map(itemId => {
      const item = order.items.find(i => i.id === itemId);
      if (!item) return null;
      return {
        category: item.kind === 'PART' ? 'PART' : 'LABOR',
        partType: item.name.split(' ')[0] || 'other',
        brand: item.brand || '未知品牌',
        model: item.name,
        specJson: { quantity: item.quantity, unit_price: item.unit_price },
        installedAt: order.completed_at,
        installedMileageKm: order.mileage_km,
        laborCost: item.kind === 'LABOR' ? item.unit_price : undefined,
        warrantyUntil: undefined,
        garageId: order.garage_id,
        beforePhotoUrls: order.before_photos || [],
        afterPhotoUrls: order.after_photos || [],
        note: `同步自工單 #${order.id}：${order.summary || ''}`
      };
    }).filter(Boolean);

    if (itemsToSync.length === 0) {
      toast.error('請至少選擇一個項目');
      return;
    }

    setSyncing(order.id);
    try {
      await myCarAPI.syncFromGarage(vehicleId, { workOrderId: order.id, items: itemsToSync });
      toast.success(`已同步 ${itemsToSync.length} 項目至車況檔案`);
      onSynced?.();
    } catch (err) {
      toast.error('同步失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <div className="skeleton h-40 rounded-xl" />;

  if (syncOrders.length === 0) {
    return (
      <section className="lg:col-span-2 bg-[#131a22] rounded-2xl p-5 border border-[#26313d]">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          🔄 車廠工單同步 <span className="text-xs text-slate-500">（將完工紀錄寫入車況檔案）</span>
        </h3>
        <p className="text-slate-500 text-sm py-8 text-center">
          目前沒有可同步的完工工單 — 到<a onClick={() => navigate('/garages')} className="text-blue-400 underline underline-offset-2 cursor-pointer mx-1">合作車廠</a>進行保養或維修後即可同步
        </p>
      </section>
    );
  }

  return (
    <section className="lg:col-span-2 bg-[#131a22] rounded-2xl p-5 border border-[#26313d]">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        🔄 車廠工單同步 <span className="text-xs text-slate-500">（將完工紀錄寫入車況檔案，建立完整保養時間線）</span>
      </h3>
      <div className="space-y-4">
        {syncOrders.map(order => (
          <div key={order.id} className="bg-[#101720] rounded-xl p-4 border border-[#212c38]">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
              <div>
                <p className="font-bold text-white">工單 #{order.id} · {order.garage_name || order.garage_company_name}</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  {DT(order.completed_at)} · {order.mileage_km ? `${Number(order.mileage_km).toLocaleString()} km` : '里程未記錄'}
                  {order.technician && ` · 技師：${order.technician}`}
                </p>
              </div>
              <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md">已完工</span>
            </div>

            <div className="space-y-2 mb-3">
              {order.items.map(item => (
                <label key={item.id} className="flex items-center gap-3 text-sm bg-[#0b0f14] p-3 rounded-lg border border-[#26313d]">
                  <input
                    type="checkbox"
                    checked={selectedItems[order.id]?.has(item.id)}
                    onChange={() => toggleItem(order.id, item.id)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-white">{item.kind === 'PART' ? '🔧' : '👷'} {item.name}</span>
                    <span className="text-slate-500 ml-2">×{item.quantity} · NT$ {Number(item.unit_price).toLocaleString()}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {item.kind === 'LABOR' ? '工資' : '零件'}
                  </span>
                </label>
              ))}
            </div>

            <button
              onClick={() => handleSync(order)}
              disabled={syncing === order.id || !selectedItems[order.id]?.size}
              className="w-full py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing === order.id ? '同步中...' : `同步選取項目 (${selectedItems[order.id]?.size || 0} 項)`}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
