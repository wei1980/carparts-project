// C:\carparts\carparts-admin\src\pages\admin\AdminAppointments.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminClient } from '../../api/client';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const navigate = useNavigate();
  // 載入失敗必須可見（原本只 console.warn → 顯示「目前沒有預約」＝誤導）
  const [loadError, setLoadError] = useState('');

  const loadAppointments = (status) => {
    setLoadError('');
    return adminClient.get(`/appointments?status=${status}`)
      .then((res) => setAppointments(res.data))
      .catch((err) => {
        console.warn('載入失敗:', err?.message || err);
        setLoadError(err?.response?.data?.error || err?.friendlyMessage || '載入預約失敗，請稍後再試');
        setAppointments([]);
      });
  };

  useEffect(() => { loadAppointments(filter); }, [filter]);

    const updateStatus = async (id, status) => {
      await adminClient.patch(
        `/appointments/${id}`,
        { status }
      );
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    };

  const statusMap = {
    PENDING: '待確認',
    CONFIRMED: '已確認',
    ARRIVED: '已到店',
    IN_PROGRESS: '施工中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };

  const statusColor = {
    PENDING: 'text-yellow-400',
    CONFIRMED: 'text-green-400',
    CANCELLED: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white p-8">
      <button onClick={() => navigate('/admin')} className="text-blue-400 mb-4 block">
        ← 返回後台
      </button>
      <h1 className="text-2xl font-bold mb-6">📅 預約管理</h1>

      {/* 狀態篩選 */}
      <div className="flex gap-4 mb-6">
        {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded ${
              filter === s ? 'bg-blue-600' : 'bg-surface-700'
            }`}
          >
            {statusMap[s]}
          </button>
        ))}
      </div>

      {/* 預約列表 */}
      <div className="space-y-4">
        {loadError && (
          <div role="alert" className="p-4 rounded-lg border border-red-800 bg-red-950/40 flex items-center gap-3">
            <span className="text-red-300 text-sm">{loadError}</span>
            <button
              onClick={() => loadAppointments(filter)}
              className="ml-auto bg-red-700 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded"
            >重新載入</button>
          </div>
        )}
        {appointments.length === 0 && !loadError && (
          <p className="text-surface-400">目前沒有 {statusMap[filter]} 的預約</p>
        )}
        {appointments.map((a) => (
          <div key={a.id} className="bg-surface-800 p-6 rounded-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">
                  {a.vehicle?.make} {a.vehicle?.model}
                  <span className="text-surface-400 text-sm ml-2">
                    ({a.vehicle?.licensePlate || '無車牌'})
                  </span>
                </h3>
                <p className="text-surface-400">
                  車主：{a.user?.name} | 電話：{a.user?.phone}
                </p>
                <p className="text-surface-400">
                  車廠：{a.garage?.garage_name || a.garage?.company_name}
                </p>
                <p className="text-surface-400">
                  預約時間：{new Date(a.scheduled_at).toLocaleString()}
                </p>
                {a.part_ids && a.part_ids.length > 0 && (
                  <p className="text-surface-500">預計安裝零件 ID：{JSON.stringify(a.part_ids)}</p>
                )}
                {a.note && <p className="text-surface-500 mt-1">備註：{a.note}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <span className={`font-bold ${statusColor[a.status] || 'text-surface-400'}`}>
                  {statusMap[a.status] || a.status}
                </span>
                {a.status === 'PENDING' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateStatus(a.id, 'CONFIRMED')}
                      className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                    >
                      確認
                    </button>
                    <button
                      onClick={() => updateStatus(a.id, 'CANCELLED')}
                      className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}