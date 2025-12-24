// src/Product.jsx

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addToCart } from "./CartDrawer.jsx";

function computeStatus(p) {
  const qty = Number(p?.stock_qty ?? 0);
  const mode = (p?.availability_mode || "").toLowerCase();
  // 假設 lead_time_days 欄位現在存的是週數 (例如: 3)
  const leadWeeks = Number(p?.lead_time_days ?? 0);

  // 1. 現貨狀態
  if (qty > 0 || mode === "stock") {
    const stockText = qty > 0 ? `庫存量：${qty}` : "庫存：—";
    return `${stockText}（✅ 現貨，24–48 小時內出貨）`;
  }
  
  // 2. 預訂狀態
  if (mode === "preorder" && leadWeeks > 0) {
    // 直接使用 leadWeeks
    return `備貨中，⏳ 預計 ${leadWeeks} 週後出貨`;
  }
  
  // 3. 接單生產狀態
  if (mode === "mto") {
    return "接單生產，出貨期另行通知";
  }
  
  // 4. 其他狀態 (如無庫存且無預訂天數)
  return "❌ 電洽（請聯繫業務確認交期）";
}

export default function Product({ by }) {
  const { id, sku } = useParams();
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [qty, setQty] = useState(1);

  const priceFmt = useMemo(() => (n) => `NT$ ${Number(n).toLocaleString()}`, []);
  
  // 獲取零件狀態文字
  const statusText = useMemo(() => part ? computeStatus(part) : null, [part]);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true); setErr("");
        // 假設後端 API 路徑為 /parts/:id 或 /parts/by-sku/:sku
        const url = by === "id" ? `/parts/${Number(id)}` : `/parts/by-sku/${encodeURIComponent(sku)}`;
        const r = await fetch(url);
        if (r.status === 404) {
          setErr("零件不存在。");
          setPart(null);
          return;
        }
        if (!r.ok) throw new Error("載入零件詳細資料失敗");
        
        const data = await r.json();
        setPart(data);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [id, sku, by]);

  const handleAddToCart = () => {
    if (!part) return;
    addToCart({
        id: part.id,
        sku: part.sku,
        name: part.name,
        price: part.wholesale_twd || part.msrp_twd, // 使用實際價格
        qty: Number(qty) || 1,
        meta: { 
          vehicle: "當前篩選車型", // TODO: 實際應從 VehicleFilter 狀態獲取
          brand: part.brand_name || part.brand_id 
        }
    });
    alert(`已將 ${qty} 個 ${part.name} 加入購物車！`);
  }

  // 輔助函式：檢查是否有價格
  const hasMsrp = useMemo(() => Number(part?.msrp_twd || 0) > 0, [part]);
  const hasWholesale = useMemo(() => Number(part?.wholesale_twd || 0) > 0, [part]);
  
  if (loading) return <div>載入中...</div>;
  if (err) return <div style={{ color: 'red' }}>錯誤: {err}</div>;
  if (!part) return <div>找不到該零件。</div>;

  return (
    <div className="product-page" style={{ padding: 20 }}>
      <Link to="/" style={{ display: "block", marginBottom: 16 }}>← 返回零件列表</Link>

      <div style={{ display: "flex", gap: 30 }}>
        
        {/* 左側：圖片與基本資訊 */}
        <div style={{ flex: 1 }}>
          <img 
            src={part.image_url || 'placeholder.jpg'} 
            alt={part.name} 
            style={{ width: "100%", maxHeight: 500, objectFit: "contain", border: "1px solid #eee", borderRadius: 8 }}
          />
          {/* 圖片切換或其他詳細圖片... */}
        </div>
        
        {/* 右側：詳細資訊與操作 */}
        <div style={{ flex: 1 }}>
          
          <h1 style={{ fontSize: "2em", margin: "0 0 8px 0" }}>{part.name}</h1>
          <div style={{ color: "#666", marginBottom: 16 }}>
            SKU: <strong>{part.sku}</strong> | 品牌: <strong>{part.brand_name || part.brand_id || 'N/A'}</strong>
          </div>

          {/* 價格顯示邏輯 */}
          <div style={{ marginBottom: 20, padding: 16, border: "1px dashed #ccc", borderRadius: 8 }}>
            
            {hasMsrp && hasWholesale && (
              <>
                <div style={{ fontSize: "1.2em", color: "#999", textDecoration: "line-through" }}>
                  建議售價 (MSRP): {priceFmt(part.msrp_twd)}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: "#dc3545", marginTop: 4 }}>
                  批發價格：{priceFmt(part.wholesale_twd)}
                </div>
              </>
            )}

            {/* 處理僅有 MSRP 或僅有 Wholesale 的情況... (略) */}
            
            {!hasMsrp && !hasWholesale && (
              <div>價格：請電洽</div>
            )}
          </div>

          {/* ✅ 商品狀態 */}
          {statusText && (
            <div style={{ marginBottom: 18, fontSize: "1.1em", fontWeight: "bold", color: "#047857" }}>
              商品狀態：{statusText}
            </div>
          )}

          {/* 產品說明 */}
          {part.description && (
            <>
                <h3 style={{fontSize: "1.2em", margin: "0 0 8px 0"}}>產品特色</h3>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 16, border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
                  {part.description}
                </div>
            </>
          )}

          {/* 加入購物車 */}
          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{fontWeight: 'bold'}}>數量：</label>
              <input
                type="number" min={1} value={qty}
                onChange={e => setQty(Math.max(1, Number(e.target.value || 1)))}
                style={{ width: 90, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              />
              <button 
                onClick={handleAddToCart} 
                style={{ 
                    marginLeft: "auto", 
                    fontWeight: 700,
                    padding: "10px 20px", 
                    backgroundColor: "#007bff", 
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#0056b3"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#007bff"}
              >
                🛒 加入購物車
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}