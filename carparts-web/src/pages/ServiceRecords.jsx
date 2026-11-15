// src/pages/ServiceRecords.jsx — 車主：愛車保養維修歷史
import { useEffect, useState } from 'react';
import { consumerClient as api } from '../api/client';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';

const statusMap = {
  DRAFT: '建立中',
  IN_PROGRESS: '施工中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const statusColor = {
  DRAFT: 'text-yellow-400',
  IN_PROGRESS: 'text-blue-400',
  COMPLETED: 'text-green-400',
  CANCELLED: 'text-red-400',
};

export default function ServiceRecords() {
  const [records, setRecords] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    api.get('/service-records')
      .then(res => setRecords(res.data))
      .catch(err => { console.warn('載入失敗:', err?.message || err); setLoadError(true); });
  };

  useEffect(load, []);

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      <main className="p-8 page-shell max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">🛠️ 保養維修紀錄</h1>
        {loadError ? (
          <ErrorState message="維修紀錄載入失敗" onRetry={load} />
        ) : records.length === 0 ? (
          <p className="text-surface-400">尚無維修紀錄。到車廠保養後，工單會自動出現在這裡。</p>
        ) : (
          <div className="space-y-4">
            {records.map(r => (
              <div key={r.id} className="bg-surface-800 p-6 rounded-xl">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <div>
                    <h3 className="font-bold">{r.vehicle?.make} {r.vehicle?.model}
                      {r.vehicle?.licensePlate && <span className="ml-2 text-sm text-surface-400">({r.vehicle.licensePlate})</span>}
                    </h3>
                    <p className="text-surface-400 text-sm mt-1">
                      {r.garage?.garage_name}　{new Date(r.created_at).toLocaleDateString()}
                      {r.mileage_km != null && <>　里程：{Number(r.mileage_km).toLocaleString()} km</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={statusColor[r.status] || 'text-surface-400'}>
                      {statusMap[r.status] || r.status}
                    </span>
                    <p className="text-lg font-bold mt-1">NT$ {Number(r.total_amount).toLocaleString()}</p>
                  </div>
                </div>

                {r.summary && <p className="text-surface-300 text-sm mt-3">{r.summary}</p>}

                {expandedId === r.id && (
                  <div className="mt-4 border-t border-surface-700 pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-surface-500 text-left">
                          <th className="pb-2">項目 / 零件</th>
                          <th className="pb-2">數量</th>
                          <th className="pb-2 text-right">單價</th>
                          <th className="pb-2 text-right">小計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map(it => (
                          <tr key={it.id} className="border-t border-surface-700/50">
                            <td className="py-2">
                              {it.kind === 'PART' ? '🔧 ' : '👷 '}
                              {it.name}
                              {it.part_brand && <span className="text-surface-500 ml-2">{it.part_brand}</span>}
                              {/* 🔒 客戶端不顯示料號（避免比價） */}
                            </td>
                            <td className="py-2">×{it.quantity}</td>
                            <td className="py-2 text-right">{Number(it.unit_price).toLocaleString()}</td>
                            <td className="py-2 text-right">{(it.unit_price * it.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* 🆕 施工照片（車廠上傳，車主可看） */}
                    {Array.isArray(r.work_photos) && r.work_photos.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-surface-300 mb-2">📷 施工照片</p>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {r.work_photos.map((p, i) => (
                            <a
                              key={p.url || i}
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block aspect-square overflow-hidden rounded-lg border border-surface-700 bg-surface-900"
                            >
                              <img src={p.url} alt={`施工照 ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                            </a>
                          ))}
                        </div>
                        {r.work_photos[0]?.time && (
                          <p className="text-xs text-surface-500 mt-1">
                            拍攝時間：{new Date(r.work_photos[0].time).toLocaleString('zh-TW')}
                          </p>
                        )}
                      </div>
                    )}
                    {r.garage?.garage_phone && (
                      <p className="text-surface-500 text-xs mt-4">施工車廠電話：{r.garage.garage_phone}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
