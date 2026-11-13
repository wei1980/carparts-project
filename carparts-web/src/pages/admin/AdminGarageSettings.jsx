// src/pages/admin/AdminGarageSettings.jsx
import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

export default function AdminGarageSettings() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    is_garage: false,
    is_approved: false,
    is_active: true,
    garage_name: '',
    garage_phone: '',
    garage_address: '',
    lat: '',
    lng: '',
    garage_slots: '',
    phone: '',
    password: '',
    contact_person: '',
    company_name: '',
    business_card: '',  // 🆕 名片路徑
  });

  useEffect(() => { loadWorkshops(); }, []);

  const loadWorkshops = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await adminClient.get('/garages');
      if (!Array.isArray(data)) throw new Error('Invalid garage list response');
      setWorkshops(data);
    } catch (err) {
      setLoadError([401, 403].includes(err.response?.status)
        ? '管理員登入已失效或權限不足，請重新登入。'
        : '車廠資料載入失敗，請重試。');
    } finally {
      setLoading(false);
    }
  };

    const startEdit = (w) => {
      setEditingId(w.id);
      // 🆕 從 garage_slots 中提取名片路徑
      let cardPath = '';
      if (w.garage_slots && typeof w.garage_slots === 'object' && w.garage_slots.business_card) {
        cardPath = w.garage_slots.business_card;
      } else if (w.garage_slots && typeof w.garage_slots === 'string') {
        try {
          const parsed = JSON.parse(w.garage_slots);
          cardPath = parsed.business_card || '';
        } catch {}
      }

      setForm({
        is_garage: w.is_garage || false,
        is_approved: w.is_approved || false,
        is_active: w.is_active || false,
        garage_name: w.garage_name || '',
        garage_phone: w.garage_phone || '',
        garage_address: w.garage_address || '',
        lat: w.lat || '',
        lng: w.lng || '',
        garage_slots: w.garage_slots ? (typeof w.garage_slots === 'string' ? w.garage_slots : JSON.stringify(w.garage_slots)) : '',
        phone: w.phone || '',
        password: '',
        contact_person: w.contact_person || '',
        company_name: w.company_name || '',
        business_card: cardPath,
      });
    };

    const cancelEdit = () => setEditingId(null);

    const quickApprove = async (id) => {
      await adminClient.patch(`/garages/${id}`, {
        is_approved: true,
        is_garage: true,
      });
      loadWorkshops();
    };

  const saveGarage = async () => {
    try {
      // 🆕 將名片路徑合併回 garage_slots
      let slots = {};
      try { slots = JSON.parse(form.garage_slots || '{}'); } catch {}
      if (form.business_card) {
        slots.business_card = form.business_card;
      }

      await adminClient.patch(`/garages/${editingId}`, {
        is_garage: form.is_garage,
        is_approved: form.is_approved,
        is_active: form.is_active,
        garage_name: form.garage_name,
        garage_phone: form.garage_phone,
        garage_address: form.garage_address,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
                garage_slots: slots,
                phone: form.phone,
                password: form.password || undefined,
                contact_person: form.contact_person,
                company_name: form.company_name,
              });
              toast.success('儲存成功');
              setEditingId(null);
              loadWorkshops();
            } catch (err) {
              toast.error('儲存失敗：' + (err.response?.data?.error || err.message));
            }
          };

          const deleteGarage = async (id, name) => {
            if (!(await confirmDialog({ message: `確定要刪除「${name}」嗎？此操作無法復原。` }))) return;
            try {
              await adminClient.delete(`/garages/${id}`);
              toast.success('已刪除');
              loadWorkshops();
            } catch (err) {
              toast.error('刪除失敗：' + (err.response?.data?.error || err.message));
            }
          };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">🏪 車廠管理</h1>

      {loading && <p role="status" className="text-surface-400">載入車廠中…</p>}
      {loadError && <div role="alert" className="mb-4 text-red-300">{loadError}
        <button onClick={loadWorkshops} className="ml-3 underline">重試</button>
        {loadError.includes('登入') && <a href="/admin/login" className="ml-3 underline">管理員登入</a>}
      </div>}
      {!loading && !loadError && workshops.length === 0 && <p className="text-surface-400">目前沒有車廠資料</p>}
      <div className="space-y-4">
        {workshops.map((w) => {
          // 🆕 提取名片路徑供顯示使用
          let cardPath = '';
          if (w.garage_slots && typeof w.garage_slots === 'object') {
            cardPath = w.garage_slots.business_card || '';
          }

          return (
            <div key={w.id} className="bg-surface-800 p-6 rounded-xl">
              {editingId === w.id ? (
                /* 編輯模式 */
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-white">{w.company_name}</h3>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-white">
                      <input type="checkbox" checked={form.is_approved} onChange={e => setForm({ ...form, is_approved: e.target.checked })} />
                      已審核
                    </label>
                    <label className="flex items-center gap-2 text-white">
                      <input type="checkbox" checked={form.is_garage} onChange={e => setForm({ ...form, is_garage: e.target.checked })} />
                      合作車廠
                    </label>
                    <label className="flex items-center gap-2 text-white">
                      <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                      啟用
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">公司名稱</label>
                      <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">聯絡人</label>
                      <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">登入手機</label>
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-surface-400 mb-1">新密碼（留空不修改）</label>
                    <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type="password" className="w-full p-2 rounded bg-surface-700 text-white" />
                  </div>

                  {/* 🆕 名片預覽 */}
                  {form.business_card && (
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">名片</label>
                      <img
                        src={form.business_card}
                        alt="名片"
                        className="max-w-xs max-h-48 rounded border border-surface-600 object-contain bg-black"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">公開名稱</label>
                      <input value={form.garage_name} onChange={e => setForm({ ...form, garage_name: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">公開電話</label>
                      <input value={form.garage_phone} onChange={e => setForm({ ...form, garage_phone: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">地址</label>
                    <input value={form.garage_address} onChange={e => setForm({ ...form, garage_address: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">緯度</label>
                      <input value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-surface-400 mb-1">經度</label>
                      <input value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-surface-400 mb-1">工位設定 (JSON)</label>
                    <textarea value={form.garage_slots} onChange={e => setForm({ ...form, garage_slots: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white font-mono text-sm" rows={2} />
                  </div>

                  <div className="flex gap-4">
                    <button onClick={saveGarage} className="bg-green-600 px-6 py-2 rounded hover:bg-green-700 text-white">儲存</button>
                    <button onClick={cancelEdit} className="bg-surface-600 px-6 py-2 rounded hover:bg-surface-500 text-white">取消</button>
                  </div>
                </div>
              ) : (
                /* 顯示模式 */
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {w.company_name || w.garage_name || '未命名'}
                      {w.is_garage && <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">合作車廠</span>}
                      {!w.is_approved && <span className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded">待審核</span>}
                    </h3>
                    <p className="text-surface-400 text-sm">手機：{w.phone} | 聯絡人：{w.contact_person}</p>
                    {w.is_garage && (
                      <div className="text-surface-400 text-sm mt-1">
                        <p>{w.garage_name && `名稱：${w.garage_name}`}</p>
                        <p>{w.garage_phone && `電話：${w.garage_phone}`}</p>
                        <p>{w.garage_address && `地址：${w.garage_address}`}</p>
                      </div>
                    )}
                    {/* 🆕 顯示模式下的名片縮圖 */}
                    {cardPath && (
                      <div className="mt-2">
                        <img
                          src={cardPath}
                          alt="名片"
                          className="max-w-[200px] max-h-[100px] rounded border border-surface-600 object-contain bg-black cursor-pointer hover:opacity-80"
                          onClick={() => window.open(cardPath, '_blank')}
                          title="點擊放大"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!w.is_approved && (
                      <button onClick={() => quickApprove(w.id)} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 text-white">
                        審核通過
                      </button>
                    )}
                    <button onClick={() => startEdit(w)} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 text-white">
                      編輯
                    </button>
                    <button onClick={() => deleteGarage(w.id, w.company_name || w.garage_name)} className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 text-white">
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}