import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
// 確保正確引用 CartDrawer (修正了錯誤)
import { addToCart } from "./CartDrawer.jsx"; 

function computeStatus(p) {
  const qty = Number(p?.stock_qty ?? 0);
  const mode = (p?.availability_mode || "").toLowerCase();
  const leadWeeks = Number(p?.lead_time_days ?? 0);

  if (qty > 0 || mode === "stock") {
    const stockText = qty > 0 ? `庫存量：${qty}` : "庫存：—";
    return `${stockText}（✅ 現貨，24–48 小時內出貨）`;
  }
  if (mode === "preorder" && leadWeeks > 0) {
    return `備貨中，⏳ 預計 ${leadWeeks} 週後出貨`;
  }
  if (mode === "mto") {
    return "接單生產，出貨期另行通知";
  }
  return "❌ 電洽（請聯繫業務確認交期）";
}

// 取得價格 (優先顯示批發價)
function getPrice(p) {
    // 注意：後端 API 欄位為 wholesale_price 和 msrp_price
    return Number(p?.wholesale_price || p?.msrp_price || 0);
}

export default function Product() {
  const { sku, id } = useParams(); // 支援 /p/:sku 或 /pid/:id
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let url = "";
        if (id) {
            url = `/parts/${id}`;
        } else if (sku) {
            const searchUrl = `/parts?sku=${encodeURIComponent(sku)}&page=1&pageSize=1`;
            const r = await fetch(searchUrl);
            const d = await r.json();
            if (d.items && d.items.length > 0) {
                // 直接使用列表回傳的第一筆資料，或者再用 ID 抓詳細
                setPart(d.items[0]);
                setLoading(false);
                return;
            } else {
                throw new Error("找不到商品");
            }
        }

        if (url) {
            const res = await fetch(url);
            if (!res.ok) throw new Error("商品載入失敗");
            const data = await res.json();
            setPart(data);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sku, id]);

  const handleAddToCart = () => {
    if (!part) return;
    addToCart({
      id: part.id,
      sku: part.sku,
      name: part.name,
      price: getPrice(part),
      qty: qty,
      meta: { brand: part.brand_name || part.brand }
    });
    alert("已加入購物車");
  };

  if (loading) return <div className="p-10 text-center">載入中...</div>;
  if (error || !part) return <div className="p-10 text-center text-red-500">錯誤：{error || "找不到商品"}</div>;

  const msrp = Number(part.msrp_price || 0);
  const wholesale = Number(part.wholesale_price || 0);
  const showPrice = msrp > 0 || wholesale > 0;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-4">
        <Link to="/shop" className="text-blue-600 hover:underline">&larr; 回商品列表</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        {/* 左側圖片區：深色圖片井（#1E293B），黑底/透明底商品圖皆能自然融和 */}
        <div className="bg-[#1E293B] rounded-lg overflow-hidden flex items-center justify-center aspect-square w-full max-h-[400px] p-4">
           {/* 圖片居中、不裁切、统一 1:1 比例 */}
           <img 
             src={part.image_url || '/placeholder.jpg'} 
             onError={(e) => e.target.src = 'https://via.placeholder.com/400?text=No+Image'}
             alt={part.name} 
             className="w-full h-full object-contain"
           />
        </div>

        {/* 右側資訊區 */}
        <div>
          <div className="mb-2">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold mr-2">
                {part.brand_name || part.brand || "Brand"}
            </span>
            <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
               SKU: {part.sku}
            </span>
            {part.category_name && (
                <span className="text-xs text-gray-500 ml-2">{part.category_name}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{part.name}</h1>

          {/* ✅ 修正價格顯示區域: 顯示未定價 */}
          <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-100">
             { showPrice ? (
                <>
                    <div className="text-sm text-gray-500 mb-1">
                        {msrp > 0 ? (
                            <span className="line-through">建議售價: NT$ {msrp.toLocaleString()}</span>
                        ) : (
                            <span>建議售價: 未定價</span>
                        )}
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm text-gray-600">批發優惠價:</span>
                        <span className="text-3xl font-bold text-red-600">
                            NT$ {wholesale > 0 ? wholesale.toLocaleString() : "-"}
                        </span>
                    </div>
                </>
             ) : (
                <div className="text-2xl font-bold text-gray-600">
                    請洽客服
                </div>
             )}
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-2">庫存狀態</h3>
            <div className="text-sm">{computeStatus(part)}</div>
          </div>

          {part.description && (
            <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-2">商品說明</h3>
                <div className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                    {part.description}
                </div>
            </div>
          )}
          
          {part.compatibility_summary && (
             <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-2">適用車型摘要</h3>
                <div className="text-gray-600 text-sm">{part.compatibility_summary}</div>
             </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
             { showPrice ? (
                 <>
                    <div className="flex items-center border border-gray-300 rounded">
                        <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-gray-100">-</button>
                        <input 
                            type="number" 
                            min="1" 
                            value={qty} 
                            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                            className="w-12 text-center border-none focus:ring-0"
                        />
                        <button onClick={() => setQty(qty + 1)} className="px-3 py-2 hover:bg-gray-100">+</button>
                    </div>
                    
                    <button 
                        onClick={handleAddToCart}
                        className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded hover:bg-blue-700 transition shadow-sm"
                    >
                        加入購物車
                    </button>
                 </>
             ) : (
                 <button disabled className="flex-1 bg-gray-300 text-white font-bold py-3 px-6 rounded cursor-not-allowed">
                     請洽客服購買
                 </button>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}