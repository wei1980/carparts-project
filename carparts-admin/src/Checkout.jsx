import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ✅ 統一讀取 Key: "cart.v1" (必須與 CartDrawer 一致)
function readCart() {
  try {
    const raw = localStorage.getItem("cart.v1");
    if (!raw) return [];
    const data = JSON.parse(raw);
    // 相容 { items: [] } 與 [ ... ] 兩種格式
    return Array.isArray(data) ? data : (data.items || []);
  } catch {
    return [];
  }
}

// 清空購物車
function clearCart() {
  localStorage.setItem("cart.v1", "[]");
  window.dispatchEvent(new Event("cart-updated"));
  window.dispatchEvent(new Event("storage"));
}

const currency = (n) => `NT$ ${Number(n || 0).toLocaleString()}`;

export default function Checkout() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  
  // 載入購物車
  useEffect(() => {
    const cartItems = readCart();
    
    // 如果真的沒東西，才導回首頁
    if (cartItems.length === 0) {
      // 避免 React StrictMode 下的雙重 alert，這裡直接導向
      // alert("購物車是空的"); 
      navigate("/shop", { replace: true });
    } else {
      setItems(cartItems);
    }
  }, [navigate]);

  const [form, setForm] = useState({
    company_name: "",
    buyer_name: "",
    phone: "",
    email: "",
    tax_id: "",
    shipping_address: "",
    note: "",
  });

  const [shippingFee, setShippingFee] = useState(150);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0), 0),
    [items]
  );
  
  const total = subtotal + shippingFee;

  async function submitOrder() {
    if (!form.buyer_name || !form.phone || !form.shipping_address) {
      alert("請填寫必填欄位 (聯絡人、電話、地址)");
      return;
    }

    setSubmitting(true);
    try {
      // 呼叫後端建立訂單
      const res = await fetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, qty: i.qty })),
          ...form,
          shipping_fee: shippingFee,
          total_amount: total
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "伺服器錯誤");
      }

      const result = await res.json();
      
      alert(`訂單建立成功！單號：${result.order_number}`);
      clearCart(); 
      navigate("/shop");

    } catch (e) {
      console.error(e);
      alert("訂單送出失敗: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // 避免畫面閃爍，如果還沒載入或為空就不顯示內容
  if (items.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">結帳作業</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左側：填寫資料 */}
        <div className="space-y-5 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold border-b pb-2 mb-4">收件資訊</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="公司名稱 (選填)">
              <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none" 
                value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
            </Field>
            <Field label="統一編號 (選填)">
              <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none" 
                value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="聯絡人 *">
              <input type="text" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none" 
                value={form.buyer_name} onChange={e => setForm({...form, buyer_name: e.target.value})} />
            </Field>
            <Field label="電話 *">
              <input type="tel" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none" 
                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </Field>
          </div>

          <Field label="Email (接收訂單通知)">
            <input type="email" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none" 
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </Field>

          <Field label="收件地址 *">
            <input type="text" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none" 
              value={form.shipping_address} onChange={e => setForm({...form, shipping_address: e.target.value})} />
          </Field>

          <Field label="備註">
            <textarea className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none" rows="3"
              value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
          </Field>
        </div>

        {/* 右側：訂單摘要 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit sticky top-4">
          <h2 className="text-lg font-semibold border-b pb-2 mb-4">訂單內容</h2>
          
          <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-start text-sm border-b border-gray-100 pb-3">
                <div>
                  <div className="font-bold text-gray-800">{item.name}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {item.meta?.brand} {item.meta?.vehicle}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {item.sku} × {item.qty}
                  </div>
                </div>
                <div className="font-medium text-gray-700 whitespace-nowrap ml-4">
                  {currency(Number(item.price || 0) * Number(item.qty || 1))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm border-t pt-4">
            <div className="flex justify-between">
              <span className="text-gray-600">小計</span>
              <span>{currency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">運費</span>
              <span>{currency(shippingFee)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-red-600 pt-4 border-t mt-2">
              <span>總計</span>
              <span>{currency(total)}</span>
            </div>
          </div>

          <button 
            onClick={submitOrder}
            disabled={submitting || items.length === 0}
            className="w-full mt-6 bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg"
          >
            {submitting ? "正在建立訂單..." : "確認結帳"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      {children}
    </label>
  );
}