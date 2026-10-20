// src/pages/garage/GarageCalendar.jsx — 車廠：預約行事曆 / 統計
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { garageClient as api } from '../../api/client';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function GarageCalendar() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'stats'

  // 載入預約資料
  const loadAppointments = useCallback(async () => {
    try {
      const res = await api.get('/garage/appointments');
      setAppointments(res.data || []);
    } catch (err) {
      console.warn('載入預約失敗:', err?.message || err);
    }
  }, []);

  // 載入統計資料
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/garage/reports/stats');
      setStats(res.data);
    } catch (err) {
      console.warn('載入統計失敗:', err?.message || err);
    }
  }, []);

  useEffect(() => { loadAppointments(); loadStats(); }, [loadAppointments, loadStats]);

  // 產生月曆格子
  const calendarWeeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const weeks = [];
    let week = [];

    // 上個月尾巴
    for (let i = firstDay - 1; i >= 0; i--) {
      week.unshift({ day: prevMonthDays - i, isCurrentMonth: false });
    }

    // 這個月
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayAppointments = appointments.filter(a => {
        const aDate = new Date(a.scheduled_at);
        return aDate.getFullYear() === year && aDate.getMonth() === month && aDate.getDate() === d;
      });
      week.push({ day: d, isCurrentMonth: true, date, count: dayAppointments.length, appointments: dayAppointments });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    // 下個月開頭
    let nextDay = 1;
    while (week.length < 7) {
      week.push({ day: nextDay++, isCurrentMonth: false });
    }
    if (week.length) weeks.push(week);

    return weeks;
  }, [currentMonth, appointments]);

  // 切換月份
  const prevMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const today = () => setCurrentMonth(new Date());

  // 點擊日期
  const handleDayClick = (dayData) => {
    if (!dayData.isCurrentMonth) return;
    setSelectedDay(dayData.date);
    setDayAppointments(dayData.appointments);
  };

  // 狀態對應顏色
  const statusStyle = (status) => {
    const map = {
      PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      CONFIRMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ARRIVED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
      CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return map[status] || 'bg-gray-500/20 text-gray-400';
  };

  const statusLabel = (status) => {
    const map = { PENDING: '待確認', CONFIRMED: '已確認', ARRIVED: '已到店', IN_PROGRESS: '施工中', COMPLETED: '已完成', CANCELLED: '已取消' };
    return map[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 頂部導航 */}
      <nav className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/garage/dashboard')}>
          <span className="text-xl font-bold tracking-wider">🏎️ 車大師車廠</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>📅 行事曆</button>
          <button onClick={() => setViewMode('stats')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>📊 統計</button>
          <button onClick={() => navigate('/garage/dashboard')} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-medium text-sm">返回首頁</button>
        </div>
      </nav>

      <main className="p-4 sm:p-8 max-w-7xl mx-auto">
        {viewMode === 'calendar' ? (
          // ===== 行事曆視圖 =====
          <div className="space-y-6">
            {/* 月份選擇 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">‹</button>
                <h2 className="text-xl font-bold min-w-[180px] text-center">
                  {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
                </h2>
                <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">›</button>
              </div>
              <button onClick={today} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm">回到今天</button>
            </div>

            {/* 週標題 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d, i) => (
                <div key={d} className="text-center py-2 text-sm font-medium text-slate-400 bg-gray-800/50 rounded-lg"
                  style={{ color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'inherit' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* 月曆格子 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarWeeks.map((week, wi) => (
                week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square relative rounded-xl border transition-all ${
                      !day.isCurrentMonth ? 'bg-gray-800/30 text-gray-600' :
                      day.date?.toDateString() === new Date().toDateString() ? 'bg-blue-500/10 border-blue-500/30' :
                      'bg-gray-800/50 border-gray-700 hover:border-blue-500/50 hover:bg-gray-700/50 cursor-pointer'
                    }`}
                    style={{ minHeight: '100px' }}
                  >
                    <span className={`absolute top-1 left-1 text-xs font-medium ${day.isCurrentMonth ? 'text-white' : 'text-gray-500'}`}>
                      {day.day}
                    </span>
                    {day.isCurrentMonth && day.count > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                        {day.appointments.slice(0, 3).map((a, i) => (
                          <span key={i} className={`px-1.5 py-0.5 text-[10px] rounded ${statusStyle(a.status)}`}>
                            {statusLabel(a.status).charAt(0)}
                          </span>
                        ))}
                        {day.count > 3 && <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-600 text-gray-300">+{day.count - 3}</span>}
                      </div>
                    )}
                  </div>
                ))
              ))}
            </div>

            {/* 選中日期的預約詳情 */}
            {selectedDay && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 animate-slide-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    {selectedDay.toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    <span className="ml-3 chip">{dayAppointments.length} 筆預約</span>
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-white">✕ 關閉</button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {dayAppointments.map(a => (
                    <div key={a.id} className={`p-4 rounded-xl border ${statusStyle(a.status)} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">#{a.id} {a.vehicle?.make} {a.vehicle?.model} {a.vehicle?.licensePlate ? `(${a.vehicle.licensePlate})` : ''}</p>
                        <p className="text-sm text-gray-300 mt-1">
                          車主：{a.user?.name || a.user?.phone || '—'} · {new Date(a.scheduled_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                          {a.install_items?.length ? ` · 🔧 ${a.install_items.length} 項安裝` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle(a.status)}`}>{statusLabel(a.status)}</span>
                        {a.status === 'PENDING' && (
                          <button onClick={() => navigate(`/garage/appointments/${a.id}`)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">處理</button>
                        )}
                        {a.status === 'CONFIRMED' && (
                          <button onClick={() => navigate(`/garage/appointments/${a.id}`)} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium">開工</button>
                        )}
                        {a.status === 'IN_PROGRESS' && (
                          <button onClick={() => navigate('/garage/work-orders')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium">工單</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // ===== 統計視圖 =====
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">📊 本月統計</h2>
            
            {!stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-32 rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                {/* KPI 卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-600 p-6 rounded-2xl shadow-lg">
                    <p className="text-blue-100">本月預約總數</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalAppointments || 0}</p>
                  </div>
                  <div className="bg-green-600 p-6 rounded-2xl shadow-lg">
                    <p className="text-green-100">已完成工單</p>
                    <p className="text-3xl font-bold mt-2">{stats.completedCount || 0}</p>
                  </div>
                  <div className="bg-yellow-600 p-6 rounded-2xl shadow-lg">
                    <p className="text-yellow-100">待確認預約</p>
                    <p className="text-3xl font-bold mt-2">{stats.pendingCount || 0}</p>
                  </div>
                  <div className="bg-purple-600 p-6 rounded-2xl shadow-lg">
                    <p className="text-purple-100">本月營收</p>
                    <p className="text-3xl font-bold mt-2">NT$ {(stats.revenue || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* 狀態分布 */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="font-bold text-lg mb-4">預約狀態分布</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { key: 'PENDING', label: '待確認', color: 'yellow' },
                      { key: 'CONFIRMED', label: '已確認', color: 'blue' },
                      { key: 'ARRIVED', label: '已到店', color: 'cyan' },
                      { key: 'IN_PROGRESS', label: '施工中', color: 'purple' },
                      { key: 'COMPLETED', label: '已完成', color: 'green' },
                      { key: 'CANCELLED', label: '已取消', color: 'red' },
                    ].map(s => {
                      const count = stats.byStatus?.[s.key] || 0;
                      return (
                        <div key={s.key} className={`p-4 rounded-xl text-center border ${s.color}-500/20`}>
                          <p className="text-2xl font-bold text-{s.color}-400">{count}</p>
                          <p className="text-sm text-gray-400 mt-1">{s.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 每日預約趨勢 */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="font-bold text-lg mb-4">每日預約數</h3>
                  <div className="flex items-end gap-1 h-48 px-2">
                    {(stats.dailyTrend || []).map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div className="w-full bg-blue-500/60 hover:bg-blue-500 rounded-t transition-all"
                          style={{ height: `${Math.max(4, (d.count / (Math.max(...(stats.dailyTrend || [{count:1}]).count))) * 100)}%` }} />
                        <span className="text-[10px] text-gray-500 mt-1">{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}