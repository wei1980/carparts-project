import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { aiApi } from '../api/aiApi';
import { vehicleAPI } from '../api';
import { modificationCategories } from '../data/modifications';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

export default function Garage() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // ---- 車輛基本資料 (新增用) ----
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);
  const [pick, setPick] = useState({ year: '', make: '', model: '', variantId: '' });
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');

  // ---- 行照掃描狀態 ----
  const regFileRef = useRef(null);
  const [recognizingReg, setRecognizingReg] = useState(false);
  const isScanningRef = useRef(false);
  const scanResultRef = useRef(null); // 暫存辨識結果

  // ---- 改裝件編輯器狀態 ----
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modList, setModList] = useState([]);
  const [recognizing, setRecognizing] = useState(false);
  const fileInputRef = useRef(null);

  // ---- 品牌正規化對照表 ----
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

  // ==================== 載入年份 ====================
  useEffect(() => {
    api.get('/vehicles/years')
      .then(res => setYears(res.data || []))
      .catch(() => setYears(Array.from({ length: 36 }, (_, i) => String(new Date().getFullYear() - i))));
  }, []);

  // ==================== 年份改變 → 載入品牌 ====================
  useEffect(() => {
    setMakes([]); setModels([]); setVariants([]);
    if (!pick.year) return;
    api.get(`/vehicles/makes?year=${pick.year}`)
      .then(res => setMakes(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
    if (!isScanningRef.current) {
      setPick(s => ({ ...s, make: '', model: '', variantId: '' }));
    }
  }, [pick.year]);

  // ==================== 品牌改變 → 載入車系 ====================
  useEffect(() => {
    setModels([]); setVariants([]);
    if (!pick.year || !pick.make) return;
    api.get(`/vehicles/models?year=${pick.year}&make=${encodeURIComponent(pick.make)}`)
      .then(res => setModels(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
    if (!isScanningRef.current) {
      setPick(s => ({ ...s, model: '', variantId: '' }));
    }
  }, [pick.make]);

  // ==================== 車系改變 → 載入世代 ====================
  useEffect(() => {
    setVariants([]);
    if (!pick.year || !pick.make || !pick.model) return;
    api.get(`/vehicles/variants?year=${pick.year}&make=${encodeURIComponent(pick.make)}&model=${encodeURIComponent(pick.model)}`)
      .then(res => setVariants(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
    setPick(s => ({ ...s, variantId: '' }));
  }, [pick.model]);

  // ==================== 監聽 makes，自動設定品牌（忽略大小寫） ====================
  useEffect(() => {
    if (isScanningRef.current && scanResultRef.current && makes.length > 0) {
      const { make } = scanResultRef.current;
      if (make) {
        const found = makes.find(m => m.toLowerCase() === make.toLowerCase());
        if (found) {
          setPick(s => ({ ...s, make: found }));
          scanResultRef.current = { ...scanResultRef.current, make: null };
        }
      }
    }
  }, [makes]);

  // ==================== 監聽 models，自動設定車系（忽略大小寫 + 部分包含） ====================
  useEffect(() => {
    if (isScanningRef.current && scanResultRef.current && models.length > 0) {
      const { model } = scanResultRef.current;
      if (model) {
        let found = models.find(m => m.toLowerCase() === model.toLowerCase());
        if (!found) {
          found = models.find(m =>
            m.toLowerCase().includes(model.toLowerCase()) ||
            model.toLowerCase().includes(m.toLowerCase())
          );
        }
        if (found) {
          setPick(s => ({ ...s, model: found }));
          scanResultRef.current = { ...scanResultRef.current, model: null };
          isScanningRef.current = false; // 成功匹配，關閉掃描狀態
        }
      }
    }
  }, [models]);

  // ==================== 監聽 variants，若只有一個世代則自動選取 ====================
  useEffect(() => {
    if (variants.length === 1 && pick.model && !pick.variantId) {
      setPick(s => ({ ...s, variantId: String(variants[0].id) }));
    }
  }, [variants, pick.model, pick.variantId]);

  // ==================== 編輯模式：載入車輛資料 ====================
  useEffect(() => {
    if (!isNew) {
      vehicleAPI.getById(id).then(res => {
        setVehicle(res.data);
        const mods = res.data.modifications || {};
        const list = [];
        for (const [catKey, catValue] of Object.entries(mods)) {
          if (typeof catValue === 'object') {
            for (const [partKey, partValue] of Object.entries(catValue)) {
              if (partValue && partValue.brand) {
                list.push({
                  category: catKey,
                  part: partKey,
                  brand: partValue.brand,
                  model: partValue.model,
                  specs: partValue.specs || {},
                });
              }
            }
          }
        }
        setModList(list);
      });
    }
  }, [id]);

  // ==================== 新增車輛 ====================
  const handleCreate = async () => {
    if (!pick.make || !pick.model) { toast.error('請至少選擇年份、品牌與車系'); return; }
    const variant = variants.find(v => v.id === parseInt(pick.variantId));
    const data = {
      make: pick.make,
      model: pick.model,
      generation: variant?.generation || '',
      year: pick.year ? parseInt(pick.year) : null,
      engine: variant?.engine_code || '',
      vin: vin || null,
      licensePlate: licensePlate || null,
      variantId: pick.variantId ? parseInt(pick.variantId) : null,
    };
    try {
      await vehicleAPI.create(data);
      navigate('/');
    } catch (err) {
      toast.error('建立失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // ==================== 自動建立新車型並建立車輛 ====================
  const autoCreateVehicleAndFinish = async (make, model, year, generation, engine_code, displacement_cc, horsepower, fuel_type, licensePlate, vin) => {
    try {
      const res = await api.post('/vehicles/auto-create-variant', {
              make: normalizeMake(make), // 使用正規化後的品牌
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
        make: normalizeMake(make), // 保持品牌一致
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
      navigate('/');
    } catch (err) {
      console.error('自動建立車型失敗:', err);
      toast.error('自動建立車型失敗，請手動選擇車型。');
      isScanningRef.current = false;
    }
  };

  // ==================== 行照掃描處理（含自動建立車型） ====================
  const handleRegUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRecognizingReg(true);
    try {
      const res = await aiApi.recognizeRegistration(file);
      const { licensePlate: lp, vin: v, make: mk, model: md, year: yr,
              generation, engine_code, displacement_cc, horsepower, fuel_type } = res.data;

      // 品牌正規化
      const brand = normalizeMake(mk);

      // 立即填入車牌與 VIN
      if (lp) setLicensePlate(lp);
      if (v) setVin(v);

      if (brand && md) {
        isScanningRef.current = true;
        // 傳入正規化後的品牌進行匹配
        scanResultRef.current = { make: brand, model: md, year: yr ? String(yr) : '' };
        setPick(s => ({ ...s, year: yr ? String(yr) : '', make: '', model: '', variantId: '' }));

        // 設定計時器，等待品牌/車系載入後檢查是否需要自動建立
        setTimeout(async () => {
          if (!isScanningRef.current) return; // 已由 useEffect 成功匹配

          // 檢查品牌是否存在
          const brandMatched = makes.find(m => m.toLowerCase() === brand.toLowerCase());
          if (!brandMatched) {
            // 品牌缺失 → 自動建立車型
            await autoCreateVehicleAndFinish(brand, md, yr, generation, engine_code, displacement_cc, horsepower, fuel_type, lp, v);
            return;
          }

          // 檢查車系是否存在 (忽略大小寫、部分包含)
          let modelMatched = models.find(m => m.toLowerCase() === md.toLowerCase());
          if (!modelMatched) {
            modelMatched = models.find(m =>
              m.toLowerCase().includes(md.toLowerCase()) || md.toLowerCase().includes(m.toLowerCase())
            );
          }
          if (!modelMatched) {
            // 車系缺失 → 自動建立車型
            await autoCreateVehicleAndFinish(brand, md, yr, generation, engine_code, displacement_cc, horsepower, fuel_type, lp, v);
            return;
          }

          // 如果品牌與車系都存在但 useEffect 沒有成功設定 (可能時序問題)，強制設定一次
          setPick(s => ({ ...s, make: brandMatched, model: modelMatched }));
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

  // ==================== 改裝件操作 ====================
  const addModification = () => {
    if (!selectedCategory || !selectedPart || !selectedBrand || !selectedModel) {
      toast.error('請完整選擇類別、零件、品牌與型號');
      return;
    }
    const newMod = {
      category: selectedCategory,
      part: selectedPart,
      brand: selectedBrand,
      model: selectedModel,
    };
    const exists = modList.find(m =>
      m.category === newMod.category &&
      m.part === newMod.part &&
      m.brand === newMod.brand &&
      m.model === newMod.model
    );
    if (exists) { toast.error('此改裝件已存在'); return; }
    setModList([...modList, newMod]);
    setSelectedCategory('');
    setSelectedPart('');
    setSelectedBrand('');
    setSelectedModel('');
  };

  const removeModification = (index) => setModList(modList.filter((_, i) => i !== index));

  const saveModifications = async () => {
    const mods = {};
    for (const item of modList) {
      if (!mods[item.category]) mods[item.category] = {};
      mods[item.category][item.part] = {
        brand: item.brand,
        model: item.model,
      };
    }
    try {
      await vehicleAPI.updateMods(id, mods);
      toast.success('改裝履歷已更新');
    } catch (err) {
      toast.error('儲存失敗');
    }
  };

  // ==================== AI 拍照辨識改裝件 ====================
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRecognizing(true);
    try {
      const res = await aiApi.recognizePart(file);
      const { part_type, brand, model, confidence } = res.data;
      if (confidence < 0.5) {
        toast.error('辨識信心度不足，請手動選擇');
        return;
      }
      const categoryMap = {
        '煞車卡鉗': 'brakes',
        '避震器': 'suspension',
        '進氣套件': 'intake',
        '碟盤': 'brakes',
        '輪圈': 'wheels',
      };
      const mappedCategory = categoryMap[part_type] || '';
      if (mappedCategory) {
        setSelectedCategory(mappedCategory);
        setTimeout(() => {
          const cat = modificationCategories.find(c => c.key === mappedCategory);
          if (cat) {
            setSelectedPart(cat.parts[0]?.key || '');
            setSelectedBrand(brand);
            setSelectedModel(model);
          }
        }, 100);
      }
      if (brand && model) {
        toast.success(`辨識成功：${brand} ${model} (信心度: ${(confidence * 100).toFixed(0)}%)`);
      }
    } catch (err) {
      toast.error('辨識失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setRecognizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ==================== 當前選擇的改裝件下拉選項 ====================
  const currentCategory = modificationCategories.find(c => c.key === selectedCategory);
  const currentPart = currentCategory?.parts.find(p => p.key === selectedPart);
  const currentBrand = currentPart?.brands.find(b => b.name === selectedBrand);

  // ==================== 新增車輛頁面 ====================
  if (isNew) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <button onClick={() => navigate('/')} className="text-blue-400 mb-6 block">← 回首頁</button>
        <h1 className="text-3xl font-bold mb-6">新增車輛</h1>

        {/* 行照掃描區 */}
        <div className="bg-gray-800 p-6 rounded-xl max-w-lg mb-6">
          <h2 className="text-lg font-bold mb-3">📷 快速掃描行照</h2>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={regFileRef}
            onChange={handleRegUpload}
            className="hidden"
          />
          <button
            onClick={() => regFileRef.current?.click()}
            disabled={recognizingReg}
            className="w-full bg-purple-600 p-3 rounded font-bold hover:bg-purple-700 disabled:opacity-50"
          >
            {recognizingReg ? '辨識中...' : '掃描行照，自動帶入資料'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            支援拍行照或上傳行照圖片，系統將自動辨識車牌、VIN、廠牌、車型等資訊，並自動收錄新車型
          </p>
        </div>

        {/* 手動建立車輛表單 */}
        <div className="bg-gray-800 p-6 rounded-xl max-w-lg">
          <h2 className="text-lg font-bold mb-4">手動輸入</h2>
          <label className="block text-sm text-gray-400 mb-1">年份</label>
          <select
            value={pick.year}
            onChange={e => setPick(s => ({ ...s, year: e.target.value }))}
            className="w-full p-3 rounded bg-gray-700 text-white mb-4"
          >
            <option value="">選擇年份</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label className="block text-sm text-gray-400 mb-1">品牌</label>
          <select
            value={pick.make}
            onChange={e => setPick(s => ({ ...s, make: e.target.value }))}
            disabled={!pick.year}
            className="w-full p-3 rounded bg-gray-700 text-white mb-4 disabled:opacity-50"
          >
            <option value="">選擇品牌</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <label className="block text-sm text-gray-400 mb-1">車系</label>
          <select
            value={pick.model}
            onChange={e => setPick(s => ({ ...s, model: e.target.value }))}
            disabled={!pick.make}
            className="w-full p-3 rounded bg-gray-700 text-white mb-4 disabled:opacity-50"
          >
            <option value="">選擇車系</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <label className="block text-sm text-gray-400 mb-1">世代 / 引擎</label>
          <select
            value={pick.variantId}
            onChange={e => setPick(s => ({ ...s, variantId: e.target.value }))}
            disabled={!pick.model}
            className="w-full p-3 rounded bg-gray-700 text-white mb-6 disabled:opacity-50"
          >
            <option value="">選擇世代（可略）</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.generation || v.variant_name} - {v.engine_code} {v.year_start && v.year_end && v.year_start !== v.year_end ? `(${v.year_start}~${v.year_end})` : v.year_start ? `(${v.year_start})` : ''}
              </option>
            ))}
          </select>

          <hr className="border-gray-600 mb-4" />
          <p className="text-sm text-gray-400 mb-4">以下選填，可由行照掃描自動填入</p>
          <label className="block text-sm text-gray-400 mb-1">車牌號碼（選填）</label>
          <input
            value={licensePlate}
            onChange={e => setLicensePlate(e.target.value)}
            placeholder="ABC-1234"
            className="w-full p-3 rounded bg-gray-700 text-white mb-4"
          />
          <label className="block text-sm text-gray-400 mb-1">VIN 碼</label>
          <input
            value={vin}
            onChange={e => setVin(e.target.value)}
            placeholder="VIN..."
            className="w-full p-3 rounded bg-gray-700 text-white mb-6"
          />
          <button
            onClick={handleCreate}
            className="w-full bg-blue-600 p-3 rounded text-lg font-bold hover:bg-blue-700"
          >
            建立車輛
          </button>
        </div>
      </div>
    );
  }

  // ==================== 編輯車輛頁面 ====================
  if (!vehicle) return <div className="min-h-screen bg-gray-900 text-white p-8">載入中...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Navbar />
      <h1 className="text-3xl font-bold mt-6">{vehicle.make} {vehicle.model}</h1>
      <p className="text-gray-400 text-lg">{vehicle.generation} | {vehicle.year} | {vehicle.engine}</p>
      <p className="text-gray-500">VIN: {vehicle.vin || '無'} | 車牌: {vehicle.licensePlate || '無'}</p>

      {/* 改裝履歷編輯器 */}
      <div className="mt-8 bg-gray-800 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">🔧 改裝履歷</h2>

        {/* 拍照辨識按鈕 */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={recognizing}
          className="w-full bg-purple-600 p-2 rounded font-bold hover:bg-purple-700 disabled:opacity-50 mb-4"
        >
          {recognizing ? '辨識中...' : '📷 拍照辨識改裝件'}
        </button>

        {/* 下拉選擇 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <select
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setSelectedPart('');
              setSelectedBrand('');
              setSelectedModel('');
            }}
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="">選擇類別</option>
            {modificationCategories.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.name}</option>
            ))}
          </select>

          <select
            value={selectedPart}
            onChange={e => {
              setSelectedPart(e.target.value);
              setSelectedBrand('');
              setSelectedModel('');
            }}
            disabled={!selectedCategory}
            className="p-2 rounded bg-gray-700 text-white disabled:opacity-50"
          >
            <option value="">選擇零件</option>
            {currentCategory?.parts.map(p => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={e => {
              setSelectedBrand(e.target.value);
              setSelectedModel('');
            }}
            disabled={!selectedPart}
            className="p-2 rounded bg-gray-700 text-white disabled:opacity-50"
          >
            <option value="">選擇品牌</option>
            {currentPart?.brands.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            disabled={!selectedBrand}
            className="p-2 rounded bg-gray-700 text-white disabled:opacity-50"
          >
            <option value="">選擇型號</option>
            {currentBrand?.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <button
            onClick={addModification}
            disabled={!selectedModel}
            className="bg-blue-600 p-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            ➕ 加入
          </button>
        </div>

        {/* 已加入的改裝件 */}
        <div className="space-y-2 mb-6">
          {modList.map((mod, index) => {
            const catName = modificationCategories.find(c => c.key === mod.category)?.name || mod.category;
            const partName = modificationCategories
              .find(c => c.key === mod.category)
              ?.parts.find(p => p.key === mod.part)?.name || mod.part;
            return (
              <div key={index} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                <div>
                  <span className="text-sm text-gray-300">{catName} &gt; {partName}</span>
                  <span className="ml-3 text-white font-medium">{mod.brand} {mod.model}</span>
                </div>
                <button onClick={() => removeModification(index)} className="text-red-400 hover:text-red-300 text-sm">
                  移除
                </button>
              </div>
            );
          })}
          {modList.length === 0 && <p className="text-gray-500 text-center py-4">尚未新增任何改裝件</p>}
        </div>

        <button
          onClick={saveModifications}
          className="w-full bg-green-600 p-3 rounded font-bold hover:bg-green-700"
        >
          儲存改裝履歷
        </button>
      </div>
    </div>
  );
}