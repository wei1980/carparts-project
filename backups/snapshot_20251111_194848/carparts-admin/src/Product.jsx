import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addToCart } from "./CartDrawer.jsx";

function computeStatus(p) {
  const qty = Number(p?.stock_qty ?? 0);
  const mode = (p?.availability_mode || "").toLowerCase();
  const lead = Number(p?.lead_time_days ?? 0);

  if (qty > 0 || mode === "stock") {
    const stockText = qty > 0 ? `庫存量：${qty}` : "庫存：—";
    return `${stockText}（現貨，24–48 小時內出貨）`;
  }
  if (mode === "lead" && lead > 0) return `備貨中，約 ${lead} 天出貨`;
  if (mode === "mto") return "接單生產，出貨期另行通知";
  return null;
}

export default function Product({ by }) {
  const { id, sku } = useParams();
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [qty, setQty] = useState(1);

  const priceFmt = useMemo(() => (n) => `NT$ ${Number(n).toLocaleString()}`, []);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true); setErr("");
        const url = by === "id" ? `/parts/${Number(id)}` : `/parts/by-sku/${encodeURIComponent(sku)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const text = await res.text();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        const data = JSON.parse(text);
        setPart(data);
      } catch (e) {
        setErr(String(e.message || e));
        setPart(null);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [id, sku, by]);

  function handleAddToCart() {
    if (!part) return;
    const unit =
      (part.wholesale_twd != null ? Number(part.wholesale_twd) : null) ??
      (part.msrp_twd != null ? Number(part.msrp_twd) : 0);

    addToCart({
      sku: part.sku,
      name: part?.name || (sku ?? String(id)),
      image_url: part?.image_url || null,
      role: "dealer",
      qty: Number(qty) || 1,
      unit_price_twd: unit,
      msrp_twd: part?.msrp_twd != null ? Number(part.msrp_twd) : null,
      wholesale_twd: part?.wholesale_twd != null ? Number(part.wholesale_twd) : null
    });

    alert("已加入購物車！請點右上角 🛒 查看。");
  }

  if (loading) return <div style={{ maxWidth: 1000, margin: "20px auto", padding: 16 }}>載入中…</div>;
  if (err || !part) return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 16, color: err ? "crimson" : "#333" }}>
      找不到此商品。
      {err && <div style={{ marginTop: 6, color: "crimson" }}>{err}</div>}
    </div>
  );

  const hasMsrp = part.msrp_twd != null;
  const hasWholesale = part.wholesale_twd != null;
  const statusText = computeStatus(part);

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/shop">← 回到商店</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        {/* 圖片 */}
        <div>
          {part.image_url ? (
            <img src={part.image_url} alt={part.name} style={{ width: "100%", borderRadius: 10 }} />
          ) : (
            <div style={{ width: "100%", height: 260, background: "#f2f2f2", borderRadius: 10 }} />
          )}
        </div>

        {/* 右側內容 */}
        <div>
          <h2 style={{ margin: "0 0 6px" }}>{part.name}</h2>

          {/* 不顯示 SKU */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 8 }}>
            <div>品牌：{part.brand ?? "-"}</div>
            <div>類別：{Array.isArray(part.categories) && part.categories.length ? part.categories.join("、") : (part.category ?? "-")}</div>
          </div>

          {/* 相容車型摘要 */}
          {part.compatibility_summary && (
            <div style={{ marginBottom: 8, color: "#444" }}>
              相容車型：{part.compatibility_summary}
            </div>
          )}

          {/* 價格區塊：建議售價（刪除線）＋ 批發價格（放大 & 粗體） */}
          <div style={{ marginBottom: 10 }}>
            {hasMsrp && hasWholesale && (
              <>
                <div style={{ color: "#888", textDecoration: "line-through" }}>
                  建議售價：{priceFmt(part.msrp_twd)}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>
                  批發價格：{priceFmt(part.wholesale_twd)}
                </div>
              </>
            )}

            {hasMsrp && !hasWholesale && (
              <div>建議售價：{priceFmt(part.msrp_twd)}</div>
            )}

            {!hasMsrp && hasWholesale && (
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>
                批發價格：{priceFmt(part.wholesale_twd)}
              </div>
            )}

            {!hasMsrp && !hasWholesale && (
              <div>價格：-</div>
            )}
          </div>

          {/* ✅ 商品狀態 */}
          {statusText && (
            <div style={{ marginBottom: 12, color: "#047857" }}>
              商品狀態：{statusText}
            </div>
          )}

          {/* 產品說明 */}
          {part.description && (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 16 }}>
              {part.description}
            </div>
          )}

          {/* 加入購物車 */}
          <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label>數量：</label>
              <input
                type="number" min={1} value={qty}
                onChange={e => setQty(e.target.value)}
                style={{ width: 90 }}
              />
              <button onClick={handleAddToCart} style={{ marginLeft: "auto", fontWeight: 700 }}>
                加入購物車
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
