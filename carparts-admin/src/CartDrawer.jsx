import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 統一使用 "cart.v1"
const CART_KEY = 'cart.v1';

// 匯出讀取購物車數量的函式
export function getCartCount() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : (data.items || []);
    return items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  } catch { return 0; }
}

// 匯出加入購物車的函式
export function addToCart(item) {
  try {
    const raw = localStorage.getItem(CART_KEY);
    let items = [];
    if (raw) {
      const data = JSON.parse(raw);
      items = Array.isArray(data) ? data : (data.items || []);
    }

    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + (Number(item.qty) || 1);
    } else {
      items.push({ ...item, qty: (Number(item.qty) || 1) });
    }

    localStorage.setItem(CART_KEY, JSON.stringify({ items }));
    window.dispatchEvent(new Event('storage')); 
    window.dispatchEvent(new Event('cart-updated'));
  } catch (e) {
    console.error("Cart error", e);
  }
}

export default function CartDrawer({ open, onClose }) {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const loadCart = () => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) {
        setItems([]);
        return;
      }
      const data = JSON.parse(raw);
      let list = Array.isArray(data) ? data : (data.items || []);
      // 過濾無效資料
      setItems(list.filter(i => i && i.id));
    } catch { setItems([]); }
  };

  useEffect(() => {
    loadCart();
    window.addEventListener('cart-updated', loadCart);
    window.addEventListener('storage', loadCart); 
    if (open) loadCart();

    return () => {
      window.removeEventListener('cart-updated', loadCart);
      window.removeEventListener('storage', loadCart);
    };
  }, [open]);

  const updateQty = (id, delta) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }).filter(i => i.qty > 0);
    
    setItems(newItems);
    localStorage.setItem(CART_KEY, JSON.stringify({ items: newItems }));
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const total = items.reduce((sum, item) => sum + (Number(item.price || 0) * (Number(item.qty) || 1)), 0);

  const handleCheckout = () => {
    onClose(); 
    navigate('/checkout'); 
  };

  return (
    <>
      {/* 遮罩層 */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* 側邊欄 */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">購物車 ({items.length})</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">購物車是空的</div>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex gap-3 border-b pb-3">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800 line-clamp-2">{item.name}</div>
                    <div className="text-xs text-gray-500 mb-1">{item.meta?.brand}</div>
                    {item.meta?.vehicle && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-1 rounded inline-block">
                        {item.meta.vehicle}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <div className="font-bold text-red-600">
                        NT$ {Number(item.price || 0).toLocaleString()}
                      </div>
                      <div className="flex items-center border rounded">
                        <button onClick={() => updateQty(item.id, -1)} className="px-2 py-0.5 hover:bg-gray-100">-</button>
                        <span className="px-2 text-sm">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="px-2 py-0.5 hover:bg-gray-100">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between mb-4 text-lg font-bold">
              <span>總金額:</span>
              <span className="text-red-600">NT$ {total.toLocaleString()}</span>
            </div>
            <button 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300"
              disabled={items.length === 0}
              onClick={handleCheckout}
            >
              前往結帳
            </button>
          </div>
        </div>
      </div>
    </>
  );
}