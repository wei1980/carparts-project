// src/pages/admin/AdminProcurement.jsx — 進貨成本管理：供貨商 / 進貨批次 / 月營收報表
import { useEffect, useState, useCallback } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

const NT = (n) => `NT$ ${Number(n || 0).toLocaleString()}`;

const STATUS_MAP = {
  DRAFT: '草稿', ORDERED: '已下單', IN_TRANSIT: '運輸中',
  CUSTOMS: '通關中', RECEIVED: '已入庫', CANCELLED: '已取消',
};
const STATUS_COLOR = {
  DRAFT: '#6b7280', ORDERED: '#2563eb', IN_TRANSIT: '#7c3aed',
  CUSTOMS: '#d97706', RECEIVED: '#059669', CANCELLED: '#dc2626',
};
const TYPE_MAP = { IMPORT: '國外進口', DOMESTIC: '國內採購' };
// 狀態推進順序（RECEIVED 會觸發入庫）
const NEXT_STATUS = { DRAFT: 'ORDERED', ORDERED: 'IN_TRANSIT', IN_TRANSIT: 'CUSTOMS', CUSTOMS: 'RECEIVED' };

export default function AdminProcurement() {
  const [tab, setTab] = useState('shipments'); // shipments | suppliers | report
  const [suppliers, setSuppliers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // ── 表單狀態 ──
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null); // null=無 | {}=新建 | shipment物件=編輯
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sh] = await Promise.all([
        adminClient.get('/procurement/suppliers'),
        adminClient.get('/procurement/shipments', { params: statusFilter ? { status: statusFilter } : {} }),
      ]);
      setSuppliers(s.data);
      setShipments(sh.data);
    } catch (err) {
      toast.error('載入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const loadReport = async () => {
    try {
      const r = await adminClient.get('/procurement/monthly-report', { params: { months: 6 } });
      setReport(r.data);
    } catch (err) {
      toast.error('報表載入失敗');
    }
  };
  useEffect(() => { if (tab === 'report') loadReport(); }, [tab]);

  // ── 狀態推進（RECEIVED 觸發入庫計算）──
  const advanceStatus = async (sh) => {
    const next = NEXT_STATUS[sh.status];
    if (!next) return;
    const msg = next === 'RECEIVED'
      ? `確認「${sh.shipment_no}」入庫？\n將依分攤方式計算到岸成本並增加各零件庫存。`
      : `將「${sh.shipment_no}」推進為「${STATUS_MAP[next]}」？`;
    if (!(await confirmDialog({ message: msg }))) return;
    try {
      await adminClient.patch(`/procurement/shipments/${sh.id}/status`, { status: next });
      toast.success(next === 'RECEIVED' ? '已入庫，到岸成本已計算' : `狀態已更新為「${STATUS_MAP[next]}」`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || '更新失敗');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">🚢 進貨成本管理</h1>
        {/* Tab 切換 */}
        <div className="flex gap-2 bg-gray-800 rounded-xl p-1">
          {[['shipments', '📦 進貨批次'], ['suppliers', '🏭 供貨商'], ['report', '📈 月營收報表']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">載入中...</p>
      ) : (
        <>
          {tab === 'shipments' && (
            <ShipmentsTab
              shipments={shipments} suppliers={suppliers} statusFilter={statusFilter}
              onFilter={setStatusFilter} onAdvance={advanceStatus}
              onEdit={(sh) => { setEditingShipment(sh); setShowShipmentForm(true); }}
              onCreate={() => { setEditingShipment(null); setShowShipmentForm(true); }}
              onDone={() => { setShowShipmentForm(false); setEditingShipment(null); load(); }}
              showForm={showShipmentForm} editing={editingShipment}
            />
          )}

          {tab === 'suppliers' && (
            <SuppliersTab
              suppliers={suppliers}
              onCreate={() => { setEditingSupplier(null); setShowSupplierForm(true); }}
              onEdit={(s) => { setEditingSupplier(s); setShowSupplierForm(true); }}
              showForm={showSupplierForm} editing={editingSupplier}
              onClose={() => { setShowSupplierForm(false); setEditingSupplier(null); }}
              onSaved={() => { setShowSupplierForm(false); setEditingSupplier(null); load(); }}
            />
          )}

          {tab === 'report' && <ReportTab report={report} />}
        </>
      )}
    </div>
  );
}

/* ==================== 進貨批次 ==================== */
function ShipmentsTab({ shipments, suppliers, statusFilter, onFilter, onAdvance, onEdit, onCreate, onDone, showForm, editing }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <select value={statusFilter} onChange={e => onFilter(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
          <option value="">全部狀態</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={onCreate} className="ml-auto bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition">
          ➕ 新增進貨批次
        </button>
      </div>

      {showForm && <ShipmentForm editing={editing} suppliers={suppliers} onClose={onDone} onSaved={onDone} />}

      {shipments.length === 0 ? (
        <div className="text-center py-16 text-gray-500">尚無進貨批次</div>
      ) : (
        <div className="space-y-4">
          {shipments.map(sh => (
            <div key={sh.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                <span className="font-mono text-blue-300 font-bold">{sh.shipment_no}</span>
                <span className="text-xs px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: TYPE_MAP[sh.type] === '國外進口' ? '#7c3aed' : '#0891b2' }}>
                  {TYPE_MAP[sh.type]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: STATUS_COLOR[sh.status] }}>
                  {STATUS_MAP[sh.status]}
                </span>
                <span className="text-gray-400 text-sm">{sh.supplier?.name}</span>
                <span className="ml-auto font-black text-white">{NT(sh.total_landed_cost_twd)}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
                <span>貨款 {NT(sh.goods_cost_twd)}</span>
                <span>國際運費 {NT(sh.intl_freight_twd)}</span>
                <span>國內運費 {NT(sh.local_freight_twd)}</span>
                <span>關稅 {NT(sh.customs_duty_twd)}</span>
                <span>雜費 {NT(sh.customs_other_twd)}</span>
              </div>

              {/* 明細摘要 */}
              {sh.items.length > 0 && (
                <div className="text-xs text-gray-500 mb-3 truncate">
                  {sh.items.map(i => `${i.part?.sku || '?'} ×${i.qty}`).join('、')}（共 {sh.total_qty} 件）
                </div>
              )}

              <div className="flex gap-2">
                {NEXT_STATUS[sh.status] && (
                  <button onClick={() => onAdvance(sh)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition ${next_status_btn_class(NEXT_STATUS[sh.status])}`}>
                    {NEXT_STATUS[sh.status] === 'RECEIVED' ? '📥 確認入庫（計算到岸成本）' : `→ 推進至「${STATUS_MAP[NEXT_STATUS[sh.status]]}」`}
                  </button>
                )}
                {(sh.status === 'DRAFT' || sh.status === 'ORDERED' || sh.status === 'IN_TRANSIT') && (
                  <button onClick={() => onEdit(sh)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 transition">
                    ✏️ 編輯
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
const next_status_btn_class = (s) =>
  s === 'RECEIVED' ? 'bg-emerald-600 hover:bg-emerald-500' : s === 'CUSTOMS' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500';

/* ===== 批次表單（新增/編輯） ===== */
function ShipmentForm({ editing, suppliers, onClose, onSaved }) {
  const isEdit = Boolean(editing?.id);
  const [form, setForm] = useState({
    type: editing?.type || 'IMPORT',
    supplier_id: editing?.supplier_id || '',
    currency: editing?.currency || 'USD',
    exchange_rate: editing?.exchange_rate ?? 32,
    intl_freight_twd: editing?.intl_freight_twd ?? '',
    local_freight_twd: editing?.local_freight_twd ?? '',
    customs_duty_twd: editing?.customs_duty_twd ?? '',
    customs_other_twd: editing?.customs_other_twd ?? '',
    paid_amount_twd: editing?.paid_amount_twd ?? '',
    allocation_method: editing?.allocation_method || 'BY_AMOUNT',
    eta_date: editing?.eta_date?.slice(0, 10) || '',
    note: editing?.note || '',
  });
  // 明細列：{ partId, sku, qty, unitPriceTwd }
  const [items, setItems] = useState((editing?.items || []).map(i => ({
    partId: i.part_id, sku: i.part?.sku || '', name: i.part?.name || '', qty: i.qty, unitPriceTwd: Number(i.unit_price_twd),
  })) || []);
  const [partQuery, setPartQuery] = useState('');
  const [partResults, setPartResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  // 零件搜尋（防抖 300ms）
  useEffect(() => {
    if (!partQuery.trim()) { setPartResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await adminClient.get('/parts', { params: { search: partQuery.trim(), limit: 8 } });
        setPartResults(r.data.data || r.data || []);
      } catch { setPartResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [partQuery]);

  const addItem = (p) => {
    if (items.some(it => it.partId === p.id)) { toast.error('此零件已在明細中'); return; }
    setItems(prev => [...prev, { partId: p.id, sku: p.sku, name: p.name, qty: 1, unitPriceTwd: '' }]);
    setPartQuery('');
    setPartResults([]);
  };

  const validate = () => {
    const e = {};
    if (!form.supplier_id) e.supplier_id = '請選擇供貨商';
    if (items.length === 0) e.items = '請至少加入一筆明細';
    for (const it of items) {
      if (!it.qty || it.qty <= 0) e.items = `「${it.sku}」數量需為正整數`;
      else if (it.unitPriceTwd === '' || Number(it.unitPriceTwd) < 0) e.items = `「${it.sku}」請填單價`;
    }
    if (form.exchange_rate !== '' && Number(form.exchange_rate) <= 0) e.exchange_rate = '匯率需大於 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { toast.error('請檢查表單'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        supplier_id: Number(form.supplier_id),
        exchange_rate: form.exchange_rate === '' ? 1 : Number(form.exchange_rate),
        goods_cost_twd: undefined, // 由明細自動加總
        intl_freight_twd: Number(form.intl_freight_twd) || 0,
        local_freight_twd: Number(form.local_freight_twd) || 0,
        customs_duty_twd: Number(form.customs_duty_twd) || 0,
        customs_other_twd: Number(form.customs_other_twd) || 0,
        paid_amount_twd: Number(form.paid_amount_twd) || 0,
        eta_date: form.eta_date || null,
        items: items.map(it => ({ partId: it.partId, qty: parseInt(it.qty), unitPriceTwd: Number(it.unitPriceTwd) })),
      };
      if (isEdit) {
        await adminClient.put(`/procurement/shipments/${editing.id}`, body);
        toast.success('批次已更新');
      } else {
        await adminClient.post('/procurement/shipments', body);
        toast.success('批次已建立');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const goodsTotal = items.reduce((a, it) => a + (Number(it.unitPriceTwd) || 0) * (parseInt(it.qty) || 0), 0);
  const overheadTotal =
    (Number(form.intl_freight_twd) || 0) + (Number(form.local_freight_twd) || 0) +
    (Number(form.customs_duty_twd) || 0) + (Number(form.customs_other_twd) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-3xl p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-5">{isEdit ? `✏️ 編輯批次 ${editing.shipment_no}` : '➕ 新增進貨批次'}</h2>

        {/* 基本資訊 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Field label="類型" error={errors.supplier_id && ''}>
            <select value={form.type} onChange={setF('type')} className={inputCls}>
              <option value="IMPORT">國外進口</option>
              <option value="DOMESTIC">國內採購</option>
            </select>
          </Field>
          <Field label="供貨商 *" error={errors.supplier_id}>
            <select value={form.supplier_id} onChange={setF('supplier_id')} className={inputCls}>
              <option value="">— 選擇 —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.country ? `（${s.country}）` : ''}</option>)}
            </select>
          </Field>
          <Field label="幣別">
            <input value={form.currency} onChange={setF('currency')} className={inputCls} placeholder="USD/EUR/JPY" />
          </Field>
          <Field label="匯率（→TWD）" error={errors.exchange_rate}>
            <input type="number" step="0.01" min="0" value={form.exchange_rate} onChange={setF('exchange_rate')} className={inputCls} />
          </Field>
        </div>

        {/* 明細 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-gray-300">進貨明細 *</label>
            {/* 零件搜尋 */}
            <div className="relative w-72">
              <input value={partQuery} onChange={e => setPartQuery(e.target.value)}
                placeholder="搜尋 SKU / 名稱加入明細…"
                aria-label="搜尋零件"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              {partResults.length > 0 && (
                <ul className="absolute right-0 top-full mt-1 w-full max-w-md bg-gray-900 border border-gray-600 rounded-lg overflow-hidden z-10 shadow-xl">
                  {partResults.map(p => (
                    <li key={p.id}>
                      <button onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-white flex justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        <span className="font-mono text-gray-400 shrink-0">{p.sku}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {items.length > 0 && (
            <table className="w-full text-sm text-white mb-1">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="py-1.5 text-left">零件</th>
                  <th className="py-1.5 text-right w-20">數量</th>
                  <th className="py-1.5 text-right w-28">單價(TWD)</th>
                  <th className="py-1.5 text-right w-24">小計</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.partId} className="border-b border-gray-700/50">
                    <td className="py-1.5 pr-2"><span className="font-mono text-xs text-gray-400 mr-1">{it.sku}</span>{it.name}</td>
                    <td className="py-1.5">
                      <input type="number" min="1" value={it.qty} aria-label={`${it.sku} 數量`}
                        onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: e.target.value } : x))}
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                    <td className="py-1.5">
                      <input type="number" min="0" step="0.01" value={it.unitPriceTwd} aria-label={`${it.sku} 單價`}
                        onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, unitPriceTwd: e.target.value } : x))}
                        className="w-24 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                    <td className="py-1.5 text-right font-mono text-gray-300">{NT((Number(it.unitPriceTwd) || 0) * (parseInt(it.qty) || 0))}</td>
                    <td className="py-1.5 text-center">
                      <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        aria-label={`移除 ${it.sku}`}
                        className="text-gray-500 hover:text-red-400 transition">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {errors.items && <p className="text-red-400 text-xs mt-1">{errors.items}</p>}
        </div>

        {/* 成本欄位 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Field label="國際運費"><Num v={form.intl_freight_twd} set={setF('intl_freight_twd')} /></Field>
          <Field label="國內運費"><Num v={form.local_freight_twd} set={setF('local_freight_twd')} /></Field>
          <Field label="關稅"><Num v={form.customs_duty_twd} set={setF('customs_duty_twd')} /></Field>
          <Field label="報關雜費"><Num v={form.customs_other_twd} set={setF('customs_other_twd')} /></Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Field label="分攤方式">
            <select value={form.allocation_method} onChange={setF('allocation_method')} className={inputCls}>
              <option value="BY_AMOUNT">依貨款金額比</option>
              <option value="BY_QTY">依數量比</option>
            </select>
          </Field>
          <Field label="預計到貨日">
            <input type="date" value={form.eta_date} onChange={setF('eta_date')} className={inputCls} />
          </Field>
          <Field label="已付款(TWD)"><Num v={form.paid_amount_twd} set={setF('paid_amount_twd')} /></Field>
          <Field label="備註"><input value={form.note} onChange={setF('note')} className={inputCls} /></Field>
        </div>

        {/* 即時成本預覽 */}
        <div className="bg-gray-900 rounded-xl p-4 mb-5 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-300">
            <span>貨款合計：<b className="text-white">{NT(goodsTotal)}</b></span>
            <span>費用合計：<b className="text-white">{NT(overheadTotal)}</b></span>
            <span>總成本：<b className="text-amber-400">{NT(goodsTotal + overheadTotal)}</b></span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            入庫時將依「{form.allocation_method === 'BY_AMOUNT' ? '貨款金額比' : '數量比'}」把費用分攤到每件零件，算出到岸成本。
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition">取消</button>
          <button onClick={handleSubmit} disabled={saving}
            className="btn-primary px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 bg-blue-600 hover:bg-blue-500 text-white transition">
            {saving ? '儲存中…' : isEdit ? '更新批次' : '建立批次'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 供貨商 ==================== */
function SuppliersTab({ suppliers, onCreate, onEdit, showForm, editing, onClose, onSaved }) {
  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={onCreate} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition">
          ➕ 新增供貨商
        </button>
      </div>

      {showForm && <SupplierForm editing={editing} onClose={onClose} onSaved={onSaved} />}

      {suppliers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">尚無供貨商資料</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-white">{s.name}</h3>
                <span className="chip text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{s.currency}</span>
              </div>
              <dl className="text-xs text-gray-400 space-y-1 mb-3">
                {s.country && <div>🌍 {s.country}</div>}
                {s.contact_person && <div>👤 {s.contact_person}{s.phone ? ` · ${s.phone}` : ''}</div>}
                {s.email && <div>✉️ {s.email}</div>}
                {s.payment_terms && <div>💳 {s.payment_terms}</div>}
                <div>📦 進貨批次：{s._count?.shipments ?? 0} 次</div>
              </dl>
              <button onClick={() => onEdit(s)} className="text-xs text-blue-400 hover:text-blue-300 transition">✏️ 編輯</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SupplierForm({ editing, onClose, onSaved }) {
  const isEdit = Boolean(editing?.id);
  const [form, setForm] = useState({
    name: editing?.name || '', country: editing?.country || '',
    contact_person: editing?.contact_person || '', phone: editing?.phone || '',
    email: editing?.email || '', payment_terms: editing?.payment_terms || '',
    currency: editing?.currency || 'USD', note: editing?.note || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('供貨商名稱為必填'); return; }
    setError('');
    setSaving(true);
    try {
      if (isEdit) await adminClient.put(`/procurement/suppliers/${editing.id}`, form);
      else await adminClient.post('/procurement/suppliers', form);
      toast.success(isEdit ? '供貨商已更新' : '供貨商已建立');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-lg p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-5">{isEdit ? '✏️ 編輯供貨商' : '➕ 新增供貨商'}</h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <Label>名稱 *</Label>
            <input value={form.name} onChange={setF('name')} autoFocus className={inputCls} />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
          <Field label="國家"><input value={form.country} onChange={setF('country')} className={inputCls} placeholder="Germany / 日本…" /></Field>
          <Field label="主要幣別"><input value={form.currency} onChange={setF('currency')} className={inputCls} /></Field>
          <Field label="聯絡人"><input value={form.contact_person} onChange={setF('contact_person')} className={inputCls} /></Field>
          <Field label="電話"><input value={form.phone} onChange={setF('phone')} className={inputCls} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={setF('email')} className={inputCls} /></Field>
          <Field label="付款條件"><input value={form.payment_terms} onChange={setF('payment_terms')} className={inputCls} placeholder="T/T 30% deposit" /></Field>
          <div className="col-span-2">
            <Field label="備註"><input value={form.note} onChange={setF('note')} className={inputCls} /></Field>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition">取消</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50 transition">
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 月營收報表 ==================== */
function ReportTab({ report }) {
  if (!report) return <p className="text-gray-400">載入中...</p>;
  const monthly = report.monthly || [];
  const maxRev = Math.max(...monthly.map(m => m.revenue), 1);
  const totalRev = monthly.reduce((a, m) => a + m.revenue, 0);
  const totalProfit = monthly.reduce((a, m) => a + m.gross_profit, 0);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard title="近月總營收（已付款）" value={NT(totalRev)} tone="blue" />
        <KpiCard title="毛利（營收−成本）" value={NT(totalProfit)} tone={totalProfit >= 0 ? 'green' : 'red'} />
        <KpiCard title="平均毛利率"
          value={totalRev > 0 ? `${((totalProfit / totalRev) * 100).toFixed(1)}%` : '—'}
          sub={report.parts_missing_cost > 0 ? `⚠️ ${report.parts_missing_cost} 個零件缺進貨成本，以批發價估算` : '所有品項皆有到岸成本'} />
      </div>

      {monthly.length === 0 ? (
        <div className="text-center py-16 text-gray-500">期間內尚無已付款訂單</div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="font-bold text-white mb-4">月度損益（近 6 個月）</h2>
          <table className="w-full text-sm text-white">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-700">
                <th className="p-2 text-left">月份</th>
                <th className="p-2 text-right">營收</th>
                <th className="p-2 text-right">銷貨成本</th>
                <th className="p-2 text-right">毛利</th>
                <th className="p-2 text-right">毛利率</th>
                <th className="p-2 text-left w-40">趨勢</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(m => (
                <tr key={m.month} className="border-b border-gray-700/50">
                  <td className="p-2 font-mono">{m.month}</td>
                  <td className="p-2 text-right">{NT(m.revenue)}</td>
                  <td className="p-2 text-right text-gray-400">{NT(m.cogs)}</td>
                  <td className={`p-2 text-right font-bold ${m.gross_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {NT(m.gross_profit)}
                  </td>
                  <td className="p-2 text-right text-gray-300">{m.gross_margin != null ? `${m.gross_margin}%` : '—'}</td>
                  <td className="p-2">
                    <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                        style={{ width: `${Math.max((m.revenue / maxRev) * 100, 2)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-3">{report.note}</p>
        </div>
      )}
    </div>
  );
}

/* ==================== 小元件 ==================== */
const inputCls = 'w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none';
const Label = ({ children }) => <label className="text-xs block mb-1 text-gray-400">{children}</label>;

function Field({ label, error, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
function Num({ v, set }) {
  return <input type="number" min="0" step="0.01" value={v} onChange={set} className={inputCls} placeholder="0" />;
}
function KpiCard({ title, value, tone = 'blue', sub }) {
  const colorMap = { blue: 'border-l-blue-500 text-blue-400', green: 'border-l-emerald-500 text-emerald-400', red: 'border-l-red-500 text-red-400' };
  return (
    <div className={`bg-gray-800 rounded-xl p-5 border border-gray-700 border-l-4 ${colorMap[tone].split(' ')[0]}`}>
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-black ${colorMap[tone].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
