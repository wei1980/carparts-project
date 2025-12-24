import React, { useState, useEffect } from 'react';

export default function AdminShopReview() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    setLoading(true);
    try {
      // 呼叫後端 API (對應 index.js 中的 /admin/shops/review)
      const res = await fetch('/admin/shops/review?status=PENDING');
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      setShops(data.shops || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id, action) {
    if (!window.confirm(`確定要${action === 'approve' ? '通過' : '拒絕'}此申請?`)) return;
    try {
      const res = await fetch(`/admin/shops/${id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error("Action Failed");
      alert("操作成功");
      loadShops(); // 重新整理列表
    } catch (e) {
      alert("操作失敗: " + e.message);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">保養廠註冊審核</h1>
      
      {err && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{err}</div>}
      
      {loading ? (
        <div>載入中...</div>
      ) : shops.length === 0 ? (
        <div className="text-gray-500">目前沒有待審核的保養廠。</div>
      ) : (
        <div className="space-y-4">
          {shops.map(shop => (
            <div key={shop.id} className="border rounded p-4 shadow-sm bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{shop.company_name}</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    <p>統編: {shop.tax_id}</p>
                    <p>聯絡人: {shop.contact_person} ({shop.job_title})</p>
                    <p>電話: {shop.phone}</p>
                    <p>地址: {shop.address}</p>
                    <p>類型: {shop.shop_type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReview(shop.id, 'approve')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    通過
                  </button>
                  <button 
                    onClick={() => handleReview(shop.id, 'reject')}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    拒絕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}