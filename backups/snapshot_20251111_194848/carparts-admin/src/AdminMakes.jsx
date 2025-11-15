// src/AdminMakes.jsx
import { useEffect, useState } from "react";

// 通用 JSON fetch（避免拿到 Vite 的 HTML）
async function jfetch(url, opts) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  const ct = r.headers.get("content-type") || "";
  const t = await r.text();
  if (!r.ok) throw new Error(t || `HTTP ${r.status}`);
  if (!ct.includes("application/json")) throw new Error(`${url} 回傳 ${ct}`);
  return t ? JSON.parse(t) : null;
}
const jget = (u) => jfetch(u);
const jpost = (u, b) => jfetch(u, { method: "POST", body: JSON.stringify(b) });
const jput = (u, b) => jfetch(u, { method: "PUT", body: JSON.stringify(b) });
const jdel = (u) => jfetch(u, { method: "DELETE" });

export default function AdminMakes() {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 初始載入
  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const rows = await jget("/makes");
        setList(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally { setLoading(false); }
    })();
  }, []);

  async function createMake() {
    if (!name.trim()) return alert("請輸入品牌名稱");
    try {
      const row = await jpost("/makes", { name: name.trim() });
      setList((prev) => [...prev, row]);
      setName("");
    } catch (e) {
      alert(`新增失敗：${e.message || e}`);
    }
  }

  async function renameMake(mk) {
    const next = prompt("新品牌名稱：", mk.name);
    if (next == null) return;
    try {
      const row = await jput(`/makes/${mk.id}`, { name: next.trim() });
      setList((prev) => prev.map((x) => (x.id === mk.id ? row : x)));
    } catch (e) {
      alert(`修改失敗：${e.message || e}`);
    }
  }

  async function removeMake(mk) {
    if (!confirm(`確定刪除品牌「${mk.name}」？`)) return;
    try {
      await jdel(`/makes/${mk.id}`);
      setList((prev) => prev.filter((x) => x.id !== mk.id));
    } catch (e) {
      alert(`刪除失敗：${e.message || e}`);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">品牌管理</h1>

      {err && (
        <div className="mb-3 p-2 border border-red-200 bg-red-50 text-red-700 text-sm whitespace-pre-wrap">
          {err}
        </div>
      )}
      {loading && <div className="text-sm text-gray-500 mb-2">載入中…</div>}

      <section className="border rounded-lg p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">品牌列表</div>
          <div className="text-xs text-gray-500">{list.length} 筆</div>
        </div>

        <div className="space-y-2">
          {list.map((mk) => (
            <div key={mk.id} className="flex items-center gap-2 p-2 border rounded">
              <div className="flex-1">{mk.name}</div>
              <button
                className="text-xs px-2 py-1 border rounded"
                onClick={() => renameMake(mk)}
              >
                改
              </button>
              <button
                className="text-xs px-2 py-1 border rounded"
                onClick={() => removeMake(mk)}
              >
                刪
              </button>
            </div>
          ))}
          {!list.length && <div className="text-sm text-gray-500">尚無資料</div>}
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="text-sm font-medium mb-2">新增品牌</div>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 flex-1"
              placeholder="例如：Volkswagen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="px-3 py-1.5 border rounded hover:bg-gray-50" onClick={createMake}>
              新增
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
