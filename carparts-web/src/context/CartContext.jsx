// src/context/CartContext.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

// 🆕 購物車持久化：localStorage（刷新/重新開啟不流失）
const CART_STORAGE_KEY = 'carparts_cart';

const loadCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 防呆：過濾破損/非預期格式的項目
    return parsed.filter(item =>
      item &&
      Number.isInteger(item.partId) &&
      item.part && typeof item.part === 'object' &&
      typeof item.qty === 'number' && item.qty > 0
    );
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);

  // 🆕 購物車異動即寫入 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn('購物車儲存失敗:', err);
    }
  }, [cart]);

  // 加入購物車（useCallback：保持引用穩定，讓 React.memo 子元件有效）
  const addToCart = useCallback((part, qty = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.partId === part.id);
      if (existingItem) {
        // 如果商品已在購物車，增加數量
        return prevCart.map(item =>
          item.partId === part.id ? { ...item, qty: item.qty + qty } : item
        );
      } else {
        // 如果商品不在購物車，加入新項目 (確保 part 資料完整)
        return [...prevCart, { partId: part.id, part, qty }];
      }
    });
  }, []);

  // 更新數量
  const updateQty = (partId, newQty) => {
    if (newQty < 1) return removeFromCart(partId);
    setCart(prevCart =>
      prevCart.map(item =>
        item.partId === partId ? { ...item, qty: newQty } : item
      )
    );
  };

  // 移除商品
  const removeFromCart = (partId) => {
    setCart(prevCart => prevCart.filter(item => item.partId !== partId));
  };

  // 清空購物車
  const clearCart = () => setCart([]);

  // 🟢 防呆計算：計算總數量 (避免資料破損)
  const itemCount = cart.reduce((total, item) => {
    const qty = typeof item.qty === 'number' ? item.qty : 0;
    return total + qty;
  }, 0);

  // 🟢 防呆計算：計算總金額 (避免因 part.msrp_price 空值導致 NaN 崩潰)
  const totalAmount = cart.reduce((total, item) => {
    const price = Number(item.part?.msrp_price || 0);
    const qty = typeof item.qty === 'number' ? item.qty : 1;
    return total + (price * qty);
  }, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      itemCount,
      totalAmount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}