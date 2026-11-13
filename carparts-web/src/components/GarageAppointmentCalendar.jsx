// src/components/GarageAppointmentCalendar.jsx
// 車廠預約行事曆元件
import { useState, useMemo } from 'react';

export function GarageAppointmentCalendar({ appointments, onSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'list'

  // 篩選非取消的預約
  const activeAppointments = useMemo(() => 
    (appointments || []).filter(a => a.status !== 'CANCELLED'), 
    [appointments]
  );

  // 依日期分組
  const appointmentsByDate = useMemo(() => {
    const map = {};
    activeAppointments.forEach(a => {
      const date = new Date(a.scheduled_at).toDateString();
      if (!map[date]) map[date] = [];
      map[date].push(a);
    });
    return map;
  }, [activeAppointments]);

  // 月曆週數計算
  const getMonthWeeks = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0=週日
    const daysInMonth = lastDay.getDate();
    
    const weeks = [];
    let week = [];
    
    // 填充月初空白
    for (let i = 0; i < startDay; i++) week.push(null);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toDateString();
      week.push({ day: d, date: new Date(year, month, d), dateStr, isToday: dateStr === new Date().toDateString() });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    // 填充月底空白
    while (week.length < 7 && week.length > 0) week.push(null);
    if (week.length > 0) weeks.push(week);
    
    return weeks;
  };

  const weeks = useMemo(() => getMonthWeeks(currentMonth), [currentMonth]);

  // 統計資料
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    
    let today = 0, thisWeek = 0, pending = 0, confirmed = 0, completed = 0;
    
    activeAppointments.forEach(a => {
      const apptDate = new Date(a.scheduled_at);
      const dateStr = apptDate.toDateString();
      
      if (dateStr === todayStr) today++;
      if (apptDate >= thisWeekStart && apptDate <= thisWeekEnd) thisWeek++;
      
      if (a.status === 'PENDING') pending++;
      else if (a.status === 'CONFIRMED') confirmed++;
      else if (['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(a.status)) completed++;
    });
    
    return { today, thisWeek, pending, confirmed, completed, total: activeAppointments.length };
  }, [activeAppointments]);

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const todayMonth = () => setCurrentMonth(new Date());

  const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-surface-800 rounded-2xl border border-surface-700 p-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="今日預約" value={stats.today} color="blue" icon="📅" />
        <StatCard label="本週預約" value={stats.thisWeek} color="emerald" icon="📊" />
        <StatCard label="待確認" value={stats.pending} color="yellow" icon="⏳" />
        <StatCard label="已確認" value={stats.confirmed} color="cyan" icon="✅" />
        <StatCard label="施工/完工" value={stats.completed} color="green" icon="🔧" />
      </div>

      {/* 視圖切換 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1 bg-surface-700 rounded-lg p-1">
          {['month', 'week', 'list'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === mode ? 'bg-blue-600 text-white' : 'text-surface-400 hover:text-white'
              }`}
            >
              {mode === 'month' ? '月曆' : mode === 'week' ? '周曆' : '列表'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 bg-surface-700 rounded-lg hover:bg-surface-600">←</button>
          <span className="font-bold text-lg min-w-[160px] text-center">
            {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </span>
          <button onClick={nextMonth} className="p-2 bg-surface-700 rounded-lg hover:bg-surface-600">→</button>
          <button onClick={todayMonth} className="ml-2 px-3 py-1.5 bg-surface-700 rounded-lg text-sm hover:bg-surface-600">回今日</button>
        </div>
      </div>

      {/* 月曆視圖 */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-7 gap-0.5">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs text-surface-500 py-2 font-bold">{d}</div>
          ))}
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="contents">
              {week.map((cell, dIdx) => (
                <CalendarCell
                  key={`${wIdx}-${dIdx}`}
                  cell={cell}
                  appointments={cell ? appointmentsByDate[cell.dateStr] || [] : []}
                  onClick={(appt) => onSelect?.(appt)}
                  selectedDate={selectedDate}
                  onDateClick={(date) => setSelectedDate(date)}
                />
              ))}
            </div>
          ))}
          </div>
      )}

      {/* 列表視圖 */}
      {viewMode === 'list' && (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {activeAppointments
            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
            .map(a => (
              <AppointmentListItem key={a.id} appointment={a} onClick={() => onSelect?.(a)} />
          ))}
          {activeAppointments.length === 0 && (
            <div className="text-center py-10 text-surface-500">暫無預約</div>
          )}
        </div>
      )}
    </div>
  );
}

// 統計卡片
function StatCard({ label, value, color, icon }) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// 月曆單元格
function CalendarCell({ cell, appointments, onClick, selectedDate, onDateClick }) {
  if (!cell) return <div className="aspect-square p-2 bg-surface-900/30" />;
  
  const hasAppointments = appointments.length > 0;
  const isSelected = selectedDate?.toDateString() === cell.date.toDateString();
  const isToday = cell.isToday;
  
  return (
    <div
      className={`relative aspect-square p-2 cursor-pointer transition ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isToday ? 'bg-blue-500/10' : 'hover:bg-surface-700/50'}`}
      onClick={() => onDateClick(cell.date)}
    >
      <div className="flex justify-between items-start mb-1">
        <span className={`text-sm font-medium ${isToday ? 'text-blue-400' : 'text-white'}`}>
          {cell.day}
        </span>
        {hasAppointments && (
          <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
            {appointments.length}
          </span>
        )}
      </div>
      
      {hasAppointments && (
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {appointments.slice(0, 3).map(a => (
            <div key={a.id} className="text-[10px] px-1.5 py-0.5 bg-surface-700 rounded truncate"
              onClick={(e) => { e.stopPropagation(); onClick?.(a); }}
            >
              {a.vehicle?.make} {a.vehicle?.model}
              <span className={`ml-1 ${a.status === 'PENDING' ? 'text-yellow-400' : a.status === 'CONFIRMED' ? 'text-cyan-400' : 'text-surface-400'}`}>
                {a.status === 'PENDING' ? '待' : a.status === 'CONFIRMED' ? '確' : a.status[0]}
              </span>
            </div>
          ))}
          {appointments.length > 3 && (
            <div className="text-[10px] text-surface-500 text-center px-1">+{appointments.length - 3} 筆</div>
          )}
        </div>
      )}
    </div>
  );
}

// 列表項目
function AppointmentListItem({ appointment, onClick }) {
  const statusColors = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CONFIRMED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    ARRIVED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  return (
    <button
      onClick={() => onClick(appointment)}
      className={`w-full text-left p-4 rounded-xl border ${statusColors[appointment.status]} hover:bg-surface-700/50 transition`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-white">{appointment.vehicle?.make} {appointment.vehicle?.model}</p>
          <p className="text-sm text-surface-400 mt-0.5">
            {new Date(appointment.scheduled_at).toLocaleString('zh-TW')} · 
            {appointment.user?.name || appointment.user?.phone}
            {appointment.install_items?.length > 0 && ` · 🔧 ${appointment.install_items.length} 項`}
          </p>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded">
          {appointment.status === 'PENDING' ? '待確認' : 
           appointment.status === 'CONFIRMED' ? '已確認' :
           appointment.status === 'ARRIVED' ? '已到店' :
           appointment.status === 'IN_PROGRESS' ? '施工中' :
           appointment.status === 'COMPLETED' ? '已完成' : '已取消'}
        </span>
      </div>
    </button>
  );
}