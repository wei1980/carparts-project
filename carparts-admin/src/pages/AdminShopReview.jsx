// src/pages/AdminShopReview.jsx
import { useEffect, useState } from "react";

const API = "http://localhost:3000";

export default function AdminShopReview() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING"); // PENDING, APPROVED, REJECTED
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filter,
        page: page,
        limit: 10,
        search: search.trim(),
      });
      const res = await fetch(`${API}/admin/shops/review?${params}`);
      const data = await res.json();
      setShops(data.shops);
      setTotal(data.total);
    } catch (err) {
      alert("載入失敗：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [filter, page, search]);

  const handleApprove = async (id) => {
    if (!confirm("確定通過此保養廠申請？通過後將開通批發查詢權限")) return;
    try {
      await fetch(`${API}/admin/shops/${id}/approve`, { method: "POST" });
      alert("已通過！");
      fetchShops();
    } catch (err) {
      alert("操作失敗：" + err.message);
    }
  };

  const handleReject = async (id) => {
    if (!confirm("確定拒絕此申請？")) return;
    try {
      await fetch(`${API}/admin/shops/${id}/reject`, { method: "POST" });
      alert("已拒絕");
      fetchShops();
    } catch (err) {
      alert("操作失敗：" + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">保養廠註冊審核</h1>

      {/* 篩選列 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-3">
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-4 py-2 rounded ${filter === "PENDING" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            待審核 ({total})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`px-4 py-2 rounded ${filter === "APPROVED" ? "bg-green-600 text-white" : "bg-gray-200"}`}
          >
            已通過
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`px-4 py-2 rounded ${filter === "REJECTED" ? "bg-red-600 text-white" : "bg-gray-200"}`}
          >
            已拒絕
          </button>
        </div>

        <input
          type="text"
          placeholder="搜尋廠商名稱..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 border rounded-lg flex-1 min-w-64"
        />
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-10">載入中...</div>
      ) : shops.length === 0 ? (
        <div className="text-center py-10 text-gray-500">目前無資料</div>
      ) : (
        <div className="space-y-6">
          {shops.map((shop) => (
            <div key={shop.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-blue-700">{shop.company_name}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      申請時間：{new Date(shop.created_at).toLocaleString("zh-TW")}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    shop.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                    shop.status === "APPROVED" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {shop.status === "PENDING" ? "待審核" :
                     shop.status === "APPROVED" ? "已通過" : "已拒絕"}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <div><strong>統一編號：</strong>{shop.tax_id || "—"}</div>
                    <div><strong>商家類型：</strong>{shop.shop_type || "—"}</div>
                    <div><strong>聯絡人：</strong>{shop.contact_person} ({shop.job_title || "無職稱"})</div>
                    <div><strong>行動電話：</strong>{shop.phone}</div>
                    <div><strong>LINE ID：</strong>{shop.line_id}</div>
                    <div><strong>地址：</strong>{shop.address}</div>
                    <div><strong>專精車型：</strong>
                      {shop.specialties?.length > 0
                        ? shop.specialties.map(s => ({
                            eu: "歐系", jp: "日系", tw: "國產車", ev: "電動車"
                          })[s] || s).join("、")
                        : "未填寫"}
                    </div>
                    <div><strong>技師人數：</strong>{shop.mechanic_count || "—"} 人</div>
                    <div><strong>工位數量：</strong>{shop.parking_spots || "—"} 個</div>
                  </div>

                  {/* 照片 */}
                  <div>
                    <strong className="block mb-2">廠內環境照片 ({shop.photos?.length || 0} 張)</strong>
                    {shop.photos?.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {shop.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt={`照片 ${i + 1}`}
                              className="w-full h-32 object-cover rounded border hover:opacity-80 transition"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400">無照片</div>
                    )}
                  </div>
                </div>

                {/* 操作按鈕 */}
                {shop.status === "PENDING" && (
                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      onClick={() => handleReject(shop.id)}
                      className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      拒絕
                    </button>
                    <button
                      onClick={() => handleApprove(shop.id)}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      通過審核
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分頁 */}
      {total > 10 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >上一頁</button>
          <span className="px-4 py-2">第 {page} 頁</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * 10 >= total}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >下一頁</button>
        </div>
      )}
    </div>
  );
}