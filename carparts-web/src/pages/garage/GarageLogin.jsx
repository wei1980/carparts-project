// src/pages/garage/GarageLogin.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function GarageLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [garageName, setGarageName] = useState('');
  const [lineId, setLineId] = useState('');           // 🆕 LINE 帳號
  const [businessCard, setBusinessCard] = useState(null);  // 🆕 名片
  const [cardPreview, setCardPreview] = useState('');  // 🆕 預覽
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) { toast.error('請填寫手機號碼和密碼'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/garage/login', { phone, password });
      localStorage.setItem('garageToken', data.token);
      localStorage.setItem('garageUser', JSON.stringify(data.user));
      navigate('/garage/dashboard');
    } catch {
      toast.error('登入失敗，請確認手機號碼或密碼');
    } finally {
      setLoading(false);
    }
  };

  const handleCardChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusinessCard(file);
    setCardPreview(URL.createObjectURL(file));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!phone || !password || !companyName) {
      toast.error('請填寫手機號碼、密碼和公司名稱');
      return;
    }
    if (!lineId) {
      toast.error('LINE 帳號為必填');
      return;
    }
    if (!garageName.trim()) {
      toast.error('店家名稱為必填');
      return;
    }
    if (!businessCard) {
      toast.error('請上傳名片');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('兩次密碼不一致');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('company_name', companyName);
      formData.append('contact_person', contactPerson);
      formData.append('address', address);
      formData.append('garage_name', garageName.trim());
      formData.append('line_id', lineId);
      formData.append('business_card', businessCard);

      await axios.post('/api/auth/garage/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('註冊成功，請等待管理員審核後即可登入');
      setIsRegister(false);
    } catch (err) {
      toast.error('註冊失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={isRegister ? handleRegister : handleLogin} className="bg-gray-800 p-8 rounded-xl w-96 max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-6">
          🏪 車廠{isRegister ? '註冊' : '登入'}
        </h1>

        <label className="block text-sm text-gray-400 mb-1">手機號碼</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="09xxxxxxxx" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

        <label className="block text-sm text-gray-400 mb-1">密碼</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder={isRegister ? '設定密碼' : '輸入密碼'} className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

        {isRegister && (
          <>
            <label className="block text-sm text-gray-400 mb-1">確認密碼</label>
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="再次輸入密碼" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            <label className="block text-sm text-gray-400 mb-1">公司名稱 *</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="例如：大台北汽車保養廠" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            <label className="block text-sm text-gray-400 mb-1">LINE 帳號 *</label>
            <input value={lineId} onChange={e => setLineId(e.target.value)} placeholder="例如：@garage001 或 lineID" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            <label className="block text-sm text-gray-400 mb-1">聯絡人</label>
            <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="例如：王廠長" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            <label className="block text-sm text-gray-400 mb-1">車廠地址</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="例如：台北市中山區..." className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            <label className="block text-sm text-gray-400 mb-1">店家名稱（車主看到的公開名稱）*</label>
            <input value={garageName} onChange={e => setGarageName(e.target.value)} placeholder="例如：大台北汽車保養廠" className="w-full p-3 mb-4 rounded bg-gray-700 text-white" />

            {/* 🆕 名片上傳 */}
            <label className="block text-sm text-gray-400 mb-1">上傳名片 *</label>
            <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handleCardChange} className="w-full p-3 rounded bg-gray-700 text-white mb-4 file:mr-4 file:py-2 file:px-4 file:rounded file:bg-blue-600 file:text-white file:border-0" />
            {cardPreview && <img src={cardPreview} alt="名片預覽" className="w-full rounded mb-4 max-h-32 object-contain bg-black" />}
          </>
        )}

        <button type="submit" disabled={loading} className="w-full bg-green-600 p-3 rounded font-bold text-white hover:bg-green-700 disabled:opacity-50 mb-4">
          {loading ? '處理中...' : isRegister ? '註冊' : '登入'}
        </button>

        <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-blue-400 text-sm hover:text-blue-300">
          {isRegister ? '已有帳號？登入' : '還沒有帳號？註冊'}
        </button>
      </form>
    </div>
  );
}