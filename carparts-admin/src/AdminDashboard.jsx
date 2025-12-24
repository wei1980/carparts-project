import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

async function jget(path) {
  const r = await fetch(path, { headers: { Accept: "application/json" } });
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}\n${text.slice(0, 160)}`);
  if (!ct.includes("application/json")) {
    throw new Error(`${path} 回傳 ${ct}，可能是 Vite 的 HTML。請確認 proxy 有生效。\n內容：\n${text.slice(0, 160)}`);
  }
  return JSON.parse(text);
}

export default function AdminDashboard() {
  const [health, setHealth] = useState(null);
  const [roots, setRoots] = useState([]);
  const [partsTotal, setPartsTotal] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        // 使用 Promise.all 同時載入多個數據
        const [healthRes, treeRes, partsRes, usersRes] = await Promise.all([
          jget("/health"),
          jget("/categories/tree"), // ✅ 修正：使用正確的 API 路徑
          jget("/parts?page=1&pageSize=1&raw=1"),
          jget("/admin/stats/users").catch(() => ({ totalUsers: 0 })), // 容錯
        ]);

        setHealth(healthRes);
        setRoots(treeRes || []);
        setPartsTotal(Number(partsRes?.total || 0));
        setTotalUsers(usersRes?.totalUsers || 0);
      } catch (e) {
        console.error(e);
        setErr(String(e.message || e));
      }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {err && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 whitespace-pre-wrap">
          <strong className="block mb-1">載入錯誤：</strong>
          {err}
        </div>
      )}

      {/* 數據卡片區 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* 卡片 1: 系統狀態 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm font-medium text-gray-500 mb-1">系統狀態</div>
          <div className="text-2xl font-bold text-green-600">
            {health ? "運作中" : "檢查中..."}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            API Latency: {health ? `${Date.now() - health.ts}ms` : "-"}
          </div>
        </div>

        {/* 卡片 2: 商品總數 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm font-medium text-gray-500 mb-1">商品總數</div>
          <div className="text-2xl font-bold text-gray-800">{partsTotal}</div>
          <div className="text-xs text-gray-400 mt-2">SKU 數量</div>
        </div>

        {/* 卡片 3: 分類數量 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm font-medium text-gray-500 mb-1">主分類</div>
          <div className="text-2xl font-bold text-blue-600">{roots.length}</div>
          <div className="text-xs text-gray-400 mt-2 truncate" title={roots.map(r => r.name).join(", ")}>
            {roots.slice(0, 3).map(r => r.name).join(", ")}{roots.length > 3 ? "..." : ""}
          </div>
        </div>

        {/* 卡片 4: 註冊用戶 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm font-medium text-gray-500 mb-1">註冊用戶</div>
          <div className="text-2xl font-bold text-purple-600">{totalUsers}</div>
          <div className="text-xs text-gray-400 mt-2">含待審核</div>
        </div>
      </div>

      {/* 快速操作區 */}
      <h3 className="text-lg font-bold text-gray-800 mb-4">快速操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Link to="/admin/parts/new" className="group block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition">
          <h4 className="font-bold text-gray-800 group-hover:text-blue-600">新增商品</h4>
          <p className="text-sm text-gray-500 mt-2">建立新的零件資料，設定價格與庫存。</p>
        </Link>

        <Link to="/admin/shops/review" className="group block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition">
          <h4 className="font-bold text-gray-800 group-hover:text-blue-600">審核保養廠</h4>
          <p className="text-sm text-gray-500 mt-2">查看並審核新註冊的保養廠會員申請。</p>
        </Link>

        <Link to="/shop" className="group block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition">
          <h4 className="font-bold text-gray-800 group-hover:text-blue-600">預覽前台</h4>
          <p className="text-sm text-gray-500 mt-2">以前台使用者的角度瀏覽商店。</p>
        </Link>

      </div>
    </div>
  );
}