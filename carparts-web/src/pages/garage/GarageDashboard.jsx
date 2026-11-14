// src/pages/garage/GarageDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { garageClient as api } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';
import GarageNav from '../../components/GarageNav';

export default function GarageDashboard() {
  const navigate = useNavigate();
  
  // 車廠基本狀態
  const [search, setSearch] = useState('');
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  // 🔍 搜尋結果的例外 / 分頁（後端有 pagination，但前端先前沒有任何換頁控制）
  const [partsError, setPartsError] = useState('');
  const [partsPage, setPartsPage] = useState(1);
  const [partsTotalPages, setPartsTotalPages] = useState(0);
  const [partsTotal, setPartsTotal] = useState(0);
  const PARTS_PAGE_SIZE = 24;
  
  // 🟢 商品彈窗狀態
  const [selectedPart, setSelectedPart] = useState(null);

  // 🆕 B2B 採購車（localStorage 暫存，送出後寫入資料庫）
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('garagePurchaseCart') || '[]'); } catch { return []; }
  });
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [poOrders, setPoOrders] = useState([]);
  const [poPagination, setPoPagination] = useState(null);
  const [poPage, setPoPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  // 🔁 最近採購（回購快捷列）
  const [recentParts, setRecentParts] = useState([]);

  const loadRecentParts = () => {
    api.get('/garage/purchase-orders/recent-parts?limit=6').then(res => setRecentParts(res.data.items || []))
      .catch(() => setRecentParts([])); // 無歷史或失敗 → 不顯示快捷列
  };

  const saveCart = (next) => {
    setCart(next);
    localStorage.setItem('garagePurchaseCart', JSON.stringify(next));
  };

  const addToPurchaseCart = (part) => {
    const existing = cart.find(c => c.part_id === part.id);
    if (existing) {
      saveCart(cart.map(c => c.part_id === part.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      saveCart([...cart, {
        part_id: part.id,
        name: part.name,
        brand: part.brand,
        sku: part.sku,
        price: Number(part.wholesale_price || 0),
        image_url: part.image_url,
        stock_qty: part.stock_qty || 0,
        qty: 1,
      }]);
    }
    setSelectedPart(null);
  };

  const updateCartQty = (partId, qty) => {
    if (qty < 1) return saveCart(cart.filter(c => c.part_id !== partId));
    saveCart(cart.map(c => c.part_id === partId ? { ...c, qty } : c));
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  // 🆕 送出採購單
  const submitPurchaseOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post('/garage/purchase-orders', {
        items: cart.map(c => ({ part_id: c.part_id, qty: c.qty })),
      });
      toast.success(`✅ ${res.data.message}\n採購單編號：${res.data.po_number}\n總金額：NT$ ${Number(res.data.total_amount).toLocaleString()}` +
        (res.data.preorder_items > 0 ? `\n🚢 其中 ${res.data.preorder_items} 項為代購（缺貨）` : ''), { duration: 5000 });
      saveCart([]);
      setShowCart(false);
      loadPoOrders(1);
      loadRecentParts(); // 🔁 下單後刷新回購快捷列
    } catch (err) {
      toast.error('送出失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // 🆕 載入我的採購單
  const loadPoOrders = (p = poPage) => {
    api.get('/garage/purchase-orders', {
      params: { page: p, pageSize: 10 },
    }).then(res => {
      setPoOrders(res.data.orders || []);
      setPoPagination(res.data.pagination || null);
    }).catch(err => console.warn('載入採購單失敗:', err?.message || err));
  };

  // 🆕 取消採購單
  const cancelPo = async (order) => {
    if (!(await confirmDialog({ message: `確定取消採購單 #${order.po_number}？` }))) return;
    try {
      await api.patch(`/garage/purchase-orders/${order.id}/cancel`, {});
      loadPoOrders();
    } catch (err) {
      toast.error('取消失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 確認收貨
  const completePo = async (order) => {
    try {
      await api.patch(`/garage/purchase-orders/${order.id}/complete`, {});
      loadPoOrders();
      toast.success(`✅ 採購單 ${order.po_number} 已確認收貨`);
    } catch (err) {
      toast.error('操作失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const PO_STATUS_MAP = {
    SUBMITTED: { label: '待平台確認', cls: 'text-yellow-400 bg-yellow-900/30' },
    CONFIRMED: { label: '備貨中', cls: 'text-blue-400 bg-blue-900/30' },
    SHIPPED:   { label: '已出貨', cls: 'text-cyan-400 bg-cyan-900/30' },
    COMPLETED: { label: '已完成', cls: 'text-green-400 bg-green-900/30' },
    CANCELLED: { label: '已取消', cls: 'text-red-400 bg-red-900/30' },
  };

  // 車廠專屬 4 層下拉選單 (車輛)
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');

  // 🟢 新增：目錄分類下拉選單
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  // 🆕 預約列表（接 /api/garage/appointments）
  const [appointments, setAppointments] = useState([]);
  const loadAppointments = () => {
    api.get('/garage/appointments').then(res => setAppointments(res.data)).catch(err => console.warn('載入失敗:', err?.message || err));
  };
  useEffect(loadAppointments, []);
  useEffect(() => { loadRecentParts(); }, []); // 🔁 初始載入回購快捷列

  // 儀表板統計
  const pendingCount = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length;
  const todayCount = appointments.filter(a =>
    new Date(a.scheduled_at).toDateString() === new Date().toDateString() &&
    !['CANCELLED', 'COMPLETED'].includes(a.status)
  ).length;

  // 🆕 車廠更新預約狀態（接單 / 拒絕 / 到店 / 開工 / 完工）
  const [updatingId, setUpdatingId] = useState(null);
  const updateApptStatus = async (id, status) => {
    const labels = { CONFIRMED: '接受此預約', CANCELLED: '拒絕此預約', ARRIVED: '標記車主已到店', IN_PROGRESS: '開始施工', COMPLETED: '標記完工' };
    if (!(await confirmDialog({ message: `確定要${labels[status] || '更新狀態'}嗎？` }))) return;
    setUpdatingId(id);
    try {
      await api.patch(`/garage/appointments/${id}`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast.success(labels[status] ? `${labels[status]}完成` : '狀態已更新');
    } catch (err) {
      toast.error(err.response?.data?.error || '更新失敗，請重試');
    } finally {
      setUpdatingId(null);
    }
  };

  // 🆕 報價/提議時間 Modal
  const [quoteAppt, setQuoteAppt] = useState(null);
  const openQuoteForm = (a) => setQuoteAppt(a);

  // 載入年份
  useEffect(() => {
    api.get('/vehicles/years')
      .then(res => setYears(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
  }, []);

  // 載入目錄分類樹
  useEffect(() => {
    api.get('/categories/tree')
      .then(res => setCategories(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
  }, []);

  // 年份 -> 廠牌
  useEffect(() => {
    if (selectedYear) {
      setSelectedMake(''); setSelectedModel(''); setSelectedVariant('');
      setMakes([]); setModels([]); setVariants([]);
      api.get(`/vehicles/makes?year=${selectedYear}`)
        .then(res => setMakes(res.data))
        .catch(err => console.warn('載入失敗:', err?.message || err));
    }
  }, [selectedYear]);

  // 廠牌 -> 車型
  useEffect(() => {
    if (selectedYear && selectedMake) {
      setSelectedModel(''); setSelectedVariant(''); setModels([]); setVariants([]);
      api.get(`/vehicles/models?make=${selectedMake}&year=${selectedYear}`)
        .then(res => setModels(res.data))
        .catch(err => console.warn('載入失敗:', err?.message || err));
    }
  }, [selectedMake]);

  // 車型 -> 引擎/世代
  useEffect(() => {
    if (selectedYear && selectedMake && selectedModel) {
      setSelectedVariant(''); setVariants([]);
      api.get(`/vehicles/variants?make=${selectedMake}&model=${selectedModel}&year=${selectedYear}`)
        .then(res => setVariants(res.data))
        .catch(err => console.warn('載入失敗:', err?.message || err));
    }
  }, [selectedModel]);

  // 🟢 當主分類變更時，重置子分類
  const handleCategoryChange = (catName) => {
    setSelectedCategory(catName);
    setSelectedSubcategory('');
  };
  const currentCategory = categories.find(c => c.name === selectedCategory);
  const subcategories = currentCategory?.subcategories || [];

  // 🟢 車廠的精準零件搜尋功能 (加入分類篩選)
  const handleGarageSearch = async (page = 1) => {
    if (!selectedVariant && !search && !selectedCategory) {
      toast.error('請選擇引擎/世代、目錄分類，或輸入關鍵字進行搜尋。');
      return;
    }
    setLoading(true);
    setPartsError('');
    try {
      const params = { page, pageSize: PARTS_PAGE_SIZE };
      if (selectedVariant) params.variantId = selectedVariant;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;
      if (search) params.search = search;

      const res = await api.get('/parts/recommended', { params });
      setParts(res.data.parts || []);
      setPartsPage(page);
      setPartsTotal(res.data.pagination?.total || 0);
      setPartsTotalPages(res.data.pagination?.pages || 0);
    } catch (err) {
      // ⚠️ 載入失敗必須讓使用者看到，不能只 console.error 然後顯示「查無零件」
      console.error('搜尋失敗:', err);
      setParts([]);
      setPartsError(err?.response?.data?.error || '零件搜尋失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      
      {/* ========== 共用頂部導覽（手機版收進漢堡選單） ========== */}
      <GarageNav
        active="dashboard"
        right={
          <>
            <button
              type="button"
              onClick={() => { setShowOrders(true); loadPoOrders(1); }}
              aria-label="我的採購單"
              title="我的採購單"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4.5M9 8h6M7.5 3.75h9A2.25 2.25 0 0118.75 6v12A2.25 2.25 0 0116.5 20.25h-9A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowCart(true)}
              aria-label="採購車"
              title="採購車"
              className="relative inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="hidden sm:inline">採購車</span>
              {cart.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                  {cart.reduce((s, c) => s + c.qty, 0)}
                </span>
              )}
            </button>
          </>
        }
      />

      {/* ========== 主體內容 ========== */}
      <main className="p-4 sm:p-8 max-w-7xl mx-auto">
        
        {/* 預約儀表板 */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-6">
          <div className="rounded-xl bg-blue-600 p-4 shadow-lg sm:p-6">
            <p className="text-xs text-blue-100 sm:text-base">待處理預約</p>
            <p className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">{pendingCount}</p>
          </div>
          <div className="rounded-xl bg-green-600 p-4 shadow-lg sm:p-6">
            <p className="text-xs text-green-100 sm:text-base">今日預約</p>
            <p className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">{todayCount}</p>
          </div>
        </div>

        {/* B2B 零件採購區 */}
        <div className="bg-surface-800 p-6 rounded-2xl border border-surface-700/50 shadow-lg mb-8">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          🔧 B2B 零件採購
        </h3>

        {/* 🔁 最近採購快捷列 */}
        {recentParts.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-surface-400 mb-2">🔁 最近常採購（點圖直接加入採購車）</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentParts.map(p => (
                <button
                  key={p.part_id}
                  onClick={() => addToPurchaseCart({ id: p.part_id, name: p.name, brand: p.brand, wholesale_price: p.price, image_url: p.image_url, stock_qty: p.stock_qty })}
                  disabled={!p.is_active}
                  className={`bg-surface-700/60 p-2 rounded-xl border text-left transition ${p.is_active ? 'border-surface-600 hover:border-blue-500/60' : 'border-surface-800 opacity-40 cursor-not-allowed'}`}
                  title={p.is_active ? `累計 ${p.total_qty} 件` : '此商品已下架'}
                >
                  <div className="product-image-container w-full rounded-lg overflow-hidden mb-1.5">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full" />
                    ) : <span className="text-xl">📦</span>}
                  </div>
                  <p className="text-xs text-white line-clamp-1">{p.name}</p>
                  <p className="text-[10px] text-green-400">NT$ {Number(p.price).toLocaleString()} · 累計{p.total_qty}件</p>
                  {!p.is_active && <p className="text-[10px] text-red-400">已下架</p>}
                </button>
              ))}
            </div>
          </div>
        )}

          {/* 🟢 第一排：車型 4 選單 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition">
              <option value="">📅 選擇年份</option>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} disabled={!selectedYear} className="h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white disabled:opacity-50 transition">
              <option value="">🏭 選擇廠牌</option>
              {makes.map(make => <option key={make} value={make}>{make}</option>)}
            </select>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={!selectedMake} className="h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white disabled:opacity-50 transition">
              <option value="">🚗 選擇車型</option>
              {models.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
            <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)} disabled={!selectedModel} className="h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white disabled:opacity-50 transition">
              <option value="">⚙️ 選擇引擎/世代</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.generation} {v.engine_code}
                </option>
              ))}
            </select>
          </div>

          {/* 🟢 第二排：目錄選單 + 搜尋框 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 主分類 */}
            <select
              value={selectedCategory}
              onChange={e => handleCategoryChange(e.target.value)}
              className="h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">📂 主分類</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {/* 子分類 */}
            <select
              value={selectedSubcategory}
              onChange={e => setSelectedSubcategory(e.target.value)}
              disabled={!selectedCategory}
              className="h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
            >
              <option value="">📂 子分類</option>
              {subcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>

            {/* 搜尋輸入框 + 按鈕 (合併在一欄中) */}
            <div className="lg:col-span-2 flex gap-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 輸入零件名稱、SKU 或品牌..."
                className="flex-1 h-11 min-w-0 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:ring-blue-500 transition"
                onKeyDown={e => e.key === 'Enter' && handleGarageSearch()}
              />
              <button
                onClick={() => handleGarageSearch()}
                disabled={loading}
                className="h-11 w-24 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-medium transition"
              >
                {loading ? '搜尋中' : '🔍 搜尋'}
              </button>
            </div>
          </div>

          {/* 搜尋結果列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {parts.map(part => (
              <div
                key={part.id}
                className="bg-surface-700/60 p-4 rounded-xl border border-surface-600 hover:border-blue-500/40 transition flex flex-col gap-3"
              >
                {/* 點擊觸發彈窗 */}
                <div
                  onClick={() => setSelectedPart(part)}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <div className="product-image-container w-16 h-16 rounded-lg flex-shrink-0 border border-surface-600">
                    {part.image_url ? (
                      <img src={part.image_url} alt={part.name} loading="lazy" className="w-full h-full" />
                    ) : (
                      <span className="text-2xl text-surface-500">📦</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-md group-hover:text-blue-400 transition-colors line-clamp-2">{part.name}</h4>
                    {/* 車廠要看的是供應商料號（SKU），不是內部 DB id */}
                    <div className="text-xs text-surface-400 mt-1">
                      品牌: {part.brand}{part.sku ? ` | 料號: ${part.sku}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between p-3 bg-surface-800/80 rounded-lg mt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-green-400">車廠批發價</span>
                    <span className="text-green-400 font-bold text-lg">
                      NT$ {Number(part.wholesale_price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right flex flex-col border-l border-surface-600 pl-3">
                    <span className="text-[10px] text-surface-400">市場建議售價</span>
                    <span className="text-surface-300 font-medium text-lg line-through opacity-70">
                      NT$ {Number(part.msrp_price || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button onClick={() => addToPurchaseCart(part)} className="w-full mt-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-medium text-sm transition">
                  🛒 加入採購單
                </button>
              </div>
            ))}
            
            {/* 🔴 載入失敗：必須先於空態顯示，否則失敗會被誤讀成「查無零件」 */}
            {partsError && !loading && (
              <div className="col-span-full text-center py-10 bg-red-950/30 rounded-xl border border-red-800/50">
                <span className="text-4xl block mb-2">⚠️</span>
                <p className="text-red-300">{partsError}</p>
                <button
                  onClick={() => handleGarageSearch(partsPage)}
                  className="mt-3 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold transition"
                >重新搜尋</button>
              </div>
            )}

            {!partsError && parts.length === 0 && !loading && (selectedYear || search || selectedCategory) && (
              <div className="col-span-full text-center py-10 text-surface-400 bg-surface-800/30 rounded-xl border border-dashed border-surface-600">
                <span className="text-4xl block mb-2">📦</span>
                <p>查無此零件，請嘗試切換不同的車型、目錄或關鍵字</p>
              </div>
            )}
          </div>

          {/* 分頁：後端有 pagination，先前前端完全沒有換頁控制（只拿得到第 1 頁 12 筆） */}
          {!loading && !partsError && partsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => handleGarageSearch(Math.max(1, partsPage - 1))}
                disabled={partsPage <= 1}
                className="px-4 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm disabled:opacity-40"
              >← 上一頁</button>
              <span className="text-sm text-surface-400">第 {partsPage} / {partsTotalPages} 頁（共 {partsTotal} 件）</span>
              <button
                onClick={() => handleGarageSearch(Math.min(partsTotalPages, partsPage + 1))}
                disabled={partsPage >= partsTotalPages}
                className="px-4 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm disabled:opacity-40"
              >下一頁 →</button>
            </div>
          )}
        </div>

        {/* 預約列表（接 API） */}
        <div className="mt-4">
          <h4 className="text-lg font-bold flex items-center gap-2 mb-4">📋 預約列表</h4>
          {appointments.length === 0 ? (
            <div className="bg-surface-800/50 rounded-xl p-10 text-center border border-surface-700/50 border-dashed">
              <p className="text-surface-400">目前沒有預約</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map(a => (
                <div key={a.id} className="bg-surface-800/70 p-5 rounded-xl border border-surface-700/50">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div>
                    <p className="font-bold">#{a.id}　{a.vehicle?.make} {a.vehicle?.model}
                      {a.vehicle?.licensePlate && <span className="ml-2 text-sm text-surface-400">({a.vehicle.licensePlate})</span>}
                    </p>
                    <p className="text-surface-400 text-sm mt-1">
                      車主：{a.user?.name || a.user?.phone || '—'}　
                      預約時間：{new Date(a.scheduled_at).toLocaleString()}　
                      項目：{a.service_type || '—'}
                    </p>
                    {/* 🆕 客戶勾選的安裝項目 */}
                    {Array.isArray(a.install_items) && a.install_items.length > 0 && (
                      <div className="mt-2 bg-surface-700/40 rounded-lg px-3 py-2">
                        <p className="text-xs text-surface-400 mb-1">🔧 要安裝的訂單零件：</p>
                        {a.install_items.map((it, i) => (
                          <p key={i} className="text-sm text-surface-300">· {it.name}{it.sku ? ` (${it.sku})` : ''} ×{it.qty}</p>
                        ))}
                        <p className="text-[11px] text-amber-400 mt-1">如需特別報價工資，請點下方「報價 / 改時間」。</p>
                      </div>
                    )}
                    {a.note && !a.note.startsWith('{') && <p className="text-surface-500 text-sm mt-1">備註：{a.note}</p>}
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className={
                      a.status === 'COMPLETED' ? 'text-green-400' :
                      a.status === 'IN_PROGRESS' ? 'text-blue-400' :
                      a.status === 'CONFIRMED' ? 'text-yellow-400' :
                      a.status === 'CANCELLED' ? 'text-red-400' : 'text-surface-400'
                    }>
                      {{ PENDING: '待確認', CONFIRMED: '已確認', ARRIVED: '已到店', IN_PROGRESS: '施工中', COMPLETED: '已完成', CANCELLED: '已取消' }[a.status] || a.status}
                    </span>
                    {/* 🆕 接單操作按鈕 */}
                    {a.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateApptStatus(a.id, 'CONFIRMED')}
                          disabled={updatingId === a.id}
                          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          {updatingId === a.id ? '處理中…' : '✓ 接受'}
                        </button>
                        <button
                          onClick={() => updateApptStatus(a.id, 'CANCELLED')}
                          disabled={updatingId === a.id}
                          className="bg-surface-600 hover:bg-red-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          ✕ 拒絕
                        </button>
                      </div>
                    )}
                    {a.status === 'CONFIRMED' && (
                      <button
                        onClick={() => updateApptStatus(a.id, 'ARRIVED')}
                        disabled={updatingId === a.id}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        🅿️ 車主已到店
                      </button>
                    )}
                    {a.status === 'ARRIVED' && (
                      <button
                        onClick={() => updateApptStatus(a.id, 'IN_PROGRESS')}
                        disabled={updatingId === a.id}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        🔧 開始施工
                      </button>
                    )}
                    {['CONFIRMED', 'ARRIVED'].includes(a.status) && (
                      <button
                        onClick={() => navigate('/garage/work-orders')}
                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        開工單
                      </button>
                    )}
                    {a.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => navigate('/garage/work-orders')}
                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        前往工單完工結案
                      </button>
                    )}
                  </div>
                  </div>
                  {/* 🆕 報價 / 提議時間操作（PENDING/CONFIRMED 皆可） */}
                  {['PENDING', 'CONFIRMED'].includes(a.status) && (
                    <div className="mt-3 pt-3 border-t border-surface-700/50">
                      <button
                        onClick={() => openQuoteForm(a)}
                        className="text-sm text-blue-400 hover:text-blue-300 transition"
                      >
                        💰 報價工資 / 📅 提議其他時間{a.quote_amount != null ? '（已報價：NT$ ' + Number(a.quote_amount).toLocaleString() + '）' : ''}
                        {a.proposed_at ? '（已提議新時間，待客戶確認）' : ''}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ==================================================== */}
      {/* 🟢 商品詳情彈窗 Modal (無 Navbar，獨立視窗) */}
      {/* ==================================================== */}
      {selectedPart && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-surface-800 rounded-2xl max-w-4xl w-full shadow-2xl border border-surface-700/50 overflow-hidden">
            
            <button
              onClick={() => setSelectedPart(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-surface-700/80 hover:bg-surface-600 rounded-full flex items-center justify-center text-surface-300 hover:text-white transition"
            >
              ✕
            </button>

            <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center">
                <div className="w-full aspect-square bg-white rounded-xl overflow-hidden flex items-center justify-center shadow-lg border border-surface-700/30 relative">
                  {selectedPart.image_url ? (
                    <img
                      src={selectedPart.image_url}
                      alt={selectedPart.name}
                      className="w-full h-full object-contain p-6 transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        if (!e.target.dataset.fallback) {
                          e.target.dataset.fallback = 'true';
                          const newSrc = e.target.src.replace(/\.(jpg|jpeg)$/i, '.png');
                          if (e.target.src !== newSrc) e.target.src = newSrc;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-6xl text-slate-400">🔧</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      {selectedPart.brand}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-700/50 px-3 py-1 rounded-full">
                      SKU: {selectedPart.sku}
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold text-white leading-tight mb-4">
                    {selectedPart.name}
                  </h1>

                  <div className="w-full h-px bg-surface-700/60 mb-6"></div>

                  <div className="mb-4">
                    <p className="text-sm text-surface-400 mb-1">車廠批發價</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-green-400">
                        NT$ {Number(selectedPart.wholesale_price || 0).toLocaleString()}
                      </span>
                      <span className="text-sm text-surface-500 line-through">
                        建議售價 NT$ {Number(selectedPart.msrp_price || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-surface-300 mb-2">商品描述</h3>
                    <p className="text-surface-400 leading-relaxed text-sm">
                      {selectedPart.description || "此商品適用於您選擇的車輛，採用高品質材料製成。"}
                    </p>
                  </div>
                </div>

                <div className="bg-surface-900/50 p-4 rounded-xl border border-surface-700/50 mt-4">
                  <button
                    onClick={() => addToPurchaseCart(selectedPart)}
                    className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-md transition-all flex justify-center items-center gap-3 shadow-lg shadow-blue-500/20"
                  >
                    🛒 加入採購單
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🆕 採購車面板（右側抽屜） */}
      {/* ==================================================== */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md h-full bg-surface-800 shadow-2xl border-l border-surface-700 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-surface-700">
              <h3 className="text-lg font-bold">🛒 採購車（{cart.length} 項）</h3>
              <button onClick={() => setShowCart(false)} className="w-9 h-9 bg-surface-700 hover:bg-surface-600 rounded-full">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-surface-500 py-10">採購車是空的</p>
              ) : cart.map(c => (
                <div key={c.part_id} className="bg-surface-900/50 p-3 rounded-xl border border-surface-700/50 flex gap-3 items-center">
                  <div className="product-image-container w-14 h-14 rounded-lg flex-shrink-0">
                    {c.image_url ? <img src={c.image_url} alt={c.name} loading="lazy" className="w-full h-full" /> : <span>📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-surface-500">{c.brand} | {c.sku}</p>
                    <p className="text-sm text-green-400 font-bold mt-0.5">
                      NT$ {c.price.toLocaleString()}
                      {(c.stock_qty + (c.distributor_stock_qty || 0)) < c.qty && <span className="ml-2 text-[10px] text-purple-300">🚢 代購</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => updateCartQty(c.part_id, c.qty - 1)} className="w-7 h-7 bg-surface-700 hover:bg-surface-600 rounded-lg font-bold">−</button>
                    <span className="w-8 text-center font-bold">{c.qty}</span>
                    <button onClick={() => updateCartQty(c.part_id, c.qty + 1)} className="w-7 h-7 bg-surface-700 hover:bg-surface-600 rounded-lg font-bold">＋</button>
                    <button onClick={() => updateCartQty(c.part_id, 0)} className="w-7 h-7 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded-lg ml-1">🗑</button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-surface-700">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-surface-400">合計（批發價）</span>
                  <span className="text-2xl font-bold text-green-400">NT$ {cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={submitPurchaseOrder}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3.5 rounded-xl font-bold transition"
                >
                  {submitting ? '送出中…' : '📤 送出採購單'}
                </button>
                <p className="text-xs text-surface-500 mt-2 text-center">送出後由平台確認，缺貨項目自動轉代購</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 🆕 我的採購單面板（全螢幕 Modal） */}
      {/* ==================================================== */}
      {showOrders && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowOrders(false)} />
          <div className="relative bg-surface-800 rounded-2xl max-w-3xl w-full my-10 shadow-2xl border border-surface-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">📄 我的採購單</h3>
              <button onClick={() => setShowOrders(false)} className="w-9 h-9 bg-surface-700 hover:bg-surface-600 rounded-full">✕</button>
            </div>

            {poOrders.length === 0 ? (
              <p className="text-center text-surface-500 py-10">尚無採購記錄</p>
            ) : (
              <div className="space-y-4">
                {poOrders.map(o => {
                  const st = PO_STATUS_MAP[o.status] || { label: o.status, cls: '' };
                  return (
                    <div key={o.id} className="bg-surface-900/50 p-4 rounded-xl border border-surface-700/50">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-bold text-blue-400">#{o.po_number}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                        <span className="ml-auto font-bold text-green-400">NT$ {Number(o.total_amount).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-surface-500">{new Date(o.created_at).toLocaleString('zh-TW')}</p>

                      <table className="w-full text-sm mt-2">
                        <tbody>
                          {o.items?.map(it => (
                            <tr key={it.id} className="border-t border-surface-700/30">
                              <td className="py-1.5 text-surface-200">
                                {it.name_snapshot}
                                {it.is_preorder && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-purple-900/40 text-purple-300">代購</span>}
                              </td>
                              <td className="py-1.5 text-center text-surface-400 w-12">×{it.qty}</td>
                              <td className="py-1.5 text-right text-surface-300 w-28">NT$ {(Number(it.price_snapshot) * it.qty).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="flex gap-2 mt-3">
                        {['SUBMITTED', 'CONFIRMED'].includes(o.status) && (
                          <button onClick={() => cancelPo(o)} className="px-4 py-1.5 rounded-lg bg-transparent border border-red-500/50 text-red-400 hover:bg-red-900/30 text-xs font-medium transition">
                            ✕ 取消採購單
                          </button>
                        )}
                        {o.status === 'SHIPPED' && (
                          <button onClick={() => completePo(o)} className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-xs font-bold transition">
                            ✓ 確認收貨
                          </button>
                        )}
                        {o.cancel_reason && <span className="text-xs text-red-300 self-center">取消原因：{o.cancel_reason}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 採購單分頁 */}
            {poPagination && poPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button onClick={() => { setPoPage(poPage - 1); loadPoOrders(poPage - 1); }} disabled={poPage <= 1}
                  className="px-4 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm disabled:opacity-40">← 上一頁</button>
                <span className="text-sm text-surface-400">第 {poPagination.page} / {poPagination.totalPages} 頁</span>
                <button onClick={() => { setPoPage(poPage + 1); loadPoOrders(poPage + 1); }} disabled={poPage >= poPagination.totalPages}
                  className="px-4 py-2 rounded-lg bg-surface-700 border border-surface-600 text-sm disabled:opacity-40">下一頁 →</button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 🆕 報價 / 提議時間 Modal */}
      {quoteAppt && (
        <QuoteModal
          appointment={quoteAppt}
          onClose={() => setQuoteAppt(null)}
          onSaved={() => { setQuoteAppt(null); loadAppointments(); }}
        />
      )}
    </div>
  );
}

/* ========== 🆕 報價工資 / 提議時間 Modal ========== */
function QuoteModal({ appointment: a, onClose, onSaved }) {
  const [quoteAmount, setQuoteAmount] = useState(a.quote_amount ?? '');
  const [quoteNote, setQuoteNote] = useState(a.quote_note || '');
  const [proposedAt, setProposedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if ((quoteAmount === '' || quoteAmount === null) && !proposedAt) {
      setError('請填寫報價金額或選擇建議時間');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/garage/appointments/${a.id}/quote`, {
        quoteAmount: quoteAmount === '' ? null : Number(quoteAmount),
        quoteNote,
        proposedAt: proposedAt || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || '送出失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-surface-800 rounded-2xl w-full max-w-md p-6 border border-surface-600 text-white" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">💰 回覆報價 / 提議時間</h3>
        <p className="text-sm text-surface-400 mb-4">
          #{a.id}　{a.vehicle?.make} {a.vehicle?.model}　客戶：{a.user?.name || a.user?.phone || '—'}
        </p>

        <label className="block text-xs text-surface-400 mb-1">安裝工資報價（NT$，留空 = 不另外報價）</label>
        <input type="number" min="0" value={quoteAmount}
          onChange={e => { setQuoteAmount(e.target.value); setError(''); }}
          placeholder="例如：800"
          className="w-full px-3 py-2.5 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none mb-3" />

        {/* 🆕 從標準工資表快速帶入 */}
        {Array.isArray(a.labor_fees) && a.labor_fees.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-surface-400 block mb-1.5">⚡ 標準工資表（點擊直接帶入）：</span>
            <div className="flex flex-wrap gap-1.5">
              {a.labor_fees.map(f => (
                <button key={f.id} type="button"
                  onClick={() => setQuoteAmount(String(f.price))}
                  className="px-2.5 py-1 rounded-lg bg-surface-700 hover:bg-blue-600 border border-surface-600 text-xs transition">
                  {f.name} ${Number(f.price).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block text-xs text-surface-400 mb-1">報價說明（選填）</label>
        <input value={quoteNote} onChange={e => setQuoteNote(e.target.value)}
          placeholder="例：含拆裝工資與定位校正"
          className="w-full px-3 py-2.5 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none mb-3" />

        <label className="block text-xs text-surface-400 mb-1">建議時間（可另行安排，留空 = 維持原時間）</label>
        <input type="datetime-local" value={proposedAt}
          onChange={e => { setProposedAt(e.target.value); setError(''); }}
          className="w-full px-3 py-2.5 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none mb-3" />
        <p className="text-xs text-surface-500 mb-4">原指定時間：{new Date(a.scheduled_at).toLocaleString()}</p>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-sm font-medium transition">取消</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold transition">
            {saving ? '送出中…' : '送出回覆'}
          </button>
        </div>
        <p className="text-[11px] text-surface-500 mt-3 text-center">送出後會以 LINE 通知客戶確認。</p>
      </div>
    </div>
  );
}