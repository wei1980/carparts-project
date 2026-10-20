// src/pages/Login.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { aiApi } from '../api/aiApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const BRAND_ALIASES = {
  'mercedes-benz': 'Mercedes-Benz', 'mercedes benz': 'Mercedes-Benz',
  'infiniti': 'INFINITI', 'porsche': 'Porsche',
  'bmw': 'BMW', 'audi': 'Audi', 'toyota': 'Toyota',
  'honda': 'Honda', 'ford': 'Ford', 'mazda': 'Mazda',
  'nissan': 'Nissan', 'subaru': 'Subaru', 'lexus': 'Lexus',
  'volvo': 'Volvo',
};

function normalizeMake(make) {
  if (!make) return '';
  return BRAND_ALIASES[make.trim().toLowerCase()] || make;
}

function cleanModel(make, model) {
  if (!model || !make) return model;
  const lowerMake = make.toLowerCase();
  const lowerModel = model.toLowerCase();
  if (lowerModel.startsWith(lowerMake + ' ')) {
    return model.slice(make.length + 1);
  }
  return model;
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  // 🆕 忘記密碼流程：false → 一般/註冊表單；true → 重設密碼表單
  const [isReset, setIsReset] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1=輸入手機送驗證碼 2=輸入驗證碼+新密碼
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState('');
  const [vin, setVin] = useState('');

  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);
  const [pick, setPick] = useState({ year: '', make: '', model: '', variantId: '' });

  const regFileRef = useRef(null);
  const [recognizingReg, setRecognizingReg] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // 載入年份
  useEffect(() => {
    api.get('/vehicles/years', { params: { _t: Date.now() } }).then(res => setYears(res.data || [])).catch(err => console.warn('載入失敗:', err?.message || err));
  }, []);

  // 年份 → 品牌
  useEffect(() => {
    setMakes([]); setModels([]); setVariants([]);
    if (!pick.year) return;
    api.get('/vehicles/makes', { params: { year: pick.year, _t: Date.now() } }).then(res => setMakes(res.data)).catch(err => console.warn('載入失敗:', err?.message || err));
  }, [pick.year]);

  // 品牌 → 車系
  useEffect(() => {
    setModels([]); setVariants([]);
    if (!pick.year || !pick.make) return;
    api.get('/vehicles/models', { params: { year: pick.year, make: pick.make, _t: Date.now() } })
      .then(res => setModels(res.data)).catch(err => console.warn('載入失敗:', err?.message || err));
  }, [pick.make, pick.year]);

  // 車系 → 世代
  useEffect(() => {
    setVariants([]);
    if (!pick.year || !pick.make || !pick.model) return;
    api.get('/vehicles/variants', { params: { year: pick.year, make: pick.make, model: pick.model, _t: Date.now() } })
      .then(res => setVariants(res.data)).catch(err => console.warn('載入失敗:', err?.message || err));
  }, [pick.model, pick.make, pick.year]);

  // 🆕 自動選取世代 (唯一世代 或 年份範圍內唯一匹配)
  useEffect(() => {
    if (!variants.length || !pick.model || pick.variantId) return;

    if (variants.length === 1) {
      setPick(s => ({ ...s, variantId: String(variants[0].id) }));
      return;
    }

    if (pick.year) {
      const year = parseInt(pick.year);
      const matched = variants.filter(v => v.year_start <= year && v.year_end >= year);
      if (matched.length === 1) {
        setPick(s => ({ ...s, variantId: String(matched[0].id) }));
      }
    }
  }, [variants, pick.model, pick.year, pick.variantId]);

  // 品牌大小寫自動校正
  useEffect(() => {
    if (pick.make && makes.length > 0) {
      const matched = makes.find(m => m.toLowerCase() === pick.make.toLowerCase());
      if (matched && matched !== pick.make) {
        setPick(s => ({ ...s, make: matched }));
      }
    }
  }, [makes, pick.make]);

  // 車系大小寫自動校正 + 包含匹配
  useEffect(() => {
    if (pick.model && models.length > 0) {
      let matched = models.find(m => m.toLowerCase() === pick.model.toLowerCase());
      if (!matched) {
        matched = models.find(m =>
          m.toLowerCase().includes(pick.model.toLowerCase()) ||
          pick.model.toLowerCase().includes(m.toLowerCase())
        );
      }
      if (matched && matched !== pick.model) {
        setPick(s => ({ ...s, model: matched }));
      }
    }
  }, [models, pick.model]);

  // 行照掃描處理 (加入狀態重置)
  const handleRegUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRecognizingReg(true);

    // 🆕 先徹底重置車輛選單狀態，避免連續掃描時殘留舊資料
    setMakes([]);
    setModels([]);
    setVariants([]);
    setPick({ year: '', make: '', model: '', variantId: '' });

    try {
      const res = await aiApi.recognizeRegistration(file);
      const { vin: scannedVin, make: aiMake, model: aiModel, year: aiYear } = res.data;

      if (scannedVin) setVin(scannedVin);

      const normalizedMake = aiMake ? normalizeMake(aiMake) : '';
      const cleanedModel = aiModel ? cleanModel(normalizedMake || aiMake, aiModel) : '';

      // 直接設定 pick（year 會觸發後續的品牌/車系/世代載入）
      setPick({
        year: aiYear ? String(aiYear) : '',
        make: normalizedMake,
        model: cleanedModel,
        variantId: '',
      });

      // 必要時手動注入選項，確保下拉可顯示
      if (normalizedMake) {
        setMakes(prev => {
          const exists = prev.some(m => m.toLowerCase() === normalizedMake.toLowerCase());
          return exists ? prev : [...prev, normalizedMake];
        });
      }
      if (cleanedModel) {
        setModels(prev => {
          const exists = prev.some(m => m.toLowerCase() === cleanedModel.toLowerCase());
          return exists ? prev : [...prev, cleanedModel];
        });
      }
    } catch (err) {
      toast.error('行照辨識失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setRecognizingReg(false);
      if (regFileRef.current) regFileRef.current.value = '';
    }
  };

  // 🆕 忘記密碼：送出驗證碼申請
  const handleForgotPassword = async () => {
    if (!resetPhone.trim()) { toast.error('請輸入註冊手機號碼'); return; }
    try {
      const res = await api.post('/auth/forgot-password', { phone: resetPhone.trim() });
      toast.success(`📩 ${res.data.message}`);
      setResetStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || '發送失敗，請稍後再試');
    }
  };

  // 🆕 忘記密碼：驗證碼 + 新密碼重設
  const handleResetPassword = async () => {
    if (!/^\d{6}$/.test(resetCode)) { toast.error('驗證碼為 6 位數字'); return; }
    if (newPassword.length < 6) { toast.error('新密碼至少需 6 碼'); return; }
    try {
      await api.post('/auth/reset-password', {
        phone: resetPhone.trim(), code: resetCode, newPassword,
      });
      toast.success('✅ 密碼已重設，請使用新密碼登入');
      setIsReset(false);
      setResetStep(1);
      setPhone(resetPhone.trim());
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || '重設失敗，請稍後再試');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        if (!phone || !password) { toast.error('手機號碼和密碼為必填'); return; }
        if (!lineId) { toast.error('LINE ID 為必填'); return; }
        if (!pick.make || !pick.model) { toast.error('請選擇您的車型'); return; }
        if (!vin) { toast.error('請輸入車身號碼 (VIN)'); return; }

        const variant = variants.find(v => String(v.id) === String(pick.variantId));
        await api.post('/auth/register', {
          phone,
          password,
          name,
          lineId,
          // 🆕 包成 vehicle 物件，與後端對齊
          vehicle: {
            make: pick.make,
            model: pick.model,
            year: pick.year ? parseInt(pick.year) : null,
            engineCode: variant?.engine_code || '',
            variantId: pick.variantId ? parseInt(pick.variantId) : null,
            vin,
          },
        });
        toast.success('註冊成功，請等待管理員審核後登入');
        setIsRegister(false);
      } else {
        await login(phone, password);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || '操作失敗');
    }
  };

  // 🆕 忘記密碼模式：獨立表單
  if (isReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">🔑 忘記密碼</h1>
          <p className="text-sm text-gray-400 mb-6">驗證碼將傳送到您註冊時綁定的 LINE 帳號</p>

          <label className="block text-sm text-gray-400 mb-1">註冊手機號碼</label>
          <input value={resetPhone} onChange={e => setResetPhone(e.target.value)}
            placeholder="09xxxxxxxx" disabled={resetStep === 2}
            className="w-full p-3 mb-4 rounded bg-gray-700 text-white disabled:opacity-60" />

          {resetStep === 1 ? (
            <button type="button" onClick={handleForgotPassword}
              className="w-full bg-blue-600 p-3 rounded font-bold text-white hover:bg-blue-700 mb-4">
              📩 發送驗證碼
            </button>
          ) : (
            <>
              <label className="block text-sm text-gray-400 mb-1">LINE 驗證碼（6 位數字）</label>
              <input value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" placeholder="例：123456"
                className="w-full p-3 mb-4 rounded bg-gray-700 text-white font-mono tracking-widest text-center text-lg" />

              <label className="block text-sm text-gray-400 mb-1">新密碼（至少 6 碼）</label>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password"
                placeholder="設定新密碼"
                className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

              <button type="button" onClick={handleResetPassword}
                className="w-full bg-green-600 p-3 rounded font-bold text-white hover:bg-green-700 mb-4">
                ✅ 重設密碼
              </button>
              <button type="button" onClick={() => setResetStep(1)}
                className="w-full text-gray-400 text-sm hover:text-gray-300 mb-2">
                ← 重新發送驗證碼
              </button>
            </>
          )}

          <button type="button" onClick={() => { setIsReset(false); setResetStep(1); }}
            className="w-full text-blue-400 text-sm hover:text-blue-300">
            返回登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-6">
          {isRegister ? '註冊' : '登入'} 車大師
        </h1>

        <label className="block text-sm text-gray-400 mb-1">手機號碼</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="09xxxxxxxx" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

        <label className="block text-sm text-gray-400 mb-1">密碼</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder={isRegister ? '設定密碼' : '輸入密碼'} className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

        {isRegister && (
          <>
            <label className="block text-sm text-gray-400 mb-1">姓名</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="您的姓名" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            <label className="block text-sm text-gray-400 mb-1">LINE ID *（必填，用於接收通知）</label>
            <input value={lineId} onChange={e => setLineId(e.target.value)} placeholder="例如：@yourline" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            <div className="border-t border-gray-700 pt-4 mt-2">
              <p className="text-sm text-gray-400 mb-3">🚗 選擇您的車型（必填）</p>

              <div className="mb-4">
                <input type="file" accept="image/*" capture="environment" ref={regFileRef} onChange={handleRegUpload} className="hidden" />
                <button type="button" onClick={() => regFileRef.current?.click()} disabled={recognizingReg}
                  className="w-full bg-purple-600 p-2 rounded font-bold text-white hover:bg-purple-700 disabled:opacity-50 text-sm">
                  {recognizingReg ? '辨識中...' : '📷 掃描行照自動帶入車型'}
                </button>
              </div>

              <select value={pick.year} onChange={e => setPick(s => ({ ...s, year: e.target.value }))} className="w-full p-3 mb-3 rounded bg-gray-700 text-white">
                <option value="">年份</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <select value={pick.make} onChange={e => setPick(s => ({ ...s, make: e.target.value }))} disabled={!pick.year} className="w-full p-3 mb-3 rounded bg-gray-700 text-white disabled:opacity-50">
                <option value="">品牌</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
                {pick.make && !makes.some(m => m.toLowerCase() === pick.make.toLowerCase()) && (
                  <option value={pick.make}>{pick.make}</option>
                )}
              </select>

              <select value={pick.model} onChange={e => setPick(s => ({ ...s, model: e.target.value }))} disabled={!pick.make} className="w-full p-3 mb-3 rounded bg-gray-700 text-white disabled:opacity-50">
                <option value="">車系</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
                {pick.model && !models.some(m => m.toLowerCase() === pick.model.toLowerCase()) && (
                  <option value={pick.model}>{pick.model}</option>
                )}
              </select>

              <select value={pick.variantId} onChange={e => setPick(s => ({ ...s, variantId: e.target.value }))} disabled={!pick.model} className="w-full p-3 mb-3 rounded bg-gray-700 text-white disabled:opacity-50">
                <option value="">世代/引擎</option>
                {variants.map(v => {
                  const yearRange = v.year_start !== v.year_end ? ` (${v.year_start}~${v.year_end})` : '';
                  return (
                    <option key={v.id} value={v.id}>
                      {v.generation || v.variant_name} - {v.engine_code}{yearRange}
                    </option>
                  );
                })}
              </select>

              <label className="block text-sm text-gray-400 mb-1 mt-3">車身號碼 (VIN) *</label>
              <input value={vin} onChange={e => setVin(e.target.value)} placeholder="WBA3A5C5XDF123456" className="w-full p-3 mb-3 rounded bg-gray-700 text-white" />
            </div>
          </>
        )}

        <button type="submit" className="w-full bg-blue-600 p-3 rounded font-bold text-white hover:bg-blue-700 mb-4">
          {isRegister ? '註冊' : '登入'}
        </button>

        {/* 🆕 忘記密碼連結（僅登入模式顯示） */}
        {!isRegister && (
          <button type="button" onClick={() => setIsReset(true)}
            className="w-full text-gray-400 text-sm hover:text-gray-300 mb-2">
            忘記密碼？
          </button>
        )}

        <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-blue-400 text-sm hover:text-blue-300">
          {isRegister ? '已有帳號？登入' : '沒有帳號？註冊'}
        </button>
      </form>
    </div>
  );
}