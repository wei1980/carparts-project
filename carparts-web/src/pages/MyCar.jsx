// src/pages/MyCar.jsx — 我的愛車：保養歷史 + 到期提醒 + 建議保養
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { myCarAPI, vehicleAPI } from '../api';
import { consumerClient as api } from '../api/client';
import { aiApi } from '../api/aiApi';
import Navbar from '../components/Navbar';
import { useCurrentVehicle } from '../context/CurrentVehicleContext';
import { ModificationEditor } from '../components/ModificationEditor';
import { toast } from 'react-hot-toast';
import { confirmDialog } from '../components/ConfirmDialog';
import { calcMembershipStatus } from '../types/membership';
import { mockMembership } from '../data/membershipMock';
import GarageSyncSection from '../components/mycar/GarageSyncSection';
import EmptyState from '../components/ui/EmptyState';

const NT = (n) => `NT$ ${Number(n || 0).toLocaleString()}`;
const DT = (d) => d ? new Date(d).toLocaleDateString('zh-TW') : '—';

// 提醒到期狀態徽章
function DueBadge({ state, days, km }) {
  if (state === 'DUE_NOW') {
    return <span className="px-2 py-0.5 text-[11px] font-bold bg-red-500/90 text-white rounded-md">已到期</span>;
  }
  if (state === 'DUE_SOON') {
    const parts = [];
    if (days != null) parts.push(`${days} 天`);
    if (km != null) parts.push(`${km} km`);
    return (
      <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-500/90 text-white rounded-md">
        即將到期{parts.length ? `（${parts.join(' / ')}）` : ''}
      </span>
    );
  }
  return <span className="chip">正常</span>;
}

