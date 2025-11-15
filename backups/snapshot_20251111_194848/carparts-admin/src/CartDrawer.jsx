import { useEffect, useState } from "react";

const KEY = "cart_items";

/* ---------- storage utils ---------- */
export function getCart() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function setCart(arr) { localStorage.setItem(KEY, JSON.stringify(arr || [])); }
export function getCartCount() { return getCart().reduce((s, x) => s + (Number(x.qty)||0), 0); }
export function addToCart(item) {
  const cart = getCart();
  const idx = cart.findIndex(x => x.id === item.id);
  if (idx >= 0) cart[idx].qty += item.qty || 1;
  else cart.push({ ...item, qty: item.qty || 1 });
  setCart(cart);
}
export function clearCart() { setCart([]); }

/* ---------- component ---------- */
export default function CartDrawer({ open, onClose }) {
  const [items, setItems] = useState(getCart());
  useEffect(() => { if (open) setItems(getCart()); }, [open]);

  const save = (next) => { setItems(next); setCart(next); };
  const inc = (id) => save(items.map(it => it.id===id ? { ...it, qty: Number(it.qty||0)+1 } : it));
  const dec = (id) => save(items.map(it => it.id===id ? { ...it, qty: Math.max(1, Number(it.qty||0)-1) } : it));
  const setQty = (id, v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    save(items.map(it => it.id===id ? { ...it, qty: Math.floor(n) } : it));
  };
  const remove = (id) => save(items.filter(it => it.id !== id));

  const total = items.reduce((s, x) => s + (Number(x.price||0) * Number(x.qty||0)), 0);

  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-mask" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-head">
          <div className="drawer-title">購物車</div>
          <button className="btn-ghost" onClick={onClose}>關閉</button>
        </div>

        <div className="drawer-body cart-body">
          {items.length === 0 && <div className="p-4 text-gray-500">購物車是空的</div>}

          {items.map(it => (
            <div key={it.id} className="cart-row v2">
              {/* 左：圖片 */}
              <img
                src={it.image_url || "/images/placeholder.png"}
                alt={it.name}
                className="cart-thumb"
              />

              {/* 右：四行 */}
              <div className="cart-info">
                {/* 1. 商品名稱 */}
                <div className="cart-name">{it.name}</div>

                {/* 2. 廠牌 */}
                {it.meta?.brand && (
                  <div className="cart-line"><span className="label">廠牌：</span>{it.meta.brand}</div>
                )}

                {/* 3. 適用車型（僅當有傳入 vehicleSummary 才顯示） */}
                {it.meta?.vehicle && (
                  <div className="cart-line"><span className="label">適用車型：</span>{it.meta.vehicle}</div>
                )}

                {/* 4. 金額 + 數量控制（同一行左右對齊） */}
                <div className="cart-footline">
                  <div className="cart-price">NT$ {toCurrency(it.price)}</div>
                  <div className="qty-group" role="group" aria-label="數量控制">
                    <button className="qty-btn" onClick={() => dec(it.id)} aria-label="減少">−</button>
                    <input
                      className="qty-input"
                      value={String(it.qty ?? 1)}
                      onChange={(e) => setQty(it.id, e.target.value)}
                      inputMode="numeric"
                    />
                    <button className="qty-btn" onClick={() => inc(it.id)} aria-label="增加">＋</button>
                    <button className="rm-btn" onClick={() => remove(it.id)} title="移除">×</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="drawer-foot">
          <div className="foot-total">合計：NT$ {toCurrency(total)}</div>
          <button className="btn-primary" onClick={() => alert("（示意）前往結帳")}>前往結帳</button>
        </div>
      </div>
    </div>
  );
}

function toCurrency(n) { return Number(n || 0).toLocaleString("zh-TW"); }
