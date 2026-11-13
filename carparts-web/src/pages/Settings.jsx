// src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import twAddress from '../data/tw-address.json';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Address state
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Other form data
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    lineId: user?.lineId || '',
    address: user?.address || '',
  });

  // Available cities from address data
  const cities = twAddress.counties || [];

  // Districts for selected city
  const districts = selectedCity 
    ? twAddress.districts[cities.indexOf(selectedCity)]?.[0] || []
    : [];

  // Update zipCode when district changes
  useEffect(() => {
    if (selectedDistrict && selectedCity) {
      const cityIndex = cities.indexOf(selectedCity);
      const districtIndex = districts.indexOf(selectedDistrict);
      if (cityIndex >= 0 && districtIndex >= 0) {
        const zip = twAddress.districts[cityIndex]?.[1]?.[districtIndex] || '';
        setZipCode(zip);
      }
    } else {
      setZipCode('');
    }
  }, [selectedDistrict, selectedCity]);

  // Initialize form with existing address if present
  useEffect(() => {
    if (user?.address) {
      parseAddress(user.address);
    }
  }, [user?.address]);

  const parseAddress = (fullAddress) => {
    if (!fullAddress) return;
    
    // Try to extract zip code (3 digits at start)
    const zipMatch = fullAddress.match(/^(\d{3})\s*/);
    let remaining = fullAddress;
    let parsedZip = '';
    let parsedCity = '';
    let parsedDistrict = '';
    let parsedDetail = fullAddress;

    if (zipMatch) {
      parsedZip = zipMatch[1];
      remaining = fullAddress.slice(zipMatch[0].length).trim();
    }

    // Try to match city
    for (const city of cities) {
      if (remaining.startsWith(city)) {
        parsedCity = city;
        remaining = remaining.slice(city.length).trim();
        break;
      }
    }

    // Try to match district
    if (parsedCity) {
      const cityIndex = cities.indexOf(parsedCity);
      const cityDistricts = twAddress.districts[cityIndex]?.[0] || [];
      for (const district of cityDistricts) {
        if (remaining.startsWith(district)) {
          parsedDistrict = district;
          remaining = remaining.slice(district.length).trim();
          break;
        }
      }
    }

    parsedDetail = remaining;

    // Update state
    if (parsedCity) setSelectedCity(parsedCity);
    if (parsedDistrict) setSelectedDistrict(parsedDistrict);
    if (parsedZip) setZipCode(parsedZip);
    setDetailAddress(parsedDetail);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setSelectedDistrict(''); // Reset district when city changes
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build full address string
      let fullAddress = '';
      if (zipCode) fullAddress += zipCode + ' ';
      if (selectedCity) fullAddress += selectedCity;
      if (selectedDistrict) fullAddress += selectedDistrict;
      if (detailAddress) fullAddress += detailAddress;

      // Prepare payload
      const payload = {
        name: formData.name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        lineId: formData.lineId || null,
        address: fullAddress || null,
      };

      const response = await api.put('/auth/profile', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        if (response.data.id || response.data._id) {
          updateUser(response.data);
          toast.success('✅ 個人資料已成功更新！');
        } else if (response.data.user) {
          updateUser(response.data.user);
          toast.success('✅ 個人資料已成功更新！');
        } else {
          await refreshUserData();
          toast.success('✅ 個人資料已成功更新！');
        }
      }
      
      navigate('/profile');
      
    } catch (err) {
      console.error('❌ 錯誤詳情:', err);
      console.error('❌ 回應資料:', err.response?.data);
      
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.message || 
                       '更新失敗，請稍後再試';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data) {
        updateUser(response.data);
      }
    } catch (err) {
      console.error('重新獲取用戶資料失敗:', err);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      
      <main className="page-shell max-w-3xl py-10">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/profile')}
            className="text-surface-400 hover:text-white transition"
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold">⚙️ 編輯個人與收件資料</h1>
        </div>

        <div className="bg-surface-800/50 rounded-2xl p-8 border border-surface-700/50 shadow-xl">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">姓名</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="請輸入姓名"
              />
            </div>

            {/* 信箱 */}
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">電子信箱</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="請輸入電子信箱"
              />
            </div>

            {/* 電話 */}
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">聯絡電話</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="例如：0912-345-678"
              />
            </div>

            {/* LINE ID */}
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1">LINE ID</label>
              <input
                type="text"
                name="lineId"
                value={formData.lineId}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="例如：@carsmaster"
              />
            </div>

            {/* ===== 收件地址 - 三級連動選單 ===== */}
            <fieldset className="space-y-4 border-t border-surface-700 pt-6">
              <legend className="text-lg font-bold text-white mb-4">📍 預設收件地址</legend>
              
              {/* 第一排：郵遞區號、縣市、鄉鎮市區 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 郵遞區號 - 唯讀 */}
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1">郵遞區號</label>
                  <input
                    type="text"
                    value={zipCode}
                    readOnly
                    className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white cursor-not-allowed"
                    placeholder="3碼郵遞區號"
                  />
                </div>
                
                {/* 縣市選單 */}
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1">縣市 <span className="text-red-500">*</span></label>
                  <select
                    value={selectedCity}
                    onChange={handleCityChange}
                    className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">請選擇縣市</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                
                {/* 鄉鎮市區選單 */}
                <div>
                  <label className="block text-sm font-medium text-surface-400 mb-1">鄉鎮市區 <span className="text-red-500">*</span></label>
                  <select
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    disabled={!selectedCity}
                    className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">請先選擇縣市</option>
                    {districts.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 第二排：詳細地址 */}
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">詳細地址 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="請輸入路街名、巷號樓層（例如：信義路四段100號5樓之2）"
                />
              </div>

              {/* 完整地址預覽 */}
              {(zipCode || selectedCity || selectedDistrict || detailAddress) && (
                <div className="p-3 bg-surface-800 rounded-xl border border-surface-600">
                  <span className="text-xs text-surface-500">完整地址預覽：</span>
                  <p className="text-sm text-white mt-1 font-mono">
                    {zipCode + ' ' + selectedCity + selectedDistrict + detailAddress}
                  </p>
                </div>
              )}
            </fieldset>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 py-3 bg-surface-700 hover:bg-surface-600 rounded-xl font-medium transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-xl font-medium transition disabled:opacity-50"
              >
                {loading ? '儲存中...' : '💾 儲存資料'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}