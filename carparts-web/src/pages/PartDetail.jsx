// src/pages/PartDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { consumerClient, garageClient } from '../api/client';
import { partsAPI, wishlistAPI } from '../api';
import { useCart } from '../context/CartContext';
import { useCurrentVehicle } from '../context/CurrentVehicleContext';
import Navbar from '../components/Navbar';
import PartImage from '../components/PartImage';
import { TERMS, formatPrice } from '../constants/terms';


// 🔒 純車廠 session（有 garageToken 且無客戶 token）——與下方 showWholesale 同口徑
const isGarageSession = () =>
  !!localStorage.getItem('garageToken') && !localStorage.getItem('token');

export default function PartDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const navPart = location.state?.part;

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { currentVehicle, loading: vehicleLoading, switching } = useCurrentVehicle();
  const [compatibilityResult, setCompatibility] = useState(null);
  const compatibilityKey = `${id}:${currentVehicle?.id || ''}`;
  const compatibility = !switching && !vehicleLoading && compatibilityResult?.key === compatibilityKey ? compatibilityResult.data : null;
  const [quantityError, setQuantityError] = useState('');
    const [added, setAdded] = useState(false);
    const [wishAdded, setWishAdded] = useState(false);

    // 數量驗證
    const validateQuantity = (value) => {
      const valid = value !== '' && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 99;
      setQuantityError(valid ? '' : '數量須為 1 至 99 的整數');
      return valid;
    };

  // 🆕 動態 OG meta：分享到 LINE/社群時帶商品圖與名稱
  useEffect(() => {
    if (!part) return;
    const setMeta = (prop, content) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', prop);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('og:title', `${part.name} | ${part.brand || ''}`);
    if (part.image_url) {
      setMeta('og:image', new URL(part.image_url, window.location.origin).href);
    }
    return () => {};
  }, [part]);

  useEffect(() => {
    const fetchPart = async () => {
      setLoading(true);
      setErrorMsg('');

      if (navPart && String(navPart.id) === String(id)) {
        setPart(navPart);
        setLoading(false);
        return;
      }

      try {
              const detailClient = isGarageSession() ? garageClient : consumerClient;
              const res = await detailClient.get(`/parts/${id}`);
              setPart(res.data);
            } catch (err) {
              console.error("API 請求失敗:", err);
              try {
                const detailClient = isGarageSession() ? garageClient : consumerClient;
                const listRes = await detailClient.get('/parts/recommended', { params: { search: '' } });
                const foundPart = listRes.data.parts.find(p => String(p.id) === String(id));
                if (foundPart) { setPart(foundPart); }
                else { setPart(null); setErrorMsg(`查無此商品（HTTP ${err.response?.status || '無回應'}）`); }
              } catch {
                setPart(null);
                setErrorMsg('連線失敗，請確認後端伺服器是否運行中');
              }
            } finally {
        setLoading(false);
      }
    };

    fetchPart();
  }, [id, navPart]);

  useEffect(() => {
    setCompatibility(null);
    if (!part || isGarageSession() || vehicleLoading || switching) return;
    if (!currentVehicle) {
      setCompatibility({ key: compatibilityKey, data: { status: 'NEEDS_VEHICLE' } });
      return;
    }
    let active = true;
    partsAPI.getCompatibility(part.id)
      .then((response) => { if (active) setCompatibility({ key: compatibilityKey, data: response.data }); })
      .catch(() => { if (active) setCompatibility({ key: compatibilityKey, data: { status: 'NEEDS_REVIEW', reason: '暫時無法確認相容性，請由合作車廠協助確認。' } }); });
    return () => { active = false; };
  }, [part, compatibilityKey, vehicleLoading, switching]);

  if (loading) {
    return (
      <div className="min-h-screen text-white">
        <Navbar />
        <main className="page-shell">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-[#141c25] rounded-2xl p-6 md:p-10 border border-[#242f3b]">
            <div className="skeleton aspect-square rounded-xl" />
            <div className="space-y-4">
              <div className="skeleton h-6 w-24 rounded" />
              <div className="skeleton h-10 w-3/4 rounded" />
              <div className="skeleton h-12 w-40 rounded mt-6" />
              <div className="skeleton h-24 w-full rounded mt-4" />
              <div className="skeleton h-14 w-full rounded-xl mt-8" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!part) {
      return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1a232e] flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-200">{TERMS.MESSAGES.PART_NOT_FOUND}</h2>
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-lg">{errorMsg || TERMS.MESSAGES.PART_NOT_FOUND}</p>
          <button onClick={() => navigate('/shop')} className="btn-primary mt-4 px-8 py-3 font-bold">
            {TERMS.ACTIONS.BACK_TO_SHOP}
          </button>
        </div>
      );
    }

  // 💰 現貨判定：自備庫存 + 總代理庫存（decrementStock 會先從總代理池出貨，
  //    所以只有 distributor 庫存的商品同樣是現貨、可立即出貨）
  const totalStock = Number(part.stock_qty || 0) + Number(part.distributor_stock_qty || 0);
  const inStock = totalStock > 0;
  // 🆕 公司貨（MST/KN/Pipercross 等官方代理）：缺貨時顯示「公司貨」而非「代購商品」
  const isOfficialPart = !!part.is_official;
  // 💰 價格顯示：只有純車廠 session（有 garageToken 且無客戶 token）顯示批發價；
  // 客戶登入/未登入一律看售價（garageToken 會殘留在 localStorage，不能單獨當依據）
  const isGarage = !!localStorage.getItem('garageToken') && !localStorage.getItem('token');
  const showWholesale = isGarage && part.wholesale_price && Number(part.wholesale_price) > 0;
  const displayPrice = showWholesale ? part.wholesale_price : part.msrp_price;

  const handleAdd = () => {
    if (!validateQuantity(quantity)) return;
    for (let i = 0; i < Number(quantity); i++) addToCart(part);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // 🆕 Sprint 3：買＋裝 bundle — 加入購物車後直接進預約安裝流程
  const handleBundle = () => {
    if (!validateQuantity(quantity)) return;
    for (let i = 0; i < Number(quantity); i++) addToCart(part);
    navigate('/booking');
  };

  // 🆕 願望清單一鍵加入（與 Shop PartCard 同一 API 流程）
  const handleWish = async () => {
    try {
      await wishlistAPI.add({ partId: String(part?.id) });
      setWishAdded(true);
      setTimeout(() => setWishAdded(false), 1500);
    } catch (err) {
      console.warn('願望加入失敗:', err?.message || err);
    }
  };

  // 🔒 客戶端不顯示料號（避免比價）；品牌/庫存資訊只呈現在徽章列，不另存 specs 陣列

  return (
    <div className="min-h-screen text-white pb-20">
      <Navbar />

      <main className="page-shell">
        {/* 麵包屑 */}
        <nav className="mb-5 text-sm flex items-center gap-2 text-slate-500">
                  <button onClick={() => navigate('/shop')} className="hover:text-blue-400 transition-colors">{TERMS.ACTIONS.BACK_TO_SHOP}</button>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  <span className="text-blue-400 font-medium">{part.brand}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-300 truncate max-w-[300px]">{part.name}</span>
                </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-[#141c25] rounded-2xl p-6 md:p-10 border border-[#242f3b] shadow-xl">

          {/* 左：商品圖 */}
                    <div>
                      <div className="product-image-container w-full rounded-xl overflow-hidden shadow-lg relative">
                        <PartImage
                          src={part.image_url}
                          alt={part.name}
                          eager
                          imgClassName="p-4 md:p-6 transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* 右：商品資訊 */}
                    <div className="flex flex-col">
            {/* 品牌 / 庫存 同一列（🔒 客戶端不顯示料號，避免比價） */}
                        <div className="flex items-center gap-2.5 flex-wrap mb-3">
                          <span className="text-xs font-black text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/25 uppercase tracking-widest">{part.brand}</span>
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow ${inStock ? 'bg-emerald-500' : (isOfficialPart ? 'bg-orange-500' : 'bg-amber-500')}`}>
                            {inStock ? `${TERMS.IN_STOCK_LABEL} ${totalStock}${TERMS.UNITS.PIECE}` : (isOfficialPart ? TERMS.OFFICIAL_LABEL : TERMS.PREORDER_LABEL)}
                          </span>
                        </div>

            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-5">{part.name}</h1>

            {!isGarage && <CompatibilityCard compatibility={compatibility} navigate={navigate} />}

            {/* 價格區 */}
                                    <div className="mb-6 bg-gradient-to-r from-[#101720] to-transparent border-l-4 border-blue-500 rounded-r-xl p-4">
                                      <p className="text-xs text-slate-400 mb-1 font-medium">
                                        {showWholesale ? TERMS.WHOLESALE_PRICE_LABEL : TERMS.MSRP_PRICE_LABEL}
                                      </p>
                                      <div className="flex items-baseline gap-3 flex-wrap">
                                        <span className={`text-4xl font-black tracking-tight ${showWholesale ? 'text-emerald-400' : 'text-blue-400'}`}>
                                          {formatPrice(displayPrice)}
                                        </span>
                                        {showWholesale && (
                                          <span className="text-sm text-slate-500 line-through">
                                            {TERMS.MSRP_PRICE_LABEL} {formatPrice(part.msrp_price)}
                                          </span>
                                        )}
                                      </div>
                                    </div>

            {/* 描述 */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-300 mb-2">商品描述</h3>
              <p className="text-slate-400 leading-relaxed text-sm whitespace-pre-line">
                {part.description || '尚未提供商品描述。請依相容性資訊及安裝條件確認，或聯絡合作車廠。'}
              </p>
            </div>

            {/* 購買區 */}
                        <div className="mt-auto bg-[#101720] p-5 rounded-xl border border-[#212c38]">
                          <div className="flex items-center gap-4 mb-4">
                            <label htmlFor="part-quantity" className="text-sm text-slate-300 font-medium shrink-0">數量</label>
                            <div className="flex items-center border border-[#2c3947] rounded-xl overflow-hidden">
                              <button onClick={() => { const newVal = quantity - 1; if (newVal >= 1) { setQuantity(newVal); validateQuantity(newVal); } }} className="w-10 h-10 flex items-center justify-center bg-[#1a232e] hover:bg-[#24303e] text-white font-bold transition">−</button>
                              <input
                                id="part-quantity"
                                type="number"
                                value={quantity}
                                onChange={(e) => { const val = e.target.value; setAdded(false); setQuantity(val); validateQuantity(val); }}
                                onBlur={() => validateQuantity(quantity)}
                                min="1"
                                max="99"
                                className={`w-12 text-center text-sm font-bold bg-transparent border-none focus:outline-none ${quantityError ? 'text-red-400' : ''}`}
                                aria-invalid={quantityError ? 'true' : 'false'}
                                aria-describedby={quantityError ? 'quantity-error' : undefined}
                              />
                              <button onClick={() => { const newVal = Number(quantity) + 1; if (newVal <= 99) { setQuantity(newVal); validateQuantity(newVal); } }} className="w-10 h-10 flex items-center justify-center bg-[#1a232e] hover:bg-[#24303e] text-white font-bold transition">+</button>
                            </div>
                            {quantityError && <p id="quantity-error" className="text-red-400 text-xs ml-2" role="alert">{quantityError}</p>}
                            <span className="text-sm text-slate-500 ml-auto">
                              小計 {formatPrice(Number(displayPrice) * quantity)}
                            </span>
                          </div>

              <button onClick={handleAdd} disabled={!!quantityError || !inStock}
                              className={`w-full py-4 rounded-xl font-bold text-base transition-all flex justify-center items-center gap-2.5 active:scale-[0.98] ${
                                added ? 'bg-emerald-600 text-white' : 'btn-primary shadow-lg shadow-blue-500/20'
                              }`}
                            >
                              {added ? (
                                <>
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                  {TERMS.ACTIONS.ADDED_TO_CART}
                                </>
                              ) : inStock ? TERMS.ACTIONS.ADD_TO_CART : (isOfficialPart ? TERMS.OFFICIAL_LABEL : TERMS.PREORDER_LABEL)}
                            </button>

                            {/* 🆕 Sprint 3：買＋裝 bundle（購買 + 預約安裝） */}
                            <button onClick={handleBundle} disabled={!!quantityError || !inStock}
                              className="w-full py-3 rounded-xl font-bold text-sm border border-[#2c3947] bg-[#1a232e] text-slate-200 hover:border-blue-500/50 hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed">
                              🛠 買＋裝：購買並預約安裝
                            </button>

                            {/* 🆕 Sprint 1：PDP 願望清單加入 + 安裝預約 CTA */}
                            <div className="mt-3 flex items-center gap-2">
                              <button onClick={handleWish} aria-pressed={wishAdded} aria-label={wishAdded ? '已加入願望清單' : '加入願望清單'}
                                className={`w-12 shrink-0 py-3 flex items-center justify-center rounded-xl border transition-all ${wishAdded ? 'border-red-500/60 bg-red-500/15 text-red-400' : 'border-[#2c3947] bg-[#1a232e] text-slate-400 hover:border-red-500/50 hover:text-red-400'}`}>
                                <svg className={`w-5 h-5 ${wishAdded ? 'fill-red-500' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0 1.38-.878 2.379-2 3v9c0 1.121-.758 2.022-1.8 2.682v0a9.65 9.65 0 0 1-6.08 0c-.9-.36-1.8-.659-1.8-2.682v-9c-1.24-1.21-2.11-2.208-2-3.38 0-1.38.88-2.379 2-3.378 1.21-.949 2.93-1.568 4.75-1.568s3.53.619 4.75 1.568Z" />
                                </svg>
                              </button>
                              <button onClick={() => navigate('/booking')} className="flex-1 py-3 rounded-xl font-bold text-sm border border-[#2c3947] bg-[#1a232e] text-slate-200 hover:border-blue-500/50 hover:text-white transition">
                                預約安裝
                              </button>
                            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CompatibilityCard({ compatibility, navigate }) {
  if (!compatibility) {
    return <div className="mb-5 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-300">正在確認這個零件是否適用您的目前車輛…</div>;
  }

  const confirmed = compatibility.status === 'CONFIRMED';
  const needsVehicle = compatibility.status === 'NEEDS_VEHICLE';
  const vehicle = compatibility.vehicle;
  const label = confirmed ? '已確認適用' : needsVehicle ? '請先選擇車輛' : '需要技師確認';
  const vehicleLabel = vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.generation, vehicle.engine].filter(Boolean).join(' ') : null;

  return (
    <section className={`mb-5 rounded-xl border p-4 ${confirmed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full font-black ${confirmed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950'}`}>{confirmed ? '✓' : '!'}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">{label}{vehicleLabel ? `｜${vehicleLabel}` : ''}</p>
          <p className="mt-1 text-sm text-slate-300">{compatibility.reason}</p>
          {needsVehicle && <button onClick={() => navigate('/my-car')} className="mt-3 text-sm font-bold text-blue-300 hover:text-blue-200">前往選擇目前車輛 →</button>}
          {!confirmed && !needsVehicle && <button onClick={() => navigate('/garages')} className="mt-3 text-sm font-bold text-amber-200 hover:text-amber-100">尋找合作車廠確認 →</button>}
        </div>
      </div>
    </section>
  );
}
