import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

export default function AdminAiDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ready');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ parts: [] });
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState(false);
  const [processingId, setProcessingId] = useState(null); // 用於重新處理的按鈕狀態

  // 載入分類樹
  useEffect(() => {
    adminClient.get('/categories/tree')
      .then(res => {
        setCategories(res.data || []);
        setCategoriesError(false);
      })
      .catch(err => {
        console.error('載入分類失敗:', err);
        setCategoriesError(true);
      });
  }, []);

  const loadDrafts = async () => {
      setLoading(true);
      try {
        const res = await adminClient.get(`/ai-drafts?status=${statusFilter}&_t=${Date.now()}`);
        setDrafts(res.data || []);
      } catch (error) {
        console.error('載入草稿失敗:', error);
        toast.error('載入草稿失敗，請檢查後端服務');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadDrafts();
    }, [statusFilter]);

    const approveDraft = async (id) => {
      if (!(await confirmDialog({ message: '確定要通過此草稿並正式上架零件？' }))) return;
      try {
        await adminClient.post(`/ai-drafts/${id}/approve`);
        loadDrafts();
      } catch (error) {
        console.error('通過草稿失敗:', error);
        toast.error('通過草稿失敗：' + (error.response?.data?.error || error.message));
      }
    };

    const rejectDraft = async (id) => {
      if (!(await confirmDialog({ message: '確定要拒絕此草稿？' }))) return;
      try {
        await adminClient.post(`/ai-drafts/${id}/reject`);
        loadDrafts();
      } catch (error) {
        console.error('拒絕草稿失敗:', error);
        toast.error('拒絕草稿失敗：' + (error.response?.data?.error || error.message));
      }
    };

    // 重新處理草稿（重新觸發 AI）
    const reprocessDraft = async (id) => {
      if (!(await confirmDialog({ message: '確定要重新處理此草稿嗎？這將重新呼叫 AI 並覆蓋現有結果。' }))) return;
      setProcessingId(id);
    try {
          await adminClient.post(`/ai-drafts/${id}/reprocess`);
          // 等待幾秒後重新載入（後端可能非同步）
          setTimeout(() => {
            loadDrafts();
            setProcessingId(null);
          }, 3000);
          toast.success('已觸發重新處理，請稍後查看結果。');
        } catch (error) {
          console.error('重新處理失敗:', error);
          toast.error('重新處理失敗：' + (error.response?.data?.error || error.message));
          setProcessingId(null);
        }
      };

  const startEdit = (draft) => {
    setEditingId(draft.id);
    const rawData = draft.result_json;
    let safeParts = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];

    // 嘗試將 AI 回傳的 category/subcategory 文字對應到現有分類
    safeParts = safeParts.map(part => {
      if (!part.category_id && part.category) {
        const foundCat = categories.find(c => c.name === part.category);
        if (foundCat) part.category_id = foundCat.id;
      }
      if (!part.subcategory_id && part.subcategory && part.category_id) {
        const parentCat = categories.find(c => c.id === parseInt(part.category_id));
        const foundSub = parentCat?.subcategories?.find(s => s.name === part.subcategory);
        if (foundSub) part.subcategory_id = foundSub.id;
      }
      // 確保每個 part 都有必要的欄位
      return {
        sku: part.sku || '',
        name: part.name || '',
        brand: part.brand || '',
        description: part.description || '',
        msrp_price: part.msrp_price ?? null,
        wholesale_price: part.wholesale_price ?? null,
        category_id: part.category_id || '',
        subcategory_id: part.subcategory_id || '',
        category: part.category || '',
        subcategory: part.subcategory || '',
        image_url: part.image_url || '',
        ...part, // 保留其他可能欄位
      };
    });

    setEditForm({ parts: safeParts });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
          await adminClient.patch(`/ai-drafts/${editingId}`, {
            result_json: editForm.parts,
          });
          setEditingId(null);
          loadDrafts();
        } catch (error) {
          console.error('儲存修改失敗:', error);
          toast.error('儲存修改失敗：' + (error.response?.data?.error || error.message));
        }
      };

  const updatePart = (idx, field, value) => {
    const parts = [...editForm.parts];
    parts[idx] = {
      ...parts[idx],
      [field]: value,
    };
    setEditForm({ parts });
  };

  // 新增一個空零件
  const addPart = () => {
    const newPart = {
      sku: '',
      name: '',
      brand: '',
      description: '',
      msrp_price: null,
      wholesale_price: null,
      category_id: '',
      subcategory_id: '',
      category: '',
      subcategory: '',
      image_url: '',
    };
    setEditForm({ parts: [...editForm.parts, newPart] });
  };

  // 刪除一個零件
  const removePart = async (idx) => {
    if (!(await confirmDialog({ message: '確定要移除這個零件嗎？' }))) return;
    const parts = [...editForm.parts];
    parts.splice(idx, 1);
    setEditForm({ parts });
  };

  const getSubcategories = (categoryId) => {
    const cat = categories.find(c => c.id === parseInt(categoryId));
    return cat?.subcategories || [];
  };

  const statusOptions = [
    { key: 'ready', label: '待審核' },
    { key: 'pending', label: '處理中' },
    { key: 'approved', label: '已通過' },
    { key: 'rejected', label: '已拒絕' },
    { key: 'failed', label: '處理失敗' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">🤖 AI 零件草稿審核</h1>

      {/* 狀態篩選 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setStatusFilter(opt.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              statusFilter === opt.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {categoriesError && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          ⚠️ 分類資料載入失敗，編輯時將無法選擇分類。請重新整理頁面或檢查網路。
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          載入中...
        </div>
      ) : drafts.length === 0 ? (
        <p className="text-gray-400">
          沒有{statusOptions.find(o => o.key === statusFilter)?.label || ''}的草稿
        </p>
      ) : (
        <div className="space-y-4">
          {drafts.map(d => (
            <div key={d.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white">{d.query}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    來源：{d.source_type === 'image' ? '圖片' : d.source_type === 'url' ? '網址' : '文字'}
                    {d.customerVehicle ? ` | 客戶車輛：${d.customerVehicle.make} ${d.customerVehicle.model}` : ''}
                  </p>
                  <p className="text-gray-500 text-xs">建立時間：{new Date(d.created_at).toLocaleString()}</p>
                  {d.status === 'failed' && (
                    <p className="text-red-400 text-xs mt-1">❌ 處理失敗，請檢查日誌或重新處理</p>
                  )}
                  {d.status === 'ready' && Array.isArray(d.result_json) && d.result_json.length === 0 && (
                    <p className="text-yellow-400 text-xs mt-1">⚠️ 此草稿無任何零件，建議重新處理或手動新增</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {d.status === 'ready' && (
                    <button
                      onClick={() => approveDraft(d.id)}
                      className="bg-green-600 px-3 py-1 rounded text-white hover:bg-green-700 transition"
                    >
                      通過
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(d)}
                    className="bg-blue-600 px-3 py-1 rounded text-white hover:bg-blue-700 transition"
                  >
                    編輯
                  </button>
                  {(d.status === 'ready' || d.status === 'failed') && (
                    <button
                      onClick={() => reprocessDraft(d.id)}
                      disabled={processingId === d.id}
                      className={`px-3 py-1 rounded text-white transition ${
                        processingId === d.id
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {processingId === d.id ? '處理中...' : '重新處理'}
                    </button>
                  )}
                  <button
                    onClick={() => rejectDraft(d.id)}
                    className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700 transition"
                  >
                    拒絕
                  </button>
                </div>
              </div>

              {editingId === d.id ? (
                <div className="mt-4 space-y-4">
                  {editForm.parts.length === 0 && (
                    <div className="text-yellow-400 text-sm mb-2">
                      此草稿沒有零件資料，請手動新增或拒絕。
                    </div>
                  )}
                  {editForm.parts.map((part, idx) => (
                    <div key={idx} className="bg-gray-700 p-4 rounded-lg space-y-3 relative">
                      <button
                        onClick={() => removePart(idx)}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        ✕
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">SKU</label>
                          <input
                            value={part.sku || ''}
                            onChange={e => updatePart(idx, 'sku', e.target.value)}
                            placeholder="輸入 SKU"
                            className="w-full p-2 rounded bg-gray-600 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">零件名稱 *</label>
                          <input
                            value={part.name || ''}
                            onChange={e => updatePart(idx, 'name', e.target.value)}
                            placeholder="輸入名稱"
                            className="w-full p-2 rounded bg-gray-600 text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">品牌</label>
                          <input
                            value={part.brand || ''}
                            onChange={e => updatePart(idx, 'brand', e.target.value)}
                            placeholder="輸入品牌"
                            className="w-full p-2 rounded bg-gray-600 text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">建議售價</label>
                          <input
                            value={part.msrp_price ?? ''}
                            onChange={e => updatePart(idx, 'msrp_price', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="輸入建議售價"
                            type="number"
                            className="w-full p-2 rounded bg-gray-600 text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">批發價</label>
                          <input
                            value={part.wholesale_price ?? ''}
                            onChange={e => updatePart(idx, 'wholesale_price', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="輸入批發價"
                            type="number"
                            className="w-full p-2 rounded bg-gray-600 text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">圖片網址</label>
                          <input
                            value={part.image_url || ''}
                            onChange={e => updatePart(idx, 'image_url', e.target.value)}
                            placeholder="輸入圖片網址"
                            className="w-full p-2 rounded bg-gray-600 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">主分類</label>
                          <select
                            value={part.category_id || ''}
                            onChange={e => {
                              updatePart(idx, 'category_id', e.target.value);
                              updatePart(idx, 'subcategory_id', '');
                            }}
                            className="w-full p-2 rounded bg-gray-600 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            disabled={categoriesError}
                          >
                            <option value="">請選擇主分類</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                          {part.category && !part.category_id && (
                            <p className="text-xs text-gray-500">AI 原始分類：{part.category}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400 font-medium">子分類</label>
                          <select
                            value={part.subcategory_id || ''}
                            onChange={e => updatePart(idx, 'subcategory_id', e.target.value)}
                            disabled={!part.category_id || categoriesError}
                            className="w-full p-2 rounded bg-gray-600 text-white disabled:opacity-50"
                          >
                            <option value="">請選擇子分類</option>
                            {part.category_id && getSubcategories(part.category_id).map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                          {part.subcategory && !part.subcategory_id && (
                            <p className="text-xs text-gray-500">AI 原始子分類：{part.subcategory}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-400 font-medium">描述</label>
                        <textarea
                          value={part.description || ''}
                          onChange={e => updatePart(idx, 'description', e.target.value)}
                          placeholder="輸入描述"
                          rows={2}
                          className="w-full p-2 rounded bg-gray-600 text-white"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={addPart}
                      className="bg-green-600 px-4 py-2 rounded text-white hover:bg-green-700 transition"
                    >
                      ＋ 新增零件
                    </button>
                    <button
                      onClick={saveEdit}
                      className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700 transition"
                    >
                      儲存修改
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-gray-600 px-4 py-2 rounded text-white hover:bg-gray-500 transition"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <pre className="mt-4 bg-gray-700 p-3 rounded text-xs text-gray-300 overflow-x-auto max-h-96">
                  {JSON.stringify(d.result_json, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}