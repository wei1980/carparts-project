// src/pages/GarageList.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumerClient } from '../api/client';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';

function StarRating({ value = 5, count = 0 }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className={`w-4 h-4 ${i < Math.round(value) ? 'text-amber-400' : 'text-slate-600'}`}
            fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118L10 15.347a1 1 0 00-1.176 0l-3.354 2.676c-.783.57-1.838-.197-1.538-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.488 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.957z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-bold text-slate-200">{Number(value).toFixed(1)}</span>
      <span className="text-xs text-slate-500">({count} 則評價)</span>
    </div>
  );
}

export default function GarageList() {
  const [groupedGarages, setGroupedGarages] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // 🆕 同縣市過濾：預設依客戶地址只顯示同縣市；可切換「全台」
  const [myCityOnly, setMyCityOnly] = useState(true);
  const [userCity, setUserCity] = useState('');
  const navigate = useNavigate();

  const [hasPaidOrder, setHasPaidOrder] = useState(null); // 🆕 付款狀態檢查

  const load = (cityOnly = myCityOnly) => {
      setLoadError(false);
      setLoading(true);

      // 先取客戶地址（決定 myCity） - 嘗試 endUser profile，失敗則用 workshop profile
      const finish = (addressCity) => {
        const params = { groupBy: 'city', sortBy: 'distance' };
        if (cityOnly && addressCity) {
          params.myCity = addressCity;      // 🆕 只回傳同縣市
        }
        if (addressCity) params.sortBy = 'distance'; // 🆕 依客戶地址距離排序

        consumerClient.get('/garages', { params })
          .then(res => { setGroupedGarages(res.data); setLoadError(false); })
          .catch(err => { console.warn('載入失敗:', err?.message || err); setLoadError(true); })
          .finally(() => setLoading(false));
      };

      // 先試 endUser profile (車主)
      consumerClient.get('/auth/profile')
        .then(res => {
          const addr = res.data?.address || '';
          const CITIES = ['台北市','新北市','基隆市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣'];
          let city = '';
          for (const c of CITIES) { if (addr.includes(c)) { city = c; break; } }
          setUserCity(city);
          finish(city);
        })
        .catch(() => {
                          // endUser profile 失敗 → 嘗試 workshop profile (管理員/車廠)
                          consumerClient.get('/auth/workshop-profile')
                            .then(res => {
              const addr = res.data?.address || '';
              const CITIES = ['台北市','新北市','基隆市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣'];
              let city = '';
              for (const c of CITIES) { if (addr.includes(c)) { city = c; break; } }
              setUserCity(city);
              finish(city);
            })
            .catch(() => finish('')); // 都失敗 → 不過濾，顯示全部
        });
    };

  useEffect(() => { load(true); }, []);

  // 🆕 檢查是否有已付款訂單（決定是否顯示推薦合作車廠）
  useEffect(() => {
    consumerClient.get('/orders')
      .then(res => {
        const orders = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
        const paid = orders.some(o =>
          o.depositPaidAt || ['DEPOSIT_PAID', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(o.status)
        );
        setHasPaidOrder(paid);
      })
      .catch(() => setHasPaidOrder(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen text-white">
        <Navbar />
        <main className="page-shell space-y-8">
          {[...Array(2)].map((_, i) => (
            <div key={i}>
              <div className="skeleton h-7 w-32 rounded mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="product-card"><div className="skeleton h-40" /><div className="p-4 space-y-2.5">
                    <div className="skeleton h-5 w-2/3 rounded" /><div className="skeleton h-4 w-full rounded" />
                  </div></div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  const cityCount = Object.keys(groupedGarages).length;
  const garageCount = Object.values(groupedGarages).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <main className="page-shell">
        {loadError ? (
          <ErrorState message="車廠清單載入失敗" onRetry={load} />
        ) : (
          <>
          {/* 🆕 付款狀態提示條 */},
          {!loading && !hasPaidOrder && (
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-700/50 rounded-xl">
              <p className="text-yellow-300 text-sm">
                <span className="font-bold">完成訂單付款後即可看到推薦合作車廠。</span>
                前往 <a href="/orders" className="underline text-yellow-200 hover:text-yellow-100">我的訂單</a> 完成付款。
              </p>
            </div>
          )}
          {hasPaidOrder && (
            <div className="mb-6 p-3 text-xs text-slate-400">
              感謝您的訂單，以下為推薦合作車廠
            </div>
          )}
          {/* 標題區 */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">合作車廠</h1>
            {/* 🆕 同縣市過濾切換 */}
            <div className="flex items-center gap-1 bg-[#1a232e] rounded-xl p-1 border border-[#26313d]">
              <button
                onClick={() => { setMyCityOnly(true); load(true); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${myCityOnly ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                📍 我的地區{userCity ? `（${userCity}）` : ''}
              </button>
              <button
                onClick={() => { setMyCityOnly(false); load(false); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${!myCityOnly ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                全台
              </button>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {myCityOnly && userCity
              ? `${userCity} 共 ${garageCount} 家認證合作車廠 — 依距離由近到遠排序`
              : `全台 ${garageCount} 家認證合作車廠，覆蓋 ${cityCount} 個縣市 — 線上預約保養維修`}
          </p>
          {/* 🆕 特改品客服提示 */}
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            特殊改裝品安裝：可洽詢客服為您推薦專業改裝車廠
          </p>
        </div>

        {cityCount === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1a232e] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" /></svg>
            </div>
            <p className="text-slate-400">目前尚無合作車廠</p>
          </div>
        ) : (
          Object.entries(groupedGarages).map(([city, garages]) => (
            <section key={city} className="mb-10">
              {/* 縣市標題 */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-white">{city}</h2>
                <span className="chip">{garages.length} 家</span>
                <div className="flex-1 h-px bg-[#212c38]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {garages.map(g => (
                  <div key={g.id}
                    onClick={() => navigate(`/garages/${g.id}/book`)}
                    className="product-card group cursor-pointer"
                  >
                    {g.image ? (
                      <div className="relative h-40 overflow-hidden">
                        <img src={g.image} alt={g.garage_name} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141c25] to-transparent" />
                      </div>
                    ) : (
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#1a2530] to-[#131a22] flex items-center justify-center">
                        <svg className="w-14 h-14 text-slate-600 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75m-6.75 3.75h13.5V9.75L12 5.25 3.75 9.75v7.5z" />
                        </svg>
                      </div>
                    )}

                    <div className="p-5 flex flex-col flex-1">
                      <div className="mb-2.5 flex items-center gap-2 flex-wrap">
                        <StarRating value={g.rating || 5.0} count={g.review_count || 0} />
                        {/* 🆕 距離顯示（同縣市+距離排序模式） */}
                        {g.distance != null && g.distance !== Infinity && (
                          <span className="chip ml-auto">🚗 {g.distance} km</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition truncate">
                        {g.garage_name || '未命名車廠'}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1.5 flex items-start gap-1.5">
                        <svg className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        <span className="line-clamp-1">{g.garage_address}</span>
                      </p>

                      <div className="mt-auto pt-4 border-t border-[#222d39] mt-4 flex items-center justify-between">
                        {g.garage_phone && (
                          <a href={`tel:${g.garage_phone}`} onClick={e => e.stopPropagation()}
                            className="text-xs text-slate-400 hover:text-blue-400 transition flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            {g.garage_phone}
                          </a>
                        )}
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-400 group-hover:gap-2 transition-all">
                          預約
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
          </>
        )}
      </main>
    </div>
  );
}
