// src/pages/garage/GarageCustomers.jsx — 車廠：客戶管理 / 來車記錄 / 標籤
import { useEffect, useState, useCallback } from 'react';
import { garageClient as api } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

export default function GarageCustomers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', lineId: '', tags: '', note: '' });
  const [allTags, setAllTags] = useState([]);

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = { page: targetPage, pageSize: 20 };
      if (search) params.search = search;
      if (filterTag) params.tag = filterTag;

      const res = await api.get('/garage/customers', { params });
      setCustomers(res.data.customers || []);
      setPagination(res.data.pagination || null);
      setAllTags(res.data.all_tags || []);
    } catch (err) {
      console.warn('載入失敗:', err?.message || err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterTag]);

  useEffect(() => { load(1); }, [search, filterTag]);
  useEffect(() => { load(page); }, [page]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
  const handleTagFilter = (tag) => { setFilterTag(tag); setPage(1); };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) { toast.error('姓名與電話為必填'); return; }
    try {
      const url = editing ? `/garage/customers/${editing.id}` : '/garage/customers';
      const method = editing ? 'patch' : 'post';
      await api[method](url, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        lineId: formData.lineId.trim() || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        note: formData.note.trim() || null
      });
      setShowForm(false);
      setEditing(null);
      setFormData({ name: '', phone: '', lineId: '', tags: '', note: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setFormData({ name: c.name, phone: c.phone, lineId: c.lineId || '', tags: (c.tags || []).join(', '), note: c.note || '' });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setFormData({ name: '', phone: '', lineId: '', tags: '', note: '' });
    setShowForm(true);
  };

  const deleteCustomer = async (id) => {
    if (!(await confirmDialog({ message: '確定刪除此客戶？' }))) return;
    try {
      await api.delete(`/garage/customers/${id}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '刪除失敗');
    }
  };

  const handleView = (c) => {
    setSelectedCustomer(c);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 頂部列 */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.history.back()}>
          <span className="text-xl font-bold text-emerald-400">👥 客戶管理</span>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500">＋ 新增客戶</button>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6 pb-24">
        {/* 搜尋與篩選 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="搜尋姓名、電話、LINE ID、標籤..."
              value={search}
              onChange={handleSearch}
              className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
            <select
              value={filterTag}
              onChange={e => handleTagFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部標籤</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* 客戶列表 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">載入中...</div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">暫無客戶資料，點擊「＋ 新增客戶」開始建立</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">客戶</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">聯絡資訊</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">標籤</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">來車次數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">最近來車</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider pr-4">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/50 cursor-pointer" onClick={() => handleView(c)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{c.name}</p>
                          {c.lineId && <p className="text-xs text-slate-400 mt-0.5">LINE: {c.lineId}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{c.phone}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags || []).slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">{tag}</span>
                            ))}
                            {(c.tags || []).length > 3 && <span className="px-2 py-0.5 text-[10px] text-slate-500">+{(c.tags || []).length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-mono">{c.visit_count || 0}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {c.last_visit ? new Date(c.last_visit).toLocaleDateString('zh-TW') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right pr-4 space-x-2">
                          <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">編輯</button>
                          <button onClick={e => { e.stopPropagation(); deleteCustomer(c.id); }} className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300">刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分頁 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-sm text-slate-400">共 {pagination.total} 筆，第 {pagination.page} / {pagination.totalPages} 頁</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">上一頁</button>
                    <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">下一頁</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 客戶詳細 Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-800 overflow-hidden animate-slide-in">
              <button onClick={() => setSelectedCustomer(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white">✕</button>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                    <p className="text-slate-400 text-sm mt-1">{selectedCustomer.phone} {selectedCustomer.lineId ? `· LINE: ${selectedCustomer.lineId}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="chip bg-emerald-500/20 text-emerald-400 border-emerald-500/30">來車 {selectedCustomer.visit_count || 0} 次</span>
                    {selectedCustomer.last_visit && <span className="chip">最近 {new Date(selectedCustomer.last_visit).toLocaleDateString('zh-TW')}</span>}
                  </div>
                </div>

                {/* 標籤管理 */}
                <div>
                  <h4 className="font-medium mb-3">標籤管理</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(selectedCustomer.tags || []).map(tag => (
                      <span key={tag} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1 text-sm">
                        {tag}
                        <button onClick={() => {
                          const newTags = (selectedCustomer.tags || []).filter(t => t !== tag);
                          api.patch(`/garage/customers/${selectedCustomer.id}`, { tags: newTags })
                            .then(() => load())
                            .catch(err => toast.error('更新失敗'));
                        }} className="text-emerald-300 hover:text-emerald-100">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="新增標籤..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" onKeyDown={e => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const newTags = [...(selectedCustomer.tags || []), e.target.value.trim()];
                        api.patch(`/garage/customers/${selectedCustomer.id}`, { tags: newTags })
                          .then(() => { e.target.value = ''; load(); })
                          .catch(err => toast.error('新增失敗'));
                      }
                    }} />
                  </div>
                </div>

                {/* 來車記錄 */}
                <div>
                  <h4 className="font-medium mb-3">來車記錄</h4>
                  {selectedCustomer.visits?.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedCustomer.visits.map(v => (
                        <div key={v.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{new Date(v.created_at).toLocaleDateString('zh-TW')}</span>
                            <span className="text-xs text-slate-400">{v.status}</span>
                          </div>
                          <p className="text-sm text-slate-300 mt-1">{v.summary || v.service_type || '保養/維修'}</p>
                          {v.total_amount && <p className="text-xs text-emerald-400 mt-1">NT$ {Number(v.total_amount).toLocaleString()}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm py-4 text-center">尚無來車記錄</p>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button onClick={() => { setEditing(selectedCustomer); setShowForm(true); setSelectedCustomer(null); }} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium">編輯資料</button>
                  <button onClick={() => setSelectedCustomer(null)} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-medium">關閉</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 新增/編輯客戶 Modal */}
        {(showForm || editing) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-800 animate-slide-in">
              <button onClick={() => { setShowForm(false); setEditing(null); setFormData({ name: '', phone: '', lineId: '', tags: '', note: '' }); }} className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white">✕</button>

              <div className="p-6 space-y-4">
                <h3 className="text-lg font-bold">{editing ? '編輯客戶' : '新增客戶'}</h3>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-slate-400">姓名 *</span>
                    <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" required />
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-400">電話 *</span>
                    <input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" required />
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-400">LINE ID</span>
                    <input value={formData.lineId} onChange={e => setFormData(f => ({ ...f, lineId: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-400">標籤（逗號分隔）</span>
                    <input value={formData.tags} onChange={e => setFormData(f => ({ ...f, tags: e.target.value }))} placeholder="如：VIP, 常客, 改裝車" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-400">備註</span>
                    <textarea value={formData.note} onChange={e => setFormData(f => ({ ...f, note: e.target.value }))} rows={3} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button onClick={handleSubmit} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium disabled:opacity-50">{editing ? '更新' : '新增'}</button>
                  <button onClick={() => { setShowForm(false); setEditing(null); setFormData({ name: '', phone: '', lineId: '', tags: '', note: '' }); }} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-medium">取消</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}