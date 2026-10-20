import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubNames, setNewSubNames] = useState({});

  // 編輯狀態
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingSubId, setEditingSubId] = useState(null);
  const [editingSubName, setEditingSubName] = useState('');

  const loadCategories = () => {
        setLoading(true);
        adminClient.get('/categories/tree')
          .then(res => setCategories(res.data || []))
          .catch(err => toast.error('取得分類失敗：' + (err.response?.data?.error || err.message)))
          .finally(() => setLoading(false));
      };

    useEffect(() => { loadCategories(); }, []);

    const addCategory = async () => {
        if (!newCategoryName.trim()) return toast.success('請輸入主分類名稱');
        await adminClient.post('/categories', { name: newCategoryName });
        setNewCategoryName('');
        loadCategories();
      };

    const saveCategoryName = async (id) => {
        if (!editingCategoryName.trim()) return toast.success('名稱不可空白');
        await adminClient.put(`/categories/${id}`, { name: editingCategoryName });
        setEditingCategoryId(null);
        loadCategories();
      };

    const deleteCategory = async (id, name) => {
        if (!(await confirmDialog({ message: `確定要刪除「${name}」及其所有子分類？` }))) return;
        try {
          await adminClient.delete(`/categories/${id}`);
          toast.success('主分類已刪除');
          loadCategories();
        } catch (err) {
          toast.error('刪除失敗：' + (err.response?.data?.error || err.message));
        }
      };

    const addSubcategory = async (categoryId) => {
        const name = newSubNames[categoryId]?.trim();
        if (!name) return toast.success('請輸入子分類名稱');
        await adminClient.post(`/categories/${categoryId}/subcategories`, { name });
        setNewSubNames(prev => ({ ...prev, [categoryId]: '' }));
        loadCategories();
      };

    const saveSubName = async (id) => {
        if (!editingSubName.trim()) return toast.success('名稱不可空白');
        await adminClient.put(`/categories/subcategories/${id}`, { name: editingSubName });
        setEditingSubId(null);
        loadCategories();
      };

    const deleteSubcategory = async (id, name) => {
        if (!(await confirmDialog({ message: `確定要刪除子分類「${name}」？` }))) return;
        try {
          await adminClient.delete(`/categories/subcategories/${id}`);
          toast.success('子分類已刪除');
          loadCategories();
        } catch (err) {
          toast.error('刪除失敗：' + (err.response?.data?.error || err.message));
        }
      };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">🗂️ 商品目錄管理</h1>

      {/* 新增主分類 */}
      <div className="bg-gray-800 p-4 rounded-xl mb-6 flex gap-2">
        <input
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          placeholder="輸入新主分類名稱"
          className="flex-1 p-2 rounded bg-gray-700 text-white"
        />
        <button onClick={addCategory} className="bg-blue-600 px-4 py-2 rounded text-white">新增主分類</button>
      </div>

      {loading ? (
        <div className="text-gray-400">載入中...</div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex justify-between items-center gap-4">
                {editingCategoryId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editingCategoryName}
                      onChange={e => setEditingCategoryName(e.target.value)}
                      className="flex-1 p-2 rounded bg-gray-700 text-white"
                    />
                    <button onClick={() => saveCategoryName(cat.id)} className="bg-green-600 px-3 py-1 rounded text-white">儲存</button>
                    <button onClick={() => setEditingCategoryId(null)} className="bg-gray-600 px-3 py-1 rounded text-white">取消</button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-white cursor-pointer"
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setEditingCategoryName(cat.name);
                        }}>
                      {cat.name} <span className="text-xs text-gray-400 ml-1">✏️</span>
                    </h3>
                    <button onClick={() => deleteCategory(cat.id, cat.name)} className="bg-red-600 px-3 py-1 rounded text-white text-sm">刪除</button>
                  </>
                )}
              </div>

              {/* 子分類 */}
              <div className="mt-4 space-y-2">
                {cat.subcategories.length === 0 && <p className="text-gray-500 text-sm">尚無子分類</p>}
                {cat.subcategories.map(sub => (
                  <div key={sub.id} className="flex justify-between items-center bg-gray-700 px-4 py-2 rounded">
                    {editingSubId === sub.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          value={editingSubName}
                          onChange={e => setEditingSubName(e.target.value)}
                          className="flex-1 p-1 rounded bg-gray-600 text-white"
                        />
                        <button onClick={() => saveSubName(sub.id)} className="bg-green-600 px-2 py-1 rounded text-white text-sm">儲存</button>
                        <button onClick={() => setEditingSubId(null)} className="bg-gray-600 px-2 py-1 rounded text-white text-sm">取消</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-white cursor-pointer"
                              onClick={() => {
                                setEditingSubId(sub.id);
                                setEditingSubName(sub.name);
                              }}>
                          {sub.name} <span className="text-xs text-gray-400">✏️</span>
                        </span>
                        <button onClick={() => deleteSubcategory(sub.id, sub.name)} className="text-red-400 text-sm">刪除</button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* 新增子分類 */}
              <div className="mt-3 flex gap-2">
                <input
                  value={newSubNames[cat.id] || ''}
                  onChange={e => setNewSubNames(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder="新子分類名稱"
                  className="flex-1 p-2 rounded bg-gray-700 text-white"
                />
                <button onClick={() => addSubcategory(cat.id)} className="bg-green-600 px-3 py-1 rounded text-white">新增</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}