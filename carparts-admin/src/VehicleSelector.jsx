import { useEffect, useState } from "react";

// 只收 JSON，避免抓到 Vite index.html
async function jget(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const ct = r.headers.get("content-type") || "";
  const t = await r.text();
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}\n${t.slice(0,160)}`);
  if (!ct.includes("application/json")) throw new Error(`${url} 回傳 ${ct}`);
  return JSON.parse(t);
}

export default function VehicleSelector({ value=[], onChange }) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [variants, setVariants] = useState([]);

  const [pick, setPick] = useState({ makeId:"", modelId:"", generationId:"", year:"" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(()=>{ (async ()=>{
    try { setMakes(await jget("/makes")); } catch(e){ setErr(String(e.message||e)); }
  })(); }, []);

  useEffect(()=>{ (async ()=>{
    if (!pick.makeId) { setModels([]); return; }
    try { setModels(await jget(`/models?makeId=${pick.makeId}`)); } catch(e){ setErr(String(e.message||e)); setModels([]); }
  })(); }, [pick.makeId]);

  useEffect(()=>{ (async ()=>{
    if (!pick.modelId) { setGenerations([]); return; }
    try { setGenerations(await jget(`/generations?modelId=${pick.modelId}`)); } catch(e){ setErr(String(e.message||e)); setGenerations([]); }
  })(); }, [pick.modelId]);

  // 依優先順序：有 generationId 用它；否則用 modelId；year 可選。
  useEffect(()=>{ (async ()=>{
    const qs = new URLSearchParams();
    if (pick.generationId) qs.set("generationId", pick.generationId);
    else if (pick.modelId) qs.set("modelId", pick.modelId);
    if (pick.year) qs.set("year", pick.year);

    if (![...qs.keys()].length) { setVariants([]); return; }
    try {
      setLoading(true);
      setVariants(await jget(`/variants?modelId=${pick.modelId}`)); //
    } catch(e){ setErr(String(e.message||e)); setVariants([]); }
    finally { setLoading(false); }
  })(); }, [pick.generationId, pick.modelId, pick.year]);

  function toggle(id) {
    const i = Number(id);
    const has = value.includes(i);
    onChange?.(has ? value.filter(x=>x!==i) : [...value, i]);
  }
  function checkAllInList() {
    const ids = variants.map(v=>v.id);
    onChange?.(Array.from(new Set([...(value||[]), ...ids])));
  }
  function uncheckAllInList() {
    const s = new Set(variants.map(v=>v.id));
    onChange?.((value||[]).filter(id=>!s.has(id)));
  }

  return (
    <div className="border rounded p-3">
      {err && <div className="mb-2 p-2 text-sm text-red-700 bg-red-50 border border-red-200">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <select
          className="border rounded px-2 py-1"
          value={pick.makeId}
          onChange={(e)=>setPick(s=>({ ...s, makeId:e.target.value, modelId:"", generationId:"", year:"" }))}
        >
          <option value="">廠牌</option>
          {makes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select
          className="border rounded px-2 py-1"
          value={pick.modelId}
          onChange={(e)=>setPick(s=>({ ...s, modelId:e.target.value, generationId:"", year:"" }))}
          disabled={!pick.makeId}
        >
          <option value="">車系</option>
          {models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select
          className="border rounded px-2 py-1"
          value={pick.generationId}
          onChange={(e)=>setPick(s=>({ ...s, generationId:e.target.value }))}
          disabled={!pick.modelId}
        >
          <option value="">世代（可略）</option>
          {generations.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select
          className="border rounded px-2 py-1"
          value={pick.year}
          onChange={(e)=>setPick(s=>({ ...s, year:e.target.value }))}
          disabled={!!pick.generationId || !pick.modelId} // 選了世代就不必選年份
        >
          <option value="">年份（可略）</option>
          {Array.from({length: 50}).map((_,i)=>{
            const y = 1985+i; return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-600">已選 {value.length} 款</div>
        <div className="flex gap-2">
          <button className="text-sm border rounded px-2 py-1" onClick={checkAllInList} disabled={!variants.length}>全選此列表</button>
          <button className="text-sm border rounded px-2 py-1" onClick={uncheckAllInList} disabled={!variants.length}>全不選此列表</button>
        </div>
      </div>

      <div className="max-h-64 overflow-auto border rounded">
        {loading && <div className="p-3 text-sm text-gray-500">載入中…</div>}
        {!loading && !variants.length && <div className="p-3 text-sm text-gray-500">請先選擇條件</div>}
        {!!variants.length && (
          <ul className="divide-y">
            {variants.map(v=>{
              const checked = value.includes(v.id);
              const yr = v.year_from===v.year_to ? v.year_from : `${v.year_from}–${v.year_to}`;
              return (
                <li key={v.id} className="p-2 flex items-center gap-3">
                  <input type="checkbox" checked={checked} onChange={()=>toggle(v.id)} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{[v.name, v.engine_code].filter(Boolean).join(" ")}</div>
                    <div className="text-xs text-gray-500">年份：{yr}</div>
                  </div>
                  <div className="text-xs text-gray-400">#{v.id}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
