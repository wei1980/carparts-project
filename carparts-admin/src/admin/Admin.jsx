// src/Admin.jsx
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

export default function Admin() {
  const [health, setHealth] = useState(null);
  const [roots, setRoots] = useState([]);
  const [partsTotal, setPartsTotal] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        // 修正：將 /categories/roots 改為 /categories/tree
        // 同時我們只取第一層 (roots)，因為 tree API 回傳的是巢狀結構的陣列
        const [healthRes, treeRes, partsRes, usersRes] = await Promise.all([
          jget("/health"),
          jget("/categories/tree"), // ✅ 修正這裡
          jget("/parts?page=1&pageSize=1&raw=1"),
          jget("/admin/stats/users").catch(() => ({ totalUsers: 0 })), // 容錯處理
          // jget("/admin/stats/online") // 暫時移除，除非後端有實作
        ]);

        setHealth(healthRes);
        setRoots(treeRes || []);
        setPartsTotal(Number(partsRes?.total || 0));
        setTotalUsers(usersRes?.totalUsers || 0);
        // setOnlineUsers(onlineRes.onlineUsers || 0);
      } catch (e) {
        console.error(e);
        setErr(String(e.message || e));
      }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">後台儀表板</h1>

      {err && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm whitespace-pre-wrap">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* 註冊用戶 */}
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">註冊用戶</div>
          <div className="text-xl mt-1">{totalUsers}</div>
        </div>

        {/* 線上用戶 (暫時隱藏或顯示假資料) */}
        {/* <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">線上用戶</div>
          <div className="text-xl mt-1">{onlineUsers}</div>
        </div> */}

        {/* 主目錄數 */}
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">主目錄數</div>
          <div className="text-xl mt-1">{roots.length}</div>
          <div className="text-xs text-gray-500 mt-1 truncate">
            {roots.map(r => r.name).join("、") || "—"}
          </div>
        </div>

        {/* 商品總數 */}
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">商品總數</div>
          <div className="text-xl mt-1">{partsTotal}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">分類管理</h2>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            目前主目錄（啟用中）：{roots.map(r => r.name).join("、") || "—"}
          </p>
          <div className="flex gap-2">
            <Link className="border rounded px-3 py-1.5 hover:bg-gray-50" to="/admin/categories">
              開啟分類管理
            </Link>
            <Link className="border rounded px-3 py-1.5 hover:bg-gray-50" to="/shop">
              前往前台檢視
            </Link>
          </div>
        </section>

        <section className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">商品管理</h2>
          <p className="text-sm text-gray-600 mb-3">目前商品總數：{partsTotal}</p>
          <div className="flex gap-2">
            <Link className="border rounded px-3 py-1.5 hover:bg-gray-50" to="/shop">
              瀏覽商品清單
            </Link>
            {/* 假設有新增商品的路由 */}
            <Link className="border rounded px-3 py-1.5 hover:bg-gray-50" to="/admin/parts/new">
              新增商品
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}