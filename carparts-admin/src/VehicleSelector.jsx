// 後臺車輛多選元件
import { useEffect, useState } from "react";

// 簡單的 Fetch 封裝
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
  const [variants, setVariants] = useState([]);
  // ✅ 新增：動態年份狀態
  const [years, setYears] = useState([]);

  // 狀態管理
  const [pick, setPick] = useState({ makeId:"", modelId:"", year:"" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 1. 初始載入：廠牌與年份
  useEffect(()=>{ 
    (async ()=>{
      try { 
        // 平行載入廠牌與年份
        const [makesData, yearsData] = await Promise.all([
            jget("/makes"),
            jget("/years").catch(() => []) // 容錯：若 API 失敗則回傳空陣列
        ]);

        setMakes(makesData);
        
        // 設定年份，若 API 無資料則給預設值
        if (Array.isArray(yearsData) && yearsData.length > 0) {
            setYears(yearsData);
        } else {
            setYears(Array.from({ length: 36 }, (_, i) => String(new Date().getFullYear() - i)));
        }

      } catch(e){ 
        setErr(String(e.message||e)); 
      }
    })(); 
  }, []);

  // 2. 載入車系 (當 makeId 改變時)
  useEffect(()=>{ 
    (async ()=>{
      setModels([]); 
      setVariants([]); 
      
      if (!pick.makeId) return;
      
      try { 
        // 載入該廠牌的所有車系
        // 註：這裡可以選擇是否要加上 year 篩選，目前維持僅依廠牌篩選
        setModels(await jget(`/models?makeId=${pick.makeId}`)); 
      } catch(e){ 
        setErr(String(e.message||e)); 
      }
    })(); 
  }, [pick.makeId]);

  // 3. 載入變體 (當 modelId 或 year 改變時)
  useEffect(()=>{ 
    (async ()=>{
      setVariants([]); 
      if (!pick.modelId) return;

      const qs = new URLSearchParams();
      qs.set("makeId", pick.makeId); 
      qs.set("modelId", pick.modelId);
      
      // ✅ 修正：如果有選年份，加入查詢參數
      if (pick.year) qs.set("year", pick.year);

      try {
        setLoading(true);
        // ✅ 修正 Bug：使用 qs.toString() 傳送正確參數
        const res = await jget(`/variants?${qs.toString()}`);
        setVariants(res);
      } catch(e){ 
        setErr(String(e.message||e)); 
      } finally { 
        setLoading(false); 
      }
    })(); 
  }, [pick.modelId, pick.year, pick.makeId]);

  // 選擇邏輯 (多選)
  function toggle(id) {
    const i = Number(id);
    const has = value.includes(i);
    onChange?.(has ? value.filter(x=>x!==i) : [...value, i]);
  }
  
  function checkAllInList() {
    const ids = variants.map(v=>v.id);
    // 使用 Set 去除重複
    onChange?.(Array.from(new Set([...(value||[]), ...ids])));
  }
  
  function uncheckAllInList() {
    const s = new Set(variants.map(v=>v.id));
    onChange?.((value||[]).filter(id=>!s.has(id)));
  }

  return (
    <div className="border rounded p-3 bg-white">
      {err && <div className="mb-2 p-2 text-sm text-red-700 bg-red-50 border border-red-200">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
        {/* 廠牌 */}
        <select
          className="border rounded px-2 py-1"
          value={pick.makeId}
          onChange={(e)=>setPick(s=>({ ...s, makeId:e.target.value, modelId:"", year:"" }))}
        >
          <option value="">廠牌</option>
          {makes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {/* 車系 */}
        <select
          className="border rounded px-2 py-1"
          value={pick.modelId}
          onChange={(e)=>setPick(s=>({ ...s, modelId:e.target.value, year:"" }))}
          disabled={!pick.makeId}
        >
          <option value="">車系</option>
          {models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {/* 年份 (改為動態載入) */}
        <select
          className="border rounded px-2 py-1"
          value={pick.year}
          onChange={(e)=>setPick(s=>({ ...s, year:e.target.value }))}
          disabled={!pick.modelId} 
        >
          <option value="">年份（可略）</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-600">已選 {value.length} 款</div>
        <div className="flex gap-2">
          <button 
            className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 disabled:opacity-50" 
            onClick={checkAllInList} 
            disabled={!variants.length}
          >
            全選此列表
          </button>
          <button 
            className="text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50" 
            onClick={uncheckAllInList} 
            disabled={!variants.length}
          >
            全不選此列表
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-auto border rounded bg-gray-50">
        {loading && <div className="p-3 text-sm text-gray-500 text-center">載入中…</div>}
        {!loading && !variants.length && <div className="p-3 text-sm text-gray-400 text-center">請先選擇條件以顯示車型</div>}
        
        {!!variants.length && (
          <ul className="divide-y divide-gray-200 bg-white">
            {variants.map(v=>{
              const checked = value.includes(v.id);
              // 顯示年份區間
              const yr = v.year_start === v.year_end ? v.year_start : `${v.year_start}–${v.year_end}`;
              // 組合顯示名稱: 世代 + 變體名 + 引擎
              const displayName = [v.generation, v.variant_name || v.name, v.engine_code].filter(Boolean).join(" ");
              
              return (
                <li key={v.id} className="p-2 flex items-center gap-3 hover:bg-blue-50 cursor-pointer" onClick={(e) => {
                   if(e.target.type !== 'checkbox') toggle(v.id);
                }}>
                  <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={()=>toggle(v.id)} 
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{displayName}</div>
                    <div className="text-xs text-gray-500">年份：{yr}</div>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">#{v.id}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}