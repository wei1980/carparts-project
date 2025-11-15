import { useEffect, useState } from "react";

async function jfetch(url, opts) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t || `HTTP ${r.status}`);
  return t ? JSON.parse(t) : null;
}
const jget = (u) => jfetch(u);
const jpost = (u, b) => jfetch(u, { method: "POST", body: JSON.stringify(b) });
const jput = (u, b) => jfetch(u, { method: "PUT", body: JSON.stringify(b) });
const jdel = (u) => jfetch(u, { method: "DELETE" });

export default function AdminBrands() {
  const [root, setRoot] = useState(null);     // 商品品牌的 root 節點
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const roots = await jget("/categories/roots");
      const brandsRoot = roots.find(r =>
        (r.slug || "").toLowerCase() === "brands" || r.name === "商品品牌"
      );
      setRoot(brandsRoot || null);
      if (brandsRoot) {
        const children = await jget(`/categories/${brandsRoot.id}/children`);
        setBrands(children);
      } else {
        setBrands([]);
      }
    } catch (e) {
      setErr(String(e.message || e));
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createBrand() {
    if (!root) return alert("尚未建立『商品品牌』主類別，請先執行 seed_categories.js");
    const name = newName.trim();
    if (!name) return;
    await jpost("/categories", {
      name,
      parent_id: root.id,
      is_active: true,
      sort_order: (brands[brands.length - 1]?.sort_order || 0) + 10,
    });
    setNewName("");
    await load();
  }

  async function renameBrand(b) {
    const next = prompt("修改品牌名稱", b.name);
    if (next == null || next.trim() === "" || next.trim() === b.name) return;
    await jput(`/categories/${b.id}`, { name: next.trim() });
    await load();
  }

  async function removeBrand(b) {
    if (!confirm(`確定刪除品牌「${b.name}」？`)) return;
    await jdel(`/categories/${b.id}`);
    await load();
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">商品品牌管理</h1>
      {loading && <div>載入中…</div>}
      {err && <div className="text-red-600 mb-2">錯誤：{err}</div>}

      {!loading && !root && (
        <div className="text-sm text-gray-600">
          尚未建立「商品品牌」主類別，請先在後端執行 <code>node seed_categories.js</code>
        </div>
      )}

      {root && (
        <>
          <div className="mb-3 text-gray-600">
            主類別：{root.name}（id: {root.id}）
          </div>

          <div className="flex gap-2 mb-4">
            <input
              className="border p-2 flex-1"
              placeholder="新增品牌名稱，如 K&N"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="px-4 py-2 bg-black text-white" onClick={createBrand}>
              新增品牌
            </button>
          </div>

          <div className="overflow-auto border rounded">
            <table className="min-w-[600px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 w-16 text-left">ID</th>
                  <th className="px-3 py-2 text-left">品牌名稱</th>
                  <th className="px-3 py-2 w-48 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {brands.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2">{b.id}</td>
                    <td className="px-3 py-2">{b.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="border rounded px-2 py-1 hover:bg-gray-50" onClick={() => renameBrand(b)}>改名</button>
                        <button className="border rounded px-2 py-1 hover:bg-gray-50" onClick={() => removeBrand(b)}>刪除</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!brands.length && (
                  <tr><td className="px-3 py-4 text-center text-gray-500" colSpan={3}>尚無品牌</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
