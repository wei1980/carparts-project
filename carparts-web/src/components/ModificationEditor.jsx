// src/components/ModificationEditor.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { vehicleAPI } from '../api';
import { modificationCategories } from '../data/modifications';
import { confirmDialog } from './ConfirmDialog';
import toast from 'react-hot-toast';

// 改裝分類 → 商城分類/關鍵字對照（「🛒 商城選購」導向）
const MOD_SHOP_MAP = {
  brake: { category: '煞車', search: '煞車' },
  suspension: { category: '底盤', search: '避震器' },
  wheels_tires: { category: '輪圈', search: '輪框' },
  intake: { category: '進氣', search: '進氣' },
  exhaust: { category: '排氣', search: '排氣' },
};

// 舊版分類／子項 key → 新版（相容資料庫既有紀錄）
const KEY_ALIAS = {
  brakes: 'brake',
  wheels: 'wheels_tires',
  coilover: 'coilovers',
  rotor: 'brake_disc',
  pad: 'brake_pads',
  spring: 'lowering_springs',
  wheel_set: 'wheels',
};
const aliasKey = (k) => KEY_ALIAS[k] || k;

const DT_SHORT = (d) => (d ? new Date(d).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '');
const NT = (n) => `NT$ ${Number(n || 0).toLocaleString()}`;

