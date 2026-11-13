// src/pages/Shop.jsx
import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { useCurrentVehicle } from '../context/CurrentVehicleContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ErrorState from '../components/ErrorState';
import PartImage from '../components/PartImage';
import { confirmDialog } from '../components/ConfirmDialog';
import { TERMS, formatPrice } from '../constants/terms';
import { wishlistAPI } from '../api';
import { activeSpecificCategories, flattenInstalledModifications } from '../utils/recommendations';

/* 信任列元件（目前未使用） */

export default function Shop() {
  const { currentVehicle: selectedProfile, loading: vehicleLoading, switching } = useCurrentVehicle();
  const selectedVehicle = selectedProfile?.id || '';
  const selectedVariantId = Number(selectedProfile?.variantId);
  const hasVariant = Number.isInteger(selectedVariantId) && selectedVariantId > 0;

  const catalogueRequest = useRef(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  // 🆕 零件品牌篩選
  const [partBrands, setPartBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');

  const [search, setSearch] = useState('');
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // 🆕 分頁 + 排序（預設熱門）
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [sort, setSort] = useState('hot');
  // 🆕 改裝匹配提示
  const [modificationMatches, setModificationMatches] = useState(null);
  // 🆕 車輛/分類載入失敗提示（compact 行內）

  const [categoriesError, setCategoriesError] = useState(false);
  // 🆕 熱門清單載入失敗狀態（補上 ErrorState + 重試，取代靜默 catch {}）
  const [hotListError, setHotListError] = useState(false);

  // AI 處理狀態
  const [aiImage, setAiImage] = useState(null);
  const aiImageInputRef = useRef(null);

  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();

  // 🧠 推薦引擎：目前里程命中的專用件分類（「適合您當前里程」徽章用）
  const recCategories = useMemo(() => activeSpecificCategories({
    currentMileage: selectedProfile?.current_mileage,
    manufactureYear: selectedProfile?.year,
    installedModifications: flattenInstalledModifications(selectedProfile?.modifications),
    modelCode: selectedProfile?.make && selectedProfile?.model ? `${selectedProfile.make} ${selectedProfile.model}` : '',
  }), [selectedProfile?.id, selectedProfile?.current_mileage, selectedProfile?.year]);
  const currentMileageKm = Number(selectedProfile?.current_mileage || 0);

  // 效能：穩定 PartCard 的 props 引用，讓 React.memo 真正跳過不必要的重繪
  const handleOpenPart = useCallback((id) => navigate(`/part/${id}`), [navigate]);

  // 🔗 推薦卡片導入：/shop?category=底盤&car=避震器
  //    注意：這裡直接設定 state 而不呼叫 handleCategoryChange — 後者會觸發一次
  //    re-fetch，與下面的 handleSearch 重複。篩選值改由 handleSearch 的
  //    overrides 帶入，確保只發一次請求且帶的是「即將生效」的值。
  const appliedParams = useRef(false);
  useEffect(() => {
    if (appliedParams.current) return;
    const cat = searchParams.get('category');
    const car = searchParams.get('car');
    if (!cat && !car) return;
    appliedParams.current = true;
    if (cat) {
      setSelectedCategory(cat);
      setSelectedSubcategory('');
      setSelectedBrand('');
      loadPartBrands({ category: cat });
    }
    if (car) setSearch(car);
    // 帶覆寫參數搜尋，避免閉包舊值
    setTimeout(() => handleSearch(1, { category: cat || '', subcategory: '', brand: '', search: car || '' }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  // 載入分類樹
  const loadCategories = () => {
    setCategoriesError(false);
    api.get('/categories/tree')
      .then(res => setCategories(res.data))
      .catch(err => { console.warn('載入失敗:', err?.message || err); setCategoriesError(true); });
  };

  useEffect(loadCategories, []);

  // 🆕 載入零件品牌清單（依分類/項目連動過濾；未選項目=全部品牌）
  //    後端 /api/parts/brands 支援 ?category=<名稱> 與 ?subcategory=<id>
  const loadPartBrands = ({ category = '', subcategory = '' } = {}) => {
    const params = {};
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    api.get('/parts/brands', { params })
      .then(res => setPartBrands(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.warn('載入品牌失敗:', err?.message || err));
  };
  useEffect(() => loadPartBrands(), []);

  // 當選擇的車輛改變時，自動重新載入熱門零件（🔥 熱門排序、完整分頁列表）
  //    切換車輛會重置搜尋狀態，但保留使用者選的分類/項目/品牌/排序條件。
  useEffect(() => {
    ++catalogueRequest.current;
    setParts([]);
    setPagination(null);
    setModificationMatches(null);
    setLoading(false);
    setSearched(false);
    setPage(1);
    if (selectedVehicle && !switching && !vehicleLoading) loadHotParts(1);
    return () => { ++catalogueRequest.current; };
  }, [selectedVehicle, selectedVariantId, switching, vehicleLoading]);

  const loadHotParts = async (targetPage = page, overrides = {}) => {
    const version = ++catalogueRequest.current;
    try {
      if (!hasVariant) { setParts([]); setPagination(null); return; }
      setLoading(true);
      setHotListError(false);
      // 🔎 篩選條件一律由「即將生效的值」帶入（overrides 優先），
      //    不可依賴 setState 後的 state —— 同一次事件內 state 尚未更新，
      //    舊寫法會讀到上一次的 closure，讓篩選慢一拍。
      const category = overrides.category !== undefined ? overrides.category : selectedCategory;
      const subcategory = overrides.subcategory !== undefined ? overrides.subcategory : selectedSubcategory;
      const brand = overrides.brand !== undefined ? overrides.brand : selectedBrand;
      const sortParam = overrides.sort !== undefined ? overrides.sort : sort;
      // 🆕 使用公開端點 /api/parts/recommended（不需登入）
      const res = await api.get('/parts/recommended', {
        params: {
          variantId: selectedVariantId,
          search: '',
          page: targetPage,
          pageSize: 12,
          sort: sortParam,
          ...(category ? { category } : {}),
          ...(subcategory ? { subcategory } : {}),
          ...(brand ? { brand } : {}),
        }
      });
      if (version !== catalogueRequest.current) return;
      const data = res.data;
      setParts(data.parts || []);
      setPagination(data.pagination || null);
      if (data.fallbackVehicle) {
        toast.custom(() => (
          <div className="rounded-lg bg-slate-800 text-slate-100 px-4 py-2.5 text-sm shadow-lg border border-blue-500/30">
            🚗 已自動以「{data.fallbackVehicle.make} {data.fallbackVehicle.model}」範圍顯示熱門零件
          </div>
        ), { duration: 3000 });
      }
    } catch (err) {
      if (version === catalogueRequest.current) {
        console.warn('熱門清單載入失敗:', err?.message || err);
        setHotListError(true);
      }
    }
    if (version === catalogueRequest.current) setLoading(false);
  };

  // 🔥 熱門列表翻頁（沿用同一組條件，不觸發 AI fallback）
  const handleHotPage = (targetPage) => {
    if (targetPage < 1 || loading || !pagination) return;
    if (targetPage > pagination.pages) return;
    setPage(targetPage);
    loadHotParts(targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentCategory = categories.find(c => c.name === selectedCategory);
  const subcategories = currentCategory?.subcategories || [];

  // 🔍 主要搜尋函式：先查資料庫，若無結果則自動觸發 AI
  // 🆕 支援分頁（page 變動時重新查詢同一組條件）；overrides 用於 URL 參數導入
  const handleSearch = async (targetPage = 1, overrides = {}) => {
    if (switching || vehicleLoading) return;
    const version = ++catalogueRequest.current;
    const searchQuery = (overrides.search ?? search).trim();
    if (!selectedVehicle) {
      // 🔒 後端會強制退回用戶愛車；前端也先擋：未選車且未輸入關鍵字時不發請求
      if (!searchQuery) {
        toast.error(TERMS.MESSAGES.VALIDATION_ERROR);
        return;
      }
    }

    setLoading(true);
    setSearched(true);
    setPage(targetPage);
    setHotListError(false);

    try {
      // 第一步：查詢資料庫（分頁式）
      const params = { page: targetPage, pageSize: 12, sort };
      if (selectedVehicle && !hasVariant) {
        setParts([]); setPagination(null); setLoading(false);
        toast.error('這台車尚未連結已確認車型，請先至我的愛車補齊資料。'); 
        return;
      }
      if (hasVariant) params.variantId = selectedVariantId;
      // 🔎 篩選條件以「即將生效的值」為準（overrides 優先於 state），
      //    避免 setState 尚未生效造成篩選慢一拍。
      const category = overrides.category !== undefined ? overrides.category : selectedCategory;
      const subcategory = overrides.subcategory !== undefined ? overrides.subcategory : selectedSubcategory;
      const brand = overrides.brand !== undefined ? overrides.brand : selectedBrand;
      const sortParam = overrides.sort !== undefined ? overrides.sort : sort;
      if (category) params.category = category;
      if (subcategory) params.subcategory = subcategory;
      if (brand) params.brand = brand;
      if (searchQuery) params.search = searchQuery;
      params.sort = sortParam;

      // 🆕 使用公開端點 /api/parts/recommended（不需登入）
      const apiRes = await api.get('/parts/recommended', { params });
      if (version !== catalogueRequest.current) return;
      const data = apiRes.data;
      const dbParts = data.parts || [];

      if (dbParts.length > 0) {
        setParts(dbParts);
        setPagination(data.pagination || null);
        // 🆕 儲存改裝匹配資訊
        setModificationMatches(data.modificationMatches || null);
        // 🔒 後端自動退回愛車時提示使用者
        if (data.fallbackVehicle) {
          toast.custom(() => (
            <div className="rounded-lg bg-slate-800 text-slate-100 px-4 py-2.5 text-sm shadow-lg border border-blue-500/30">
              🚗 未選擇車輛，已自動以「{data.fallbackVehicle.make} {data.fallbackVehicle.model}」範圍搜尋
            </div>
          ), { duration: 3000 });
        }
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 分頁翻頁時不觸發 AI（只在第一頁無結果才詢問）
      if (targetPage > 1) {
        setParts([]);
        setPagination(null);
        setLoading(false);
        return;
      }

      // 第二步：資料庫無結果，自動使用 AI 搜尋
      const confirmed = await confirmDialog({
        message: `🔍 資料庫中未找到「${searchQuery}」的相關零件\n\n🤖 是否要使用 AI 搜尋，自動建立待審核草稿？`
      });

      if (!confirmed) {
        setParts([]);
        setLoading(false);
        return;
      }

      // 執行 AI 搜尋
      if (!localStorage.getItem('token')) {
        toast.error(TERMS.MESSAGES.UNAUTHORIZED);
        setLoading(false);
        return;
      }

      const formData = new FormData();
            formData.append('customerVehicleId', selectedVehicle);
            formData.append('query', searchQuery);
            if (aiImage) formData.append('image', aiImage);

            const aiRes = await api.post('/ai/search-part', formData, {
                                            headers: {
                                              'Content-Type': 'multipart/form-data',
                                            },
                                          });

      if (version !== catalogueRequest.current) return;
      toast.success(`✅ AI 分析完成，已建立 ${aiRes.data.items_found} 筆待審核草稿，管理員審核通過後將自動上架`);

      setAiImage(null);
      if (aiImageInputRef.current) aiImageInputRef.current.value = '';
      setParts([]);

    } catch (err) {
      if (version !== catalogueRequest.current) return;
      toast.error(`❌ 搜尋失敗：${err.response?.data?.error || err.message}`);
    }
    if (version === catalogueRequest.current) setLoading(false);
  };

  // 🔄 篩選變動後重新查詢：無論目前是「熱門清單」或「搜尋結果」都套用新條件。
  //    next 為「即將生效」的篩選值（直接帶入查詢），避免 setState 尚未更新造成慢一拍。
  const refetchWithFilters = (next, { withSearch = false } = {}) => {
    setPage(1);
    if (withSearch || searched) handleSearch(1, next);
    else loadHotParts(1, next);
  };

  // 類別變更：項目與品牌重置，品牌清單收斂到該類別
  const handleCategoryChange = (catName) => {
    setSelectedCategory(catName);
    setSelectedSubcategory('');
    setSelectedBrand('');
    loadPartBrands({ category: catName });
    refetchWithFilters({ category: catName, subcategory: '', brand: '' });
  };

  // 零件項目變動：品牌清空並依該項目過濾品牌
  const handleSubcategoryChange = (subId) => {
    setSelectedSubcategory(subId);
    setSelectedBrand('');
    loadPartBrands({ category: selectedCategory, subcategory: subId });
    refetchWithFilters({ category: selectedCategory, subcategory: subId, brand: '' });
  };

  // 品牌篩選變動：熱門清單/搜尋結果皆重新查詢第一頁
  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    refetchWithFilters({ category: selectedCategory, subcategory: selectedSubcategory, brand });
  };

  // 排序變動：熱門清單與搜尋結果皆重新查詢第一頁
  const handleSortChange = (nextSort) => {
    setSort(nextSort);
    refetchWithFilters({ category: selectedCategory, subcategory: selectedSubcategory, brand: selectedBrand, sort: nextSort });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch(1);
  };

  const sortOptions = [
    { value: 'hot', label: '🔥 熱門' },
    { value: 'newest', label: '🆕 最新上架' },
    { value: 'price_asc', label: '💰 價格低→高' },
    { value: 'price_desc', label: '💎 價格高→低' },
    { value: 'name', label: '🔤 名稱 A-Z' },
  ];

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <main className="page-shell">

        {/* ===== 搜尋主區塊 ===== */}
        <div className="bg-gradient-to-br from-[#16202b] to-[#101720] rounded-2xl p-5 md:p-6 mb-6 border border-[#26313d] shadow-xl">
          <div className="flex flex-wrap items-center gap-2.5">

            {/* 分類 */}
            <select value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} className="field min-w-[120px] max-w-[180px]">
              <option value="">零件類別</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {/* 子分類 */}
            <select value={selectedSubcategory} onChange={e => handleSubcategoryChange(e.target.value)} disabled={!selectedCategory} className="field min-w-[120px] max-w-[180px] disabled:opacity-40">
              <option value="">零件項目</option>
              {subcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>

            {/* 🆕 零件品牌篩選 */}
            <select value={selectedBrand} onChange={e => handleBrandChange(e.target.value)} className="field min-w-[110px] max-w-[170px]" title="零件品牌">
              <option value="">品牌</option>
              {partBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* 🆕 排序 */}
            <select value={sort} onChange={e => handleSortChange(e.target.value)} className="field min-w-[130px] max-w-[160px]" title="排序方式">
              {sortOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* 搜尋框 */}
            <div className="flex-1 min-w-[220px] flex items-center gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={TERMS.PLACEHOLDERS.PART_SEARCH}
                  className="field w-full !pl-10"
                />
              </div>

              {/* 圖片上傳（AI 輔助） */}
              <input type="file" accept="image/*" capture="environment" ref={aiImageInputRef}
                onChange={e => setAiImage(e.target.files[0])} className="hidden" />
              <button onClick={() => aiImageInputRef.current?.click()}
                title="上傳圖片，AI 協助辨識零件"
                className="h-11 w-11 shrink-0 flex items-center justify-center bg-[#1e2936] hover:bg-[#28354a] border border-[#2c3947] rounded-xl transition"
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </button>

              {/* 搜尋按鈕 */}
              <button onClick={() => handleSearch(1)} disabled={loading} className="btn-primary h-11 px-6 shrink-0 font-bold">
                {loading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : '搜尋'}
              </button>
            </div>
          </div>

          {aiImage && (
            <p className="text-xs text-blue-300 mt-3 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              已選擇圖片：{aiImage.name}（送出搜尋時將一併進行 AI 辨識）
            </p>
          )}

          {/* 🆕 車輛/分類載入失敗行內提示 */}
          {categoriesError && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoriesError && (
                <ErrorState compact message="分類載入失敗" onRetry={loadCategories} />
              )}
            </div>
          )}
        </div>

        {/* ===== 信任列（已移除） ===== */}

        {/* 內容標題（單行：標題 + 件數） */}
        <div className="flex items-baseline gap-3 mb-5">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            {searched ? TERMS.ACTIONS.SEARCH_RESULTS : TERMS.ACTIONS.HOT_PARTS}
          </h2>
          <p className="text-sm text-slate-500">
            {searched
              ? `${TERMS.ACTIONS.MATCHING_PARTS} ${pagination?.total ?? parts.length} 件`
              : `${pagination?.total ?? parts.length} 件`}
          </p>
        </div>

        {/* 🆕 改裝匹配提示 */}
        {searched && modificationMatches && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-fade-in">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="text-sm text-emerald-300">{modificationMatches.message}</span>
          </div>
        )}

        {/* 零件列表 */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="product-card p-0">
                <div className="skeleton aspect-square" />
                <div className="p-4 space-y-2.5">
                  <div className="skeleton h-3 w-1/3 rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-9 w-full rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🆕 熱門清單載入失敗：顯示 ErrorState + 重試（取代靜默 catch {} 造成的空白區塊） */}
        {!loading && hotListError && (
          <ErrorState message="熱門零件載入失敗" onRetry={() => loadHotParts(1)} />
        )}

        {!loading && !hotListError && parts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1a232e] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </div>
            {searched ? (
              <>
                <p className="text-lg font-medium text-slate-300">{TERMS.MESSAGES.NO_PARTS_FOUND}</p>
                <p className="text-sm text-slate-500 mt-1">{TERMS.MESSAGES.AI_SEARCH_SUBMITTED}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-slate-300">選擇你的愛車，找到真正裝得上的零件</p>
                <p className="text-sm text-slate-500 mt-1">30 秒完成愛車資訊，庫存與 AI 會直接列出適合的零件</p>
                <button onClick={() => navigate('/my-car')} className="btn-primary mt-6 px-6 py-3 font-bold">選擇我的車</button>
              </>
            )}
          </div>
        )}

        {!loading && parts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
            {parts.map(part => (
              <PartCard
                key={part.id}
                part={part}
                onAdd={addToCart}
                onOpen={handleOpenPart}
                mileageBadge={!part.is_universal && recCategories.has(part.category) && currentMileageKm > 0
                  ? '里程數推薦零件'
                  : null}
              />
            ))}
          </div>
        )}

        {/* 🆕 分頁控制：搜尋結果與熱門列表共用（頁碼選擇器 1…N） */}
        {!loading && pagination && pagination.pages > 1 && (() => {
          const totalPages = pagination.pages;
          const cur = pagination.page;
          const go = (p) => { if (searched) handleSearch(p); else handleHotPage(p); };
          // 頁碼視窗：首尾 + 目前頁前後 2 頁，其餘以 … 省略
          const picked = new Set([1, totalPages, cur - 2, cur - 1, cur, cur + 1, cur + 2].filter(p => p >= 1 && p <= totalPages));
          const arr = [...picked].sort((a, b) => a - b);
          const items = [];
          let prev = 0;
          for (const p of arr) {
            if (p - prev > 1) items.push('…');
            items.push(p);
            prev = p;
          }
          return (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-8">
              <button
                onClick={() => go(cur - 1)}
                disabled={cur <= 1 || loading}
                className="px-3 py-2 rounded-xl bg-[#1a232e] border border-[#2c3947] text-sm text-slate-300 disabled:opacity-40 hover:border-slate-500 transition"
              >
                ← 上一頁
              </button>
              {items.map((it, i) => it === '…' ? (
                <span key={'gap' + i} className="px-1 text-slate-500 select-none">…</span>
              ) : (
                <button
                  key={it}
                  onClick={() => go(it)}
                  disabled={loading}
                  className={`min-w-[40px] px-2 py-2 rounded-xl border text-sm transition ${it === cur
                    ? 'bg-[#2c3947] border-slate-500 text-white font-bold'
                    : 'bg-[#1a232e] border-[#2c3947] text-slate-300 hover:border-slate-500'}`}
                >
                  {it}
                </button>
              ))}
              <button
                onClick={() => go(cur + 1)}
                disabled={cur >= totalPages || loading}
                className="px-3 py-2 rounded-xl bg-[#1a232e] border border-[#2c3947] text-sm text-slate-300 disabled:opacity-40 hover:border-slate-500 transition"
              >
                下一頁 →
              </button>
              <span className="text-sm text-slate-400 ml-2">共 {pagination.total} 件</span>
            </div>
          );
        })()}

        {/* 🆕 回到熱門清單快捷入口（搜尋結果 / 多頁熱門清單共用） */}
        {!loading && (searched || pagination?.pages > 1) && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => refetchWithFilters({ category: '', subcategory: '', brand: '', search: '' })}
              className="px-4 py-2 rounded-xl bg-[#1a232e] border border-[#2c3947] text-sm text-slate-300 hover:border-slate-500 transition"
            >
              ← 回到熱門清單
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/* ========== 商品卡元件（含加入購物車回饋 + 通用型徽章 + 里程徽章） ========== */
export const PartCard = memo(function PartCard({ part, onAdd, onOpen, mileageBadge }) {
  const [added, setAdded] = useState(false);
  const [wishAdded, setWishAdded] = useState(false);
  const totalStock = part.stock_qty + (part.distributor_stock_qty || 0); // 現貨判定：自備＋總代理
  // 🆕 公司貨（MST/KN/Pipercross）缺貨顯示「公司貨」橘色標籤；條件 class 抽離成變數
  const stockBadgeClass = totalStock > 0
    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
    : (part.is_official ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30');

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd(part);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWish = (e) => {
    e.stopPropagation();
    wishlistAPI.add({ partId: String(part.id) })
      .then(() => {
        setWishAdded(true);
        setTimeout(() => setWishAdded(false), 1500);
      })
      .catch(err => console.warn('願望加入失敗:', err?.message || err));
  };

  return (
    <div className="product-card group">
      <div onClick={() => onOpen(part.id)}
        className="product-image-container relative cursor-pointer overflow-hidden aspect-square">
        <PartImage
          src={part.image_url}
          alt={part.name}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {/* 🆕 適合里程徽章（專用件，右上角）＋ 改裝匹配徽章 */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {mileageBadge && (
            <span className="px-2 py-1 text-[11px] font-bold bg-amber-500/90 text-white rounded-md backdrop-blur-sm shadow">
              {mileageBadge}
            </span>
          )}
          {part.isModificationMatch && (
            <span className="px-2 py-1 text-[11px] font-bold bg-emerald-500/90 text-white rounded-md backdrop-blur-sm shadow flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              {TERMS.MODIFICATION_MATCH_LABEL}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div onClick={() => onOpen(part.id)} className="cursor-pointer flex-1">
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">{part.brand}</p>
          <h3 className="font-semibold text-slate-100 group-hover:text-blue-400 transition line-clamp-2 text-[15px] leading-snug mb-2">
            {part.name}
          </h3>
        </div>
        <div className="mt-auto pt-3 border-t border-[#222d39]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl font-black text-white tracking-tight">
              {formatPrice(part.msrp_price)}
            </span>
            <span className={`px-2 py-1 text-[11px] font-bold rounded-md ${stockBadgeClass}`}>
              {totalStock > 0 ? `${TERMS.IN_STOCK} ${totalStock}` : (part.is_official ? TERMS.OFFICIAL : TERMS.PREORDER)}
            </span>
          </div>
          {/* 🆕 點擊回饋：按鈕變綠「✓ 已加入」1.5 秒 */}
          <div className="flex gap-2">
            <button onClick={handleAdd} aria-live="polite"
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${added ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'}`}>
              {added ? TERMS.ACTIONS.ADDED_TO_CART : TERMS.ACTIONS.ADD_TO_CART}
            </button>
            {/* 🆕 願望清單一鍵加入 */}
            <button onClick={handleWish} aria-live="polite" title="加入願望清單"
              className={`w-12 shrink-0 py-2 flex items-center justify-center rounded-xl border transition-all duration-200 ${wishAdded ? 'border-red-500/60 bg-red-500/15 text-red-400' : 'border-[#2c3947] bg-[#1a232e] text-slate-400 hover:border-red-500/50 hover:text-red-400'}`}>
              <svg className={`w-5 h-5 ${wishAdded ? 'fill-red-500' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0 1.38-.878 2.379-2 3v9c0 1.121-.758 2.022-1.8 2.682v0a9.65 9.65 0 0 1-6.08 0c-.9-.36-1.8-.659-1.8-2.682v-9c-1.24-1.21-2.11-2.208-2-3.38 0-1.38.88-2.379 2-3.378 1.21-.949 2.93-1.568 4.75-1.568s3.53.619 4.75 1.568Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
