import { useEffect, useMemo, useState } from "react";

// 以 JSON 要求，避免拿到 Vite 的 HTML
async function jget(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
  if (!ct.includes("application/json")) throw new Error(`${url} 回傳 ${ct}`);
  return JSON.parse(text);
}

/**
 * VehicleFilter
 * Flow：年份 → 廠牌 → 車系 → 引擎（variants）
 * 確認後：以「車型摘要」取代下拉，右側顯示「取消車型」
 *
 * props:
 *  - value: { year, makeId, modelId, variantId, makeName, modelName, variantName }
 *  - onChange(nextValue)
 */
export default function VehicleFilter({ value, onChange }) {
  // 下拉資料
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [variants, setVariants] = useState([]);

  // 草稿（按「確定」才送到外層）
  const [draft, setDraft] = useState({
    year: value?.year || "",
    makeId: value?.makeId || "",
    modelId: value?.modelId || "",
    variantId: value?.variantId || "",
    makeName: value?.makeName || "",
    modelName: value?.modelName || "",
    variantName: value?.variantName || "",
  });

  // 是否顯示「摘要模式」
  const [showSummary, setShowSummary] = useState(
    Boolean(value?.year || value?.makeId || value?.modelId || value?.variantId)
  );

  // 外部 value 變更時，同步到內部與摘要顯示
  useEffect(() => {
    setDraft({
      year: value?.year || "",
      makeId: value?.makeId || "",
      modelId: value?.modelId || "",
      variantId: value?.variantId || "",
      makeName: value?.makeName || "",
      modelName: value?.modelName || "",
      variantName: value?.variantName || "",
    });
    setShowSummary(Boolean(value?.year || value?.makeId || value?.modelId || value?.variantId));
  }, [
    value?.year, value?.makeId, value?.modelId, value?.variantId,
    value?.makeName, value?.modelName, value?.variantName
  ]);

  // 年份選項（1980~今年）
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const arr = [];
    for (let y = now; y >= 1980; y--) arr.push(y);
    return arr;
  }, []);

  // 載入廠牌
  useEffect(() => {
    (async () => {
      try {
        const list = await jget("/makes");
        setMakes(Array.isArray(list) ? list : []);
      } catch {
        setMakes([]);
      }
    })();
  }, []);

  // 選「廠牌」→ 讀取該廠牌下的車系
  useEffect(() => {
    (async () => {
      if (!draft.makeId) { setModels([]); return; }
      try {
        const list = await jget(`/models?makeId=${draft.makeId}`);
        setModels(Array.isArray(list) ? list : []);
      } catch {
        setModels([]);
      }
    })();
  }, [draft.makeId]);

  // 選「車系」或「年份」→ 讀取引擎（variants）
  useEffect(() => {
    (async () => {
      if (!draft.modelId) { setVariants([]); return; }
      const qs = new URLSearchParams({ modelId: String(draft.modelId) });
      if (draft.year) qs.set("year", String(draft.year));
      try {
        const list = await jget(`/variants?${qs.toString()}`);
        setVariants(Array.isArray(list) ? list : []);
      } catch {
        setVariants([]);
      }
    })();
  }, [draft.modelId, draft.year]);

  // 工具
  const nameOf = (list, id) => list.find(x => String(x.id) === String(id))?.name || "";
  const disabledConfirm = !(draft.makeId && draft.modelId && draft.variantId); // 年份可選可不選

  function pickYear(v) {
    setDraft(s => ({ ...s, year: v || "", variantId: "", variantName: "" }));
  }
  function pickMake(v) {
    setDraft(s => ({
      ...s,
      makeId: v || "", makeName: nameOf(makes, v),
      modelId: "", modelName: "",
      variantId: "", variantName: ""
    }));
  }
  function pickModel(v) {
    setDraft(s => ({
      ...s,
      modelId: v || "", modelName: nameOf(models, v),
      variantId: "", variantName: ""
    }));
  }
  function pickVariant(v) {
    setDraft(s => ({ ...s, variantId: v || "", variantName: nameOf(variants, v) }));
  }

  // 套用（顯示摘要、通知外層）
  function apply() {
    setShowSummary(true);
    onChange?.({ ...draft });
  }

  // 取消車型（回到下拉、清空、通知外層）
  function clearSelection() {
    const empty = {
      year: "", makeId: "", modelId: "", variantId: "",
      makeName: "", modelName: "", variantName: ""
    };
    setDraft(empty);
    setShowSummary(false);
    onChange?.(empty);
  }

  // 取得目前選中的 variant 詳細（用 variants 陣列就足夠，不必額外請求）
  const selectedVariant =
    variants.find(v => String(v.id) === String(draft.variantId)) || null;

  // 組合「車型摘要」：基本 + MK 世代（不顯示年份區間）
  function summaryText() {
    const base = [];
    if (draft.year) base.push(draft.year);
    if (draft.makeName) base.push(draft.makeName);
    if (draft.modelName) base.push(draft.modelName);
    if (draft.variantName) base.push(draft.variantName);

    // 優先使用 DB 內的世代欄位
    const mk =
      selectedVariant?.generation_label ||
      selectedVariant?.generation_name ||
      selectedVariant?.generation_short ||
      selectedVariant?.gen_label ||
      selectedVariant?.gen ||
      "";

    return `車型：${base.join(" ") || "未選擇"}${mk ? " " + mk : ""}`;
  }

  // === UI ===
  if (showSummary) {
    // ✅ 摘要模式：顯示車型摘要 + 取消按鈕（同高度樣式）
    return (
      <div className="w-full overflow-x-auto">
        <div className="inline-flex items-center gap-8 whitespace-nowrap vf-wrap">
          <div className="vf-summary">{summaryText()}</div>
          <button type="button" className="vf-control vf-btn--ghost" onClick={clearSelection}>
            取消車型
          </button>
        </div>
      </div>
    );
  }

  // 下拉模式（字體大小全部與按鈕一致）
  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex items-center gap-8 whitespace-nowrap vf-wrap">
        <div className="vf-field">
          <label className="vf-label">年份</label>
          <select
            className="vf-control"
            value={draft.year || ""}
            onChange={(e) => pickYear(e.target.value)}
          >
            <option value="">選擇年份</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="vf-field">
          <label className="vf-label">廠牌</label>
          <select
            className="vf-control"
            value={draft.makeId || ""}
            onChange={(e) => pickMake(e.target.value)}
          >
            <option value="">選擇廠牌</option>
            {makes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="vf-field">
          <label className="vf-label">車系</label>
          <select
            className="vf-control"
            value={draft.modelId || ""}
            onChange={(e) => pickModel(e.target.value)}
            disabled={!draft.makeId}
          >
            <option value="">{draft.makeId ? "選擇車系" : "先選廠牌"}</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="vf-field">
          <label className="vf-label">引擎</label>
          <select
            className="vf-control"
            value={draft.variantId || ""}
            onChange={(e) => pickVariant(e.target.value)}
            disabled={!draft.modelId}
          >
            <option value="">{draft.modelId ? "選擇引擎" : "先選車系"}</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name || v.engine_code || `#${v.id}`}
                {/* 不再顯示 (year_from–year_to) */}
              </option>
            ))}
          </select>
        </div>

        <button
          className="vf-control vf-btn--primary"
          onClick={apply}
          disabled={disabledConfirm}
          title={disabledConfirm ? "請先選擇：廠牌 + 車系 + 引擎" : "套用車型"}
        >
          確定
        </button>
      </div>
    </div>
  );
}
