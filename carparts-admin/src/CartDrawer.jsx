import React, { useState, useEffect } from 'react';

// 簡單的 LocalStorage 購物車實作
const CART_KEY = 'autoparts_b2b_cart';

// 匯出給 Shop.jsx 使用的 Helper
export function getCartCount() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return items.reduce((sum, item) => sum + (item.qty || 1), 0);
  } catch { return 0; }
}

export function addToCart(item) {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ ...item, qty: 1 });
    }
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    // 發送自訂事件通知 UI 更新 (選用)
    window.dispatchEvent(new Event('cart-updated'));
  } catch (e) {
    console.error("Cart error", e);
  }
}

export default function CartDrawer({ open, onClose }) {
  const [items, setItems] = useState([]);

  // 監聽購物車變化
  useEffect(() => {
    const load = () => {
      try {
        setItems(JSON.parse(localStorage.getItem(CART_KEY) || '[]'));
      } catch { setItems([]); }
    };

    load();
    window.addEventListener('cart-updated', load);
    // 當 Drawer 打開時也重新載入一次
    if (open) load();

    return () => window.removeEventListener('cart-updated', load);
  }, [open]);

  const updateQty = (id, delta) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }).filter(i => i.qty > 0);
    
    setItems(newItems);
    localStorage.setItem(CART_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // 樣式：簡單的右側滑出
  return (
    <>
      {/* 遮罩 */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* 側邊欄 */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">購物車 ({items.length})</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">購物車是空的</div>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex gap-3 border-b pb-3">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800 line-clamp-2">{item.name}</div>
                    <div className="text-xs text-gray-500 font-mono mb-1">{item.sku}</div>
                    {item.meta?.vehicle && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-1 rounded inline-block">
                        {item.meta.vehicle}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <div className="font-bold text-red-600">${item.price.toLocaleString()}</div>
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
              <span className="text-red-600">${total.toLocaleString()}</span>
            </div>
            <button 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300"
              disabled={items.length === 0}
              onClick={() => alert("前往結帳頁面 (尚未實作)")}
            >
              前往結帳
            </button>
          </div>
        </div>
      </div>
    </>
  );
}