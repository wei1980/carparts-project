// src/pages/RegisterShop.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "http://localhost:3000"; // 改成你的後端

export default function RegisterShop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState([]); // 上傳的照片檔案

  const [form, setForm] = useState({
    company_name: "",
    tax_id: "",
    shop_type: "",
    line_id: "",
    phone: "",
    contact_person: "",
    job_title: "",
    address: "",
    specialties: [], // 陣列
    mechanic_count: "",
    parking_spots: "",
  });

  const shopTypes = ["一般保養廠", "連鎖品牌", "原廠授權", "改裝性能", "鈑噴烤漆", "其他"];

  const specialtiesOptions = [
    { value: "eu", label: "歐系車" },
    { value: "jp", label: "日系車" },
    { value: "tw", label: "國產車" },
    { value: "ev", label: "電動車" },
  ];

  const handleCheckbox = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setForm((prev) => ({ ...prev, specialties: [...prev.specialties, value] }));
    } else {
      setForm((prev) => ({
        ...prev,
        specialties: prev.specialties.filter((s) => s !== value),
      }));
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 10) {
      alert("最多上傳 10 張照片");
      return;
    }
    setPhotos((prev) => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 必填檢查
    const required = ["company_name", "line_id", "phone", "contact_person", "address"];
    for (const field of required) {
      if (!form[field]) {
        setError(`請填寫 ${field === "company_name" ? "廠商名稱" : 
                        field === "line_id" ? "LINE ID" : 
                        field === "phone" ? "行動電話" : 
                        field === "contact_person" ? "聯絡人" : "地址"}`);
        setLoading(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      
      // 基本資料
      Object.keys(form).forEach((key) => {
        if (key === "specialties") {
          formData.append(key, JSON.stringify(form[key]));
        } else {
          formData.append(key, form[key] || "");
        }
      });

      // 照片
      photos.forEach((photo, i) => {
        formData.append("shop_photos", photo);
      });

      const res = await fetch(`${API}/auth/register-shop`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "註冊失敗");

      alert("註冊成功！我們會在 1-2 個工作天內審核並開通您的查詢帳號");
      navigate("/login");
    } catch (err) {
      setError(err.message || "註冊失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">保養廠註冊申請</h1>
          <p className="text-gray-600 mt-2">
            填寫以下資料，完成註冊後即可使用零件查詢與批發價格
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* 廠商名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                廠商名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例：宏泰汽車保養廠"
              />
            </div>

            {/* 統一編號 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">統一編號</label>
              <input
                type="text"
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="可選填，審核會較快"
              />
            </div>

            {/* 商家類型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">商家類型</label>
              <select
                value={form.shop_type}
                onChange={(e) => setForm({ ...form, shop_type: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">請選擇</option>
                {shopTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* LINE ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LINE ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.line_id}
                onChange={(e) => setForm({ ...form, line_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="用來接收訂單與通知"
              />
            </div>

            {/* 行動電話 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                行動電話 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="0912-345-678"
              />
            </div>

            {/* 聯絡人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                聯絡人 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="例：王先生"
              />
            </div>

            {/* 職稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">職稱</label>
              <input
                type="text"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="例：老闆、服務顧問"
              />
            </div>

            {/* 地址 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="例：台中市西屯區台灣大道三段123號"
              />
            </div>

            {/* 專精車型 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                專精車型（可多選）
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {specialtiesOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={opt.value}
                      checked={form.specialties.includes(opt.value)}
                      onChange={handleCheckbox}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 技師人數 & 工位數量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">技師人數</label>
              <input
                type="number"
                min="1"
                value={form.mechanic_count}
                onChange={(e) => setForm({ ...form, mechanic_count: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="例：5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">廠內停車位/工位數量</label>
              <input
                type="number"
                min="1"
                value={form.parking_spots}
                onChange={(e) => setForm({ ...form, parking_spots: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="例：8"
              />
            </div>

            {/* 環境照片上傳 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                廠內環境照片（最多 10 張，建議包含：工作區、接待區、設備）
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  選擇照片
                </label>
                <p className="text-sm text-gray-500 mt-2">已選擇 {photos.length} 張照片</p>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-6">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`預覽 ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 flex justify-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-70"
            >
              {loading ? "提交中..." : "送出申請"}
            </button>
            <Link
              to="/"
              className="px-10 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </Link>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            送出後我們會在 1-2 個工作天內審核，通過後將開通您的批發查詢帳號與專屬價格
          </p>
        </form>
      </div>
    </div>
  );
}