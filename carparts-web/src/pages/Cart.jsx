// src/pages/Cart.jsx — 購物車（配色已對齊設計系統：深藍工業風 token）
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import { useCurrentVehicle, vehicleLabel } from '../context/CurrentVehicleContext';

export default function Cart() {
  const { cart, updateQty, removeFromCart, totalAmount, clearCart, itemCount } = useCart();
  const navigate = useNavigate();
  const { currentVehicle } = useCurrentVehicle();

  // 🟢 防呆處理：如果 Context 回傳的不是數字，給預設值 0 (避免頁面崩潰)
  const safeTotalAmount = typeof totalAmount === 'number' ? totalAmount : 0;
  const safeItemCount = typeof itemCount === 'number' ? itemCount : 0;

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Navbar />
      <main className="page-shell max-w-3xl">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">🛒 購物車 ({safeItemCount} 件)</h1>
          <button onClick={() => navigate('/shop')} className="text-blue-400 hover:text-blue-300 transition">
            ← 繼續購物
          </button>
        </div>

        {currentVehicle && (
                <div className="mb-6 rounded-xl border border-amber-500/30 p-4 text-sm text-slate-300">
                  <p className="font-medium">目前車輛：{vehicleLabel(currentVehicle)}</p>
                  {/* ⚠️ 切換車輛只改變適用性檢查的對象，不代表既有商品已確認適配 */}
                  <p className="mt-1 text-xs text-amber-300/90">切換車輛不代表現有商品均適用</p>
                </div>
              )}
        {/* 如果購物車是空的 */}
        {!cart || cart.length === 0 ? (
          <div className="bg-[#131a22] p-12 text-center rounded-2xl border border-[#26313d]">
            <span className="text-6xl block mb-4">🛒</span>
            <p className="text-slate-400 text-lg mb-4">購物車是空的</p>
            <button
              onClick={() => navigate('/shop')}
              className="btn-primary px-6 py-3 font-bold"
            >
              去逛逛零件商城
            </button>
          </div>
        ) : (
          <>
            {/* 商品列表 */}
            <div className="space-y-4 mb-8">
              {cart.map(item => {
                // 🟢 防呆：確保 item.part 存在，避免取不到屬性報錯
                const part = item.part || {};
                const price = Number(part.msrp_price || 0);
                const qty = item.qty || 1;
                const subtotal = price * qty;

                return (
                  <div
                    key={item.partId}
                    className="bg-[#131a22] p-4 rounded-xl border border-[#26313d] flex flex-col sm:flex-row items-center gap-4 hover:border-[#33445a] transition"
                  >
                    {/* 商品圖 */}
                                        <div className="product-image-container w-20 h-20 rounded-lg flex-shrink-0">
                                          {part.image_url ? (
                                            <img
                                              src={part.image_url}
                                              alt={part.name || '商品'}
                                              loading="lazy"
                                              className="w-full h-full"
                                              onError={(e) => {
                                                if (!e.target.dataset.fallback) {
                                                  e.target.dataset.fallback = 'true';
                                                  const newSrc = e.target.src.replace(/\.(jpg|jpeg)$/i, '.png');
                                                  if (e.target.src !== newSrc) e.target.src = newSrc;
                                                }
                                              }}
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                                          )}
                                        </div>

                    {/* 商品資訊 */}
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-bold">{part.name || '未知商品'}</h3>
                      <p className="text-slate-400 text-sm">{part.brand || ''}</p>
                      <p className="text-emerald-400 font-bold mt-1">NT$ {price.toLocaleString()}</p>
                    </div>

                    {/* 數量增減 */}
                    <div className="flex items-center gap-3">
                      <button
                        aria-label="減少數量"
                        onClick={() => updateQty(item.partId, qty - 1)}
                        className="bg-[#1a232e] w-8 h-8 rounded-lg hover:bg-[#243040] flex items-center justify-center transition border border-[#2c3947]"
                      >−</button>
                      <span className="font-bold w-6 text-center">{qty}</span>
                      <button
                        aria-label="增加數量"
                        onClick={() => updateQty(item.partId, qty + 1)}
                        className="bg-[#1a232e] w-8 h-8 rounded-lg hover:bg-[#243040] flex items-center justify-center transition border border-[#2c3947]"
                      >+</button>
                    </div>

                    {/* 小計 */}
                    <span className="font-bold text-emerald-400 w-24 text-center sm:text-right">
                      NT$ {subtotal.toLocaleString()}
                    </span>

                    {/* 刪除按鈕 */}
                    <button
                      aria-label="移除商品"
                      onClick={() => removeFromCart(item.partId)}
                      className="text-slate-500 hover:text-red-400 transition"
                    >✕</button>
                  </div>
                );
              })}
            </div>

            {/* 總計與結帳區塊 */}
            <div className="bg-[#131a22] p-6 rounded-xl border border-[#26313d]">
              <div className="flex justify-between text-xl font-bold mb-6">
                <span>總計</span>
                <span className="text-emerald-400">NT$ {safeTotalAmount.toLocaleString()}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={clearCart}
                  className="btn-secondary flex-1 py-3 font-bold"
                >清空購物車</button>
                <button
                  onClick={() => navigate('/checkout')}
                  className="btn-primary flex-1 py-3 font-bold"
                >前往結帳 →</button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
