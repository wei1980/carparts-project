// src/pages/garage/GarageWorkOrders.jsx — 車廠：工單管理（從預約開單 / 自開單）
import { useEffect, useState, useCallback } from 'react';
import { garageClient as api } from '../../api/client';
import { confirmDialog } from '../../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../../utils/userFriendlyErrors';
import GarageNav from '../../components/GarageNav';

const statusMap = {
  DRAFT: '建立中',
  IN_PROGRESS: '施工中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const emptyItem = { kind: 'LABOR', name: '', quantity: 1, unit_price: 0, part_sku: '', part_brand: '' };

export default function GarageWorkOrders() {
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // 開單表單
  const [apptId, setApptId] = useState('');
  const [mileage, setMileage] = useState('');
  const [summary, setSummary] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [laborFees, setLaborFees] = useState([]); // 🆕 標準工資表（LABOR 下拉帶價）

  const load = useCallback(() => {
    api.get('/garage/service-records')
      .then(res => setRecords(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
    api.get('/garage/appointments')
      .then(res => {
        setAppointments(res.data);
        // 🆕 預約列表 API 已附帶 labor_fees，直接取用
        if (Array.isArray(res.data) && res.data[0]?.labor_fees) setLaborFees(res.data[0].labor_fees);
      })
      .catch(err => console.warn('載入失敗:', err?.message || err));
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = items.reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);

  const updateItem = (i, field, value) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };

  const handleSubmit = async () => {
    const valid = items.filter(it => it.name.trim());
    if (valid.length === 0) {
      toast.error('請至少填一個工項或零件名稱');
      return;
    }

    // 由預約轉工單時，取得車主車輛
    let vehicleId;
    if (apptId) {
      const appt = appointments.find(a => String(a.id) === String(apptId));
      vehicleId = appt?.vehicle_id;
    }
    if (!vehicleId) {
      toast.error('請選擇預約單（工單需對應車輛）');
      return;
    }

    setSaving(true);
    try {
      await api.post('/garage/service-records', {
        vehicleId,
        appointmentId: apptId || undefined,
        mileageKm: mileage || undefined,
        summary,
        items: valid.map(it => ({
          kind: it.kind,
          name: it.name,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          part_sku: it.part_sku || undefined,
          part_brand: it.part_brand || undefined,
        })),
      });

      // 重置表單
      setShowForm(false); setApptId(''); setMileage(''); setSummary(''); setItems([{ ...emptyItem }]);
      toast.success('工單建立成功');
      load();
    } catch (err) {
      const friendlyError = getUserFriendlyError(err, '開單失敗：');
      toast.error(friendlyError.message);
    } finally {
      setSaving(false);
    }
  };

  const completeRecord = async (id) => {
    const confirmed = await confirmDialog({
      message: '確定要將此工單標記為完工？此操作不可復原。',
      confirmText: '確定完工',
      danger: false,
    });
    if (!confirmed) return;
    try {
      await api.patch(`/garage/service-records/${id}`, { status: 'COMPLETED' });
      toast.success('工單已完工');
      load();
    } catch (err) {
      const friendlyError = getUserFriendlyError(err, '更新失敗：');
      toast.error(friendlyError.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <GarageNav active="work-orders" />

      <main className="p-4 sm:p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">📋 維修工單</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-medium"
          >
            {showForm ? '收起表單' : '＋ 開新工單'}
          </button>
        </div>

        {/* ===== 開單表單 ===== */}
        {showForm && (
          <div className="bg-surface-800 p-6 rounded-2xl border border-surface-700 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-surface-400 block mb-1">選擇預約單</label>
                <select value={apptId} onChange={e => setApptId(e.target.value)}
                  className="w-full h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl">
                  <option value="">— 請選擇 —</option>
                  {appointments.filter(a => ['CONFIRMED', 'ARRIVED'].includes(a.status)).map(a => (
                    <option key={a.id} value={a.id}>
                      #{a.id} {a.vehicle?.make} {a.vehicle?.model} {a.vehicle?.licensePlate ? `(${a.vehicle.licensePlate})` : ''} - {a.user?.name || a.user?.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-surface-400 block mb-1">進廠里程 (km)</label>
                <input value={mileage} onChange={e => setMileage(e.target.value)} type="number"
                  className="w-full h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl" placeholder="例：85,000" />
              </div>
              <div>
                <label className="text-sm text-surface-400 block mb-1">維修摘要</label>
                <input value={summary} onChange={e => setSummary(e.target.value)}
                  className="w-full h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl" placeholder="例：10萬公里大保養" />
              </div>
            </div>

            <h3 className="font-bold mb-2">工項 / 零件{laborFees.length > 0 && <span className="ml-2 text-xs font-normal text-emerald-400">⚡ LABOR 列可用「帶入工資」快速填入標準工資表項目</span>}</h3>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={it.kind} onChange={e => updateItem(i, 'kind', e.target.value)}
                    className="col-span-2 h-11 px-2 bg-surface-700 border border-surface-600 rounded-xl text-sm">
                    <option value="LABOR">👷 工資</option>
                    <option value="PART">🔧 零件</option>
                  </select>
                  {it.kind === 'PART' ? (
                    <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)}
                      placeholder="零件名稱"
                      className="col-span-3 h-11 px-3 bg-surface-700 border border-surface-600 rounded-xl text-sm" />
                  ) : (
                    <div className="col-span-3 flex gap-1">
                      <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)}
                        placeholder="工項名稱，例：機油更換" list="labor-fee-options"
                        className="flex-1 min-w-0 h-11 px-3 bg-surface-700 border border-surface-600 rounded-xl text-sm" />
                    </div>
                  )}
                  <input value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} type="number" min="1"
                    className="col-span-2 h-11 px-3 bg-surface-700 border border-surface-600 rounded-xl text-sm" placeholder="數量" />
                  {it.kind === 'LABOR' && laborFees.length > 0 ? (
                    <select
                      value=""
                      onChange={e => {
                        const fee = laborFees.find(f => String(f.id) === e.target.value);
                        if (fee) setItems(prev => prev.map((x, idx) => idx === i ? { ...x, name: fee.name, unit_price: fee.price } : x));
                      }}
                      className="col-span-2 h-11 px-2 bg-surface-700 border border-surface-600 rounded-xl text-sm text-emerald-300">
                      <option value="">⚡ 帶入工資…</option>
                      {laborFees.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ${Number(f.price).toLocaleString()}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} type="number" min="0"
                      className="col-span-2 h-11 px-3 bg-surface-700 border border-surface-600 rounded-xl text-sm" placeholder="單價" />
                  )}
                  {it.kind === 'PART' ? (
                    <input value={it.part_sku} onChange={e => updateItem(i, 'part_sku', e.target.value)}
                      className="col-span-2 h-11 px-3 bg-surface-700 border border-surface-600 rounded-xl text-sm" placeholder="SKU" />
                  ) : <span className="col-span-2" />}
                  <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                    className="col-span-1 h-11 text-red-400 hover:text-red-300 text-lg">✕</button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => setItems(prev => [...prev, { ...emptyItem }])}
                className="text-blue-400 hover:text-blue-300 text-sm">＋ 新增一列</button>
              <div className="text-lg font-bold">合計：NT$ {total.toLocaleString()}</div>
            </div>
            <button onClick={handleSubmit} disabled={saving}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 rounded-xl font-bold">
              {saving ? '開單中…' : '建立工單'}
            </button>
          </div>
        )}

        {/* ===== 工單列表 ===== */}
        {records.length === 0 ? (
          <div className="bg-surface-800/50 rounded-xl p-10 text-center border border-surface-700/50 border-dashed">
            <p className="text-surface-400">目前沒有工單</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map(r => (
              <div key={r.id} className="bg-surface-800 p-6 rounded-xl border border-surface-700/50">
                <div className="flex justify-between items-center cursor-pointer"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  <div>
                    <h3 className="font-bold">工單 #{r.id}　{r.vehicle?.make} {r.vehicle?.model}
                      {r.vehicle?.licensePlate && <span className="ml-2 text-sm text-surface-400">({r.vehicle.licensePlate})</span>}
                    </h3>
                    <p className="text-surface-400 text-sm mt-1">
                      車主：{r.user?.name || r.user?.phone || '—'}　
                      {new Date(r.created_at).toLocaleString()}
                      {r.mileage_km != null && <>　里程：{Number(r.mileage_km).toLocaleString()} km</>}
                      {r.appointment_id && <>　（由預約 #{r.appointment_id} 轉）</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={r.status === 'COMPLETED' ? 'text-green-400' : r.status === 'IN_PROGRESS' ? 'text-blue-400' : 'text-surface-400'}>
                      {statusMap[r.status] || r.status}
                    </span>
                    <p className="text-lg font-bold mt-1">NT$ {Number(r.total_amount).toLocaleString()}</p>
                  </div>
                </div>

                {expandedId === r.id && (
                  <div className="mt-4 border-t border-surface-700 pt-4">
                    {r.summary && <p className="text-surface-300 text-sm mb-3">{r.summary}</p>}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-surface-500 text-left">
                          <th className="pb-2">項目 / 零件</th>
                          <th className="pb-2">數量</th>
                          <th className="pb-2 text-right">單價</th>
                          <th className="pb-2 text-right">小計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map(it => (
                          <tr key={it.id} className="border-t border-surface-700/50">
                            <td className="py-2">{it.kind === 'PART' ? '🔧 ' : '👷 '}{it.name}
                              {it.part_sku && <span className="text-surface-600 ml-1 text-xs">{it.part_sku}</span>}
                            </td>
                            <td className="py-2">×{it.quantity}</td>
                            <td className="py-2 text-right">{Number(it.unit_price).toLocaleString()}</td>
                            <td className="py-2 text-right">{(it.unit_price * it.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                      <button onClick={() => completeRecord(r.id)}
                        className="mt-4 bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg text-sm font-medium">
                        ✅ 完工結案
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
