// src/pages/admin/DashboardCharts.jsx — 儀表板圖表（recharts 隔離在此模組）
// 由 Dashboard.jsx 以 React.lazy 載入：recharts 打進獨立 chunk，
// 統計卡與訂單表不必等圖表庫下載即可渲染。
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardCharts({ monthlySales, topParts }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* 近 6 個月銷售趨勢 */}
      <div className="bg-surface-800 p-6 rounded-xl">
        <h2 className="text-lg font-bold text-white mb-4">📈 近 6 個月銷售趨勢</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlySales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
              formatter={(value) => [`NT$ ${value.toLocaleString()}`, '銷售額']}
            />
            <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 熱門零件 Top 5 */}
      <div className="bg-surface-800 p-6 rounded-xl">
        <h2 className="text-lg font-bold text-white mb-4">🔥 熱門零件 Top 5</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topParts} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
            <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
            />
            <Bar dataKey="qty" fill="#10B981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
