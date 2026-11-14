// src/pages/garage/GarageReports.jsx — 車廠月報表（工單數/營收/熱門工項/趨勢）
import { useEffect, useState, useCallback } from 'react';
import { garageClient as api } from '../../api/client';
import GarageNav from '../../components/GarageNav';

const fmt = n => Number(n || 0).toLocaleString();

export default function GarageReports() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.get(`/garage/reports/monthly?month=${month}`).then(res => setData(res.data))
      // ⚠️ 載入失敗必須讓使用者看到：否則畫面只顯示「無資料」，
      //    無法分辨「這個月真的沒營收」與「API 掛了」。
      .catch(err => {
        console.error('載入報表失敗:', err);
        setData(null);
        setError(err?.response?.data?.error || err?.friendlyMessage || '報表載入失敗，請稍後再試');
      })
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const maxTrend = Math.max(1, ...(data?.revenue_trend || []).map(t => t.revenue));

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100">
      <GarageNav
        active="reports"
        right={
          <input
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={e => setMonth(e.target.value)}
            aria-label="選擇月份"
            className="rounded-lg border border-[#26313d] bg-[#131a22] px-2.5 py-1.5 text-xs text-slate-200"
          />
        }
      />

      <main className="max-w-3xl mx-auto p-4 space-y-5 pb-24">
        <h1 className="text-2xl font-bold">月報表</h1>
        {loading && <div className="text-slate-400 p-6">載入中…</div>}
        {!loading && error && (
          <div role="alert" className="m-4 rounded-xl border border-red-800 bg-red-950/40 p-4">
            <p className="text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
            >
              重新載入
            </button>
          </div>
        )}
        {!loading && !error && !data && <div className="text-slate-500 p-6">無資料</div>}

        {!loading && data && (
          <>
            {/* 核心指標 */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['工單總數', s.work_orders_total, `${s.work_orders_completed} 完工`],
                ['本月營收', `$${fmt(s.total_revenue)}`, `平均單 $${fmt(s.avg_order_value)}`],
                ['工資營收', `$${fmt(s.labor_revenue)}`, 'LABOR'],
                ['零件營收', `$${fmt(s.part_revenue)}`, 'PART'],
              ].map(([label, val, sub]) => (
                <div key={label} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-xl font-black mt-1">{val}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
                </div>
              ))}
            </section>

            {/* 預約 */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h2 className="font-bold mb-2">📅 本月預約</h2>
              <p className="text-sm text-slate-300">
                共 <b className="text-blue-400">{data.appointments.total}</b> 筆，完成 <b className="text-emerald-400">{data.appointments.completed}</b> 筆
                （完成率 {data.appointments.total ? Math.round(data.appointments.completed / data.appointments.total * 100) : 0}%）
              </p>
            </section>

            {/* 熱門工項 */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h2 className="font-bold mb-3">🔥 熱門工項 TOP 5</h2>
              {data.top_labor_items.length === 0 ? (
                <p className="text-sm text-slate-500">本月尚無工資項目紀錄</p>
              ) : (
                <ul className="space-y-2">
                  {data.top_labor_items.map((it, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>{i + 1}</span>
                      <span className="flex-1 text-sm">{it.name}</span>
                      <span className="text-sm text-emerald-400">×{fmt(it.count)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 近 6 個月趨勢（簡易條圖） */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h2 className="font-bold mb-3">📈 近 6 個月完工營收</h2>
              <div className="space-y-2">
                {data.revenue_trend.map(t => (
                  <div key={t.month} className="flex items-center gap-3 text-xs">
                    <span className="w-14 text-slate-400">{t.month}</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded"
                        style={{ width: `${Math.round(t.revenue / maxTrend * 100)}%` }} />
                    </div>
                    <span className="w-24 text-right font-mono text-emerald-400">${fmt(t.revenue)}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
