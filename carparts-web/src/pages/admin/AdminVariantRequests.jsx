// src/pages/admin/AdminVariantRequests.jsx — 管理端：待補車型（方案 A 配套）
//
// 客戶註冊時若車型庫找不到對應車型會被擋下並記錄在此。
// 這個頁面讓管理者：
//   1. 看「待補車型」清單（依累計次數排序，最常被卡住的排前面）
//   2. 勾選要補的車型 → 複製到 import CSV（或直接看次數決定優先序）
//   3. 補完車型後標記 RESOLVED
import { useCallback, useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';

export default function AdminVariantRequests() {
  const [rows, setRows] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminClient.get('/variant-requests', {
        params: { status, q: q || undefined, page, pageSize: 20 },
      });
      setRows(res.data.rows || []);
      setGrouped(res.data.grouped || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      console.error('載入待補車型失敗:', err);
      setRows([]); setGrouped([]); setPagination(null);
      setError(err?.response?.data?.error || err?.friendlyMessage || '載入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);

  const markResolved = async (id) => {
    try {
      await adminClient.patch(`/variant-requests/${id}`, { status: 'RESOLVED' });
      toast.success('已標記為已補');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || '更新失敗');
    }
  };

  const markDismissed = async (id) => {
    try {
      await adminClient.patch(`/variant-requests/${id}`, { status: 'DISMISSED' });
      toast.success('已忽略');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || '更新失敗');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">🚙 待補車型</h1>
      <p className="text-sm text-surface-400 mb-5">
        客戶註冊時若車型庫找不到對應車型，會被擋下並記錄在這裡。
        累計次數越高代表越多客戶卡在該車型，請優先補進車型庫。
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              status === s ? 'bg-blue-600 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
            }`}
          >
            {s === 'PENDING' ? '待補' : s === 'RESOLVED' ? '已補' : s === 'DISMISSED' ? '已忽略' : '全部'}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="搜尋廠牌／車型／手機"
          className="ml-auto rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm w-56"
        />
      </div>

      {loading ? (
        <p className="text-surface-400 py-8">載入中…</p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-4">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={load} className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white">
            重新載入
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-surface-500 py-8">目前沒有待補車型。</p>
      ) : (
        <>
          {/* 依車型聚合（同一車型不同客戶合併） */}
          {grouped.length > 0 && (
            <section className="mb-6">
              <h2 className="font-bold mb-2">依車型聚合</h2>
              <div className="overflow-x-auto rounded-xl border border-surface-700">
                <table className="w-full text-sm">
                  <thead className="bg-surface-800/60">
                    <tr>
                      <th className="text-left p-3">廠牌</th>
                      <th className="text-left p-3">車型</th>
                      <th className="text-left p-3">年份</th>
                      <th className="text-right p-3">累計次數</th>
                      <th className="text-right p-3">客戶數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((g, i) => (
                      <tr key={i} className="border-t border-surface-700/50">
                        <td className="p-3">{g.make}</td>
                        <td className="p-3">{g.model}</td>
                        <td className="p-3 text-surface-400">{(g.years || []).join(', ')}</td>
                        <td className="p-3 text-right font-bold text-amber-400">{g.total_requests}</td>
                        <td className="p-3 text-right">{g.requesters}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 逐筆（可標記） */}
          <h2 className="font-bold mb-2">逐筆紀錄</h2>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-700 bg-surface-800/40 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {r.make} {r.model}
                    {r.year ? <span className="text-surface-400 ml-2">{r.year}</span> : null}
                  </p>
                  <p className="text-xs text-surface-500">
                    {r.phone} · 重試 {r.request_count} 次 · {new Date(r.created_at).toLocaleString('zh-TW')}
                    {r.engine_code ? ` · 引擎 ${r.engine_code}` : ''}
                  </p>
                </div>
                {status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => markResolved(r.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">
                      已補
                    </button>
                    <button onClick={() => markDismissed(r.id)} className="rounded-lg bg-surface-700 px-3 py-1.5 text-sm text-surface-300">
                      忽略
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-surface-800 px-3 py-1.5 disabled:opacity-40"
              >
                上一頁
              </button>
              <span className="text-surface-400">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page >= pagination.pages}
                className="rounded-lg bg-surface-800 px-3 py-1.5 disabled:opacity-40"
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}