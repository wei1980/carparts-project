import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import VehicleFilter from "./VehicleFilter.jsx";
import CartDrawer, { addToCart, getCartCount } from "./CartDrawer.jsx";

// 助手函數：取得價格
function computePrice(p) {
  return Number(p.wholesale_twd || p.msrp_twd || 0);
}

// 助手函數：價格格式化
function toCurrency(n) {
  const v = Number(n || 0);
  return v.toLocaleString("zh-TW");
}

// 助手函數：產生商品連結
function productLink(p) {
  return p.sku ? `/p/${encodeURIComponent(p.sku)}` : `/pid/${p.id}`;
}

// 助手函數：渲染商品狀態
function renderAvailability(p) {
  const mode = (p.availability_mode || "").toLowerCase();
  const qty = Number(p.stock_qty || 0);
  const leadWeeks = Number(p.lead_time_days || 0); 
  
  if (qty > 0 || mode === "stock") {
    return <div className="text-xs font-bold text-green-600 mt-1">✅ 現貨（庫存 {qty}）</div>;
  }
  if (leadWeeks > 0) {
    return <div className="text-xs font-bold text-orange-500 mt-1">⏳ 預訂（約 {leadWeeks} 週後出貨）</div>;
  }
  return <div className="text-xs font-bold text-red-500 mt-1">❌ 電洽</div>;
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [expandedRootId, setExpandedRootId] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState("skuAsc");
  const [cartCount, setCartCount] = useState(0);

  // 車型狀態
  const [vehicle, setVehicle] = useState(() => ({
    variantId: searchParams.get("variantId") || null,
    summary: searchParams.get("summary") || "",
  }));

  // 從 URL 取得目前的分類狀態 (區分主/子)
  const activeCatId = searchParams.get("categoryId");
  const activeSubId = searchParams.get("subcategoryId");

  // 1. 載入零件列表
  const fetchParts = useMemo(() => {
    return async (currentVehicle, currentSortBy) => {
      setLoading(true);
      setError("");
      try {
        const variantId = currentVehicle.variantId;
        
        // 取得目前的分類參數
        const catId = searchParams.get("categoryId"); 
        const subId = searchParams.get("subcategoryId"); 

        let url = `/parts?page=1&limit=20`;
        
        if (currentSortBy) url += `&sort=${currentSortBy}`;
        if (variantId) url += `&variantId=${variantId}`;
        
        // ⚠️ 關鍵修正：區分傳送 subcategoryId 或 categoryId
        // 後端 API 若同時收到兩者，通常會優先處理子目錄，或我們在此只送一個最精確的
        if (subId) {
            url += `&subcategoryId=${subId}`;
        } else if (catId) {
            url += `&categoryId=${catId}`;
        }

        const r = await fetch(url);
        if (r.status === 429) throw new Error("查詢配額已滿，請聯繫業務。"); 
        if (!r.ok) throw new Error("載入零件列表失敗");
        
        const resData = await r.json();
        
        if (resData.items) {
            setParts(resData.items);
            setTotal(resData.total || 0);
        } else if (resData.data) { 
            setParts(resData.data);
            setTotal(resData.meta?.total || 0);
        } else {
            setParts([]);
            setTotal(0);
        }
      } catch (e) {
        setError(String(e.message || e)); 
        setParts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
  }, [searchParams]);

  useEffect(() => {
    fetchParts(vehicle, sortBy);
  }, [vehicle, sortBy, fetchParts]); 

  // 2. 載入分類樹 & 自動展開
  useEffect(() => {
    async function loadCategories() {
      try {
        const r = await fetch(`/categories/tree`);
        if (!r.ok) throw new Error("載入分類失敗");
        const data = await r.json();
        setCategories(data || []);

        // ⚠️ 自動展開邏輯：如果目前選中了子目錄，要自動展開對應的主目錄
        const currentSubId = searchParams.get("subcategoryId");
        if (currentSubId && data.length > 0) {
            const parent = data.find(root => root.subcategories?.some(sub => String(sub.id) === currentSubId));
            if (parent) setExpandedRootId(parent.id);
        }
      } catch (e) {
        console.error("Category load error:", e);
      }
    }

    loadCategories();
    setCartCount(getCartCount());
  }, []); // 只在初次載入時執行

  // 3. 處理分類點擊 (修正 ID 衝突的核心)
  const handleCategoryClick = (id, type) => {
    setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        
        // 重置頁碼
        newParams.delete("page");

        if (type === 'main') {
            // 點擊主目錄：設定 categoryId，清除 subcategoryId
            // 如果點擊的是「目前已選中」的主目錄 -> 取消選取 (Toggle)
            if (newParams.get("categoryId") === String(id) && !newParams.get("subcategoryId")) {
                newParams.delete("categoryId");
            } else {
                newParams.set("categoryId", id);
                newParams.delete("subcategoryId"); // 清除子目錄選取
            }
            
            // UI 展開控制
            setExpandedRootId(prevId => prevId === id ? null : id);

        } else if (type === 'sub') {
            // 點擊子目錄：設定 subcategoryId
            // 為了乾淨網址與避免衝突，我們刪除 categoryId，靠 expandedRootId 維持展開
            if (newParams.get("subcategoryId") === String(id)) {
                newParams.delete("subcategoryId"); // 取消選取
            } else {
                newParams.set("subcategoryId", id);
                newParams.delete("categoryId"); 
            }
        }
        
        return newParams;
    }, { replace: true });
  };
  
  const handleVehicleChange = (newVehicle) => {
    setVehicle(newVehicle);
    setSearchParams(prev => {
        if (newVehicle.variantId) {
            prev.set("variantId", newVehicle.variantId);
            prev.set("summary", newVehicle.summary);
        } else {
            prev.delete("variantId");
            prev.delete("summary");
        }
        return prev;
    }, { replace: true });
  };

  const joinCart = (p) => {
    addToCart({ 
        id: p.id, sku: p.sku, name: p.name, 
        price: computePrice(p), qty: 1, 
        meta: { vehicle: vehicle.summary, brand: p.brand_name || p.brand } 
    });
    setCartCount(getCartCount());
    setDrawerOpen(true);
  }

  // 4. 渲染分類導航 (樣式邏輯修正)
  const renderCategoryNav = () => {
    return (
        <div style={{ padding: "16px 0", borderRight: "1px solid #eee", minWidth: 200 }}>
            <h3 style={{ fontSize: "1.2em", marginBottom: "16px", padding: "0 16px" }}>零件分類</h3>
            
            {categories.length === 0 && (
                <div style={{ padding: "0 16px", color: "#888", fontSize: "0.9em" }}>(暫無分類資料)</div>
            )}

            {categories.map(root => {
                // 主目錄是否啟用：必須 categoryId 吻合 且 沒有選子目錄
                const isMainActive = activeCatId === String(root.id) && !activeSubId;
                
                return (
                <div key={root.id}>
                    <button 
                        onClick={() => handleCategoryClick(root.id, 'main')}
                        style={{ 
                            width: "100%", textAlign: "left", padding: "8px 16px", 
                            // 樣式：如果選中變藍色，否則根據是否展開變灰色
                            backgroundColor: isMainActive ? "#e0f7fa" : (expandedRootId === root.id ? "#f5f5f5" : "white"),
                            color: isMainActive ? "#006064" : "inherit",
                            border: "none", cursor: "pointer", fontWeight: "bold",
                            transition: "background-color 0.2s",
                            display: "flex", justifyContent: "space-between"
                        }}
                    >
                        {root.name}
                        {root.subcategories && root.subcategories.length > 0 && (
                            <span style={{ fontSize: "0.8em", color: "#888" }}>
                                {expandedRootId === root.id ? "▼" : "▶"}
                            </span>
                        )}
                    </button>
                    
                    {/* 子目錄區塊 */}
                    {root.subcategories && expandedRootId === root.id && (
                        <div style={{ paddingLeft: "16px", borderLeft: isMainActive ? "3px solid #00bcd4" : "3px solid transparent" }}>
                            {root.subcategories.map(child => {
                                // 子目錄是否啟用：只看 subcategoryId
                                const isSubActive = activeSubId === String(child.id);

                                return (
                                <button
                                    key={child.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCategoryClick(child.id, 'sub');
                                    }}
                                    style={{
                                        width: "100%", textAlign: "left", padding: "6px 16px", fontSize: "0.9em",
                                        backgroundColor: isSubActive ? "#e0f7fa" : "white",
                                        color: isSubActive ? "#007bff" : "#555",
                                        fontWeight: isSubActive ? "bold" : "normal",
                                        border: "none", cursor: "pointer",
                                    }}
                                >
                                    {child.name}
                                </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            )})}
        </div>
    );
  };

  return (
    <div className="shop-page" style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>零件批發平台</h1>

      <VehicleFilter value={vehicle} onChange={handleVehicleChange} compact={true} />
      
      {vehicle.variantId && (
        <div style={{ marginTop: 20, padding: 12, backgroundColor: "#f0f8ff", border: "1px solid #cce5ff", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
            🚗 <strong style={{color: "#0056b3"}}>目前車型:</strong> {vehicle.summary}
            <button onClick={() => handleVehicleChange({ variantId: null, summary: "" })} style={{ marginLeft: 20, padding: "4px 8px", background: "#fff", border: "1px solid #ccc", borderRadius: 4 }}>
                [取消/更換]
            </button>
        </div>
      )}

      <div style={{ display: "flex", marginTop: 20, gap: 20 }}>
        {renderCategoryNav()}

        <div style={{ flexGrow: 1 }}>
          <section style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
             <div className="text-gray-600">
                {vehicle.variantId ? `共找到 ${total} 個適用零件` : `全站共 ${total} 個零件`}
             </div>
             <div>
                <label className="text-sm text-gray-500 mr-2">排序:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded px-2 py-1">
                    <option value="skuAsc">料號 (A-Z)</option>
                    <option value="priceAsc">價格 (低到高)</option>
                    <option value="priceDesc">價格 (高到低)</option>
                </select>
            </div>
          </section>

          <section>
            {loading && <div className="text-center py-10">載入中...</div>}
            {error && <div className="text-center py-10 text-red-500">錯誤: {error}</div>}
            
            {!loading && parts.length === 0 && (
                <div className="text-center py-16 bg-gray-50 rounded border border-dashed">
                    <p className="text-gray-500 mb-2">查無商品</p>
                    <button onClick={() => setSearchParams({})} className="text-blue-600 underline text-sm">清除所有篩選</button>
                </div>
            )}
            
            {!loading && parts.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {parts.map(p => (
                  <div key={p.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md flex flex-col">
                    <Link to={productLink(p)} className="block relative h-48 bg-gray-200">
                        <img src={p.image_url || '/placeholder.jpg'} onError={(e)=>e.target.src='https://via.placeholder.com/300?text=No+Image'} alt={p.name} className="w-full h-full object-cover" />
                    </Link>
                    <div className="p-4 flex-grow flex flex-col">
                        <div className="text-xs text-gray-500 mb-1">{p.sku} | {p.brand_name || p.brand}</div>
                        <h4 className="font-bold mb-2 line-clamp-2"><Link to={productLink(p)}>{p.name}</Link></h4>
                        <div className="mb-3">{renderAvailability(p)}</div>
                        <div className="mt-auto pt-3 border-t flex justify-between items-center">
                            <div className="text-xl font-bold text-red-600">NT$ {toCurrency(computePrice(p))}</div>
                            <button onClick={() => joinCart(p)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">
                                + 加入
                            </button>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}