import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
// 確保引用路徑正確，指向 src/PartCompatibilityEditor.jsx
// 因為本檔案在 src/admin/，所以需要往上一層找
import PartCompatibilityEditor from "../PartCompatibilityEditor"; 

export default function AdminPartEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  // 判斷是否為新增模式
  const isCreateMode = !id || id === 'new';

  const [activeTab, setActiveTab] = useState("basic"); // 控制當前顯示的頁籤: basic | compatibility
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 商品基本資料 State
  const [formData, setFormData] = useState({
    sku: "", 
    name: "", 
    brand: "", 
    msrp_price: 0, 
    wholesale_price: 0,
    stock_qty: 0, 
    lead_time_days: 21, 
    description: "", 
    image_url: "", 
    is_active: true
  });

  // 適用車型列表 (從 API 載入後傳給子元件顯示)
  const [compatVehicles, setCompatVehicles] = useState([]);

  // 1. 載入商品資料 (如果是編輯模式)
  useEffect(() => {
    if (!isCreateMode) {
      loadPartData(id);
    }
  }, [id, isCreateMode]);

  async function loadPartData(partId) {
    setLoading(true);
    try {
      // 呼叫後端 API 取得商品詳情
      const res = await fetch(`/admin/parts/${partId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      // 將資料填入表單
      setFormData({
        sku: data.sku || "",
        name: data.name || "",
        brand: data.brand || "",
        msrp_price: Number(data.msrp_price || 0),
        wholesale_price: Number(data.wholesale_price || 0),
        stock_qty: Number(data.stock_qty || 0),
        lead_time_days: Number(data.preorder_lead_time_days || 21),
        description: data.description || "",
        image_url: data.image_url || "",
        is_active: data.is_active,
      });

      // 載入已設定的相容車型
      // 後端 API (GET /admin/parts/:id) 需包含 include: { compatible_vehicles: { include: { vehicle: true } } }
      if (data.compatible_vehicles) {
        setCompatVehicles(data.compatible_vehicles.map(cv => cv.vehicle));
      }
    } catch (e) {
      setError("載入失敗: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. 儲存基本資料
  async function handleSaveBasic(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = isCreateMode ? "/admin/parts" : `/admin/parts/${id}`;
      const method = isCreateMode ? "POST" : "PUT";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      
      if (isCreateMode) {
        alert("商品建立成功！請繼續設定適用車型。");
        // 新增成功後，轉址到編輯頁面 (將 url 中的 new 替換為實際 ID)
        navigate(`/admin/parts/${result.id}`, { replace: true });
        // 手動切換到車型分頁，讓使用者接著設定
        setActiveTab("compatibility"); 
      } else {
        alert("儲存成功");
      }
    } catch (e) {
      setError("儲存失敗: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 頁面標題與返回按鈕 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isCreateMode ? "新增商品" : `編輯商品: ${formData.sku}`}
        </h1>
        <div className="flex gap-2">
            <button 
              onClick={() => navigate("/admin/parts")} 
              className="text-gray-500 hover:text-gray-700 px-4 py-2 border rounded bg-white hover:bg-gray-50"
            >
              返回列表
            </button>
            {!isCreateMode && (
              <button 
                onClick={() => window.open(`/p/${formData.sku}`, '_blank')} 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                預覽前台
              </button>
            )}
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 border border-red-200">{error}</div>}

      {/* 頁籤切換 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === "basic" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("basic")}
        >
          基本資料
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === "compatibility" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          } ${isCreateMode ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => isCreateMode ? alert("請先填寫並儲存基本資料，才能設定適用車型。") : setActiveTab("compatibility")}
        >
          適用車型 
          {compatVehicles.length > 0 && (
            <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
              {compatVehicles.length}
            </span>
          )}
        </button>
      </div>

      {/* 內容區域 */}
      <div className="min-h-[400px]">
        {activeTab === "basic" ? (
          /* 基本資料表單 */
          <form onSubmit={handleSaveBasic} className="bg-white p-6 rounded shadow-sm border border-gray-200 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">料號 (SKU) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  value={formData.sku} 
                  onChange={e => setFormData({...formData, sku: e.target.value})} 
                  placeholder="例如: 33-3005"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌 (Brand)</label>
                <input 
                  type="text" 
                  className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  value={formData.brand} 
                  onChange={e => setFormData({...formData, brand: e.target.value})} 
                  placeholder="例如: K&N" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品名稱 <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required 
                className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="例如: 高流量空氣濾芯" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">建議售價 (MSRP)</label>
                <input 
                  type="number" 
                  min="0" 
                  className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  value={formData.msrp_price} 
                  onChange={e => setFormData({...formData, msrp_price: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">批發價</label>
                <input 
                  type="number" 
                  min="0" 
                  className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  value={formData.wholesale_price} 
                  onChange={e => setFormData({...formData, wholesale_price: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">庫存量</label>
                <input 
                  type="number" 
                  min="0" 
                  className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  value={formData.stock_qty} 
                  onChange={e => setFormData({...formData, stock_qty: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                    <select 
                        className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={formData.is_active} 
                        onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
                    >
                        <option value="true">上架</option>
                        <option value="false">下架</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">圖片 URL</label>
                    <input 
                      type="text" 
                      className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={formData.image_url} 
                      onChange={e => setFormData({...formData, image_url: e.target.value})} 
                      placeholder="/media/parts/..." 
                    />
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品描述</label>
              <textarea 
                rows="4" 
                className="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="請輸入商品詳細說明..." 
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button 
                type="submit" 
                disabled={saving} 
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition shadow-sm font-medium"
              >
                {saving ? "儲存中..." : "儲存變更"}
              </button>
            </div>
          </form>
        ) : (
          /* 適用車型編輯器 (獨立組件) */
          <PartCompatibilityEditor 
            partId={id} 
            initialList={compatVehicles} 
            onChange={() => loadPartData(id)} 
          />
        )}
      </div>
    </div>
  );
}