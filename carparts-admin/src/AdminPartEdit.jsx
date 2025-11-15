import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function toNullableInt(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toIntOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
function normalizeAvail(v) {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  return ["stock", "lead", "mto"].includes(s) ? s : null;
}
function fixUrl(p) {
  // 使用 /media/... 或 http(s) 連結；把 \ 換成 /
  if (!p) return null;
  return String(p).replace(/\\/g, "/");
}

export default function AdminPartEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 商品目錄（主/子）供下拉
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [categoryValue, setCategoryValue] = useState("");

  // 載入商品目錄
  useEffect(() => {
    fetch("http://localhost:3000/categories/tree")
      .then((r) => r.json())
      .then((data) => setCategoriesTree(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Failed to load categories", e));
  }, []);

  // 載入商品
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`http://localhost:3000/parts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setPart(data);
        setCategoryValue(data?.category || "");
      })
      .catch(() => setError("Failed to load part"))
      .finally(() => setLoading(false));
  }, [id]);

// 只要在 onField 裡把空字串轉成 null 即可
const onField = (e) => {
  const { name, value } = e.target;
  setPart((prev) => ({
    ...prev,
    [name]: value === "" ? null : value,   // ← 關鍵
  }));
};

  async function save() {
    if (!part) return;
    setSaving(true);
    try {
      // 標準化 payload
      const payload = {
        name: String(part.name || "").trim(),
        brand: part.brand ? String(part.brand).trim() : null,
        // 分類：採用子目錄名稱存到 parts.category（與目前後端相容）
        category: categoryValue || null,

        msrp_twd: toNullableInt(part.msrp_twd),
        wholesale_twd: toNullableInt(part.wholesale_twd),

        stock_qty: toIntOrZero(part.stock_qty),
        availability_mode: normalizeAvail(part.availability_mode),
        lead_time_days: toNullableInt(part.lead_time_days),

        image_url: fixUrl(part.image_url),
        description: part.description || null,
      };

      // 供應狀態規則
      if (payload.availability_mode === "stock") {
        payload.lead_time_days = null;
      } else if (payload.availability_mode === "lead" && payload.lead_time_days == null) {
        payload.lead_time_days = 0;
      }

      const resp = await fetch(`http://localhost:3000/parts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok && data?.ok) {
        alert("✅ 已儲存");
        navigate("/admin/parts");
      } else {
        // 把後端細節丟出來，方便定位問題
        const msg = [
          "❌ Failed to update part",
          data?.code ? `code: ${data.code}` : "",
          data?.meta ? `meta: ${JSON.stringify(data.meta)}` : "",
          data?.detail ? `detail: ${data.detail}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        alert(msg || "❌ Failed to update part");
        console.error("PUT /parts/:id error", data);
      }
    } catch (e) {
      console.error(e);
      alert("❌ Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!part) return <div className="p-4">No data</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">編輯商品</h2>

      {/* 名稱 */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">名稱</label>
        <input
          type="text"
          name="name"
          value={part.name || ""}
          onChange={onField}
          className="border rounded p-2 w-full"
        />
      </div>

      {/* 商品品牌 */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">商品品牌</label>
        <input
          type="text"
          name="brand"
          value={part.brand || ""}
          onChange={onField}
          className="border rounded p-2 w-full"
        />
      </div>

      {/* 分類（商品目錄下拉） */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">商品目錄分類</label>
        <select
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option value="">（未分類）</option>
          {categoriesTree.map((root) => (
            <optgroup key={root.id} label={root.name}>
              {(root.children || []).map((child) => (
                <option key={child.id} value={child.name}>
                  {`- ${child.name}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          目前把「子目錄名稱」寫入 <code>parts.category</code>。要改用 ID 維護多對多也可以，我再幫你加
          <code>/parts/:id/categories</code> 路由與 UI。
        </p>
      </div>

      {/* 價格 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium mb-1">建議售價 (MSRP)</label>
          <input
            type="number"
            name="msrp_twd"
            value={part.msrp_twd ?? ""}
            onChange={onField}
            className="border rounded p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">批發價格</label>
          <input
            type="number"
            name="wholesale_twd"
            value={part.wholesale_twd ?? ""}
            onChange={onField}
            className="border rounded p-2 w-full"
          />
        </div>
      </div>

      {/* 庫存 / 供應 */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium mb-1">庫存量</label>
        <input
            type="number"
            name="stock_qty"
            value={part.stock_qty ?? 0}
            onChange={onField}
            className="border rounded p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">供應狀態</label>
          <select
            name="availability_mode"
            value={part.availability_mode || ""}
            onChange={onField}
            className="border rounded p-2 w-full"
          >
            <option value="">未設定</option>
            <option value="stock">現貨</option>
            <option value="lead">備貨</option>
            <option value="mto">接單生產</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">備貨天數</label>
          <input
            type="number"
            name="lead_time_days"
            value={part.lead_time_days ?? ""}
            onChange={onField}
            className="border rounded p-2 w-full"
          />
        </div>
      </div>

      {/* 圖片 URL */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">圖片 URL</label>
        <input
          type="text"
          name="image_url"
          value={part.image_url || ""}
          onChange={onField}
          className="border rounded p-2 w-full"
          placeholder="/media/parts/... 或 http(s) 連結"
        />
        <p className="text-xs text-gray-500 mt-1">
          Windows 路徑請改用斜線：例 <code>/media/parts/Intake/airfilter/KN/33-3111.jpg</code>
        </p>
      </div>

      {/* 商品說明 */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">商品說明</label>
        <textarea
          name="description"
          value={part.description || ""}
          onChange={onField}
          rows="5"
          className="border rounded p-2 w-full"
        />
      </div>

      {/* 動作 */}
      <div className="mt-4 flex justify-between">
        <button className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white" onClick={() => navigate("/admin/parts")}>
          返回
        </button>
        <button
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          onClick={save}
          disabled={saving}
        >
          {saving ? "儲存中..." : "儲存"}
        </button>
      </div>
    </div>
  );
}
