// src/pages/GarageProfile.jsx — 車廠詳情（車主端）：照片、評價、工資、營業時間、預約入口
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';

const DAY_LABELS = { mon: '週一', tue: '週二', wed: '週三', thu: '週四', fri: '週五', sat: '週六', sun: '週日' };
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function parseRange(value) {
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  return {
    open: parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
    close: parseInt(m[3], 10) * 60 + parseInt(m[4], 10),
  };
}

function Stars({ value = 0, size = 'w-4 h-4' }) {
  return (
    <div className="flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`${size} ${i <= Math.round(value) ? 'text-amber-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118L10 15.347a1 1 0 00-1.176 0l-3.354 2.676c-.783.57-1.838-.197-1.538-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.488 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

function Photo({ src, alt, className = '' }) {
  const [broken, setBroken] = useState(!src);
  useEffect(() => setBroken(!src), [src]);

  if (broken) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1a2530] to-[#131a22] ${className}`}>
        <svg className="h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75m-6.75 3.75h13.5V9.75L12 5.25 3.75 9.75v7.5z" />
        </svg>
        <span className="text-xs text-slate-500">車廠尚未上傳照片</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} onError={() => setBroken(true)} />;
}

export default function GarageProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [garage, setGarage] = useState(null);
  const [reviews, setReviews] = useState({ average: null, count: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      api.get(`/garages/${id}`),
      api.get(`/reviews/garage/${id}`).catch(() => ({ data: { average: null, count: 0, reviews: [] } })),
    ])
      .then(([g, r]) => {
        setGarage(g.data);
        setReviews(r.data || { average: null, count: 0, reviews: [] });
      })
      .catch((err) => {
        console.warn('車廠詳情載入失敗:', err?.message || err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const photos = useMemo(() => {
    const list = Array.isArray(garage?.garage_photos) ? garage.garage_photos : [];
    return list.map(p => (typeof p === 'string' ? p : p?.url)).filter(Boolean);
  }, [garage]);

  const hours = garage?.opening_hours || null;
  const todayKey = DAY_KEYS[new Date().getDay()];
  const todayRange = hours?.[todayKey] ? parseRange(hours[todayKey]) : null;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isOpenNow = !!todayRange && nowMinutes >= todayRange.open && nowMinutes < todayRange.close;

  const ratingValue = reviews.count > 0 ? reviews.average : null;
  const hasPhotos = photos.length > 0 || !!garage?.image;

  // 分享／SEO：離開頁面時還原原本的 title 與 description
  useEffect(() => {
    if (!garage) return undefined;
    const prevTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content');
    const name = garage.garage_name || '合作車廠';
    document.title = `${name}｜預約保養｜車大師`;
    if (meta) {
      meta.setAttribute('content', `${name}${garage.garage_address ? `（${garage.garage_address}）` : ''}：查看評價、服務項目與工資，線上預約保養。`);
    }
    return () => {
      document.title = prevTitle;
      if (meta && prevDesc != null) meta.setAttribute('content', prevDesc);
    };
  }, [garage]);

  if (loading) {
    return (
      <div className="min-h-screen text-white">
        <Navbar />
        <main className="page-shell space-y-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="skeleton h-80 rounded-2xl lg:col-span-2" />
            <div className="skeleton h-80 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !garage) {
    return (
      <div className="min-h-screen text-white">
        <Navbar />
        <main className="page-shell">
          <ErrorState message="車廠資料載入失敗" onRetry={load} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-44 xl:pb-0">
      <Navbar />

      <main className="page-shell">
        {/* 麵包屑 */}
        <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500" aria-label="麵包屑">
          <button onClick={() => navigate('/garages')} className="transition-colors hover:text-blue-400">合作車廠</button>
          <span>/</span>
          <span className="truncate text-slate-300">{garage.garage_name || '未命名車廠'}</span>
        </nav>

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-surface-600 bg-surface-800">
          <div className={`grid grid-cols-1 ${hasPhotos ? 'lg:grid-cols-2' : ''}`}>
            {hasPhotos && (
            <div className="relative">
              <div className="aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[360px]">
                <Photo src={photos[activePhoto] || garage.image} alt={garage.garage_name || '車廠'} />
              </div>
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-3 flex gap-2">
                  {photos.slice(0, 5).map((photo, i) => (
                    <button
                      key={photo + i}
                      type="button"
                      onClick={() => setActivePhoto(i)}
                      aria-label={`第 ${i + 1} 張照片`}
                      aria-pressed={activePhoto === i}
                      className={`h-12 w-16 overflow-hidden rounded-lg border-2 transition ${activePhoto === i ? 'border-blue-400' : 'border-white/20 opacity-70 hover:opacity-100'}`}
                    >
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            <div className="flex flex-col p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 font-bold text-blue-300">
                  {garage.shop_type || '合作車廠'}
                </span>
                {isOpenNow ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-300">營業中</span>
                ) : todayRange ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-bold text-amber-300">目前休息</span>
                ) : (
                  <span className="rounded-full border border-slate-600 bg-slate-700/40 px-3 py-1 text-slate-400">營業時間未提供</span>
                )}
                {Number(garage.booking_capacity) > 1 && (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 font-bold text-blue-200">
                    每時段可接 {garage.booking_capacity} 台
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-2xl font-black leading-tight md:text-3xl">{garage.garage_name || '未命名車廠'}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                {ratingValue != null ? (
                  <>
                    <Stars value={ratingValue} />
                    <span className="text-sm font-bold text-slate-200">{Number(ratingValue).toFixed(1)}</span>
                    <span className="text-xs text-slate-500">({reviews.count} 則評價)</span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">尚無評價</span>
                )}
              </div>

              <div className="mt-5 space-y-2.5 text-sm text-slate-300">
                <p className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  <span>{garage.garage_address || '地址待補'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  {garage.garage_phone ? (
                    <a href={`tel:${garage.garage_phone}`} className="hover:text-blue-300">{garage.garage_phone}</a>
                  ) : (
                    <span className="text-slate-500">電話待補</span>
                  )}
                </p>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {todayRange
                    ? `今日 ${hours[todayKey]}${isOpenNow ? '（營業中）' : '（已休息）'}`
                    : '今日營業時間未提供'}
                </p>
              </div>

              <div className="mt-auto hidden flex-col gap-2 pt-6 sm:flex sm:flex-row">
                <button
                  onClick={() => navigate(`/garages/${garage.id}/book`, { state: { garage } })}
                  className="btn-primary flex-1 px-5 py-3 font-bold"
                >
                  立即預約保養
                </button>
                {garage.garage_phone && (
                  <a href={`tel:${garage.garage_phone}`} className="btn-secondary px-5 py-3 text-center font-bold">
                    打電話
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左：服務與工資 */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-surface-600 bg-surface-800 p-5 md:p-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold">服務項目與工資</h2>
                <span className="text-xs text-slate-500">實際費用以現場估價為準</span>
              </div>
              {garage.labor_fees?.length > 0 ? (
                <ul className="divide-y divide-[#222d39] overflow-hidden rounded-xl border border-surface-600">
                  {garage.labor_fees.map(fee => (
                    <li key={fee.id} className="flex items-center gap-3 bg-surface-800 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">{fee.name}</p>
                        {fee.note && <p className="mt-0.5 text-xs text-amber-400/90">{fee.note}</p>}
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold text-emerald-400">
                        NT$ {Number(fee.price || 0).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-surface-600 px-4 py-6 text-center text-sm text-slate-500">
                  車廠尚未提供工資表，預約後由車廠報價。
                </p>
              )}
            </section>

            {/* 評價 */}
            <section className="rounded-2xl border border-surface-600 bg-surface-800 p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">車主評價</h2>
                {reviews.count > 0 && (
                  <span className="text-sm text-slate-400">{Number(reviews.average).toFixed(1)} / 5 · {reviews.count} 則</span>
                )}
              </div>

              {reviews.reviews?.length > 0 ? (
                <ul className="space-y-4">
                  {reviews.reviews.map(r => (
                    <li key={r.id} className="rounded-xl border border-surface-600 bg-surface-800 p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Stars value={r.rating} size="w-3.5 h-3.5" />
                        <span className="text-sm font-medium text-slate-200">
                          {r.user?.name ? `${r.user.name.slice(0, 1)}**` : '車主'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.created_at).toLocaleDateString('zh-TW')}
                        </span>
                        {r.appointment?.vehicle && (
                          <span className="chip">
                            {r.appointment.vehicle.make} {r.appointment.vehicle.model}
                          </span>
                        )}
                      </div>
                      {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-surface-600 px-4 py-8 text-center text-sm text-slate-500">
                  尚無評價。完成保養後，歡迎回到「我的預約」留下評分。
                </p>
              )}
            </section>
          </div>

          {/* 右：營業時間＋照片 */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-surface-600 bg-surface-800 p-5">
              <h2 className="mb-4 text-lg font-bold">營業時間</h2>
              {hours && Object.keys(hours).length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                    const isToday = day === todayKey;
                    return (
                      <li key={day} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${isToday ? 'bg-blue-500/10 text-blue-200' : 'text-slate-300'}`}>
                        <span>{DAY_LABELS[day]}{isToday ? '（今天）' : ''}</span>
                        <span className={hours[day] ? 'font-mono' : 'text-slate-500'}>{hours[day] || '公休'}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">車廠尚未提供營業時間。</p>
              )}
            </section>

            {photos.length > 0 && (
              <section className="rounded-2xl border border-surface-600 bg-surface-800 p-5">
                <h2 className="mb-3 text-lg font-bold">店面照片</h2>
                <div className="grid grid-cols-2 gap-2">
                  {photos.slice(0, 6).map((photo, i) => (
                    <button
                      key={photo + i}
                      type="button"
                      onClick={() => setActivePhoto(i)}
                      className="aspect-[4/3] overflow-hidden rounded-lg border border-surface-600"
                      aria-label={`查看第 ${i + 1} 張照片`}
                    >
                      <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          特殊改裝品安裝：可先洽詢客服或車廠，確認施工方式與工資後再預約。
        </p>
      </main>

      {/* 手機底部固定 CTA */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-[#1e2833] bg-surface-900/95 px-4 py-3 backdrop-blur-md xl:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          {garage.garage_phone && (
            <a href={`tel:${garage.garage_phone}`} className="btn-secondary px-4 py-2.5 text-sm font-bold">電話</a>
          )}
          <button
            onClick={() => navigate(`/garages/${garage.id}/book`, { state: { garage } })}
            className="btn-primary flex-1 px-4 py-2.5 text-sm font-bold"
          >
            立即預約保養
          </button>
        </div>
      </div>
    </div>
  );
}
