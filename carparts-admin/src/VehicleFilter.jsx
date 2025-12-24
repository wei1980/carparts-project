import React, { useEffect, useState, useRef } from "react";

// ⚠️ API 設定修正：
// 1. 移除 /api，因為後端 index.js 路由是掛在根目錄 (如 /makes)
// 2. 改用相對路徑，讓 vite.config.js 的 proxy 處理跨域問題
async function jget(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function VehicleFilter({ value, onChange, compact = false }) {
  // 資料來源狀態
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);
  
  // 使用者選擇狀態 (草稿)
  const [draft, setDraft] = useState({
    year: "",
    makeId: "",
    modelId: "",
    variantId: ""
  });

  // 載入狀態
  const [loading, setLoading] = useState(false);

  // 產生年份清單 (例如 1990 - 2025)
  const years = Array.from({ length: 36 }, (_, i) => String(2025 - i));

  // 1. 初始載入廠牌
  useEffect(() => {
    // 呼叫 /makes (透過 Vite Proxy -> http://localhost:3000/makes)
    jget("/makes").then(setMakes).catch(console.error);
  }, []);

  // 2. 當年份或廠牌改變時，載入車系
  useEffect(() => {
    setModels([]); // 清空舊的
    setVariants([]);
    if (!draft.year || !draft.makeId) return;

    setLoading(true);
    jget(`/models?makeId=${draft.makeId}&year=${draft.year}`)
      .then(setModels)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [draft.year, draft.makeId]);

  // 3. 當車系改變時，載入引擎/變體
  useEffect(() => {
    setVariants([]); // 清空舊的
    if (!draft.year || !draft.modelId) return;

    setLoading(true);
    jget(`/variants?modelId=${draft.modelId}&year=${draft.year}`)
      .then(setVariants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [draft.year, draft.modelId]);

  // 按下「確定」
  const confirm = () => {
    const selectedMake = makes.find(m => String(m.id) === String(draft.makeId));
    const selectedModel = models.find(m => String(m.id) === String(draft.modelId));
    const selectedVariant = variants.find(v => String(v.id) === String(draft.variantId));

    if (!selectedVariant) return;

    // 組合摘要字串
    const parts = [
      draft.year,
      selectedMake?.name,
      selectedModel?.name,
      selectedVariant?.name,
      selectedVariant?.engine_code
    ].filter(Boolean).join(" ");

    onChange({
      variantId: draft.variantId,
      summary: parts
    });
  };

  // 按下「取消/重置」
  const cancel = () => {
    setDraft({ year: "", makeId: "", modelId: "", variantId: "" });
    onChange({ variantId: null, summary: "" });
  };

  // === 渲染模式：已選擇 ===
  if (value && value.variantId) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <span className="text-green-800 font-medium">🚗 已選車型：{value.summary}</span>
        <button 
          onClick={cancel}
          className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
        >
          重選
        </button>
      </div>
    );
  }

  // === 渲染模式：Compact (首頁單排) ===
  return (
    <div className={`flex flex-wrap gap-2 items-end ${compact ? 'text-sm' : ''}`}>
      {/* 年份 */}
      <div>
        <select
          className="border p-2 rounded"
          value={draft.year}
          onChange={e => setDraft(d => ({ ...d, year: e.target.value, makeId: "", modelId: "", variantId: "" }))}
        >
          <option value="">年份</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* 廠牌 */}
      <div>
        <select
          className="border p-2 rounded w-32"
          value={draft.makeId}
          disabled={!draft.year}
          onChange={e => setDraft(d => ({ ...d, makeId: e.target.value, modelId: "", variantId: "" }))}
        >
          <option value="">廠牌</option>
          {makes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* 車系 */}
      <div>
        <select
          className="border p-2 rounded w-32"
          value={draft.modelId}
          disabled={!draft.makeId}
          onChange={e => setDraft(d => ({ ...d, modelId: e.target.value, variantId: "" }))}
        >
          <option value="">車系</option>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* 引擎/車型 */}
      <div>
        <select
          className="border p-2 rounded w-48"
          value={draft.variantId}
          disabled={!draft.modelId}
          onChange={e => setDraft(d => ({ ...d, variantId: e.target.value }))}
        >
          <option value="">引擎/規格</option>
          {variants.map(v => (
            <option key={v.id} value={v.id}>
              {[v.name, v.engine_code].filter(Boolean).join(" - ")}
            </option>
          ))}
        </select>
      </div>

      {/* 按鈕 */}
      <button
        onClick={confirm}
        disabled={!draft.variantId || loading}
        className={`px-4 py-2 rounded font-bold text-white transition ${
          draft.variantId && !loading 
            ? "bg-blue-600 hover:bg-blue-700" 
            : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        {loading ? "載入中..." : "確定"}
      </button>
    </div>
  );
}