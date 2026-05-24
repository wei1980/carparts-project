import React, { useEffect, useState } from "react";

// 簡單的 API 請求封裝
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
  const [years, setYears] = useState([]); // ✅ 改為狀態，不再寫死

  // 使用者選擇狀態 (草稿)
  const [draft, setDraft] = useState({
    year: "",
    makeId: "",
    modelId: "",
    variantId: ""
  });

  const [loading, setLoading] = useState(false);

  // 監聽外部 value 變化
  useEffect(() => {
    if (!value || (!value.variantId && !value.makeId)) {
        setDraft({ year: "", makeId: "", modelId: "", variantId: "" });
    }
  }, [value]);

  // 1. 初始載入：年份範圍 & 所有廠牌
  useEffect(() => {
    // ✅ 載入動態年份
    jget("/years")
      .then((data) => {
         if(Array.isArray(data) && data.length > 0) {
             setYears(data);
         } else {
             // 如果 API 失敗或沒資料，給個預設值避免壞掉
             setYears(Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i)));
         }
      })
      .catch(err => {
         console.error("載入年份失敗", err);
         setYears(Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i)));
      });

    // 初始載入所有廠牌
    jget("/makes").then(setMakes).catch(console.error);
  }, []);

  // 2. 當年份改變時，重新載入適用廠牌 (✅ 新增連動)
  useEffect(() => {
    // 如果有選年份，就只抓該年份的廠牌；沒選則抓全部
    const url = draft.year ? `/makes?year=${draft.year}` : "/makes";
    
    jget(url)
      .then(setMakes)
      .catch(console.error);

    // 年份改變時，若廠牌不在新清單中，可能會需要重置(這裡暫保留使用者選擇，但通常邏輯會清空後面)
    // 這裡我們選擇清空 makeId, 因為重新 fetch makes 後 id 可能會有變動或不存在
    if (draft.year) {
         setDraft(d => ({ ...d, makeId: "", modelId: "", variantId: "" }));
    }
  }, [draft.year]);

  // 3. 載入車系 (相依於 Make & Year)
  useEffect(() => {
    setModels([]); 
    setVariants([]);
    if (!draft.makeId) return; // 沒選廠牌就不載入

    setLoading(true);
    // Url 組合
    let url = `/models?makeId=${draft.makeId}`;
    if (draft.year) url += `&year=${draft.year}`;

    jget(url)
      .then(setModels)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [draft.year, draft.makeId]);

  // 4. 載入引擎/變體 (相依於 Model & Year)
  useEffect(() => {
    setVariants([]); 
    if (!draft.modelId) return;

    setLoading(true);
    let url = `/variants?modelId=${draft.modelId}`;
    if (draft.year) url += `&year=${draft.year}`;

    jget(url)
      .then(setVariants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [draft.year, draft.modelId]);

  const confirm = () => {
    const selectedMake = makes.find(m => String(m.id) === String(draft.makeId));
    const selectedModel = models.find(m => String(m.id) === String(draft.modelId));
    const selectedVariant = variants.find(v => String(v.id) === String(draft.variantId));

    if (!selectedMake || !selectedModel) return;

    let parts = [draft.year, selectedMake.name, selectedModel.name];

    if (selectedVariant) {
       const gen = selectedVariant.generation || selectedVariant.generation_name;
       if (gen) parts.push(gen);
       
       if (selectedVariant.engine_code) parts.push(selectedVariant.engine_code);
       
       const drive = selectedVariant.specs?.Drive || "";
       if (drive) parts.push(drive);
       
       if (selectedVariant.variant_name && selectedVariant.variant_name !== selectedModel.name) {
           parts.push(selectedVariant.variant_name);
       }
    }

    let uniqueParts = [...new Set(parts.filter(Boolean).map(s => String(s).trim()))];
    
    const finalParts = uniqueParts.filter((item, index) => {
        for (let i = 0; i < index; i++) {
            if (uniqueParts[i].includes(item)) return false;
        }
        return true;
    });

    const summary = finalParts.join(" ");

    onChange({
      variantId: draft.variantId, 
      makeId: draft.makeId,       
      modelId: draft.modelId,     
      year: draft.year,           
      summary: summary
    });
  };

  const cancel = () => {
    setDraft({ year: "", makeId: "", modelId: "", variantId: "" });
    onChange({ variantId: null, makeId: null, modelId: null, year: null, summary: "" });
  };

  const hasSelection = value && (value.variantId || value.modelId);

  if (hasSelection) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <span className="text-green-800 font-medium">🚗 目前車型：{value.summary}</span>
        <button 
          onClick={cancel}
          className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
        >
          [取消/更換]
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 items-end ${compact ? 'text-sm' : ''}`}>
      {/* 年份 */}
      <div>
        <select
          className="border p-2 rounded"
          value={draft.year}
          // 修改：選年份時只清空後面的，不需清空 makeId (除非上面的 useEffect 邏輯決定要清空)
          onChange={e => setDraft(d => ({ ...d, year: e.target.value }))}
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
          disabled={!draft.year} // 強制先選年份
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
          className="border p-2 rounded w-64"
          value={draft.variantId}
          disabled={!draft.modelId}
          onChange={e => setDraft(d => ({ ...d, variantId: e.target.value }))}
        >
          <option value="">引擎/規格 (可選)</option>
          {variants.map(v => {
            const drive = v.specs?.Drive || ""; 
            const displayText = [
                v.generation || v.generation_name,
                v.engine_code,
                drive
            ].filter(Boolean).join(" | ");

            return (
                <option key={v.id} value={v.id}>
                  {displayText || v.name || "規格詳情"} 
                </option>
            );
          })}
        </select>
      </div>

      <button
        onClick={confirm}
        disabled={!draft.year || !draft.makeId || !draft.modelId || loading}
        className={`px-4 py-2 rounded font-bold text-white transition ${
          (draft.year && draft.makeId && draft.modelId) && !loading 
            ? "bg-blue-600 hover:bg-blue-700" 
            : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        {loading ? "載入中..." : "確定"}
      </button>
    </div>
  );
}