export function ModificationEditor({ vehicleId, vehicleInfo, onSaved }) {
  const [mods, setMods] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [editingNew, setEditingNew] = useState(null); // { categoryKey, partTypeKey }
  const [editingKey, setEditingKey] = useState(null); // 'cat.part' — 已紀錄項目的表單編輯開關
  const navigate = useNavigate();

  // 🆕 AI 辨識狀態（每個卡片獨立）
  const [aiUploading, setAiUploading] = useState({}); // { 'cat.part': true }
  const [aiPhotoPreview, setAiPhotoPreview] = useState({}); // { 'cat.part': photoUrl }
  const aiFileRefs = useRef({}); // { 'cat.part': <input ref> }

  // 載入現有改裝
  useEffect(() => {
    if (!vehicleId) return;
    vehicleAPI.getModifications(vehicleId)
      .then(res => {
        const json = {};
        (res.data || []).forEach(m => {
          const cat = aliasKey(m.category);
          const pt = aliasKey(m.partType);
          if (!json[cat]) json[cat] = {};
          json[cat][pt] = m;
        });
        setMods(json);

        // 🆕 同步照片預覽
        const previews = {};
        (res.data || []).forEach(m => {
          if (Array.isArray(m.beforePhotoUrls) && m.beforePhotoUrls.length > 0) {
            previews[`${aliasKey(m.category)}.${aliasKey(m.partType)}`] = m.beforePhotoUrls[0];
          }
        });
        setAiPhotoPreview(prev => ({ ...prev, ...previews }));
      })
      .catch(err => console.warn('載入改裝失敗:', err))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  // ==========================================
  // 🆕 AI 拍照辨識
  // ==========================================
  const handleAIRecognize = async (categoryKey, partTypeKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('請上傳圖片檔案');
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('圖片大小不能超過 5MB');
    }

    const key = `${categoryKey}.${partTypeKey}`;
    setAiUploading(prev => ({ ...prev, [key]: true }));

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (vehicleInfo) formData.append('vehicleInfo', vehicleInfo);
      // 告訴 AI 使用者希望辨識的大類（提示用，AI 仍可能改判）
      formData.append('categoryHint', categoryKey);

      const res = await api.post('/ai/recognize-modification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { photoUrl, result } = res.data;

      // 🎯 自動填入品牌、型號、規格
      setMods(prev => {
        const existing = prev[categoryKey]?.[partTypeKey] || { brand: '', model: '', specJson: {}, note: '', beforePhotoUrls: [] };
        return {
          ...prev,
          [categoryKey]: {
            ...prev[categoryKey],
            [partTypeKey]: {
              ...existing,
              brand: result.brand || existing.brand || '',
              model: result.model || existing.model || '',
              specJson: { ...existing.specJson, ...(result.specJson || {}) },
              beforePhotoUrls: photoUrl
                ? [photoUrl, ...(existing.beforePhotoUrls || []).filter(u => u !== photoUrl)]
                : existing.beforePhotoUrls,
            },
          },
        };
      });

      if (photoUrl) {
        setAiPhotoPreview(prev => ({ ...prev, [key]: photoUrl }));
      }

      const pct = Math.round((result.confidence || 0) * 100);
      const detected = [result.brand, result.model].filter(Boolean).join(' ') || '未辨識出品牌型號';
      if (result.confidence >= 0.75) {
        toast.success(`✅ AI 辨識成功（${pct}%）：${detected}`);
      } else if (result.confidence >= 0.4) {
        toast(`⚠️ AI 辨識完成（${pct}%）：${detected}\n請確認後再儲存`, { duration: 5000 });
      } else {
        toast(`🤔 AI 信心度低（${pct}%）：請手動填寫`, { icon: '⚠️', duration: 5000 });
      }
    } catch (err) {
      toast.error('AI 辨識失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setAiUploading(prev => ({ ...prev, [key]: false }));
      if (aiFileRefs.current[key]) aiFileRefs.current[key].value = '';
    }
  };

  // 同步儲存到兩個地方：結構化表 + JSON 欄位
  const handleSave = async (categoryKey, partTypeKey, data) => {
    setSaving(`${categoryKey}.${partTypeKey}`);
    try {
      const response = await vehicleAPI.addModification(vehicleId, {
        category: categoryKey,
        partType: partTypeKey,
        brand: data.brand,
        model: data.model,
        specJson: data.specJson,
        note: data.note,
        // 🆕 照片一併寫入（後端 addModification 需支援 beforePhotoUrls）
        beforePhotoUrls: data.beforePhotoUrls || [],
      });
      setMods(prev => ({
        ...prev,
        [categoryKey]: { ...prev[categoryKey], [partTypeKey]: response.data }
      }));
      setEditingNew(null);
      setEditingKey(null);
      toast.success('改裝已儲存');
      onSaved?.();
    } catch (err) {
      toast.error('儲存失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (categoryKey, partTypeKey) => {
    const confirmed = await confirmDialog({
      message: '確定刪除此改裝項目？此操作不可復原。',
      confirmText: '確定刪除',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const modId = mods[categoryKey]?.[partTypeKey]?.id;
      if (!modId) { toast.error('找不到項目 ID'); return; }

      await vehicleAPI.deleteModification(vehicleId, modId);
      setMods(prev => {
        const next = { ...prev };
        if (next[categoryKey]) {
          delete next[categoryKey][partTypeKey];
          if (Object.keys(next[categoryKey]).length === 0) delete next[categoryKey];
        }
        return next;
      });
      // 🆕 清除照片預覽
      setAiPhotoPreview(prev => {
        const next = { ...prev };
        delete next[`${categoryKey}.${partTypeKey}`];
        return next;
      });
      toast.success('改裝已刪除');
      onSaved?.();
    } catch (err) {
      toast.error('刪除失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 開放自訂子項目：以時間戳為鍵存入，名稱記錄於 specJson.customName
  const startCustom = (categoryKey) => {
    const partTypeKey = `custom_${Date.now().toString(36)}`;
    const newItem = { brand: '', model: '', specJson: { customName: '' }, note: '' };
    setMods(prev => ({ ...prev, [categoryKey]: { ...prev[categoryKey], [partTypeKey]: newItem } }));
    setEditingNew({ categoryKey, partTypeKey, isCustom: true });
    setExpanded(k => ({ ...k, [categoryKey]: true }));
  };

  const handleCancelNew = (categoryKey, partTypeKey) => {
    setMods(prev => {
      const next = { ...prev };
      if (next[categoryKey]) {
        delete next[categoryKey][partTypeKey];
        if (Object.keys(next[categoryKey]).length === 0) delete next[categoryKey];
      }
      return next;
    });
    setEditingNew(null);
    // 🆕 清除照片預覽
    setAiPhotoPreview(prev => {
      const next = { ...prev };
      delete next[`${categoryKey}.${partTypeKey}`];
      return next;
    });
  };

  // 通用規格輸入欄位
  const renderSpecInputs = (partType, existing, handlers) => {
    const base = existing || {};
    const spec = base.specJson || {};

    switch (partType) {
      case 'caliper':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-[#101720] rounded-xl border border-[#26313d]">
            <label className="block">
              <span className="text-xs text-slate-500">安裝位置</span>
              <select value={spec.axle || ''} onChange={e => handlers.handleSpecChange('axle', e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="">尚未確認</option><option value="front">前軸</option><option value="rear">後軸</option><option value="both">前後軸（同型號）</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">活塞數</span>
              <input type="number" value={String(spec.pistonCount || '')} onChange={e => handlers.handleSpecChange('pistonCount', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：6" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">碟盤直徑 (mm)</span>
              <input type="number" value={String(spec.rotorDiameter || '')} onChange={e => handlers.handleSpecChange('rotorDiameter', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：380" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">固定螺絲間距 (mm)</span>
              <input type="number" value={String(spec.mountSpacing || '')} onChange={e => handlers.handleSpecChange('mountSpacing', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：210" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">來令片形狀碼／料號</span>
              <input value={String(spec.shapeCode || '')} onChange={e => handlers.handleSpecChange('shapeCode', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="依卡鉗或來令片供應商資料填寫" />
            </label>
          </div>
        );
      case 'wheels':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-[#101720] rounded-xl border border-[#26313d]">
            <label className="block">
              <span className="text-xs text-slate-500">直徑 (吋)</span>
              <input type="number" value={String(spec.diameter || '')} onChange={e => handlers.handleSpecChange('diameter', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：19" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">寬度 (J)</span>
              <input type="number" step="0.5" value={String(spec.width || '')} onChange={e => handlers.handleSpecChange('width', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：9.5" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">PCD</span>
              <input value={String(spec.pcd || '')} onChange={e => handlers.handleSpecChange('pcd', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：5x114.3" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">ET 值</span>
              <input type="number" value={String(spec.et || '')} onChange={e => handlers.handleSpecChange('et', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：35" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">中心孔</span>
              <input type="number" value={String(spec.centerBore || '')} onChange={e => handlers.handleSpecChange('centerBore', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：67.1" />
            </label>
          </div>
        );
      case 'intake_kit':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-[#101720] rounded-xl border border-[#26313d]">
            <label className="block">
              <span className="text-xs text-slate-500">管徑 (mm)</span>
              <input type="number" value={String(spec.pipeDiameter || '')} onChange={e => handlers.handleSpecChange('pipeDiameter', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：76" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">濾芯類型</span>
              <select value={String(spec.filterType || '')} onChange={e => handlers.handleSpecChange('filterType', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="">選擇類型</option>
                <option value="cone">圓錐型 (香菇頭)</option>
                <option value="panel">平板型</option>
                <option value="custom">客製化</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">濾芯尺寸</span>
              <input value={String(spec.filterSize || '')} onChange={e => handlers.handleSpecChange('filterSize', e.target.value)} 
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="如：Φ150 x H200" />
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  function makeHandlers(categoryKey, partTypeKey) {
    return {
      handleBrandChange: (e) => {
        const val = typeof e === 'string' ? e : e.target?.value ?? '';
        const existing = mods[categoryKey]?.[partTypeKey] || {};
        setMods(prev => ({ ...prev, [categoryKey]: { ...prev[categoryKey], [partTypeKey]: { ...existing, brand: val } } }));
      },
      handleModelChange: (e) => {
        const val = typeof e === 'string' ? e : e.target?.value ?? '';
        const existing = mods[categoryKey]?.[partTypeKey] || {};
        setMods(prev => ({ ...prev, [categoryKey]: { ...prev[categoryKey], [partTypeKey]: { ...existing, model: val } } }));
      },
      handleSpecChange: (key, val) => {
        const existing = mods[categoryKey]?.[partTypeKey] || {};
        setMods(prev => ({ ...prev, [categoryKey]: { ...prev[categoryKey], [partTypeKey]: { ...existing, specJson: { ...existing.specJson, [key]: val } } } }));
      },
      handleNoteChange: (e) => {
        const val = typeof e === 'string' ? e : e.target?.value ?? '';
        const existing = mods[categoryKey]?.[partTypeKey] || {};
        setMods(prev => ({ ...prev, [categoryKey]: { ...prev[categoryKey], [partTypeKey]: { ...existing, note: val } } }));
      },
    };
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="bg-[#131a22] rounded-2xl p-5 border border-[#26313d]">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        🔧 改裝項目 <span className="text-xs text-slate-500">（記錄實際裝車品牌、型號與規格）</span>
      </h3>

      {modificationCategories.map(cat => {
        const catMods = mods[cat.key] || {};
        const recordedCount = Object.keys(catMods).length;
        return (
          <div key={cat.key} className="mb-4">
            <button 
              onClick={() => { if (!editingNew) setExpanded(k => ({...k, [cat.key]: !k[cat.key]})); }}
              className="w-full flex items-center justify-between text-slate-300 py-2"
            >
              <span className="flex items-center gap-2">
                {cat.name}
                <span className="text-xs text-slate-500">({recordedCount}/{cat.parts.length} 項目)</span>
                {recordedCount > 0 && <span className="chip bg-emerald-500/20 text-emerald-400">{recordedCount} 項</span>}
              </span>
              <svg className={`w-5 h-5 transition ${expanded[cat.key] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded[cat.key] && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  ...cat.parts,
                  // 自訂子項目（字典外鍵：既有紀錄或新增中的自訂項）
                  ...Object.keys(catMods)
                    .filter(k => !cat.parts.some(p => p.key === k))
                    .map(k => ({ key: k, name: catMods[k]?.specJson?.customName || '自訂項目', custom: true })),
                ].map(pt => {
                  const existing = catMods[pt.key];
                  const isEditingNew = editingNew?.categoryKey === cat.key && editingNew?.partTypeKey === pt.key;
                  const handlers = makeHandlers(cat.key, pt.key);
                  const current = existing || (isEditingNew ? mods[cat.key]?.[pt.key] : null);
                  const key = `${cat.key}.${pt.key}`;
                  const photo = aiPhotoPreview[key];

                  // ===== 未紀錄：輕量虛線卡片 =====
                  if (!existing && !isEditingNew) {
                    const shop = MOD_SHOP_MAP[cat.key];
                    return (
                      <div key={pt.key} className="border-2 border-dashed border-slate-700/70 hover:border-blue-500/50 bg-slate-800/20 hover:bg-slate-800/60 rounded-xl p-4 flex flex-col justify-between items-center text-center transition-all min-h-[140px]">
                        <div className="text-sm font-medium text-slate-400 mb-2">{pt.name}</div>
                        <button
                          onClick={() => {
                            const newItem = { brand: '', model: '', specJson: {}, note: '' };
                            setMods(prev => ({ ...prev, [cat.key]: { ...prev[cat.key], [pt.key]: newItem } }));
                            setEditingNew({ categoryKey: cat.key, partTypeKey: pt.key });
                            setExpanded(k => ({ ...k, [cat.key]: true }));
                          }}
                          className="text-xs bg-slate-700/50 hover:bg-blue-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 hover:border-blue-500 transition-colors flex items-center gap-1 my-1"
                        >
                          <span>+</span> 紀錄改裝
                        </button>
                        {shop && (
                          <button
                            onClick={() => navigate(`/shop?category=${encodeURIComponent(shop.category)}&car=${encodeURIComponent(shop.search)}`)}
                            className="text-[11px] text-blue-400/80 hover:text-blue-300 hover:underline transition-colors mt-2"
                          >
                            🛒 找尋適用{pt.name} →
                          </button>
                        )}
                      </div>
                    );
                  }

                  const showForm = isEditingNew || editingKey === key;

                  // ===== 已紀錄：質感實心卡片 =====
                  return (
                    <div key={pt.key} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-slate-300">{pt.name}</p>
                          {existing?.id && !showForm && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">已裝車</span>
                          )}
                          {existing?.garageId && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">車大師購入</span>
                          )}
                          {isEditingNew && <span className="text-xs text-blue-400">新增模式 - 填寫後點擊確認</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {existing?.id && !showForm && (
                            <>
                              <button onClick={() => setEditingKey(key)} className="text-xs px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600 text-slate-200">✏️ 編輯</button>
                              <button onClick={() => handleDelete(cat.key, pt.key)} className="text-xs px-2 py-1 rounded bg-red-900/50 hover:bg-red-800 text-red-300">🗑️ 刪除</button>
                            </>
                          )}
                          {showForm && existing?.id && (
                            <button onClick={() => setEditingKey(null)} className="text-xs px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600 text-slate-200">收起</button>
                          )}
                          {isEditingNew && (
                            <button onClick={() => handleCancelNew(cat.key, pt.key)} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white">取消</button>
                          )}
                        </div>
                      </div>

                      {/* 精簡檢視：品牌型號 + 安裝日期/金額 + 照片 */}
                      {existing?.id && !showForm && (
                        <div>
                          <p className="font-bold text-slate-100">{existing.brand} {existing.model}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {existing.installedAt ? DT_SHORT(existing.installedAt) : '未記錄日期'}{existing.laborCost ? ` · ${NT(existing.laborCost)}` : ''}
                          </p>
                          {photo && <img src={photo} alt="改裝品" className="mt-2 w-20 h-20 object-cover rounded-lg border border-[#26313d]" />}
                        </div>
                      )}

                      {showForm && (
                        <div className="space-y-3 pt-2 border-t border-[#26313d]">

                          {/* 🆕 AI 拍照辨識按鈕 */}
                          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-3 border border-purple-500/30">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              ref={el => aiFileRefs.current[key] = el}
                              onChange={(e) => handleAIRecognize(cat.key, pt.key, e)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => aiFileRefs.current[key]?.click()}
                              disabled={aiUploading[key]}
                              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                              {aiUploading[key] ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  AI 辨識中...
                                </>
                              ) : (
                                <>📷 拍照 / 上傳改裝品照片（AI 自動辨識）</>
                              )}
                            </button>

                            {photo && (
                              <div className="mt-3 flex items-center gap-3 bg-[#0b0f14] rounded-lg p-2 border border-[#26313d]">
                                <img src={photo} alt="改裝品" className="w-16 h-16 object-cover rounded" />
                                <div className="text-xs text-slate-400 flex-1">
                                  <p className="text-emerald-300 font-medium">✓ 照片已上傳</p>
                                  <p className="mt-0.5">AI 已自動填入品牌型號，請確認後儲存</p>
                                </div>
                              </div>
                            )}

                            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                              💡 拍攝特寫標誌/銘牌可提高辨識率；規格（如活塞數）仍需手動確認
                            </p>
                          </div>

                          {/* 改裝品識別 */}
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-xs text-slate-500">品牌</span>
                              <input value={current?.brand || ''} onChange={handlers.handleBrandChange} 
                                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                            </label>
                            <label className="block">
                              <span className="text-xs text-slate-500">型號</span>
                              <input value={current?.model || ''} onChange={handlers.handleModelChange} 
                                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                            </label>
                          </div>
                          <label className="block">
                            <span className="text-xs text-slate-500">備註</span>
                            <input value={current?.note || ''} onChange={handlers.handleNoteChange} 
                              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="其他說明..." />
                          </label>

                          {/* 自訂項目名稱 */}
                          {pt.key.startsWith('custom_') && (
                            <label className="block">
                              <span className="text-xs text-slate-500">自訂項目名稱 *</span>
                              <input
                                value={current?.specJson?.customName || ''}
                                onChange={e => handlers.handleSpecChange('customName', e.target.value)}
                                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                                placeholder="例如：防爆電池、手排換檔撐桿..."
                              />
                            </label>
                          )}

                          {renderSpecInputs(pt.key, current, handlers)}

                          <div className="flex gap-2 mt-4">
                            <button onClick={() => {
                              handleSave(cat.key, pt.key, mods[cat.key][pt.key]);
                            }} 
                            disabled={saving === key}
                            className={`flex-1 py-2 rounded-lg font-medium text-sm ${isEditingNew 
                              ? 'bg-emerald-600 hover:bg-emerald-500' 
                              : 'bg-blue-600 hover:bg-blue-500'} disabled:opacity-50`}>
                              {saving === key ? '儲存中...' : (isEditingNew ? '確認新增' : '更新儲存')}
                            </button>
                            {isEditingNew && (
                              <button onClick={() => handleCancelNew(cat.key, pt.key)} 
                                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-medium text-sm">
                                取消
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ＋ 自訂項目（開放自訂子項目） */}
                <div key="__custom_add" className="border-2 border-dashed border-slate-700/70 hover:border-purple-500/50 bg-slate-800/20 hover:bg-slate-800/60 rounded-xl p-4 flex flex-col justify-center items-center text-center transition-all min-h-[140px]">
                  <div className="text-sm font-medium text-slate-400 mb-2">其他子項目</div>
                  <button
                    onClick={() => startCustom(cat.key)}
                    className="text-xs bg-slate-700/50 hover:bg-purple-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 hover:border-purple-500 transition-colors flex items-center gap-1 my-1"
                  >
                    <span>+</span> 自訂項目
                  </button>
                  <span className="text-[11px] text-slate-500 mt-2">字典沒有的零件也能記錄</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}