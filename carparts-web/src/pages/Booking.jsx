// src/pages/Booking.jsx — 預約安裝：可勾選訂單零件 + 同縣市車廠
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { vehicleAPI } from '../api';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';
import toast from 'react-hot-toast';

export default function Booking() {
  const { garageId } = useParams();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [note, setNote] = useState('');
  // 🆕 可安裝的訂單項目
  const [installable, setInstallable] = useState(null); // null=載入中 | []=無
  const [selectedItems, setSelectedItems] = useState([]); // 勾選的 install item
  const [itemsError, setItemsError] = useState(false);
  // 🆕 車廠門店資訊（店面照 / 營業時間 / 標準工資表）
  const [garage, setGarage] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  // 🆕 可預約時段（依 opening_hours 生成）
  const [bookingDate, setBookingDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    vehicleAPI.getAll().then(res => {
      setVehicles(res.data);
      if (res.data.length > 0) setSelectedVehicle(res.data[0].id);
    });
  }, []);

  // 🆕 載入車廠公開資訊（含店面照與工資表）
  useEffect(() => {
    api.get(`/garages/${garageId}`)
      .then(res => setGarage(res.data))
      .catch(err => console.warn('載入車廠資訊失敗:', err?.message || err));
  }, [garageId]);

  const DAY_LABELS = { mon: '週一', tue: '週二', wed: '週三', thu: '週四', fri: '週五', sat: '週六', sun: '週日' };

  // 🆕 載入可安裝的訂單零件（已付款/已出貨/已完成）
  const loadInstallable = () => {
    setItemsError(false);
    api.get('/appointments/installable-items').then(res => setInstallable(res.data || []))
      .catch(err => { console.warn('載入失敗:', err?.message); setItemsError(true); });
  };
  useEffect(loadInstallable, []);

  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const key = `${item.orderId}-${item.partId}`;
      return prev.some(i => `${i.orderId}-${i.partId}` === key) ? prev.filter(i => `${i.orderId}-${i.partId}` !== key) : [...prev, item];
    });
  };
  const isPicked = (item) => selectedItems.some(i => `${i.orderId}-${i.partId}` === `${item.orderId}-${item.partId}`);

  // 🆕 依所選日期 + 車廠營業時間生成可預約時段（每 60 分鐘一格，收店前一小時截止）
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const slots = (() => {
    if (!bookingDate || !garage?.opening_hours) return null; // null = 用自由時間輸入
    const d = new Date(bookingDate + 'T00:00:00');
    const range = garage.opening_hours[DAY_KEYS[d.getDay()]];
    if (!range) return []; // 公休
    const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(String(range));
    if (!m) return null; // 格式不明 → 自由輸入
    const open = parseInt(m[1]) * 60 + parseInt(m[2]);
    const close = parseInt(m[3]) * 60 + parseInt(m[4]);
    const out = [];
    for (let t = open; t <= close - 60; t += 60) {
      const h = String(Math.floor(t / 60)).padStart(2, '0');
      const min = String(t % 60).padStart(2, '0');
      out.push(`${h}:${min}`);
    }
    return out;
  })();
  // 選了時段後組合出 scheduledAt
  const pickSlot = (time) => {
    setScheduledAt(`${bookingDate}T${time}`);
  };

  const handleSubmit = async () => {
    if (!selectedVehicle || !scheduledAt) { toast.error('請選擇車輛與預約時間'); return; }
    try {
      await api.post('/appointments', {
        vehicleId: selectedVehicle,
        garageId: parseInt(garageId),
        scheduledAt,
        note,
        installItems: selectedItems, // 🆕 勾選的安裝項目
      });
      toast.success(`預約已送出！${selectedItems.length ? `共 ${selectedItems.length} 項安裝。` : ''}\n車廠會盡快確認時間，有報價或回覆將以 LINE 通知你。`);
      navigate('/appointments');
    } catch (err) {
      toast.error('預約失敗：' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <main className="p-8 max-w-lg mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-6">📅 預約保養</h1>

        {/* 🆕 車廠門店資訊卡（店面照 / 營業時間 / 標準工資表） */}
        {garage && (
          <div className="bg-gray-800 rounded-xl overflow-hidden mb-4 border border-gray-700">
            {(garage.garage_photos?.length || 0) > 0 ? (
              <div>
                <div className="relative h-44">
                  <img src={garage.garage_photos[activePhoto]?.url} alt={garage.garage_name}
                    className="w-full h-full object-cover" />
                </div>
                {garage.garage_photos.length > 1 && (
                  <div className="flex gap-1.5 p-2 bg-gray-900/60">
                    {garage.garage_photos.map((p, i) => (
                      <button key={i} onClick={() => setActivePhoto(i)}
                        aria-label={`第 ${i + 1} 張照片`}
                        className={`h-12 w-16 rounded overflow-hidden border-2 transition ${i === activePhoto ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            <div className="p-4 space-y-3">
              <div>
                <h2 className="text-lg font-bold">{garage.garage_name || '未命名車廠'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{garage.garage_address}</p>
              </div>

              {garage.opening_hours && Object.keys(garage.opening_hours).length > 0 && (
                <div className="text-xs space-y-0.5">
                  <span className="text-gray-400 block mb-1">🕐 營業時間</span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-300">
                    {Object.entries(garage.opening_hours).map(([d, t]) => (
                      <span key={d}>{DAY_LABELS[d] || d}：{t || '公休'}</span>
                    ))}
                  </div>
                </div>
              )}

              {(garage.labor_fees?.length || 0) > 0 && (
                <div>
                  <span className="text-xs text-gray-400 block mb-1.5">💰 標準工資表</span>
                  <ul className="divide-y divide-gray-700 border border-gray-700 rounded-lg overflow-hidden text-sm">
                    {garage.labor_fees.map(f => (
                      <li key={f.id} className="flex items-center gap-2 px-3 py-2 bg-gray-900/40">
                        <span className="flex-1 min-w-0 truncate">{f.name}
                          {f.note && <span className="ml-1.5 text-[10px] text-amber-400">{f.note}</span>}
                        </span>
                        <span className="font-mono text-emerald-400 shrink-0">${Number(f.price).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-gray-500 mt-1">特殊零件或維修項目將另行估價，車廠回覆後以 LINE 通知。</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-gray-800 p-6 rounded-xl space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">選擇車輛</label>
            <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white">
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate || '無車牌'})</option>
              ))}
            </select>
          </div>

          {/* 🆕 安裝項目選擇 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">🔧 要安裝的零件<span className="text-gray-500">（從你的訂單選擇，可略過）</span></label>
            {installable === null && !itemsError && (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
            )}
            {itemsError && <ErrorState compact message="訂單項目載入失敗" onRetry={loadInstallable} />}
            {Array.isArray(installable) && installable.length === 0 && (
              <p className="text-xs text-gray-500 py-2">目前沒有可安裝的訂單零件</p>
            )}
            {Array.isArray(installable) && installable.length > 0 && (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {installable.map(item => {
                  const key = `${item.orderId}-${item.partId}`;
                  const picked = isPicked(item);
                  return (
                    <li key={key}>
                      <button onClick={() => toggleItem(item)}
                        aria-pressed={picked}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${picked ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs ${picked ? 'bg-blue-600 border-blue-600' : 'border-gray-500'}`}>
                          {picked ? '✓' : ''}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm truncate">{item.name}</span>
                          <span className="block text-[11px] text-gray-500">{item.brand} · 訂單 {item.orderNumber}</span>
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">×{item.qty}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {selectedItems.length > 0 && (
              <p className="text-xs text-blue-300 mt-2">已選 {selectedItems.length} 項 — 車廠可能需要另外報價安裝工資</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">預約時間</label>
            <input type="date" value={bookingDate} min={new Date().toISOString().slice(0, 10)}
              onChange={e => { setBookingDate(e.target.value); setScheduledAt(''); }}
              className="w-full p-3 rounded bg-gray-700 text-white mb-2" />
            {slots === null ? (
              // 車廠未設營業時間 → 自由時間輸入
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white" />
            ) : slots.length === 0 ? (
              <p className="text-sm text-red-400 py-1">⚠️ 這天公休，請選擇其他日期</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(t => {
                  const isToday = bookingDate === new Date().toISOString().slice(0, 10);
                  const past = isToday && t <= new Date().toTimeString().slice(0, 5);
                  const picked = scheduledAt === `${bookingDate}T${t}`;
                  return (
                    <button key={t} type="button" disabled={past}
                      onClick={() => pickSlot(t)}
                      aria-pressed={picked}
                      className={`py-2 rounded-lg text-sm border transition ${picked ? 'bg-blue-600 border-blue-500 font-bold' : past ? 'border-gray-700 text-gray-600 cursor-not-allowed' : 'border-gray-600 hover:border-blue-400'}`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
            {!slots && !bookingDate && <p className="text-xs text-gray-500 mt-1">選擇日期後顯示可預約時段</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">備註</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 rounded bg-gray-700 text-white" placeholder="如有特殊需求請填寫..." />
          </div>
          <button onClick={handleSubmit} className="w-full bg-blue-600 p-3 rounded font-bold hover:bg-blue-700">
            確認預約{selectedItems.length ? `（${selectedItems.length} 項安裝）` : ''}
          </button>
          <p className="text-[11px] text-gray-500 text-center">送出後車廠會收到 LINE 通知，並確認時間或回覆報價。</p>
        </div>
      </main>
    </div>
  );
}
