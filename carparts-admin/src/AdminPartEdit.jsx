import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API = "http://localhost:3000";

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
  return ["stock", "preorder"].includes(s) ? s : null;
}
function fixUrl(p) {
  if (!p) return null;
  return String(p).replace(/\\/g, "/");
}

export default function AdminPartEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isNew = id === "new";                 // 新增模式

  const [part, setPart] = useState(isNew ? { is_active: true } : null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 分類
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [subcategoryId, setSubcategoryId] = useState("");

  // 車型相容性
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [isUniversal, setIsUniversal] = useState(false);

  // ── 載入分類、廠牌、車系、變體（保持您原本的邏輯）──
  useEffect(() => {
    fetch(`${API}/categories/tree`).then(r => r.json()).then(d => setCategoriesTree(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    fetch(`${API}/makes`).then(r => r.json()).then(d => setMakes(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!selectedMakeId) { setModels([]); setSelectedModelId(""); return; }
    fetch(`${API}/models?makeId=${selectedMakeId}`).then(r => r.json()).then(d => setModels(Array.isArray(d) ? d : []));
  }, [selectedMakeId]);

  useEffect(() => {
    if (!selectedModelId) { setVariants([]); return; }
    fetch(`${API}/variants?modelId=${selectedModelId}`).then(r => r.json()).then(d => setVariants(Array.isArray(d) ? d : []));
  }, [selectedModelId]);

  // ── 載入單筆商品（編輯模式）──
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`${API}/parts/${id}`)
      .then(r => r.json())
      .then(data => {
        setPart(data);
        // 填入已有的相容性
        if (data.compatibility_summary?.variant_ids) {
          setSelectedVariants(data.compatibility_summary.variant_ids);
        }
        setSubcategoryId(data.subcategory_id?.toString() || "");
        setIsUniversal(data.is_universal || false);
      })
      .catch(() => setError("載入失敗"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // 通用欄位變更（支援 checkbox）
  const onField = (e) => {
    const { name, value, type, checked } = e.target;
    setPart(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (value === "" ? null : value)
    }));
  };

  // 變體勾選
  const toggleVariant = (vid) => {
    setSelectedVariants(prev =>
      prev.includes(vid) ? prev.filter(v => v !== vid) : [...prev, vid]
    );
  };

  // ── 儲存（新增 / 修改）──
  async function save() {
    if (!part) return;
    setSaving(true);
    setError("");

    const payload = {
      sku: part.sku?.trim() || null,                     // SKU 可修改
      name: part.name?.trim() || null,
      brand: part.brand?.trim() || null,
      subcategory_id: toNullableInt(subcategoryId),
      msrp_twd: toNullableInt(part.msrp_twd),
      wholesale_twd: toNullableInt(part.wholesale_twd),
      stock_qty: toIntOrZero(part.stock_qty),
      availability_mode: normalizeAvail(part.availability_mode),
      lead_time_days: toNullableInt(part.lead_time_days),
      image_url: fixUrl(part.image_url),
      description: part.description?.trim() || null,
      is_active: !!part.is_active,                       // 上架/下架
      is_universal: isUniversal,
      compatibility_variant_ids: isUniversal ? [] : selectedVariants,
    };

    try {
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? `${API}/parts` : `${API}/parts/${id}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "儲存失敗");
      }

      alert("儲存成功");
      navigate("/admin/parts");
    } catch (e) {
      setError(e.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  // ── 單筆刪除 ──
  async function remove() {
    if (!window.confirm("確定要永久刪除這筆商品？")) return;
    try {
      const res = await fetch(`${API}/parts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("刪除失敗");
      alert("已刪除");
      navigate("/admin/parts");
    } catch (e) {
      setError(e.message || "刪除失敗");
    }
  }

  if (loading) return <div className="p-4">載入中…</div>;
  if (!part) return <div className="p-4">無資料</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">

      <h2 className="text-2xl font-bold mb-6">
        {isNew ? "新增商品" : "編輯商品"}
      </h2>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* 基本資訊 */}
      <div className="border rounded-lg p-4 mb-6 bg-white">
        <h3 className="text-lg font-semibold mb-4">基本資訊</h3>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">商品名稱 *</label>
          <input type="text" name="name" value={part.name || ""} onChange={onField}
            className="border rounded p-2 w-full" required />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">商品料號 (SKU) *</label>
            <input type="text" name="sku" value={part.sku || ""} onChange={onField}
              className="border rounded p-2 w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">品牌</label>
            <input type="text" name="brand" value={part.brand || ""} onChange={onField}
              className="border rounded p-2 w-full" />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">子分類</label>
          <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)}
            className="border rounded p-2 w-full">
            <option value="">（未選擇）</option>
            {categoriesTree.map(root => (
              <optgroup key={root.id} label={root.name}>
                {root.subcategories?.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">商品描述</label>
          <textarea name="description" value={part.description || ""} onChange={onField}
            rows="4" className="border rounded p-2 w-full" />
        </div>

        {/* 上架 / 下架 */}
        <div className="mb-4 flex items-center gap-3">
          <input type="checkbox" name="is_active" checked={!!part.is_active} onChange={onField} />
          <span className="font-medium">
            {part.is_active ? "已上架（前台可見）" : "已下架（前台隱藏）"}
          </span>
        </div>
      </div>

      {/* 價格與庫存（保持您原本的版面） */}
      <div className="border rounded-lg p-4 mb-6 bg-white">
        <h3 className="text-lg font-semibold mb-4">價格與庫存</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">建議售價 (MSRP)</label>
            <input type="number" name="msrp_twd" value={part.msrp_twd ?? ""} onChange={onField}
              className="border rounded p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">批發價格</label>
            <input type="number" name="wholesale_twd" value={part.wholesale_twd ?? ""} onChange={onField}
              className="border rounded p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">庫存量</label>
            <input type="number" name="stock_qty" value={part.stock_qty ?? 0} onChange={onField}
              className="border rounded p-2 w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">供應狀態</label>
            <select name="availability_mode" value={part.availability_mode || ""} onChange={onField}
              className="border rounded p-2 w-full">
              <option value="">未設定</option>
              <option value="stock">現貨</option>
              <option value="preorder">預訂</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">備貨天數</label>
            <input type="number" name="lead_time_days" value={part.lead_time_days ?? ""} onChange={onField}
              className="border rounded p-2 w-full" />
          </div>
        </div>
      </div>

      {/* 圖片 */}
      <div className="border rounded-lg p-4 mb-6 bg-white">
        <h3 className="text-lg font-semibold mb-4">圖片</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">圖片 URL</label>
          <input type="text" name="image_url" value={part.image_url || ""} onChange={onField}
            className="border rounded p-2 w-full"
            placeholder="/media/parts/... 或 http(s) 連結" />
        </div>
        {part.image_url && (
          <img src={part.image_url} alt="預覽" className="max-h-48 rounded"
            onError={e => e.target.style.display = "none"} />
        )}
      </div>

      {/* 車型相容性（保持您原本的完整 UI） */}
      <div className="border rounded-lg p-4 mb-6 bg-white">
        <h3 className="text-lg font-semibold mb-4">車型相容性</h3>

        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input type="checkbox" checked={isUniversal} onChange={e => setIsUniversal(e.target.checked)} />
          <span className="font-medium">通用型零件（適用所有車型）</span>
        </label>

        {!isUniversal && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">廠牌</label>
                <select value={selectedMakeId} onChange={e => { setSelectedMakeId(e.target.value); setSelectedModelId(""); }}
                  className="border rounded p-2 w-full">
                  <option value="">選擇廠牌</option>
                  {makes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">車系</label>
                <select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}
                  disabled={!selectedMakeId} className="border rounded p-2 w-full disabled:bg-gray-50">
                  <option value="">選擇車系</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="border rounded p-3 bg-gray-50 max-h-64 overflow-y-auto">
                {variants.map(v => (
                  <label key={v.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input type="checkbox" checked={selectedVariants.includes(v.id)}
                      onChange={() => toggleVariant(v.id)} />
                    <span className="text-sm">
                      {v.engine_code || v.name}
                      {v.generation_name && ` (${v.generation_name})`}
                      {v.drivetrain && ` - ${v.drivetrain}`}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">已選擇 {selectedVariants.length} 個變體</p>
          </>
        )}

        {isUniversal && (
          <div className="p-3 bg-green-50 rounded text-sm text-green-800">
            此商品為通用型，適用所有車型
          </div>
        )}
      </div>

      {/* 動作按鈕 */}
      <div className="flex justify-between gap-3">
        <button className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white"
          onClick={() => navigate("/admin/parts")}>返回</button>

        <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          onClick={save} disabled={saving}>
          {saving ? "儲存中..." : "儲存"}
        </button>

        {!isNew && (
          <button className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
            onClick={remove}>刪除商品</button>
        )}
      </div>
    </div>
  );
}