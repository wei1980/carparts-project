// src/pages/admin/Dashboard.jsx
import { useEffect, useState, lazy, Suspense } from 'react';
import { adminClient } from '../../api/client';
import { PartialErrorBoundary } from '../../components/ErrorBoundary';

// 🆕 recharts 隔離到獨立 chunk：統計卡/訂單表先渲染，圖表庫非同步載入
const DashboardCharts = lazy(() => import('./DashboardCharts'));
const ChartsLoading = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    {[...Array(2)].map((_, i) => <div key={i} className="bg-gray-800 p-6 rounded-xl"><div className="skeleton h-[250px]" /></div>)}
  </div>
);


export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reload, setReload] = useState(0);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrors({});
    Promise.allSettled([
      adminClient.get('/stats/dashboard'),
      adminClient.get('/dashboard-insights?days=30'),
    ]).then(([statsRes, insightsRes]) => {
      if (!active) return;
      const failed = [statsRes, insightsRes].find(r => r.status === 'rejected' && [401, 403].includes(r.reason?.response?.status));
      setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null);
      setInsights(insightsRes.status === 'fulfilled' ? insightsRes.value.data : null);
      setErrors({
        stats: statsRes.status === 'rejected',
        insights: insightsRes.status === 'rejected',
        auth: Boolean(failed),
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);

  const retry = <button onClick={() => setReload(n => n + 1)} className="ml-3 text-blue-400 underline">重新載入</button>;
  if (loading) return <div className="p-8 text-gray-400">載入中...</div>;
  if (errors.auth) return <div role="alert" className="p-8 text-amber-300">管理員登入已失效或權限不足，請重新登入。<a href="/admin/login" className="ml-3 underline">管理員登入</a></div>;
  if (!stats) return <div role="alert" className="p-8 text-gray-400">無法載入數據，請稍後重試。{retry}</div>;

  const { overview, recentOrders, monthlySales, topParts } = stats;

  const cards = [
    { title: '總會員', value: overview.totalUsers, sub: `本月 +${overview.newUsersThisMonth}`, color: 'bg-blue-600', icon: '👤' },
    { title: '總訂單', value: overview.totalOrders, sub: `本月 ${overview.ordersThisMonth} 筆`, color: 'bg-green-600', icon: '📦' },
    { title: '待處理預約', value: overview.pendingAppointments, sub: `今日 ${overview.todayAppointments} 筆`, color: 'bg-yellow-600', icon: '📅' },
    { title: '合作車廠', value: overview.totalGarages, sub: '', color: 'bg-purple-600', icon: '🏪' },
  ];

  const orderStatusMap = {
    PENDING_PAYMENT: '待付款',
    PAYMENT_REVIEW: '待查核',
    PAID: '已付款',
    SHIPPED: '已出貨',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">📊 數據儀表板</h1>

      {errors.insights && <div role="alert" className="mb-6 text-amber-300">營運洞察暫時無法載入，其他統計仍可查看。{retry}</div>}

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {cards.map(card => (
          <div key={card.title} className={`${card.color} rounded-xl p-6 text-white`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80">{card.title}</p>
                <p className="text-3xl font-bold mt-2">{card.value}</p>
                {card.sub && <p className="text-xs mt-1 opacity-70">{card.sub}</p>}
              </div>
              <span className="text-4xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 圖表區（🆕 recharts lazy chunk） */}
      <PartialErrorBoundary>
        <Suspense fallback={<ChartsLoading />}>
          <DashboardCharts monthlySales={monthlySales} topParts={topParts} />
        </Suspense>
      </PartialErrorBoundary>

      {/* 最近訂單 */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h2 className="text-lg font-bold text-white mb-4">📋 最近訂單</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-white text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="p-3 text-left">訂單編號</th>
                <th className="p-3 text-left">金額</th>
                <th className="p-3 text-left">狀態</th>
                <th className="p-3 text-left">日期</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="p-3 font-mono">{order.order_number}</td>
                  <td className="p-3">NT$ {order.total_amount.toLocaleString()}</td>
                  <td className="p-3">{orderStatusMap[order.status] || order.status}</td>
                  <td className="p-3 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🆕 營運洞察三區塊（dashboard-insights API） */}
      {insights && (
        <Insights insights={insights} />
      )}
    </div>
  );
}

/* ========== 🆕 營運洞察：熱銷排行 / 庫存週轉 / 代購逾期 ========== */
function Insights({ insights }) {
  const { best_sellers, turnover, overdue_preorders, summary } = insights;
  const maxQty = Math.max(...best_sellers.map(s => s.total_qty), 1);

  return (
    <>
      {/* ⚠️ 代購逾期警示列（有逾期才顯示） */}
      {summary.overdue_count > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl mb-6 border-2 border-red-500/60">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
            ⚠️ 代購逾期警示 — {summary.overdue_count} 筆未到貨
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-white text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="p-2 text-left">訂單</th>
                  <th className="p-2 text-left">客戶</th>
                  <th className="p-2 text-left">零件</th>
                  <th className="p-2 text-right">數量</th>
                  <th className="p-2 text-left">承諾到貨</th>
                  <th className="p-2 text-right">逾期</th>
                </tr>
              </thead>
              <tbody>
                {overdue_preorders.slice(0, 10).map((o, i) => (
                  <tr key={`${o.source}-${o.order_id}-${i}`} className="border-b border-gray-700">
                    <td className="p-2 font-mono">{o.order_no}</td>
                    <td className="p-2">{o.customer_name}</td>
                    <td className="p-2 truncate max-w-[220px]">{o.sku} · {o.name}</td>
                    <td className="p-2 text-right">{o.qty}</td>
                    <td className="p-2 text-gray-400">{new Date(o.due_at).toLocaleDateString('zh-TW')}</td>
                    <td className="p-2 text-right">
                      <span className={`px-2 py-0.5 rounded font-bold ${o.days_overdue > 14 ? 'bg-red-600' : 'bg-red-500/70'}`}>
                        {o.days_overdue} 天
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 熱銷排行 + 庫存週轉並排 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 🔥 近 30 天熱銷排行 */}
        <div className="bg-gray-800 p-6 rounded-xl">
          <h2 className="text-lg font-bold text-white mb-4">🔥 熱銷排行（近 30 天）</h2>
          {best_sellers.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">期間內尚無銷售資料</p>
          ) : (
            <ol className="space-y-3">
              {best_sellers.map((s, i) => (
                <li key={`${s.part_id || s.sku}-${i}`}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      {i + 1}
                    </span>
                    <span className="truncate flex-1 text-sm">{s.name}</span>
                    <span className="text-blue-400 font-bold text-sm shrink-0">{s.total_qty} 件</span>
                  </div>
                  {/* 條狀圖 */}
                  <div className="ml-9 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: `${(s.total_qty / maxQty) * 100}%` }} />
                  </div>
                  <p className="ml-9 mt-1 text-xs text-gray-500">營收 NT$ {Math.round(s.total_revenue).toLocaleString()}{s.current_stock != null ? ` · 庫存 ${s.current_stock}` : ''}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 📦 庫存週轉警示 */}
        <div className="bg-gray-800 p-6 rounded-xl">
          <h2 className="text-lg font-bold text-white mb-4">
            📦 庫存週轉警示
            <span className="text-xs font-normal text-gray-400 ml-2">銷量 ÷ 現有庫存，≥1 代表賣比補快</span>
          </h2>
          {turnover.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">期間內尚無可計算的品項</p>
          ) : (
            <ul className="space-y-2.5">
              {turnover.slice(0, 10).map((t, i) => {
                const level = t.turnover_ratio >= 2 ? 'high' : t.turnover_ratio >= 1 ? 'mid' : 'low';
                const color = level === 'high' ? 'bg-red-500' : level === 'mid' ? 'bg-amber-500' : 'bg-green-600';
                return (
                  <li key={`${t.part_id || t.sku}-${i}`} className="flex items-center gap-3 bg-gray-750 bg-gray-700/40 rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                    <span className="truncate flex-1 text-sm">{t.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">賣 {t.sold_qty} / 存 {t.current_stock ?? '?'}</span>
                    <span className={`font-black text-sm shrink-0 ${level === 'high' ? 'text-red-400' : level === 'mid' ? 'text-amber-400' : 'text-green-400'}`}>
                      ×{t.turnover_ratio}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}