function MyCar() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMileageEdit, setShowMileageEdit] = useState(false);
  const [mileageInput, setMileageInput] = useState('');
  const [mileageSuggestion, setMileageSuggestion] = useState(null); // { estimate, months, base }
  const [showVehicleManager, setShowVehicleManager] = useState(Boolean(location.state?.openVehicleManager));
  const [activeTab, setActiveTab] = useState('vehicle');
  const [showVehicleSwitcher, setShowVehicleSwitcher] = useState(false);
  const { vehicles, currentVehicle, switching, selectVehicle, refreshVehicles, dashboard } = useCurrentVehicle();
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ make: '', model: '', generation: '', year: '', engine: '', vin: '', licensePlate: '', variantId: '' });
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);
  
  // 行照掃描狀態
  const regFileRef = useRef(null);
  const [recognizingReg, setRecognizingReg] = useState(false);
  const isScanningRef = useRef(false);
  const scanResultRef = useRef(null);

  const navigate = useNavigate();

  // 載入年份
  useEffect(() => {
    api.get('/vehicles/years')
      .then(res => setYears(res.data || []))
      .catch(() => setYears(Array.from({ length: 36 }, (_, i) => String(new Date().getFullYear() - i))));
  }, []);

  // 年份改變 → 載入品牌
  useEffect(() => {
    setMakes([]); setModels([]); setVariants([]);
    if (!vehicleForm.year) return;
    api.get(`/vehicles/makes?year=${vehicleForm.year}`)
      .then(res => setMakes(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
    if (!isScanningRef.current && !editingVehicle) {
      setVehicleForm(s => ({ ...s, make: '', model: '', generation: '', engine: '', variantId: '' }));
    }
  }, [vehicleForm.year]);

  // 品牌改變 → 載入車系
  useEffect(() => {
    setModels([]); setVariants([]);
    if (!vehicleForm.year || !vehicleForm.make) return;
    api.get(`/vehicles/models?year=${vehicleForm.year}&make=${encodeURIComponent(vehicleForm.make)}`)
      .then(res => setModels(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
    if (!isScanningRef.current && !editingVehicle) {
      setVehicleForm(s => ({ ...s, model: '', generation: '', engine: '', variantId: '' }));
    }
  }, [vehicleForm.make]);

  // 車系改變 → 載入世代
  useEffect(() => {
    setVariants([]);
    if (!vehicleForm.year || !vehicleForm.make || !vehicleForm.model) return;
    api.get(`/vehicles/variants?year=${vehicleForm.year}&make=${encodeURIComponent(vehicleForm.make)}&model=${encodeURIComponent(vehicleForm.model)}`)
      .then(res => setVariants(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
    if (!editingVehicle) setVehicleForm(s => ({ ...s, generation: '', engine: '', variantId: '' }));
  }, [vehicleForm.model]);

  // 世代改變 → 自動帶入引擎/世代
  useEffect(() => {
    if (vehicleForm.variantId) {
      const v = variants.find(v => String(v.id) === String(vehicleForm.variantId));
      if (v) {
        setVehicleForm(s => ({ ...s, generation: v.generation || '', engine: v.engine_code || '' }));
      }
    }
  }, [vehicleForm.variantId, variants]);

  // 品牌正規化
  const normalizeMake = (make) => {
    if (!make) return '';
    const map = {
      'mercedes-benz': 'Mercedes-Benz',
      'mercedes benz': 'Mercedes-Benz',
      'infiniti': 'INFINITI',
      'porsche': 'Porsche',
    };
    return map[make.toLowerCase()] || make;
  };

  // 行照掃描處理
  const handleRegUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRecognizingReg(true);
    try {
      const res = await aiApi.recognizeRegistration(file);
      const { licensePlate: lp, vin: v, make: mk, model: md, year: yr,
              generation, engine_code, displacement_cc, horsepower, fuel_type } = res.data;

      const brand = normalizeMake(mk);

      if (lp) setVehicleForm(s => ({ ...s, licensePlate: lp }));
      if (v) setVehicleForm(s => ({ ...s, vin: v }));

      if (brand && md) {
        isScanningRef.current = true;
        scanResultRef.current = { make: brand, model: md, year: yr ? String(yr) : '' };
        setVehicleForm(s => ({ ...s, year: yr ? String(yr) : '', make: '', model: '', variantId: '' }));

        setTimeout(async () => {
          if (!isScanningRef.current) return;

          const brandMatched = makes.find(m => m.toLowerCase() === brand.toLowerCase());
          if (!brandMatched) {
            await autoCreateVehicleAndFinish(brand, md, yr, generation, engine_code, displacement_cc, horsepower, fuel_type, lp, v);
            return;
          }

          let modelMatched = models.find(m => m.toLowerCase() === md.toLowerCase());
          if (!modelMatched) {
            modelMatched = models.find(m =>
              m.toLowerCase().includes(md.toLowerCase()) || md.toLowerCase().includes(m.toLowerCase())
            );
          }
          if (!modelMatched) {
            await autoCreateVehicleAndFinish(brand, md, yr, generation, engine_code, displacement_cc, horsepower, fuel_type, lp, v);
            return;
          }

          setVehicleForm(s => ({ ...s, make: brandMatched, model: modelMatched }));
          isScanningRef.current = false;
          toast.success('行照辨識完成，已自動填入資料，請確認並手動調整細節。');
        }, 1500);
      } else {
        toast.error('行照辨識完成，但廠牌或車型缺失，請手動輸入。');
      }
    } catch (err) {
      toast.error('行照辨識失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setRecognizingReg(false);
      if (regFileRef.current) regFileRef.current.value = '';
    }
  };

  const autoCreateVehicleAndFinish = async (make, model, year, generation, engine_code, displacement_cc, horsepower, fuel_type, licensePlate, vin) => {
    try {
      const res = await api.post('/vehicles/auto-create-variant', {
        make: normalizeMake(make),
        model,
        year,
        generation,
        engine_code,
        displacement_cc,
        horsepower,
        fuel_type
      });

      const newVariantId = res.data.variantId;
      const vehicleData = {
        make: normalizeMake(make),
        model,
        generation: generation || '',
        year: year || new Date().getFullYear(),
        engine: engine_code || '',
        vin: vin || '',
        licensePlate: licensePlate || '',
        variantId: newVariantId
      };
      await vehicleAPI.create(vehicleData);
      toast.success(`已自動收錄新車型 ${normalizeMake(make)} ${model} 並建立車輛！`);
      setVehicleForm({ make: '', model: '', generation: '', year: '', engine: '', vin: '', licensePlate: '', variantId: '' });
      setShowVehicleManager(false);
      await loadVehicles();
    } catch (err) {
      console.error('自動建立車型失敗:', err);
      toast.error('自動建立車型失敗，請手動選擇車型。');
      isScanningRef.current = false;
    }
  };

  // 載入所有車輛
  const loadVehicles = async () => {
    setLoadingVehicles(true);
    try { await refreshVehicles(); } finally { setLoadingVehicles(false); }
  };

  // 新增車輛
  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleForm.make || !vehicleForm.model) return toast.error('請填寫品牌與車系');
    try {
      await vehicleAPI.create(vehicleForm);
      toast.success('車輛新增成功');
      setVehicleForm({ make: '', model: '', generation: '', year: '', engine: '', vin: '', licensePlate: '', variantId: '' });
      setShowVehicleManager(false);
      await loadVehicles();
    } catch (err) {
      toast.error('新增失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 更新車輛
  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      await vehicleAPI.update(editingVehicle.id, vehicleForm);
      setShowVehicleManager(false);
      toast.success('車輛更新成功');
      setEditingVehicle(null);
      setVehicleForm({ make: '', model: '', generation: '', year: '', engine: '', vin: '', licensePlate: '', variantId: '' });
      await loadVehicles();
    } catch (err) {
      toast.error('更新失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 刪除車輛
  const handleDeleteVehicle = async (id) => {
    const confirmed = await confirmDialog({
      message: '確定刪除此車輛？此操作不可復原，相關保養記錄與改裝記錄將一併移除。',
      confirmText: '確定刪除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await vehicleAPI.delete(id);
      toast.success('車輛已刪除');
      await loadVehicles();
    } catch (err) {
      toast.error('刪除失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 切換編輯模式
  const startEditVehicle = (v) => {
    setEditingVehicle(v);
    setVehicleForm({
      make: v.make,
      model: v.model,
      generation: v.generation || '',
      year: v.year || '',
      engine: v.engine || '',
      vin: v.vin || '',
      licensePlate: v.licensePlate || '',
      variantId: v.variantId || '',
    });
    setShowVehicleManager(true);
  };

  const cancelEditVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({ make: '', model: '', generation: '', year: '', engine: '', vin: '', licensePlate: '', variantId: '' });
    setShowVehicleManager(false);
  };

  // 切換當前車輛
  const switchVehicle = async (vehicleId) => {
    try {
      if (!await selectVehicle(vehicleId)) return;
      toast.success('已切換車輛');
      // The currentVehicle effect owns loading and stale-response protection.
    } catch (err) {
      toast.error('切換失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const startCreateVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({ make: '', model: '', generation: '', year: '', engine: '', vin: '', licensePlate: '', variantId: '' });
    setShowVehicleManager(true);
  };

  // 🔒 銀卡會員以上才能新增第二台車（第一台免費）
  const membership = calcMembershipStatus(mockMembership.tier, mockMembership.currentYearSpent);
  const canAddVehicle = vehicles.length === 0 || membership.currentTier !== 'BRONZE';
  const tryAddVehicle = () => {
    if (canAddVehicle) { startCreateVehicle(); return; }
    const remain = Math.max(0, (membership.nextTierThreshold ?? 20000) - membership.currentYearSpent);
    toast.error(`🔒 需銀卡會員以上才能新增第二台車（年度消費再滿 NT$ ${remain.toLocaleString()} 即升級銀卡）`);
  };

  const openMileageEdit = () => {
    setMileageInput(data?.current_mileage_km != null ? String(data.current_mileage_km) : '');
    setShowMileageEdit(true);
  };

  // 里程更新：只接受使用者手動輸入（不再提供模擬 OCR，避免污染保養提醒）

  const handleMileageSave = async () => {
    if (!data?.vehicle) return;
    const mileage = parseInt(mileageInput);
    if (isNaN(mileage) || mileage < 0) return toast.error('請輸入有效的里程數');
    const source = 'manual';
    try {
      await myCarAPI.updateMileage(data.vehicle.id, { mileage_km: mileage, source });
      setData(prev => ({
        ...prev,
        current_mileage_km: mileage,
        mileage_source: source,
        mileage_source_note: source === 'ocr' ? '儀表板辨識' : '手動更新',
        mileage_updated_at: new Date().toISOString(),
      }));
      setShowMileageEdit(false);
      setMileageInput('');
      setMileageSuggestion(null);
      localStorage.setItem(`mileage-hint-dismissed-${data.vehicle.id}`, '1');
      toast.success('里程已更新');
    } catch (err) {
      toast.error('更新失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 📈 智慧推算：直接套用預估里程
  const applyMileageSuggestion = async () => {
    if (!mileageSuggestion || !data?.vehicle) return;
    try {
      await myCarAPI.updateMileage(data.vehicle.id, { mileage_km: mileageSuggestion.estimate, source: 'estimated' });
      setData(prev => ({
        ...prev,
        current_mileage_km: mileageSuggestion.estimate,
        mileage_source: 'estimated',
        mileage_source_note: '系統推算',
        mileage_updated_at: new Date().toISOString(),
      }));
      setMileageSuggestion(null);
      localStorage.setItem(`mileage-hint-dismissed-${data.vehicle.id}`, '1');
      toast.success(`已套用推算里程 ${mileageSuggestion.estimate.toLocaleString()} km`);
    } catch (err) {
      toast.error('更新失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const mileageSourceText = (d) => {
    const date = d.mileage_updated_at ? new Date(d.mileage_updated_at).toLocaleDateString('zh-TW') : '';
    switch (d.mileage_source) {
      case 'customer': return `預約時填寫 (${date})`;
      case 'garage': return `已由【${(d.mileage_source_note || '合作車廠工單').replace('工單', '')}】工單自動更新 (${date})`;
      case 'ocr': return `📷 儀表板辨識更新 (${date})`;
      case 'estimated': return `📈 系統推算更新 (${date})`;
      default: return `手動更新 (${date})`;
    }
  };

  useEffect(() => {
    let active = true;
    if (switching) { setLoading(true); return; }
    setLoading(true);
    myCarAPI.dashboard()
      .then(res => {
        if (!active) return;
        setData(res.data);
        setError('');
        // 📈 智慧推算：超過 3 個月未更新里程 → 依歷史平均 1,200 km/月 估算
        const d = res.data;
        if (d?.vehicle && d.mileage_updated_at && d.current_mileage_km != null) {
          const months = (Date.now() - new Date(d.mileage_updated_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
          if (months >= 3 && !localStorage.getItem(`mileage-hint-dismissed-${d.vehicle.id}`)) {
            const estimate = d.current_mileage_km + Math.floor(months) * 1200;
            setMileageSuggestion({ estimate, months: Math.floor(months), base: d.current_mileage_km });
          } else {
            setMileageSuggestion(null);
          }
        } else {
          setMileageSuggestion(null);
        }
      })
      .catch(err => {
        console.warn('載入失敗:', err?.message || err);
        if (active) setError('車輛資料載入失敗，請重新整理再試');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentVehicle?.id, switching, dashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 text-white">
        <Navbar />
        <main className="page-shell">
          <div className="skeleton h-40 rounded-2xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      <main className="page-shell">
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">🚗 我的愛車</h1>
            <button onClick={() => navigate('/garages')} className="btn-secondary px-4 py-2 text-sm font-medium">
              找車廠保養 →
            </button>
          </div>

          {/* 所有條件內容包在一個 fragment 中 */}
          <>
            {/* 錯誤顯示 */}
            {error && (
              <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3">
                <span className="text-sm">{error}</span>
                <button onClick={() => window.location.reload()} className="ml-auto text-sm underline underline-offset-2 hover:text-red-200">重試</button>
              </div>
            )}

            {/* 車輛摘要與唯一管理入口 */}
            {!error && data && (
              <section className="mb-6 p-5 bg-surface-800 border border-surface-600 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{data.vehicle ? `${data.vehicle.make} ${data.vehicle.model}` : '還沒有登記車輛'}</h2>
                  {data.vehicle && <p className="text-sm text-slate-400 mt-1">{data.vehicle.year} · {data.vehicle.licensePlate || '未填車牌'} · {data.vehicle.engine || '未填引擎'}</p>}
                  {/* 里程數（工單自動回寫／手動／辨識／推算） */}
                  {data.vehicle && (
                    data.current_mileage_km != null ? (
                      <div className="mt-2 flex items-baseline gap-x-3 gap-y-1 flex-wrap">
                        <span className="text-2xl font-black text-blue-400">{Number(data.current_mileage_km).toLocaleString()}<span className="text-sm text-slate-400 font-medium ml-1">km</span></span>
                        {data.mileage_source && <span className="text-xs text-slate-500">{mileageSourceText(data)}</span>}
                      </div>
                    ) : (
                      <p className="text-sm text-amber-400/90 mt-2">尚未記錄里程數，點右側按鈕更新</p>
                    )
                  )}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                  {data.vehicle && <button className="btn-primary whitespace-nowrap px-3 py-2 text-sm" onClick={() => { setActiveTab('vehicle'); startEditVehicle(data.vehicle); }}>🛠 管理</button>}
                  {data.vehicle && <button className="btn-secondary whitespace-nowrap px-3 py-2 text-sm" onClick={openMileageEdit}>📷 更新里程</button>}
                  <button
                    className={`whitespace-nowrap px-3 py-2 text-sm ${canAddVehicle ? 'btn-secondary' : 'btn-secondary opacity-60'}`}
                    onClick={tryAddVehicle}
                    title={canAddVehicle ? '新增車輛' : '需銀卡會員以上才能新增第二台車'}
                  >
                    {canAddVehicle ? '＋ 新增車輛' : '🔒 新增車輛'}
                  </button>
                </div>
              </section>
            )}
            {/* 📈 智慧推算提示：超過 3 個月未更新 */}
            {!error && data?.vehicle && mileageSuggestion && (
              <div className="mb-6 p-4 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex flex-wrap items-center gap-3">
                <span className="text-sm text-amber-200">
                  🚗 嗨！您的愛車已經 {mileageSuggestion.months} 個月沒更新里程囉！預估目前約在 <b>{mileageSuggestion.estimate.toLocaleString()} km</b>，是否直接更新？
                </span>
                <div className="flex gap-2 ml-auto">
                  <button className="btn-primary px-3 py-1.5 text-sm" onClick={applyMileageSuggestion}>確認套用</button>
                  <button className="btn-secondary px-3 py-1.5 text-sm" onClick={openMileageEdit}>自行修改</button>
                  <button
                    className="text-slate-500 hover:text-slate-300 px-2 py-1.5"
                    onClick={() => { setMileageSuggestion(null); localStorage.setItem(`mileage-hint-dismissed-${data.vehicle.id}`, '1'); }}
                    aria-label="暫不提醒"
                  >✕</button>
                </div>
              </div>
            )}
            {!error && data?.vehicle && <div role="tablist" aria-label="愛車內容" className="flex gap-2 mb-6 border-b border-slate-700">
              {[
                ['vehicle', '車輛資料'],
                ['mods', '改裝項目'],
                ['maintenance', '保養'],
              ].map(([key, label]) => (
                <button key={key} id={`tab-${key}`} role="tab" aria-selected={activeTab === key} aria-controls={`panel-${key}`} onClick={() => setActiveTab(key)} className={`px-4 py-3 text-sm font-bold border-b-2 ${activeTab === key ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-400'}`}>{label}</button>
              ))}
            </div>}
            {/* 無車輛 */}
            {/* 有車輛 - 車輛管理面板 + 內容區 */}
            {!error && data && (
              <>
                {/* ===== 保養內容區（保養總覽 + 保養紀錄 合併為單一保養分頁） ===== */}
                {data.vehicle && activeTab === 'maintenance' && !showVehicleManager && (
                  <div role="tabpanel" id="panel-maintenance" aria-labelledby="tab-maintenance" className="space-y-6">
                    {data.vehicle ? (
                      <section className="bg-surface-800 border border-surface-600 rounded-2xl p-5">
                        <h3 className="font-bold text-lg mb-4">🛡 保養總覽</h3>
                        <div className="space-y-3">
                          {data.reminders.filter(r => r.enabled).length > 0 ? (
                            data.reminders.filter(r => r.enabled).map((r, i) => (
                              <div key={i} className="bg-surface-800 rounded-xl px-4 py-3 border border-surface-600">
                                <p className="font-medium text-slate-200">{r.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  週期：{[r.interval_km ? `${r.interval_km} km` : null, r.interval_days ? `${Math.round(r.interval_days / 30)} 個月` : null].filter(Boolean).join(' / ')}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <DueBadge state={r.state} days={r.days_to_go} km={r.km_to_go} />
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500 text-sm py-6 text-center">目前沒有啟用的保養提醒 — 完成一次保養後會依項目自動產生</p>
                          )}
                          {data.suggestions.slice(0, 3).map((s, i) => (
                            <div key={`${s.title}-${i}`} className="bg-surface-800 rounded-xl px-4 py-3 border border-surface-600">
                              <p className="font-medium text-slate-200">{s.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                建議週期：{[s.interval_km ? `${s.interval_km.toLocaleString()} km` : null, s.interval_days ? `${Math.round(s.interval_days / 30)} 個月` : null].filter(Boolean).join(' / ')}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2 flex-wrap">
                          <button className="btn-primary px-3 py-2 text-sm" onClick={() => { setActiveTab('vehicle'); startEditVehicle(data.vehicle); }}>🛠 管理車輛</button>
                        </div>
                      </section>
                    ) : (
                      <EmptyState
                        icon={<span className="text-6xl">🚗</span>}
                        title="還沒有登記車輛"
                        description="登記你的愛車，開始建立保養總覽與保養預約"
                        primaryAction={{ label: '新增車輛', onClick: () => tryAddVehicle() }}
                      />
                    )}

                    {/* ===== 車廠工單同步（車主回訪理由） ===== */}
                    <GarageSyncSection vehicleId={data.vehicle.id} onSynced={() => window.location.reload()} />

                    {/* ===== 保養歷史時間軸 ===== */}
                    <section className="bg-surface-800 rounded-2xl p-5 border border-surface-600">
                      <h3 className="font-bold text-lg mb-5">📋 保養歷史</h3>
                      {data.history.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">
                          還沒有保養紀錄 — 到<a onClick={() => navigate('/garages')} className="text-blue-400 underline underline-offset-2 cursor-pointer mx-1">合作車廠</a>完成第一次保養吧
                        </p>
                      ) : (
                        <ol className="relative ml-3 border-l-2 border-surface-600 space-y-6">
                          {data.history.map(h => (
                            <li key={h.id} className="ml-6 relative">
                              {/* 時間軸圓點 */}
                              <span className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 ${h.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-300' : 'bg-slate-600 border-slate-400'}`} />

                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <p className={`font-bold ${h.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-300'}`}>
                                  {DT(h.completed_at)}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {h.mileage_km != null ? `${Number(h.mileage_km).toLocaleString()} km` : '里程未記錄'}
                                  {h.garage_name ? ` · ${h.garage_name}` : ''}
                                </p>
                                <p className="ml-auto font-black text-white">{NT(h.total_amount)}</p>
                              </div>

                              {h.summary && <p className="text-sm text-slate-300 mt-1.5">{h.summary}</p>}

                              {h.items.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {h.items.map((it, i) => (
                                    <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-surface-700 border border-surface-600 text-slate-300">
                                      {it.kind === 'PART' ? '🔧' : '👷'} {it.name}{it.quantity > 1 ? ` ×${it.quantity}` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  </div>
                )}

                {/* ===== 車輛管理面板（頂部） ===== */}
                {(!data.vehicle || activeTab === 'vehicle' || (data.vehicle && showVehicleManager)) && <div role="tabpanel" id="panel-vehicle" aria-labelledby="tab-vehicle" className="mb-6">
                  {showVehicleManager && (
                    <div className="bg-surface-800 rounded-2xl p-5 border border-surface-600 animate-slide-in">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">{editingVehicle ? '編輯車輛' : '新增車輛'}</h3>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={regFileRef}
                            onChange={handleRegUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => regFileRef.current?.click()}
                            disabled={recognizingReg}
                            className="px-3 py-1.5 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                          >
                            {recognizingReg ? '辨識中...' : '📷 掃描行照'}
                          </button>

                        </div>
                      </div>
                      <form onSubmit={editingVehicle ? handleUpdateVehicle : handleCreateVehicle} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* 年份 */}
                          <label className="block">
                            <span className="text-xs text-slate-500">年份 *</span>
                            <select value={vehicleForm.year} onChange={e => setVehicleForm({...vehicleForm, year: e.target.value, make: '', model: '', variantId: '', generation: '', engine: ''})} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" required>
                              <option value="">選擇年份</option>
                              {vehicleForm.year && !years.some(y => String(y) === String(vehicleForm.year)) && <option value={vehicleForm.year}>{vehicleForm.year}</option>}
                              {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </label>
                          {/* 品牌 */}
                          <label className="block">
                            <span className="text-xs text-slate-500">品牌 *</span>
                            <select value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value, model: '', variantId: '', generation: '', engine: ''})} disabled={!vehicleForm.year} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white disabled:opacity-50" required>
                              <option value="">選擇品牌</option>
                              {vehicleForm.make && !makes.includes(vehicleForm.make) && <option value={vehicleForm.make}>{vehicleForm.make}</option>}
                              {makes.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </label>
                          {/* 車系 */}
                          <label className="block">
                            <span className="text-xs text-slate-500">車系 *</span>
                            <select value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value, variantId: '', generation: '', engine: ''})} disabled={!vehicleForm.make} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white disabled:opacity-50" required>
                              <option value="">選擇車系</option>
                              {vehicleForm.model && !models.includes(vehicleForm.model) && <option value={vehicleForm.model}>{vehicleForm.model}</option>}
                              {models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </label>
                          {/* 世代/引擎 */}
                          <label className="block">
                            <span className="text-xs text-slate-500">世代/引擎</span>
                            <select value={vehicleForm.variantId} onChange={e => setVehicleForm({...vehicleForm, variantId: e.target.value})} disabled={!vehicleForm.model} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white disabled:opacity-50">
                              <option value="">選擇世代（可略）</option>
                              {vehicleForm.variantId && !variants.some(v => String(v.id) === String(vehicleForm.variantId)) && <option value={vehicleForm.variantId}>{vehicleForm.generation || '目前車型'} - {vehicleForm.engine}</option>}
                              {variants.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.generation || v.variant_name} - {v.engine_code} {v.year_start && v.year_end && v.year_start !== v.year_end ? `(${v.year_start}~${v.year_end})` : v.year_start ? `(${v.year_start})` : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                          {/* VIN */}
                          <label className="block md:col-span-2">
                            <span className="text-xs text-slate-500">VIN</span>
                            <input value={vehicleForm.vin} onChange={e => setVehicleForm({...vehicleForm, vin: e.target.value})} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" placeholder="車架號" />
                          </label>
                          {/* 車牌 */}
                          <label className="block md:col-span-2">
                            <span className="text-xs text-slate-500">車牌</span>
                            <input value={vehicleForm.licensePlate} onChange={e => setVehicleForm({...vehicleForm, licensePlate: e.target.value})} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" placeholder="如：ABC-1234" />
                          </label>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold">
                            {editingVehicle ? '更新車輛' : '新增車輛'}
                          </button>
                          <button type="button" onClick={cancelEditVehicle} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold">
                            取消
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* 無車輛 → 引導新增車輛（CTA 由上方車輛摘要提供） */}
                  {!data.vehicle && !showVehicleManager && (
                    <EmptyState
                      icon={<span className="text-6xl">🚗</span>}
                      title="還沒有登記車輛"
                      description="登記你的愛車，開始建立保養總覽與保養預約"
                    />
                  )}

                  {/* 車輛列表 */}
                  {/* ⚠️ 條件是 vehicles.length，不是 data.vehicle：
                      data.vehicle 是「當前車輛」，若 currentVehicleId 指向已刪車輛會是 null，
                      用它當條件會讓整個列表消失（看起來像所有車都不見）。 */}
                  {vehicles.length > 0 && (
                  <div className="border-t border-surface-600 pt-4">
                    <h4 className="font-medium text-slate-300 mb-3">我的車輛列表</h4>
                    {loadingVehicles ? (
                      <div className="space-y-2">{[...Array(3)].map((_, i) => (<div key={i} className="skeleton h-16 rounded-xl" />))}</div>
                    ) : vehicles.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">尚無車輛，點擊上方新增</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {vehicles.map(v => (
                          <div key={v.id} className={`bg-surface-800 rounded-xl p-4 border ${data?.vehicle?.id === v.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-surface-600'}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-white">{v.make} {v.model}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{v.generation || ''} {v.year ? `· ${v.year}` : ''}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{v.engine || '未填引擎'} · {v.licensePlate || '未填車牌'}</p>
                              </div>
                              {data?.vehicle?.id === v.id && <span className="chip bg-blue-500/20 text-blue-400 text-xs">當前</span>}
                            </div>
                            <div className="flex gap-2 mt-3">
                              {data?.vehicle?.id === v.id ? (
                                <>
                                  <button onClick={() => startEditVehicle(v)} className="flex-1 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white">編輯</button>
                                  <button onClick={() => handleDeleteVehicle(v.id)} className="py-1.5 px-3 text-xs rounded bg-red-900/60 text-red-300 hover:bg-red-900">刪除</button>
                                </>
                              ) : (
                                <button onClick={() => switchVehicle(v.id)} className="w-full py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">切換至這台車</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>}

                {data.vehicle && activeTab === 'mods' && <div role="tabpanel" id="panel-mods" aria-labelledby="tab-mods">
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 flex-wrap">
                    <span>當前套用車輛：</span>
                    <span className="font-medium text-slate-200 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                      🚗 {data.vehicle.make} {data.vehicle.model}{data.vehicle.generation ? ` ${data.vehicle.generation}` : ''}{data.vehicle.year ? ` · ${data.vehicle.year}` : ''}
                    </span>
                    <button onClick={() => setShowVehicleSwitcher(true)} className="text-xs text-blue-400 hover:text-blue-300 underline ml-2 cursor-pointer">⇄ 切換車輛</button>
                  </div>
                  <ModificationEditor key={data.vehicle.id} vehicleId={data.vehicle.id} vehicleInfo={data.vehicle} />
                </div>}
              </>
            )}
          </>
        </>

      {/* 📷 更新里程數 Modal（含拍照/上傳儀表板辨識） */}
      {showMileageEdit && data?.vehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowMileageEdit(false)}>
          <div className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">更新里程數</h3>
            <p className="text-xs text-slate-500 mb-4">目前紀錄：{data.current_mileage_km != null ? `${Number(data.current_mileage_km).toLocaleString()} km` : '—'}</p>

            <label htmlFor="mileage-input" className="block text-sm text-slate-400 mb-1">目前里程數（km）</label>
            <input
              id="mileage-input"
              type="number"
              min="0"
              inputMode="numeric"
              value={mileageInput}
              onChange={e => setMileageInput(e.target.value)}
              placeholder="例如：42500"
              className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-lg font-bold mb-3 focus:border-blue-500 outline-none"
            />

            {/* 里程以手動輸入為準；技師於工單回寫的里程會自動同步 */}
            <p className="mt-1 text-xs text-slate-500">
              小提醒：回廠保養時由車廠更新里程，系統會自動同步，不需要每次手動修改。
            </p>

            <div className="flex gap-2 mt-4">
              <button className="btn-primary flex-1 py-2" onClick={handleMileageSave}>確認套用</button>
              <button className="btn-secondary px-4 py-2" onClick={() => setShowMileageEdit(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ⇄ 全域車輛切換器（與導航列右上角同一來源） */}
      {showVehicleSwitcher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowVehicleSwitcher(false)}>
          <div className="w-full max-w-sm bg-surface-800 border border-surface-600 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">切換車輛</h3>
            <p className="text-xs text-slate-500 mb-4">全域當前車輛 — 導航列與本頁同步更新</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {vehicles.map(v => (
                <button
                  key={v.id}
                  onClick={async () => { setShowVehicleSwitcher(false); await switchVehicle(v.id); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${data?.vehicle?.id === v.id ? 'border-blue-500 bg-blue-500/10' : 'border-surface-600 bg-surface-800 hover:border-slate-600'}`}
                >
                  <p className="font-bold text-white text-sm">{v.make} {v.model}{v.generation ? ` ${v.generation}` : ''}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{v.year ? `${v.year} · ` : ''}{v.engine || '未填引擎'} · {v.licensePlate || '未填車牌'}</p>
                  {data?.vehicle?.id === v.id && <span className="chip bg-blue-500/20 text-blue-400 text-xs mt-1 inline-block">當前</span>}
                </button>
              ))}
            </div>
            <button className="btn-secondary w-full mt-4 py-2" onClick={() => setShowVehicleSwitcher(false)}>取消</button>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default MyCar;