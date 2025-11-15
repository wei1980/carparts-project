// src/admin/AdminVehicles.jsx
import { useEffect, useState } from "react";

async function jget(url){const r=await fetch(url,{headers:{Accept:"application/json"}});const t=await r.text();if(!r.ok)throw new Error(t);return JSON.parse(t)}

export default function AdminVehicles(){
  const [makes,setMakes]=useState([]); const [models,setModels]=useState([]); const [gens,setGens]=useState([]); const [vars,setVars]=useState([]);
  const [makeId,setMakeId]=useState(""); const [modelId,setModelId]=useState(""); const [genId,setGenId]=useState("");
  const [err,setErr]=useState("");

  useEffect(()=>{ jget("/makes").then(setMakes).catch(e=>setErr(String(e.message||e))); },[]);
  useEffect(()=>{
    setModels([]); setModelId(""); setGens([]); setGenId(""); setVars([]);
    if(makeId) jget(`/models?makeId=${makeId}`).then(setModels).catch(e=>setErr(String(e.message||e)));
  },[makeId]);
  useEffect(()=>{
    setGens([]); setGenId(""); setVars([]);
    if(modelId) jget(`/generations?modelId=${modelId}`).then(setGens).catch(e=>setErr(String(e.message||e)));
  },[modelId]);
  useEffect(()=>{
    const p = new URLSearchParams();
    if(makeId) p.set("makeId",makeId);
    if(modelId) p.set("modelId",modelId);
    if(genId) p.set("generationId",genId);
    if(p.toString()) jget(`/variants?${p.toString()}`).then(setVars).catch(e=>setErr(String(e.message||e)));
    else setVars([]);
  },[makeId,modelId,genId]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">車型資料</h2>
      {err && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm whitespace-pre-wrap">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-3">
        <select className="border rounded px-2 py-1" value={makeId} onChange={e=>setMakeId(e.target.value)}>
          <option value="">選品牌</option>
          {makes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1" value={modelId} onChange={e=>setModelId(e.target.value)} disabled={!makeId}>
          <option value="">選車系</option>
          {models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1" value={genId} onChange={e=>setGenId(e.target.value)} disabled={!modelId}>
          <option value="">選世代</option>
          {gens.map(g=><option key={g.id} value={g.id}>{g.name || "(無名)"} {g.year_from}{g.year_to && g.year_to!==g.year_from?`–${g.year_to}`:""}</option>)}
        </select>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="border px-2 py-1 text-left">ID</th>
            <th className="border px-2 py-1 text-left">年份</th>
            <th className="border px-2 py-1 text-left">名稱 / 引擎</th>
          </tr>
        </thead>
        <tbody>
          {vars.map(v=>(
            <tr key={v.id}>
              <td className="border px-2 py-1">{v.id}</td>
              <td className="border px-2 py-1">{v.year_from}{v.year_to&&v.year_to!==v.year_from?`–${v.year_to}`:""}</td>
              <td className="border px-2 py-1">{v.name}{v.engine_code?`｜${v.engine_code}`:""}</td>
            </tr>
          ))}
          {vars.length===0 && <tr><td className="border px-2 py-3 text-center text-gray-500" colSpan={3}>（請先選擇條件）</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
