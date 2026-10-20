import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

export default function AdminVehicleApproval() {
  const [variants, setVariants] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    make: '', model: '', generation: '', engine_code: '',
    year_start: '', year_end: '', specs: '', is_approved: false,
  });

  useEffect(() => {
    loadVariants();
  }, [filter]);

  const loadVariants = () => {
    setLoading(true);
    adminClient.get(`/variants?status=${filter}`)
      .then(res => setVariants(res.data))
      .finally(() => setLoading(false));
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditForm({
      make: v.make || '',
      model: v.model || '',
      generation: v.generation || '',
      engine_code: v.engine_code || '',
      year_start: v.year_start || '',
      year_end: v.year_end || '',
      specs: v.specs ? JSON.stringify(v.specs) : '',
      is_approved: v.is_approved || false,
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    const data = { ...editForm };
    if (data.year_start) data.year_start = parseInt(data.year_start);
    if (data.year_end) data.year_end = parseInt(data.year_end);
    if (data.specs) {
      try { data.specs = JSON.parse(data.specs); } catch { toast.error('規格 JSON 格式錯誤'); return; }
    } else {
      data.specs = {};
    }
    await adminClient.patch(`/variants/${editingId}`, data);
    toast.success('已儲存');
    setEditingId(null);
    loadVariants();
  };

  const approve = async (id) => {
    await adminClient.patch(`/variants/${id}`, { is_approved: true });
    loadVariants();
  };

  const reject = async (id) => {
    if (!(await confirmDialog({ message: '確定要拒絕並刪除此車型？已關聯的車輛將解除關聯。' }))) return;
    await adminClient.delete(`/variants/${id}`);
    loadVariants();
  };

  const approveAll = async () => {
    if (!(await confirmDialog({ message: '確定要審核通過所有待審核車型？' }))) return;
    for (const v of variants) {
      await approve(v.id);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">🚗 車型審核</h1>
      <div className="flex gap-4 mb-6">
        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-yellow-600' : 'bg-gray-700'}`}>待審核</button>
        <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded ${filter === 'approved' ? 'bg-green-600' : 'bg-gray-700'}`}>已通過</button>
        {filter === 'pending' && variants.length > 0 && (
          <button onClick={approveAll} className="bg-blue-600 px-4 py-2 rounded">全部通過</button>
        )}
      </div>
      {loading ? <p className="text-gray-400">載入中...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {variants.map(v => (
            <div key={v.id} className="bg-gray-800 p-4 rounded-xl">
              {editingId === v.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editForm.make} onChange={e => setEditForm({...editForm, make: e.target.value})} placeholder="品牌" className="p-2 rounded bg-gray-700 text-white" />
                    <input value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} placeholder="車系" className="p-2 rounded bg-gray-700 text-white" />
                    <input value={editForm.generation} onChange={e => setEditForm({...editForm, generation: e.target.value})} placeholder="世代" className="p-2 rounded bg-gray-700 text-white" />
                    <input value={editForm.engine_code} onChange={e => setEditForm({...editForm, engine_code: e.target.value})} placeholder="引擎代碼" className="p-2 rounded bg-gray-700 text-white" />
                    <input value={editForm.year_start} onChange={e => setEditForm({...editForm, year_start: e.target.value})} placeholder="年份開始" type="number" className="p-2 rounded bg-gray-700 text-white" />
                    <input value={editForm.year_end} onChange={e => setEditForm({...editForm, year_end: e.target.value})} placeholder="年份結束" type="number" className="p-2 rounded bg-gray-700 text-white" />
                  </div>
                  <textarea value={editForm.specs} onChange={e => setEditForm({...editForm, specs: e.target.value})} placeholder="規格 JSON" rows={2} className="w-full p-2 rounded bg-gray-700 text-white" />
                  <label className="flex items-center gap-2 text-white">
                    <input type="checkbox" checked={editForm.is_approved} onChange={e => setEditForm({...editForm, is_approved: e.target.checked})} />
                    審核通過
                  </label>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="bg-green-600 px-3 py-1 rounded text-white">儲存</button>
                    <button onClick={cancelEdit} className="bg-gray-600 px-3 py-1 rounded text-white">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg">{v.make} {v.model}</h3>
                  <p className="text-gray-400">{v.generation || '無世代'} | {v.engine_code || '無引擎'}</p>
                  <p className="text-gray-500">{v.year_start}-{v.year_end}</p>
                  <div className="mt-4 flex gap-2">
                    {!v.is_approved && (
                      <button onClick={() => approve(v.id)} className="bg-green-600 px-3 py-1 rounded text-white">通過</button>
                    )}
                    <button onClick={() => startEdit(v)} className="bg-blue-600 px-3 py-1 rounded text-white">編輯</button>
                    <button onClick={() => reject(v.id)} className="bg-red-600 px-3 py-1 rounded text-white">拒絕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}