// src/pages/garage/GarageSettings.jsx — 車廠門店設定（店面照 / 營業時間 / 標準工資表）
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { garageClient as api } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

const DAYS = [
  ['mon', '週一'], ['tue', '週二'], ['wed', '週三'], ['thu', '週四'],
  ['fri', '週五'], ['sat', '週六'], ['sun', '週日'],
];

export default function GarageSettings() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // 基本資料表單
  const [profile, setProfile] = useState({
    garage_name: '', garage_phone: '', garage_address: '',
    contact_person: '', shop_type: '',
  });
  const [hours, setHours] = useState({});

  // 工資表
  const [fees, setFees] = useState([]);
  const [newFee, setNewFee] = useState({ name: '', price: '', note: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFee, setEditFee] = useState({});

  const load = useCallback(() => {
    api.get('/garage/settings')
      .then(res => {
        setData(res.data);
        setProfile({
          garage_name: res.data.garage_name || '',
          garage_phone: res.data.garage_phone || '',
          garage_address: res.data.garage_address || '',
          contact_person: res.data.contact_person || '',
          shop_type: res.data.shop_type || '',
        });
        setHours(res.data.opening_hours || {});
        setFees(res.data.labor_fees || []);
      })
      .catch(err => console.warn('載入設定失敗:', err?.message || err));
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch('/garage/settings', { ...profile, opening_hours: hours });
      flash('✅ 已儲存');
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    } finally {
      setSavingProfile(false);
    }
  };

  // ---- 店面照 ----
  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      await api.post('/garage/settings/photos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '上傳失敗');
    }
    e.target.value = '';
  };

  const deletePhoto = async (idx) => {
    if (!(await confirmDialog({ message: '確定刪除這張照片？' }))) return;
    try {
      await api.delete(`/garage/settings/photos/${idx}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '刪除失敗');
    }
  };

  // ---- 工資表 ----
  const addFee = async () => {
    if (!newFee.name.trim() || newFee.price === '') { toast.error('請填寫項目名稱與工資'); return; }
    try {
      await api.post('/garage/settings/labor-fees', {
        name: newFee.name.trim(),
        price: parseInt(newFee.price),
        note: newFee.note.trim() || null,
      });
      setNewFee({ name: '', price: '', note: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '新增失敗');
    }
  };

  const saveFee = async (id) => {
    try {
      await api.patch(`/garage/settings/labor-fees/${id}`, {
        name: editFee.name,
        price: parseInt(editFee.price),
        note: editFee.note || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '更新失敗');
    }
  };

  const removeFee = async (id) => {
    if (!(await confirmDialog({ message: '確定刪除此工資項目？' }))) return;
    try {
      await api.delete(`/garage/settings/labor-fees/${id}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '刪除失敗');
    }
  };

  if (!data) return <div className="min-h-screen bg-slate-950 text-slate-100 p-6">載入中…</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 頂部列 */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/garage/dashboard')}>
          <span className="text-xl font-bold text-emerald-400">🔧 門店設定</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/garage/work-orders')} className="px-4 py-2 rounded-lg text-sm bg-slate-800 hover:bg-slate-700">工單管理</button>
          <button onClick={() => navigate('/garage/dashboard')} className="px-4 py-2 rounded-lg text-sm bg-slate-800 hover:bg-slate-700">返回首頁</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6 pb-24">
        {msg && <div className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg px-4 py-2 text-sm">{msg}</div>}

        {/* 基本資料 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <h2 className="font-bold text-lg">基本資料</h2>
          {[
            ['garage_name', '店家名稱'],
            ['garage_phone', '店家電話'],
            ['garage_address', '店家地址'],
            ['contact_person', '聯絡人'],
            ['shop_type', '店別類型（例：保養廠／鈑烤廠）'],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm text-slate-400">{label}</span>
              <input
                value={profile[key]}
                onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </label>
          ))}
        </section>

        {/* 營業時間 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <h2 className="font-bold text-lg">營業時間</h2>
          <p className="text-xs text-slate-500">格式 HH:mm-HH:mm，留空＝公休</p>
          {DAYS.map(([d, label]) => (
            <div key={d} className="flex items-center gap-3">
              <span className="w-12 text-sm text-slate-400">{label}</span>
              <input
                placeholder="公休"
                value={hours[d] || ''}
                onChange={e => setHours(h => ({ ...h, [d]: e.target.value || null }))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          ))}
        </section>

        {/* 店面照片 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">店面照片</h2>
            <label className={`px-4 py-2 rounded-lg text-sm cursor-pointer font-medium ${
              (data.garage_photos?.length || 0) >= 6
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}>
              ＋ 上傳照片
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={(data.garage_photos?.length || 0) >= 6} onChange={uploadPhoto} />
            </label>
          </div>
          <p className="text-xs text-slate-500">最多 6 張，自動壓縮。車主在車廠列表與詳情頁會看到。</p>
          {(data.garage_photos?.length || 0) === 0 ? (
            <div className="border-2 border-dashed border-slate-700 rounded-xl py-8 text-center text-slate-500 text-sm">尚未上傳店面照</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {data.garage_photos.map((p, idx) => (
                <div key={idx} className="relative group">
                  <img src={p.url} alt={`店面照 ${idx + 1}`} loading="lazy" className="w-full h-28 object-cover rounded-lg" />
                  <button
                    onClick={() => deletePhoto(idx)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-500 text-white text-sm opacity-0 group-hover:opacity-100 transition"
                  >×</button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-emerald-400">封面</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 標準工資表 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <h2 className="font-bold text-lg">標準工資表</h2>
          <p className="text-xs text-slate-500">車主預約時會看到這些價格；特殊零件或維修請在「備註」說明另行估價。</p>

          {fees.length === 0 && <div className="text-sm text-slate-500 py-2">尚無工資項目，新增第一筆吧！</div>}

          {fees.map(fee => (
            editingId === fee.id ? (
              <div key={fee.id} className="flex flex-wrap gap-2 items-center bg-slate-800/60 rounded-lg p-2">
                <input value={editFee.name} onChange={e => setEditFee(f => ({ ...f, name: e.target.value }))} className="flex-1 min-w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm" />
                <input type="number" value={editFee.price} onChange={e => setEditFee(f => ({ ...f, price: e.target.value }))} className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm" />
                <input placeholder="備註（另議說明）" value={editFee.note || ''} onChange={e => setEditFee(f => ({ ...f, note: e.target.value }))} className="flex-1 min-w-40 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm" />
                <button onClick={() => saveFee(fee.id)} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-sm">儲存</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm">取消</button>
              </div>
            ) : (
              <div key={fee.id} className="flex items-center gap-3 border-b border-slate-800 pb-2">
                <span className="flex-1 text-sm">{fee.name}{fee.note && <span className="ml-2 text-xs text-slate-500">{fee.note}</span>}</span>
                <span className="font-mono text-emerald-400">${Number(fee.price).toLocaleString()}</span>
                <button onClick={() => { setEditingId(fee.id); setEditFee({ name: fee.name, price: fee.price, note: fee.note }); }} className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">編輯</button>
                <button onClick={() => removeFee(fee.id)} className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-300">刪除</button>
              </div>
            )
          ))}

          {/* 新增列 */}
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-800">
            <input placeholder="項目名稱（例：機油更換）" value={newFee.name} onChange={e => setNewFee(f => ({ ...f, name: e.target.value }))} className="flex-1 min-w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />
            <input placeholder="工資" type="number" value={newFee.price} onChange={e => setNewFee(f => ({ ...f, price: e.target.value }))} className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />
            <input placeholder="備註（特殊維修另議…）" value={newFee.note} onChange={e => setNewFee(f => ({ ...f, note: e.target.value }))} className="flex-1 min-w-40 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />
            <button onClick={addFee} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium">＋ 新增</button>
          </div>
        </section>

        {/* 儲存按鈕 */}
        <button onClick={saveProfile} disabled={savingProfile} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-50">
          {savingProfile ? '儲存中…' : '儲存基本資料與營業時間'}
        </button>
      </main>
    </div>
  );
}
