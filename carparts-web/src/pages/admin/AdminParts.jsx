// src/pages/admin/AdminParts.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { adminClient } from '../../api/client';
import { confirmDialog } from '../../components/ConfirmDialog';
import { getUserFriendlyError } from '../../utils/userFriendlyErrors';

export default function AdminParts() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [editingPart, setEditingPart] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({});
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [brandFilter, setBrandFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [genFilter, setGenFilter] = useState('');
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerPath, setImagePickerPath] = useState('');
  const [imagePickerFiles, setImagePickerFiles] = useState([]);
  const [imagePickerLoading, setImagePickerLoading] = useState(false);
  const [imagePickerSearch, setImagePickerSearch] = useState(''); // 🆕 圖片搜尋

  // 批次套用相關狀態
  const [batchApplyOpen, setBatchApplyOpen] = useState(false);
  const [batchApplyLoading, setBatchApplyLoading] = useState(false);
  const [batchApplyVariants, setBatchApplyVariants] = useState([]);
  const [batchApplySelectedDriveTypes, setBatchApplySelectedDriveTypes] = useState([]);
  const [batchApplyPreview, setBatchApplyPreview] = useState({});
  const [missingOnly, setMissingOnly] = useState(false);
  const [missingSummary, setMissingSummary] = useState(null);

  // 載入分類
    const loadCategories = useCallback(async () => {
      try {
        const res = await adminClient.get('/categories/tree');
        const cats = res.data || [];
        setCategories(cats);
        const allSubs = cats.flatMap(cat => (
          (cat.subcategories || []).map(sub => ({
            ...sub,
            categoryName: cat.name,
          }))
        ));
        setSubcategories(allSubs);
      } catch (err) {
        console.error('載入分類失敗:', err);
      }
    }, []);

    // 載入所有車型
    const loadVehicles = useCallback(async () => {
      try {
        const res = await adminClient.get('/variants?status=all&limit=0');
        setVehicles(res.data || []);
      } catch (err) {
        console.error('載入車型失敗:', err);
      }
    }, []);

    // 載入媒體檔案列表（search 非空時為搜尋模式，忽略目錄層級限制）
    const loadMediaFiles = useCallback(async (dirPath = '', search = '') => {
      setImagePickerLoading(true);
      try {
        const params = search ? { q: search } : (dirPath ? { path: dirPath } : {});
        const res = await adminClient.get('/media/list', { params });
        setImagePickerFiles(res.data || []);
        setImagePickerPath(dirPath);
        setImagePickerSearch(search);
      } catch (err) {
        console.error('載入圖片列表失敗:', err);
      } finally {
        setImagePickerLoading(false);
      }
    }, [adminClient]);

    // 載入商品列表
  const loadParts = useCallback(async (page = 1, limit = 20, searchTerm = '') => {
    setLoading(true);
    try {
      if (missingOnly) {
        const res = await adminClient.get('/parts/missing', { params: { page: page.toString(), limit: limit.toString() } });
        setParts(res.data.data || []);
        setMissingSummary(res.data.summary || null);
        setPagination({ page, limit, total: res.data.pagination?.total ?? 0, pages: res.data.pagination?.pages ?? 0 });
      } else {
        const params = new URLSearchParams({
              page: page.toString(),
              limit: limit.toString(),
              search: searchTerm,
            });
            const res = await adminClient.get('/parts', { params });
        setParts(res.data.data || []);
        setMissingSummary(null);
        setPagination(res.data.pagination || { page, limit, total: 0, pages: 0 });
      }
    } catch (err) {
      console.error('載入商品失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [missingOnly]);

  useEffect(() => {
    loadCategories();
    loadVehicles();
    loadParts(1, 20, '');
  }, [loadCategories, loadVehicles, loadParts]);

  // 搜尋處理
  const handleSearch = (e) => {
    e.preventDefault();
    loadParts(1, pagination.limit, search);
  };

  // 分頁
  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    loadParts(newPage, pagination.limit, search);
  };

  const toggleMissingOnly = () => {
    setMissingOnly(prev => !prev);
  };

  // 編輯商品
    const startEdit = async (part) => {
      setIsCreating(false);
      try {
        const res = await adminClient.get(`/parts/${part.id}`);
        const fullPart = res.data;
        setEditingPart(fullPart);
      const compatibleIds = (fullPart.compatible_vehicles || []).map(cv => cv.vehicle_id);
      setFormData({
        sku: fullPart.sku || '',
        name: fullPart.name || '',
        brand: fullPart.brand || '',
        description: fullPart.description || '',
        msrp_price: fullPart.msrp_price ?? '',
        wholesale_price: fullPart.wholesale_price ?? '',
        image_url: fullPart.image_url || '',
        stock_qty: fullPart.stock_qty ?? 0,
        distributor_stock_qty: fullPart.distributor_stock_qty ?? 0,
        is_active: fullPart.is_active ?? true,
        is_universal: fullPart.is_universal ?? false,
        subcategory_id: fullPart.subcategory_id ?? '',
        category_ids: (fullPart.parts_on_categories || []).map(poc => poc.category_id) || [],
        compatible_vehicle_ids: compatibleIds,
      });
      setBrandFilter('');
      setModelFilter('');
      setGenFilter('');
    } catch (error) {
      console.error('載入商品詳情失敗:', error);
      toast.error('載入商品詳情失敗，請稍後再試');
    }
  };

  // 新增商品
  const startCreate = () => {
    setIsCreating(true);
    setEditingPart({ id: null });
    setFormData({
      sku: '',
      name: '',
      brand: '',
      description: '',
      msrp_price: '',
      wholesale_price: '',
      image_url: '',
      stock_qty: 0,
      distributor_stock_qty: 0,
      is_active: true,
      is_universal: false,
      subcategory_id: '',
      category_ids: [],
      compatible_vehicle_ids: [],
    });
    setBrandFilter('');
    setModelFilter('');
    setGenFilter('');
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleVehicle = (vehicleId) => {
    setFormData(prev => {
      const current = prev.compatible_vehicle_ids || [];
      if (current.includes(vehicleId)) {
        return { ...prev, compatible_vehicle_ids: current.filter(id => id !== vehicleId) };
      } else {
        return { ...prev, compatible_vehicle_ids: [...current, vehicleId] };
      }
    });
  };

  const removeVehicleFromList = (vehicleId) => {
    setFormData(prev => ({
      ...prev,
      compatible_vehicle_ids: (prev.compatible_vehicle_ids || []).filter(id => id !== vehicleId),
    }));
  };

  // 批次套用功能
  const fetchBatchApplyVariants = useCallback(async () => {
    if (!editingPart || !formData.brand || !formData.model || !formData.subcategory_id) return;

    setBatchApplyLoading(true);
    try {
      if (!editingPart) return;

      const res = await adminClient.get('/variants/engine-generation-group', {
        params: {
          make: formData.brand,
          model: formData.model,
          generation: editingPart.generation,
          engine_code: editingPart.engine_code,
          exclude_variant_id: editingPart.id,
        },
      });

      setBatchApplyVariants(res.data.groups || []);
      setBatchApplySelectedDriveTypes([]);
      setBatchApplyPreview({});
      setBatchApplyOpen(true);
    } catch (error) {
      console.error('載入批次套用車型失敗:', error);
      toast.error('載入同引擎同世代車型失敗');
    } finally {
      setBatchApplyLoading(false);
    }
  }, [editingPart, formData.brand, formData.model, formData.subcategory_id]);

  const handleDriveTypeSelect = (driveType) => {
    setBatchApplySelectedDriveTypes(prev =>
      prev.includes(driveType)
        ? prev.filter(d => d !== driveType)
        : [...prev, driveType]
    );
  };

  const updateBatchApplyPreview = useCallback(async () => {
    if (!editingPart || batchApplySelectedDriveTypes.length === 0) {
      setBatchApplyPreview({});
      return;
    }

    setBatchApplyPreview({});
    try {
      const partIds = [editingPart.id];
      const res = await adminClient.post('/variants/batch-compatibility', {
        part_ids: partIds,
      });

      const preview = {};
      batchApplySelectedDriveTypes.forEach(dt => {
        const variants = batchApplyVariants.find(g => g.drive_type === dt)?.variants || [];
        variants.forEach(v => {
          if (!preview[v.id]) {
            preview[v.id] = { ...v, drive_type: dt };
          }
        });
      });

      setBatchApplyPreview(preview);
    } catch (error) {
      console.error('更新預覽失敗:', error);
    }
  }, [editingPart, batchApplySelectedDriveTypes, batchApplyVariants]);

  const handleBatchApply = async () => {
    if (batchApplySelectedDriveTypes.length === 0) {
      toast.error('請選擇至少一種驅動類型');
      return;
    }

    if (Object.keys(batchApplyPreview).length === 0) {
      toast.error('沒有可套用的車型');
      return;
    }

    if (!(await confirmDialog({
      message: `確定要將此零件套用到 ${Object.keys(batchApplyPreview).length} 個車型？\n包含驅動類型: ${batchApplySelectedDriveTypes.join(', ')}`
    }))) return;

    try {
      const newVehicleIds = Object.keys(batchApplyPreview).map(Number);
      const currentIds = formData.compatible_vehicle_ids || [];
      const mergedIds = [...new Set([...currentIds, ...newVehicleIds])];

      setFormData(prev => ({ ...prev, compatible_vehicle_ids: mergedIds }));
      setBatchApplyOpen(false);
      toast.success(`已套用到 ${Object.keys(batchApplyPreview).length} 個車型`);
    } catch (error) {
      console.error('批次套用失敗:', error);
      toast.error('批次套用失敗');
    }
  };

  const saveEdit = async () => {
    if (!editingPart) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        msrp_price: formData.msrp_price ? parseFloat(formData.msrp_price) : 0,
        wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : 0,
        stock_qty: formData.stock_qty ? parseInt(formData.stock_qty) : 0,
        distributor_stock_qty: formData.distributor_stock_qty ? parseInt(formData.distributor_stock_qty) : 0,
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : null,
        category_ids: formData.category_ids || [],
        compatible_vehicle_ids: formData.compatible_vehicle_ids || [],
      };

      if (isCreating) {
        await adminClient.post('/parts', payload);
        toast.success('商品已新增');
      } else {
        await adminClient.patch(`/parts/${editingPart.id}`, payload);
        toast.success('商品已更新');
      }

      setEditingPart(null);
      setIsCreating(false);
      loadParts(pagination.page, pagination.limit, search);
    } catch (error) {
      console.error('儲存失敗:', error);
      toast.error('儲存失敗：' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const deletePart = async (id) => {
        const confirmed = await confirmDialog({
          message: '確定要刪除此商品嗎？此操作不可復原，相關的庫存記錄、相容車型設定將一併移除。',
          confirmText: '確定刪除',
          danger: true,
        });
        if (!confirmed) return;
        try {
          await adminClient.delete(`/parts/${id}`);
          toast.success('商品已刪除');
          loadParts(pagination.page, pagination.limit, search);
        } catch (error) {
          console.error('刪除失敗:', error);
          const friendlyError = getUserFriendlyError(error, '刪除失敗：');
          toast.error(friendlyError.message);
        }
      };

  const getVehicleLabel = (v) => {
    return `${v.make} ${v.model} ${v.generation || ''} (${v.year_start}-${v.year_end || 'present'})`.trim();
  };

  // 衍生狀態：品牌/車系/世代下拉選單
  const brands = useMemo(() => [...new Set(vehicles.map(v => v.make).filter(Boolean))].sort(), [vehicles]);
  const models = useMemo(() => {
    if (!brandFilter) return [];
    return [...new Set(vehicles.filter(v => v.make === brandFilter).map(v => v.model).filter(Boolean))].sort();
  }, [vehicles, brandFilter]);
  const generations = useMemo(() => {
    if (!modelFilter) return [];
    return [...new Set(vehicles.filter(v => v.make === brandFilter && v.model === modelFilter).map(v => v.generation).filter(Boolean))].sort();
  }, [vehicles, brandFilter, modelFilter]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (brandFilter && v.make !== brandFilter) return false;
      if (modelFilter && v.model !== modelFilter) return false;
      if (genFilter && v.generation !== genFilter) return false;
      return true;
    });
  }, [vehicles, brandFilter, modelFilter, genFilter]);

  // Render
  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#111827', color: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>📦 商品管理</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={toggleMissingOnly}
            style={{
              backgroundColor: missingOnly ? '#1f2937' : '#374151', color: '#ffffff',
              padding: '12px 24px', borderRadius: '8px',
              fontWeight: 'bold', border: 'none', cursor: 'pointer'
            }}
          >
            {missingOnly ? '✓ 缺資料商品' : '🔍 缺資料商品'}
          </button>
          <button
            onClick={startCreate}
            style={{
              backgroundColor: '#16a34a', color: '#ffffff',
              padding: '12px 24px', borderRadius: '8px',
              fontWeight: 'bold', border: 'none', cursor: 'pointer'
            }}
          >
            ＋ 新增商品
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋名稱 / SKU / 品牌"
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#ffffff' }}
          />
          <button type="submit" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>搜尋</button>
          <button type="button" onClick={() => loadParts(1, pagination.limit, '')} style={{ backgroundColor: '#4b5563', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>清除</button>
        </div>
      </form>

      {loading ? (
        <div style={{ color: '#9ca3af' }}>載入中...</div>
      ) : parts.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>沒有符合的商品</p>
      ) : (
        <>
          {missingOnly && missingSummary && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#1f2937', borderRadius: '8px', border: '1px solid #374151', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>缺資料商品總數：{missingSummary.total ?? 0} 筆</span>
              <span style={{ color: '#f87171', fontSize: '14px' }}>缺圖片：{missingSummary.missing_image ?? 0} 筆</span>
              <span style={{ color: '#f87171', fontSize: '14px' }}>缺說明：{missingSummary.missing_description ?? 0} 筆</span>
              <span style={{ color: '#fbbf24', fontSize: '14px' }}>缺圖+缺說明：{missingSummary.missing_both ?? 0} 筆</span>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ backgroundColor: '#374151', color: '#d1d5db' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>SKU</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>名稱</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>品牌</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>售價</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>庫存</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>分類</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>狀態</th>
                  {missingOnly && (
                    <>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>缺圖片</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>缺說明</th>
                    </>
                  )}
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #374151' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#ffffff' }}>{p.sku}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#ffffff' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: '#d1d5db' }}>{p.brand}</td>
                    <td style={{ padding: '12px 16px', color: '#e5e7eb' }}>${p.msrp_price}</td>
                    <td style={{ padding: '12px 16px', color: '#e5e7eb' }}>{p.stock_qty}</td>
                    <td style={{ padding: '12px 16px', color: '#d1d5db' }}>
                      {p.subcategory
                        ? `${p.subcategory.category?.name || ''} > ${p.subcategory.name}`
                        : (p.parts_on_categories?.map(poc => poc.category.name).join('、') || p.category || '-')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: p.is_active ? '#065f46' : '#7f1d1d',
                        color: '#ffffff'
                      }}>
                        {p.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    {missingOnly && (
                      <>
                        <td style={{ padding: '12px 16px', color: '#f87171' }}>{p.missing_image ? '缺圖片' : '有圖片'}</td>
                        <td style={{ padding: '12px 16px', color: '#f87171' }}>{p.missing_description ? '缺說明' : '有說明'}</td>
                      </>
                    )}
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => startEdit(p)} style={{ color: '#60a5fa', marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>編輯</button>
                      <button onClick={() => deletePart(p.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分頁 */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '24px', gap: '8px' }}>
              <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563', opacity: pagination.page <= 1 ? 0.5 : 1 }}>上一頁</button>
              <span style={{ color: '#9ca3af' }}>第 {pagination.page} / {pagination.pages} 頁 (共 {pagination.total} 筆)</span>
              <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563', opacity: pagination.page >= pagination.pages ? 0.5 : 1 }}>下一頁</button>
            </div>
          )}

          {/* 編輯/新增彈窗 */}
          {(editingPart || isCreating) && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
              <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'auto', border: '1px solid #374151', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
                    {isCreating ? '新增商品' : `編輯商品 #${editingPart?.id}`}
                  </h2>
                  <button onClick={() => { setEditingPart(null); setIsCreating(false); setFormData({}); setIsCreating(false); }} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>SKU *</label>
                      <input name="sku" value={formData.sku} onChange={handleFormChange} required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>名稱 *</label>
                      <input name="name" value={formData.name} onChange={handleFormChange} required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>品牌</label>
                      <input name="brand" value={formData.brand} onChange={handleFormChange} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>建議售價</label>
                      <input name="msrp_price" type="number" value={formData.msrp_price} onChange={handleFormChange} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>批發價</label>
                      <input name="wholesale_price" type="number" value={formData.wholesale_price} onChange={handleFormChange} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>庫存數量</label>
                      <input name="stock_qty" type="number" value={formData.stock_qty} onChange={handleFormChange} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>總代理庫存</label>
                      <input name="distributor_stock_qty" type="number" value={formData.distributor_stock_qty} onChange={handleFormChange} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>圖片網址</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input name="image_url" value={formData.image_url || ''} onChange={handleFormChange} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '13px' }} />
                        <button type="button" onClick={() => { setImagePickerOpen(true); loadMediaFiles(''); }} style={{ padding: '8px 12px', fontSize: '13px', backgroundColor: '#4b5563', borderRadius: '6px', border: 'none', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>📁 選擇</button>
                      </div>
                      {formData.image_url && (
                        <div style={{ marginTop: '8px' }}>
                          <img src={formData.image_url} alt="預覽" style={{ maxWidth: '100%', maxHeight: '80px', borderRadius: '4px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                      {imagePickerOpen && (
                        <>
                          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999 }} onClick={() => setImagePickerOpen(false)} />
                          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', maxHeight: '70vh', backgroundColor: '#1f2937', borderRadius: '8px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', zIndex: 10000 }}>
                            <div style={{ padding: '8px 12px', borderBottom: '1px solid #374151', display: 'flex', gap: '6px' }}>
                              <input
                                value={imagePickerSearch}
                                placeholder="🔍 搜尋圖片名稱（Enter）"
                                onChange={(e) => setImagePickerSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') loadMediaFiles(imagePickerPath, imagePickerSearch); }}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#fff', fontSize: '13px', outline: 'none' }}
                              />
                              <button type="button" onClick={() => loadMediaFiles(imagePickerPath, imagePickerSearch)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: '#2563eb', borderRadius: '4px', border: 'none', color: '#fff' }}>搜尋</button>
                            </div>
                            <div style={{ padding: '6px 12px', borderBottom: '1px solid #374151', fontSize: '12px', color: '#9ca3af', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                              {imagePickerSearch && (
                                <span style={{ color: '#60a5fa', marginRight: '8px' }}>🔍「{imagePickerSearch}」{imagePickerFiles.length} 筆</span>
                              )}
                              <span onClick={() => loadMediaFiles('', '')} style={{ cursor: 'pointer', color: '#60a5fa' }}>/media/</span>
                              {imagePickerPath.split('/').filter(Boolean).map((seg, i, arr) => {
                                const segPath = arr.slice(0, i + 1).join('/');
                                return (
                                  <span key={segPath}>
                                    <span style={{ color: '#6b7280' }}>/</span>
                                    <span onClick={() => loadMediaFiles(segPath, '')} style={{ cursor: 'pointer', color: '#60a5fa' }}>{seg}</span>
                                  </span>
                                );
                              })}
                            </div>
                            <div style={{ flex: 1, overflow: 'auto' }}>
                              {imagePickerLoading && <div style={{ padding: '16px', color: '#9ca3af' }}>載入中...</div>}
                              {!imagePickerLoading && imagePickerFiles.length === 0 && (
                                <div style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>無符合的檔案</div>
                              )}
                              {!imagePickerLoading && imagePickerFiles.map(f => (
                                <div key={f.path} onClick={() => {
                                  if (f.type === 'dir') loadMediaFiles(f.path, '');
                                  else { setFormData({ ...formData, image_url: '/media/' + f.path }); setImagePickerOpen(false); }
                                }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #2d3748', color: f.type === 'dir' ? '#60a5fa' : '#9ca3af', fontSize: '14px' }}>
                                  {f.type === 'dir' ? '📁 ' : '🖼️ '}{f.name}
                                  {imagePickerSearch && (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const dir = f.path.split('/').slice(0, -1).join('/');
                                        loadMediaFiles(dir, '');
                                      }}
                                      title="前往此目錄"
                                      style={{ fontSize: '11px', color: '#3b82f6', marginLeft: '8px', cursor: 'pointer', textDecoration: 'underline' }}
                                    >{f.path}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div style={{ padding: '8px 16px', borderTop: '1px solid #374151', display: 'flex', justifyContent: 'space-between' }}>
                              <button type="button" onClick={() => { const p = imagePickerPath.split('/').filter(Boolean); loadMediaFiles(p.slice(0, -1).join('/'), ''); }} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: '#4b5563', borderRadius: '4px', border: 'none', color: '#fff' }}>📁 上層</button>
                              <button type="button" onClick={() => setImagePickerOpen(false)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: '#ef4444', borderRadius: '4px', border: 'none', color: '#fff' }}>取消</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>啟用</label>
                      <input name="is_active" type="checkbox" checked={formData.is_active} onChange={handleFormChange} style={{ width: '16px', height: '16px', accentColor: '#16a34a' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>通用型（全車系）</label>
                      <input name="is_universal" type="checkbox" checked={formData.is_universal} onChange={handleFormChange} style={{ width: '16px', height: '16px', accentColor: '#16a34a' }} />
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>描述</label>
                    <textarea name="description" value={formData.description} onChange={handleFormChange} rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>子分類</label>
                      <select name="subcategory_id" value={formData.subcategory_id} onChange={handleFormChange} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }}>
                        <option value="">無</option>
                        {subcategories.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.categoryName} - {sub.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>主分類 (多選)</label>
                      <select
                        multiple
                        name="category_ids"
                        value={formData.category_ids.map(String)}
                        onChange={e => {
                          const selected = Array.from(e.target.selectedOptions, opt => parseInt(opt.value));
                          setFormData(prev => ({ ...prev, category_ids: selected }));
                        }}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', height: '100px' }}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>按住 Ctrl (Cmd) 複選</p>
                    </div>
                  </div>

                  {/* 相容車型 */}
                  <div style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>相容車型 (點擊即可選取/取消)</label>
                      {editingPart && formData.brand && formData.model && (
                        <button
                          type="button"
                          onClick={fetchBatchApplyVariants}
                          disabled={batchApplyLoading}
                          style={{
                            padding: '8px 16px', borderRadius: '6px', fontSize: '13px',
                            fontWeight: '500', backgroundColor: '#9333ea', color: '#ffffff',
                            border: 'none', cursor: batchApplyLoading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {batchApplyLoading ? '載入中...' : '🔄 批次套用相容車型'}
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <select
                        value={brandFilter}
                        onChange={e => { setBrandFilter(e.target.value); setModelFilter(''); setGenFilter(''); }}
                        style={{ flex: 1, minWidth: '100px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '13px' }}
                      >
                        <option value="">所有品牌</option>
                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <select
                        value={modelFilter}
                        onChange={e => { setModelFilter(e.target.value); setGenFilter(''); }}
                        disabled={!brandFilter}
                        style={{ flex: 1, minWidth: '100px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '13px', opacity: brandFilter ? 1 : 0.5 }}
                      >
                        <option value="">所有車系</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select
                        value={genFilter}
                        onChange={e => setGenFilter(e.target.value)}
                        disabled={!modelFilter}
                        style={{ flex: 1, minWidth: '100px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#ffffff', outline: 'none', fontSize: '13px', opacity: modelFilter ? 1 : 0.5 }}
                      >
                        <option value="">所有世代</option>
                        {generations.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <button onClick={() => { setBrandFilter(''); setModelFilter(''); setGenFilter(''); }} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563', cursor: 'pointer' }}>清除篩選</button>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #374151', borderRadius: '8px', padding: '4px', backgroundColor: '#1f2937' }}>
                      {filteredVehicles.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '16px' }}>沒有符合條件的車型</p>
                      ) : (
                        filteredVehicles.map(v => {
                          const checked = (formData.compatible_vehicle_ids || []).includes(v.id);
                          const checkboxId = `vehicle-${v.id}`;
                          return (
                            <label key={v.id} htmlFor={checkboxId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.15s', backgroundColor: checked ? '#374151' : 'transparent' }}>
                              <input id={checkboxId} type="checkbox" checked={checked} onChange={() => toggleVehicle(v.id)} style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }} />
                              <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{getVehicleLabel(v)}</span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>已選 {formData.compatible_vehicle_ids?.length || 0} 個車型</p>

                    {formData.compatible_vehicle_ids?.length > 0 && (
                      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}>
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>目前已關聯車型 (點擊 ✕ 移除)：</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {formData.compatible_vehicle_ids.map(id => {
                            const vehicle = vehicles.find(v => v.id === id);
                            return vehicle ? (
                              <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#1e3a5f', border: '1px solid #1e40af', borderRadius: '4px', fontSize: '11px', color: '#93c5fd' }}>
                                {getVehicleLabel(vehicle)}
                                <button onClick={() => removeVehicleFromList(id)} style={{ background: 'none', border: 'none', color: '#f87171', fontWeight: 'bold', marginLeft: '4px', cursor: 'pointer' }}>✕</button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* 批次套用 Modal */}
                    {batchApplyOpen && (
                      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
                        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', maxWidth: '800px', width: '100%', maxHeight: '80vh', overflow: 'auto', border: '1px solid #374151', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                          <div style={{ padding: '24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>批次套用相容車型</h3>
                            <button onClick={() => setBatchApplyOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                          </div>

                          <div style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>選擇要套用的驅動類型</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                              {['FWD', 'RWD', 'AWD', '4WD'].map(dt => (
                                <label key={dt} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: batchApplySelectedDriveTypes.includes(dt) ? '#7c3aed' : '#1f2937', borderColor: batchApplySelectedDriveTypes.includes(dt) ? '#a855f7' : '#374151' }}>
                                  <input type="checkbox" checked={batchApplySelectedDriveTypes.includes(dt)} onChange={() => handleDriveTypeSelect(dt)} style={{ width: '16px', height: '16px', accentColor: '#a855f7' }} />
                                  <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: '500' }}>{{
                                    FWD: '前驅 (FWD)',
                                    RWD: '後驅 (RWD)',
                                    AWD: '四驅/全時四驅 (AWD)',
                                    '4WD': '分時四驅 (4WD)',
                                  }[dt] || dt}</span>
                                </label>
                              ))}
                            </div>

                            {batchApplySelectedDriveTypes.length > 0 && (
                              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#7c3aed20', border: '1px solid #a855f7', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#a855f7', marginBottom: '8px' }}>已選驅動類型: {batchApplySelectedDriveTypes.join(', ')}</p>
                                <button onClick={updateBatchApplyPreview} style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: '500', fontSize: '13px', border: 'none', cursor: 'pointer' }}>更新預覽</button>
                              </div>
                            )}

                            {Object.keys(batchApplyPreview).length > 0 && (
                              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#064e3b20', border: '1px solid #10b981', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#10b981', marginBottom: '12px', fontWeight: '500' }}>預覽將套用的車型: {Object.keys(batchApplyPreview).length} 個</p>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {Object.values(batchApplyPreview).map(v => (
                                    <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '4px', fontSize: '11px', color: '#e5e7eb' }}>
                                      <span style={{ fontWeight: '500' }}>{v.variant_name}</span>
                                      <span style={{ color: '#a855f7', fontSize: '10px' }}>({v.drive_type})</span>
                                    </span>
                                  ))}
                                </div>
                                <button onClick={handleBatchApply} style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer' }}>確定套用 ({Object.keys(batchApplyPreview).length} 個車型)</button>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #374151' }}>
                              <button onClick={() => setBatchApplyOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563', cursor: 'pointer' }}>取消</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #374151' }}>
                      <button onClick={() => { setEditingPart(null); setIsCreating(false); }} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#374151', color: '#ffffff', border: '1px solid #4b5563', cursor: 'pointer' }}>取消</button>
                      <button onClick={saveEdit} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}>
                        {saving ? '儲存中...' : (isCreating ? '新增商品' : '更新商品')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}