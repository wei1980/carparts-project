import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import VehicleFilter from "./VehicleFilter.jsx";
import CartDrawer, { addToCart, getCartCount } from "./CartDrawer.jsx";

function computePrice(p) {
  const w = Number(p.wholesale_price || 0);
  const m = Number(p.msrp_price || 0);
  return w > 0 ? w : m;
}

function toCurrency(n) {
  return Number(n || 0).toLocaleString("zh-TW");
}

function productLink(p) {
  return p.sku ? `/p/${encodeURIComponent(p.sku)}` : `/pid/${p.id}`;
}

function renderAvailability(p) {
  const mode = (p.availability_mode || "").toLowerCase();
  const qty = Number(p.stock_qty || 0);
  const leadWeeks = Number(p.lead_time_days || 0);
  if (qty > 0 || mode === "stock") return <div className="text-xs font-bold text-green-600">✅ 現貨</div>;
  if (leadWeeks > 0) return <div className="text-xs font-bold text-orange-500">⏳ 預訂 ({leadWeeks}週)</div>;
  return <div className="text-xs font-bold text-red-500">❌ 電洽</div>;
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState("");
  const PAGE_SIZE = 20;
  const [vehicle, setVehicle] = useState({ makeId: "", modelId: "", year: "", variantId: "", summary: "" });
  const [sortBy, setSortBy] = useState("skuAsc");
  const [categories, setCategories] = useState([]);

  // 目前展開的主目錄 ID（一次只展開一個）
  const [activeMainId, setActiveMainId] = useState(null);

  // 目前選中的子目錄 ID（從 URL 取得）
  const currentSubId = searchParams.get("subcategoryId");
  const currentCatId = searchParams.get("categoryId");

  // 找出目前選中的主目錄 ID
  const activeMainFromUrl = categories.find(c => c.subcategories?.some(sc => String(sc.id) === currentSubId))?.id || null;

  useEffect(() => {
    fetch("/categories/tree")
      .then(r => r.json())
      .then(data => {
        setCategories(data);
        // 如果 URL 有 subcategoryId，自動展開對應的主目錄
        if (currentSubId) {
          const parent = data.find(c => c.subcategories?.some(sc => String(sc.id) === currentSubId));
          if (parent) setActiveMainId(parent.id);
        }
      })
      .catch(err => console.error("分類載入失敗:", err));
  }, [currentSubId]);

  // 點擊主目錄：展開/收合
  const handleMainClick = (id) => {
    if (activeMainId === id) {
      setActiveMainId(null);
      // 收合時回到全部目錄
      setSearchParams({});
    } else {
      setActiveMainId(id);
      setSearchParams({});
    }
  };

  // 點擊子目錄
  const handleSubClick = (id) => {
    setSearchParams({ subcategoryId: id });
    // 自動展開對應主目錄
    const parent = categories.find(c => c.subcategories?.some(sc => String(sc.id) === id));
    if (parent) setActiveMainId(parent.id);
  };

  // 判斷子目錄是否為當前選中
  const isActiveSub = (sc) => String(sc.id) === currentSubId;

  // 判斷主目錄是否被選中（有子目錄被選中）
  const isActiveMain = (c) => c.subcategories?.some(sc => String(sc.id) === currentSubId);

  // 判斷主目錄是否展開
  const isExpanded = (c) => activeMainId === c.id;

  const fetchParts = useCallback(async (v, s, pg) => {
    setLoading(true); setError("");
    try {
      const { variantId, makeId, modelId, year } = v;
      const catId = searchParams.get("categoryId");
      const subId = searchParams.get("subcategoryId");
      let url = `/parts?page=${pg}&pageSize=${PAGE_SIZE}`;
      if (s) url += `&sort=${s}`;
      if (variantId) url += `&variantId=${variantId}`;
      else {
        if (makeId) url += `&makeId=${encodeURIComponent(makeId)}`;
        if (modelId) url += `&modelId=${encodeURIComponent(modelId)}`;
        if (year) url += `&year=${year}`;
      }
      if (subId) url += `&subcategoryId=${subId}`;
      else if (catId) url += `&categoryId=${catId}`;
      const r = await fetch(url);
      if (r.status === 429) throw new Error("查詢配額已滿，請聯繫業務。");
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`伺服器錯誤 (HTTP ${r.status}): ${errText.slice(0, 100)}`);
      }
      const d = await r.json();
      setParts(d.items || d.data || []);
      setTotal(d.total || d.meta?.total || 0);
    } catch (e) { console.error(e); setError(String(e)); setParts([]); setTotal(0); }
    finally { setLoading(false); }
  }, [searchParams]);

  useEffect(() => { setPage(1); fetchParts(vehicle, sortBy, 1); }, [vehicle, sortBy, searchParams, fetchParts]);

  const handlePageChange = (pg) => { setPage(pg); fetchParts(vehicle, sortBy, pg); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleJumpToPage = (e) => {
    e.preventDefault();
    const p = Number(jumpPage);
    if (p > 0 && p <= Math.ceil(total / PAGE_SIZE)) { handlePageChange(p); setJumpPage(""); }
  };
  const joinCart = (p) => addToCart({ id: p.id, sku: p.sku, name: p.name, price: computePrice(p), qty: 1, meta: { brand: p.brand, vehicle: vehicle.summary || "" } });

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/shop" className="text-xl font-bold text-gray-800">零件批發平台</Link>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-blue-600">⚙️ 後台管理</Link>
          </div>
          <button onClick={() => setDrawerOpen(true)} className="relative bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
            🛒
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{getCartCount()}</span>
          </button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100">
          <VehicleFilter value={vehicle} onChange={setVehicle} />
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          {/* 分類側邊欄 */}
          <aside className="w-full md:w-52 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <div className="p-3 font-bold bg-gray-50 border-b text-gray-700 text-sm">分類</div>
              <ul className="divide-y divide-gray-100">
                {categories.map(c => {
                  const expanded = isExpanded(c);
                  const active = isActiveMain(c);
                  return (
                    <li key={c.id}>
                      {/* 主目錄：永遠顯示，點擊展開/收合 */}
                      <button
                        onClick={() => handleMainClick(c.id)}
                        className={`w-full text-left p-3 flex justify-between items-center transition text-sm font-medium
                          ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 hover:text-blue-700'}
                          ${expanded ? 'bg-gray-100' : ''}
                        `}
                      >
                        <span className="truncate">{c.name}</span>
                        {c.subcategories && c.subcategories.length > 0 && (
                          <span className={`text-xs transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                            {active ? '▶' : '▶'}
                          </span>
                        )}
                      </button>

                      {/* 子目錄：展開時顯示 */}
                      {expanded && c.subcategories && c.subcategories.length > 0 && (
                        <ul className="bg-gray-50 border-t border-gray-100">
                          {c.subcategories.map(sc => {
                            const subActive = isActiveSub(sc);
                            return (
                              <li key={sc.id}>
                                <button
                                  onClick={() => handleSubClick(sc.id)}
                                  className={`w-full text-left px-4 py-2 text-xs transition
                                    ${subActive
                                      ? 'bg-blue-100 text-blue-700 font-bold border-l-4 border-blue-600'
                                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                                    }
                                  `}
                                >
                                  {sc.name}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* 右側：商品列表區 */}
          <section className="flex-1">
            {/* 列表控制列 */}
            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="text-gray-600 text-sm">
                共 {total} 個零件
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">排序:</span>
                <select
                  className="border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="skuAsc">料號 (A-Z)</option>
                  <option value="skuDesc">料號 (Z-A)</option>
                  <option value="priceAsc">價格 (低至高)</option>
                  <option value="priceDesc">價格 (高至低)</option>
                </select>
              </div>
            </div>

            {/* 錯誤顯示 */}
            {error && <div className="text-red-500 p-8 text-center bg-red-50 rounded-lg mb-6 border border-red-100">錯誤: {error}</div>}

            {/* 載入中動畫 */}
            {loading && !error && (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                載入中...
              </div>
            )}

            {/* 無資料狀態 */}
            {!loading && !error && parts.length === 0 && (
              <div className="p-16 text-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100 border-dashed">
                <div className="text-xl mb-2">查無商品</div>
                <Link to="/shop" className="text-blue-500 hover:underline">清除所有篩選</Link>
              </div>
            )}

            {/* 商品網格 */}
            {!loading && parts.length > 0 && (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {parts.map((p) => {
                    const msrp = Number(p.msrp_price || 0);
                    const wholesale = Number(p.wholesale_price || 0);
                    const showMsrp = msrp > 0;
                    const showPrice = msrp > 0 || wholesale > 0;

                    return (
                      <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition flex flex-col group">
                        <div className="h-40 bg-[#1E293B] border-b border-gray-100 p-2.5 flex items-center justify-center relative">
                          <Link to={productLink(p)} className="absolute inset-2.5 flex items-center justify-center">
                            <img
                              src={p.image_url || '/placeholder.jpg'}
                              alt={p.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }}
                            />
                          </Link>
                        </div>
                        <div className="p-3 flex-grow flex flex-col">
                          <h4 className="font-bold mb-2 line-clamp-2 text-sm leading-tight">
                            <Link to={productLink(p)} className="hover:text-blue-600">{p.name}</Link>
                          </h4>
                          <div className="mt-auto pt-2 border-t flex justify-between items-end">
                            <div className="flex flex-col gap-1">
                              <div className="text-xs text-gray-400">
                                {showMsrp ? (
                                  <span className="line-through">定價: ${msrp.toLocaleString()}</span>
                                ) : (
                                  <span>定價: 未定價</span>
                                )}
                              </div>
                              <div className="text-lg font-bold text-red-600">
                                批發: ${wholesale > 0 ? wholesale.toLocaleString() : "-"}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {renderAvailability(p)}
                              {showPrice ? (
                                <button onClick={() => joinCart(p)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition shadow-sm">
                                  + 加入
                                </button>
                              ) : (
                                <button disabled className="bg-gray-300 text-white px-3 py-1 rounded text-xs font-medium cursor-not-allowed">
                                  請洽客服
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                })}
              </div>
            )}

            {/* 底部導覽分頁 */}
            {!loading && parts.length > 0 && total > PAGE_SIZE && (
              <div className="flex justify-center items-center gap-2 mt-8 mb-4">
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="px-4 py-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一頁
                </button>
                <span className="px-4 text-gray-600">
                  第 {page} / {Math.ceil(total / PAGE_SIZE)} 頁
                </span>
                <button
                  disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  onClick={() => handlePageChange(page + 1)}
                  className="px-4 py-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一頁
                </button>

                <form onSubmit={handleJumpToPage} className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-500">前往</span>
                  <input
                    type="number"
                    min="1"
                    max={Math.ceil(total / PAGE_SIZE)}
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    placeholder="頁碼"
                    className="w-16 border rounded px-2 py-1 text-center text-sm"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200"
                  >
                    GO
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 購物車側邊抽屜 */}
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}