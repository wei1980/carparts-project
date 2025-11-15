import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import VehicleFilter from "./VehicleFilter.jsx";
import CartDrawer, { addToCart, getCartCount } from "./CartDrawer.jsx";

const API = "http://localhost:3000";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]); // roots with children
  const [expandedRootId, setExpandedRootId] = useState(null); // 手風琴
  const [brandFilters, setBrandFilters] = useState([]); // 子目錄內出現過的品牌
  const [selectedBrand, setSelectedBrand] = useState("");

  // 車型（摘要與取消在 VehicleFilter 裡顯示）
  const [vehicle, setVehicle] = useState(() => {
    const v = {};
    if (searchParams.get("year")) v.year = Number(searchParams.get("year"));
    if (searchParams.get("makeId")) v.makeId = Number(searchParams.get("makeId"));
    if (searchParams.get("modelId")) v.modelId = Number(searchParams.get("modelId"));
    if (searchParams.get("variantId")) v.variantId = Number(searchParams.get("variantId"));
    v.makeName = searchParams.get("makeName") || "";
    v.modelName = searchParams.get("modelName") || "";
    v.variantName = searchParams.get("variantName") || "";
    return v;
  });

  // 類別選擇
  const [rootId, setRootId] = useState(null);
  const [childId, setChildId] = useState(null);
  const [childName, setChildName] = useState("");

  // 購物車抽屜
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartCount, setCartCount] = useState(getCartCount());

  useEffect(() => {
    refreshParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId, childId, selectedBrand, vehicle?.variantId]);

  useEffect(() => {
    fetch(`${API}/categories/tree`)
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  function refreshParts() {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(searchParams.get("page") || 1));
    qs.set("pageSize", "20");
    if (childName) qs.set("category", childName);
    if (selectedBrand) qs.set("brand", selectedBrand);
    if (vehicle?.variantId) qs.set("variantId", String(vehicle.variantId));

    fetch(`${API}/parts?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setParts(arr);
        const brands = [...new Set(arr.map(p => (p.brand || "").trim()).filter(Boolean))];
        setBrandFilters(brands);
      })
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }

  function onVehicleChange(next) {
    setVehicle(next);
    const sp = new URLSearchParams(searchParams);
    ["year","makeId","modelId","variantId","makeName","modelName","variantName"].forEach(k=>{
      if (next[k]) sp.set(k, String(next[k])); else sp.delete(k);
    });
    setSearchParams(sp, { replace: true });
  }

  // 手風琴展開/收合（只展開一個 root）
  function toggleRoot(root) {
    setExpandedRootId(expandedRootId === root.id ? null : root.id);
    setRootId(root.id);
    setChildId(null);
    setChildName("");
    setSelectedBrand("");
  }

  function pickChild(root, child) {
    setChildId(child.id);
    setChildName(child.name);
    setSelectedBrand("");
    if (expandedRootId !== root.id) setExpandedRootId(root.id);
  }

  // 產生「適用車型」摘要（只有在已選 variantId 才會回傳字串）
  function vehicleSummary(v) {
    if (!v || !v.variantId) return "";
    // 只把有值的串起來，避免多餘空白
    return [v.year, v.makeName, v.modelName, v.variantName].filter(Boolean).join(" ");
  }

  function joinCart(p) {
    const summary = vehicleSummary(vehicle); // 若未選車型會是空字串
    addToCart({
      id: p.id,
      name: p.name,
      price: computePrice(p),
      qty: 1,
      image_url: p.image_url || "",
      meta: {
        brand: p.brand || "",
        category: p.category || "",
        // ✅ 只有「已選車型」才寫入，否則不放這個欄位
        ...(summary ? { vehicle: summary } : {})
      }
    });
    setCartCount(getCartCount());
    setDrawerOpen(true);
  }

  function computePrice(p) {
    // 經銷商系統：優先批發，否則退回 MSRP
    const w = Number.isFinite(Number(p.wholesale_twd)) ? Number(p.wholesale_twd) : null;
    const m = Number.isFinite(Number(p.msrp_twd)) ? Number(p.msrp_twd) : null;
    return w ?? m ?? 0;
  }

  // 詳情路由仍保留（圖片/名稱可以點入產品頁；若完全不需要詳情，將 Link 換成 div）
  function productLink(p) {
    return p?.sku ? `/p/${encodeURIComponent(p.sku)}` : `/pid/${encodeURIComponent(p.id)}`;
  }

  return (
    <div className="shop-page">
      {/* 頂部：Logo + 車型選擇 */}
      <div className="shop-top">
        <img src="/images/Top_logo_684x190.webp" alt="logo" className="shop-logo" />
        <div className="shop-vehicle">
          <VehicleFilter value={vehicle} onChange={onVehicleChange} />
        </div>
      </div>

      <div className="shop-body">
        {/* 左：目錄（手風琴） */}
        <aside className="shop-cats">
          <div className="cats-title">目錄</div>
          <div className="cats-list">
            {categories.map(root => (
              <div key={root.id} className="cat-root">
                <button
                  className={`cat-root-btn ${expandedRootId === root.id ? "is-open" : ""}`}
                  onClick={() => toggleRoot(root)}
                >
                  {root.name}
                  <span className="arrow">{expandedRootId === root.id ? "▾" : "▸"}</span>
                </button>
                {expandedRootId === root.id && (
                  <div className="cat-children">
                    {(root.children || []).map(child => (
                      <button
                        key={child.id}
                        className={`cat-child-btn ${childId === child.id ? "active" : ""}`}
                        onClick={() => pickChild(root, child)}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 二次篩選：品牌 */}
          {childName && brandFilters.length > 0 && (
            <div className="brand-filter">
              <div className="brand-title">品牌</div>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="brand-select"
              >
                <option value="">全部</option>
                {brandFilters.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
        </aside>

        {/* 右：商品清單 */}
        <section className="shop-list">
          {loading && <div className="p-4">Loading…</div>}
          {!loading && parts.length === 0 && <div className="p-4">目前沒有符合篩選的商品</div>}

          <div className="cards">
            {parts.map(p => (
              <div key={p.id} className="card">
                {/* 圖片可點（如不需要詳情，改成 <div className="card-img-wrap">…） */}
                <Link to={productLink(p)} className="card-img-wrap" title={p.name}>
                  <img
                    src={p.image_url || "/images/placeholder.png"}
                    alt={p.name}
                    className="card-img"
                    loading="lazy"
                  />
                </Link>

                <div className="card-body">
                  {/* 名稱也可點（如不需要詳情，這行改成 <div className="card-name">{p.name}</div>） */}
                  <Link to={productLink(p)} className="card-name" title={p.name}>
                    {p.name}
                  </Link>

                  {renderAvailability(p)}
                  <div className="card-price">NT$ {toCurrency(computePrice(p))}</div>

                  <div className="card-actions">
                    <button className="btn-primary" onClick={() => joinCart(p)}>加入購物車</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="list-footer">共 {parts.length} 件</div>
        </section>
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function toCurrency(n) {
  const v = Number(n || 0);
  return v.toLocaleString("zh-TW");
}

function renderAvailability(p) {
  const mode = (p.availability_mode || "").toLowerCase();
  const qty = Number(p.stock_qty || 0);
  const lead = Number(p.lead_time_days || 0);
  if (mode === "stock") return <div className="card-availability">商品狀態：現貨（庫存 {qty}）</div>;
  if (mode === "lead")  return <div className="card-availability">商品狀態：備貨（約 {lead} 天）</div>;
  if (mode === "mto")   return <div className="card-availability">商品狀態：接單生產</div>;
  return null;
}
