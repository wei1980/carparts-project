// src/PartCompatibilityEditor.jsx
import { useEffect, useMemo, useState } from "react";
import VehicleFilter from "./VehicleFilter.jsx";

/** GET JSON helper */
async function jget(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}
/** POST JSON helper */
async function jpost(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}
/** DELETE helper */
async function jdel(path) {
  const r = await fetch(path, { method: "DELETE" });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}

/**
 * 編輯零件的相容車型
 * props:
 *  - partId: number (必填，已存在的零件 id)
 *  - initialList?: part_compatibilities[]  // 可不傳，會自動抓
 *  - onChange?: (list) => void              // 變更後回傳
 */
export default function PartCompatibilityEditor({ partId, initialList, onChange }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [compat, setCompat] = useState(() => Array.isArray(initialList) ? initialList : []);
  const [variants, setVariants] = useState([]);     // 依當前篩選列出的候選 variants
  const [cond, setCond] = useState(null);           // { makeId, modelId, generationId, year, variantId }

  // 為了把「已相容」顯示得更友善，我們會額外把相容的 variant 詳細資料抓回來
  const [compatDetails, setCompatDetails] = useState([]); // [{id, year_from, year_to, name, engine_code, ...}]

  const compatIds = useMemo(() => new Set((compat || []).map(c => Number(c.vehicle_variant_id))), [compat]);

  // 初始/變動時載入 part 的相容清單
  useEffect(() => {
    if (!partId) return;
    if (initialList && Array.isArray(initialList)) {
      setCompat(initialList);
      return;
    }
    (async () => {
      try {
        const p = await jget(`/parts/${partId}`);
        setCompat(Array.isArray(p?.part_compatibilities) ? p.part_compatibilities : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [partId]);

  // 把已相容的 variant 詳細資料補齊（需要後端支援 /variants?ids=1,2,3，見下面第 3 步）
  useEffect(() => {
    const ids = Array.from(compatIds);
    if (ids.length === 0) { setCompatDetails([]); return; }
    (async () => {
      try {
        const list = await jget(`/variants?ids=${ids.join(",")}`);
        setCompatDetails(Array.isArray(list) ? list : []);
      } catch (e) {
        // 若後端尚未支援 ids，可忽略錯誤；畫面會用 id 先顯示
        console.warn("variants?ids not supported yet:", e.message);
        setCompatDetails([]);
      }
    })();
  }, [compatIds]);

  // 由 VehicleFilter 觸發查詢
  async function runSearch(c) {
    setErr(""); setLoading(true);
    try {
      const params = new URLSearchParams();
      if (c?.variantId) params.set("variantId", c.variantId);
      if (!c?.variantId) {
        if (c?.makeId) params.set("makeId", c.makeId);
        if (c?.modelId) params.set("modelId", c.modelId);
        if (c?.generationId) params.set("generationId", c.generationId);
        if (c?.year) params.set("year", c.year);
      }
      const list = await jget(`/variants?${params.toString()}`);
      setVariants(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(String(e.message || e));
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }

  function onApplyFromFilter(c) {
    setCond(c);
    runSearch(c);
  }

  async function attachOne(variantId) {
    if (!partId) return alert("請先儲存零件，取得 partId 後再設定相容車型。");
    try {
      await jpost(`/parts/${partId}/compatibility`, { variant_id: Number(variantId) });
      const next = [...compat, { part_id: Number(partId), vehicle_variant_id: Number(variantId) }];
      setCompat(next); onChange?.(next);
    } catch (e) {
      alert(`加入失敗：${e.message || e}`);
    }
  }

  async function attachAllFromList() {
    if (variants.length === 0) return;
    const tasks = variants
      .filter(v => !compatIds.has(Number(v.id)))
      .map(v => jpost(`/parts/${partId}/compatibility`, { variant_id: Number(v.id) }).catch(() => null));
    await Promise.all(tasks);
    // 重新拉一次（穩妥）
    const p = await jget(`/parts/${partId}`);
    const next = Array.isArray(p?.part_compatibilities) ? p.part_compatibilities : [];
    setCompat(next); onChange?.(next);
  }

  async function removeOne(variantId) {
    if (!confirm("確定要移除此相容車型？")) return;
    try {
      await jdel(`/parts/${partId}/compatibility/${variantId}`);
      const next = compat.filter(c => Number(c.vehicle_variant_id) !== Number(variantId));
      setCompat(next); onChange?.(next);
    } catch (e) {
      alert(`移除失敗：${e.message || e}`);
    }
  }

  // 用詳細資料（若有）呈現，否則退回顯示 id
  function renderCompatRow(c) {
    const v = compatDetails.find(v => Number(v.id) === Number(c.vehicle_variant_id));
    const label = v
      ? `${v.year_from ?? ""}${v.year_to && v.year_to !== v.year_from ? `–${v.year_to}` : ""}${v.name ? `｜${v.name}` : ""}${v.engine_code ? `｜${v.engine_code}` : ""}`
      : `Variant #${c.vehicle_variant_id}`;
    return (
      <tr key={c.vehicle_variant_id} style={{ borderTop: "1px solid #eee" }}>
        <td style={td}>{label}</td>
        <td style={{ ...td, width: 1, whiteSpace: "nowrap" }}>
          <button onClick={() => removeOne(c.vehicle_variant_id)}>移除</button>
        </td>
      </tr>
    );
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>相容車型設定</div>

      {/* 篩選器：沿用前台的 VehicleFilter（支援世代＋年份交集） */}
      <VehicleFilter
        onChange={(variantId) => {
          // 若只點選 Variant（不按套用），也立即列出這一個
          if (variantId) {
            setCond(c => ({ ...(c||{}), variantId }));
            runSearch({ ...(cond||{}), variantId });
          }
        }}
        onApply={onApplyFromFilter}
      />

      {/* 候選列表（可逐筆加入或一鍵加入全部） */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <strong>候選車型</strong>
        <span style={{ color: "#666" }}>（{variants.length} 筆）</span>
        <div style={{ marginLeft: "auto" }} />
        <button onClick={attachAllFromList} disabled={variants.length === 0}>把列表全部加入</button>
      </div>

      {loading && <div>載入中…</div>}
      {err && <div style={{ color: "crimson" }}>Error: {err}</div>}

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            <th style={th}>Variant</th>
            <th style={{ ...th, width: 1 }}></th>
          </tr>
        </thead>
        <tbody>
          {variants.map(v => (
            <tr key={v.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={td}>
                {(v.year_from ?? "")}{v.year_to && v.year_to !== v.year_from ? `–${v.year_to}` : ""}
                {v.name ? `｜${v.name}` : ""}{v.engine_code ? `｜${v.engine_code}` : ""}
              </td>
              <td style={{ ...td, width: 1, whiteSpace: "nowrap" }}>
                {compatIds.has(Number(v.id))
                  ? <span style={{ color: "#666" }}>已加入</span>
                  : <button onClick={() => attachOne(v.id)}>加入</button>}
              </td>
            </tr>
          ))}
          {variants.length === 0 && (
            <tr><td style={{ padding: 8, color: "#666" }} colSpan={2}>尚未選擇條件</td></tr>
          )}
        </tbody>
      </table>

      {/* 已相容清單 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <strong>已設定相容車型</strong>
        <span style={{ color: "#666" }}>（{compat.length} 筆）</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            <th style={th}>Variant</th>
            <th style={{ ...th, width: 1 }}></th>
          </tr>
        </thead>
        <tbody>
          {compat.map(renderCompatRow)}
          {compat.length === 0 && (
            <tr><td style={{ padding: 8, color: "#666" }} colSpan={2}>尚未設定</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #eee" };
const td = { padding: "8px 10px", verticalAlign: "top" };
