// src/pages/Booking.jsx — 預約安裝：可勾選訂單零件 + 同縣市車廠
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { vehicleAPI } from '../api';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';
import toast from 'react-hot-toast';

export default function Booking() {
  const { garageId } = useParams();
  const location = useLocation();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [note, setNote] = useState('');
  // 🆕 服務類型／狀況／里程（S2）
  const [serviceType, setServiceType] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [mileage, setMileage] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookedCounts, setBookedCounts] = useState({});
  const [slotCapacity, setSlotCapacity] = useState(() => Number(location.state?.garage?.booking_capacity) || 1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // 🆕 可安裝的訂單項目
  const [installable, setInstallable] = useState(null); // null=載入中 | []=無
  const [selectedItems, setSelectedItems] = useState([]); // 勾選的 install item
  const [itemsError, setItemsError] = useState(false);
  // 🆕 車廠門店資訊（店面照 / 營業時間 / 標準工資表）
  const [garage, setGarage] = useState(location.state?.garage || null);
  const [garageError, setGarageError] = useState(false);
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
  const loadGarage = () => {
    setGarageError(false);
    api.get(`/garages/${garageId}`)
      .then(res => {
        setGarage(res.data);
        const capacity = Number(res.data?.booking_capacity);
        if (Number.isInteger(capacity) && capacity >= 1) setSlotCapacity(capacity);
      })
      .catch(err => {
        console.warn('載入車廠資訊失敗:', err?.message || err);
        setGarageError(true);
      });
  };
  useEffect(loadGarage, [garageId]);

  const DAY_LABELS = { mon: '週一', tue: '週二', wed: '週三', thu: '週四', fri: '週五', sat: '週六', sun: '週日' };
  const SERVICE_TYPES = [
    '定期保養',
    '更換機油／濾芯',
    '輪胎／定位',
    '煞車系統',
    '冷氣／空調',
    '底盤／懸吊',
    '引擎／變速箱',
    '電系／燈光',
    '鈑金／烤漆',
    '改裝安裝',
    '其他',
  ];

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
  const hasHours = !!(garage?.opening_hours && Object.keys(garage.opening_hours).length > 0);
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
  // 🆕 Sprint 3：可預約時段統計（已排除過場 + 已額滿，供 UI 摘要顯示）
  const nowTime = new Date().toTimeString().slice(0, 5);
  const todayStr = new Date().toISOString().slice(0, 10);
  const availableCount = slots
    ? slots.filter(
        (t) =>
          !(bookingDate === todayStr && t <= nowTime) &&
          ((bookedCounts[t] ?? (bookedSlots.includes(t) ? 1 : 0)) < slotCapacity)
      ).length
    : 0;
  // 選了時段後組合出 scheduledAt
  const pickSlot = (time) => {
    setScheduledAt(`${bookingDate}T${time}`);
    setSubmitError('');
  };

  // 依日期取得已被預約的時段（只回時間，不含客戶資料）
  useEffect(() => {
    if (!hasHours || !bookingDate) {
      setBookedSlots([]);
      setBookedCounts({});
      return undefined;
    }
    let active = true;
    api.get(`/garages/${garageId}/availability`, { params: { date: bookingDate } })
      .then(res => {
        if (!active) return;
        const data = res.data || {};
        setBookedSlots(data.booked || []);
        setBookedCounts(data.counts || {});
        setSlotCapacity(Number(data.capacity) || 1);
      })
      .catch(() => {
        if (!active) return;
        setBookedSlots([]);
        setBookedCounts({});
      });
    return () => { active = false; };
  }, [garageId, bookingDate, hasHours]);

  const handleSubmit = async () => {
    setSubmitError('');
    if (!selectedVehicle) { setSubmitError('請選擇車輛'); return; }
    if (!serviceType) { setSubmitError('請選擇服務類型'); return; }
    if (!scheduledAt) { setSubmitError('請選擇預約時間'); return; }
    if (mileage !== '' && (!Number.isFinite(Number(mileage)) || Number(mileage) < 0)) {
      setSubmitError('目前里程需為大於 0 的數字');
      return;
    }

    // 把里程／狀況／備註整理成車廠看得懂的結構化文字
    const composedNote = [
      mileage !== '' ? `【目前里程】${Number(mileage).toLocaleString()} km` : '',
      symptoms.trim() ? `【狀況】${symptoms.trim()}` : '',
      note.trim() ? `【備註】${note.trim()}` : '',
    ].filter(Boolean).join('\n');

    setSubmitting(true);
    try {
      const res = await api.post('/appointments', {
        vehicleId: selectedVehicle,
        garageId: parseInt(garageId),
        serviceType,
        scheduledAt,
        mileageKm: mileage === '' ? null : Number(mileage),
        note: composedNote,
        installItems: selectedItems,
      });
      toast.success(
        `預約已送出！${selectedItems.length ? `共 ${selectedItems.length} 項安裝。` : ''}` +
        `${res.data?.mileage_updated ? '里程已同步更新。' : ''}\n車廠會盡快確認時間，有報價或回覆將以 LINE 通知你。`
      );
      navigate('/appointments');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message;
      setSubmitError(
        status === 409
          ? '這個時段剛被其他人預約了，請重新選擇時間。'
          : `預約失敗：${message}`
      );
      if (status === 409 && bookingDate) {
        api.get(`/garages/${garageId}/availability`, { params: { date: bookingDate } })
          .then(res => {
            const data = res.data || {};
            setBookedSlots(data.booked || []);
            setBookedCounts(data.counts || {});
            setSlotCapacity(Number(data.capacity) || 1);
          })
          .catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      <main className="page-shell max-w-2xl pb-28">
        <h1 className="text-2xl font-black mb-1">預約保養</h1>
        <p className="text-sm text-slate-500 mb-6">送出後由車廠確認時間；有報價或異動會用 LINE 通知你。</p>

        {/* 🆕 車廠門店資訊卡（店面照 / 營業時間 / 標準工資表） */}
        {garage && (
          <div className="bg-surface-800 rounded-2xl overflow-hidden mb-4 border border-surface-600">
            {(garage.garage_photos?.length || 0) > 0 ? (
              <div>
                <div className="relative h-44">
                  <img src={garage.garage_photos[activePhoto]?.url} alt={garage.garage_name}
                    className="w-full h-full object-cover" />
                </div>
                {garage.garage_photos.length > 1 && (
                  <div className="flex gap-1.5 p-2 bg-surface-900/60">
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
                <p className="text-xs text-surface-400 mt-0.5">{garage.garage_address || '地址待補'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => navigate(`/garages/${garage.id}`)}
                    className="rounded-lg border border-blue-500/40 px-2.5 py-1 font-medium text-blue-300 hover:bg-blue-500/10"
                  >
                    查看車廠詳情 →
                  </button>
                  {garage.garage_phone && (
                    <a href={`tel:${garage.garage_phone}`} className="rounded-lg border border-surface-600 px-2.5 py-1 text-surface-300 hover:border-surface-500">
                      📞 {garage.garage_phone}
                    </a>
                  )}
                  {garage.review_count > 0 ? (
                    <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-amber-300">
                      ★ {Number(garage.rating).toFixed(1)}（{garage.review_count} 則）
                    </span>
                  ) : (
                    <span className="text-surface-500">尚無評價</span>
                  )}
                  {Number(garage.booking_capacity) > 1 && (
                    <span className="rounded-lg bg-slate-700/40 px-2.5 py-1 text-slate-300">
                      每時段可接 {garage.booking_capacity} 台
                    </span>
                  )}
                </div>
              </div>

              {garage.opening_hours && Object.keys(garage.opening_hours).length > 0 && (
                <div className="text-xs space-y-0.5">
                  <span className="text-surface-400 block mb-1">🕐 營業時間</span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-surface-300">
                    {Object.entries(garage.opening_hours).map(([d, t]) => (
                      <span key={d}>{DAY_LABELS[d] || d}：{t || '公休'}</span>
                    ))}
                  </div>
                </div>
              )}

              {(garage.labor_fees?.length || 0) > 0 && (
                <div>
                  <span className="text-xs text-surface-400 block mb-1.5">💰 標準工資表</span>
                  <ul className="divide-y divide-surface-700 border border-surface-700 rounded-lg overflow-hidden text-sm">
                    {garage.labor_fees.map(f => (
                      <li key={f.id} className="flex items-center gap-2 px-3 py-2 bg-surface-900/40">
                        <span className="flex-1 min-w-0 truncate">{f.name}
                          {f.note && <span className="ml-1.5 text-[10px] text-amber-400">{f.note}</span>}
                        </span>
                        <span className="font-mono text-emerald-400 shrink-0">${Number(f.price).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-surface-500 mt-1">特殊零件或維修項目將另行估價，車廠回覆後以 LINE 通知。</p>
                </div>
              )}
            </div>
          </div>
        )}

        {garageError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <span>車廠資訊載入失敗，你仍可送出預約，車廠會收到通知。</span>
            <button type="button" onClick={loadGarage} className="underline underline-offset-2 hover:text-amber-100">
              重試
            </button>
          </div>
        )}

        <div className="bg-surface-800 border border-surface-600 p-5 sm:p-6 rounded-2xl space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="booking-vehicle">選擇車輛</label>
            <select id="booking-vehicle" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="field w-full">
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate || '無車牌'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="booking-service">
              服務類型 <span className="text-red-400">*</span>
            </label>
            <select
              id="booking-service"
              value={serviceType}
              onChange={e => { setServiceType(e.target.value); setSubmitError(''); }}
              className="field w-full"
              required
            >
              <option value="">請選擇（車廠才能先備料）</option>
              {SERVICE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="booking-mileage">目前里程（選填）</label>
            <div className="flex items-center gap-2">
              <input
                id="booking-mileage"
                type="number"
                min="0"
                inputMode="numeric"
                value={mileage}
                onChange={e => { setMileage(e.target.value); setSubmitError(''); }}
                placeholder="例如：42500"
                className="field w-full"
              />
              <span className="shrink-0 text-sm text-slate-500">km</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="booking-symptoms">狀況描述（選填）</label>
            <textarea
              id="booking-symptoms"
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              rows={2}
              placeholder="例如：煞車時方向盤會抖、冷氣不冷、異音從右前輪傳來…"
              className="field h-auto min-h-[72px] w-full py-2.5"
            />
          </div>

          {/* 🆕 安裝項目選擇 */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">🔧 要安裝的零件<span className="text-slate-500">（從你的訂單選擇，可略過）</span></label>
            {installable === null && !itemsError && (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
            )}
            {itemsError && <ErrorState compact message="訂單項目載入失敗" onRetry={loadInstallable} />}
            {Array.isArray(installable) && installable.length === 0 && (
              <p className="text-xs text-slate-500 py-2">目前沒有可安裝的訂單零件</p>
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${picked ? 'border-blue-500 bg-blue-500/10' : 'border-[#2c3947] hover:border-slate-500'}`}>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs ${picked ? 'bg-blue-600 border-blue-600' : 'border-slate-500'}`}>
                          {picked ? '✓' : ''}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm truncate">{item.name}</span>
                          <span className="block text-[11px] text-slate-500">{item.brand} · 訂單 {item.orderNumber}</span>
                        </span>
                        <span className="text-xs text-slate-400 shrink-0">×{item.qty}</span>
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
            <label className="block text-sm text-slate-400 mb-1" htmlFor="booking-date">預約時間</label>
            {!hasHours ? (
              <>
                <input
                  id="booking-date"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="field w-full"
                />
                <p className="text-xs text-slate-500 mt-1">此車廠尚未設定營業時間，送出後由車廠確認。</p>
              </>
            ) : (
              <>
                <input
                  id="booking-date"
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => { setBookingDate(e.target.value); setScheduledAt(''); setSubmitError(''); setBookedSlots([]); setBookedCounts({}); }}
                  className="field w-full mb-2"
                />
                {!bookingDate ? (
                  <p className="text-xs text-slate-500">選擇日期後顯示可預約時段</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-red-400 py-1">⚠️ 這天公休，請選擇其他日期</p>
                ) : (
                  <>
                    {slotCapacity > 1 && (
                      <p className="mb-2 text-xs text-slate-500">此車廠每個時段可同時接 {slotCapacity} 台車。</p>
                    )}
                    {slots && (
                      <p className="mb-2 text-xs text-slate-500">
                        🟢 可預約時段 {availableCount} / {slots.length} 個{slotCapacity > 1 ? `（每時段可接 ${slotCapacity} 台）` : ''}
                      </p>
                    )}
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map(t => {
                        const isToday = bookingDate === new Date().toISOString().slice(0, 10);
                        const past = isToday && t <= new Date().toTimeString().slice(0, 5);
                        const used = bookedCounts[t] ?? (bookedSlots.includes(t) ? 1 : 0);
                        const remaining = Math.max(0, slotCapacity - used);
                        const taken = remaining <= 0;
                        const picked = scheduledAt === `${bookingDate}T${t}`;
                        return (
                          <button key={t} type="button" disabled={past || taken}
                            onClick={() => pickSlot(t)}
                            aria-pressed={picked}
                            aria-label={taken ? `${t}（已額滿）` : t}
                            className={`flex flex-col items-center justify-center py-2 rounded-lg text-sm border transition ${
                              picked
                                ? 'bg-blue-600 border-blue-500 font-bold'
                                : taken
                                  ? 'border-[#222d39] text-slate-600 line-through cursor-not-allowed'
                                  : past
                                    ? 'border-[#222d39] text-slate-600 cursor-not-allowed'
                                    : 'border-[#2c3947] hover:border-blue-400'
                            }`}>
                            <span>{t}</span>
                            {slotCapacity > 1 && remaining > 0 && !past && (
                              <span className="text-[10px] font-normal text-slate-500">剩 {remaining}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {bookedSlots.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        {slotCapacity > 1
                          ? `已額滿時段會劃線；「剩 N」表示該時段還能接幾台車。`
                          : '劃線時段已有人預約，請選擇其他時間。'}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1" htmlFor="booking-note">備註</label>
            <textarea id="booking-note" value={note} onChange={e => setNote(e.target.value)} className="field h-24 w-full py-2.5" placeholder="如有特殊需求請填寫..." />
          </div>
          {submitError && (
            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </div>
          )}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? '送出中…' : `確認預約${selectedItems.length ? `（${selectedItems.length} 項安裝）` : ''}`}
          </button>
          <p className="text-[11px] text-slate-500 text-center">送出後車廠會收到 LINE 通知，並確認時間或回覆報價。</p>
        </div>
      </main>
    </div>
  );
}
