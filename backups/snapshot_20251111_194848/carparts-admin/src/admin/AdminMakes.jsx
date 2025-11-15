// src/admin/AdminMakes.jsx
import { useEffect, useState } from "react";

async function jget(url){const r=await fetch(url,{headers:{Accept:"application/json"}});const t=await r.text();if(!r.ok)throw new Error(t);return JSON.parse(t)}
async function jpost(url,body){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(t);return JSON.parse(t)}
async function jput(url,body){const r=await fetch(url,{method:"PUT",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(t);return JSON.parse(t)}

export default function AdminMakes(){
  const [rows,setRows]=useState([]); const [name,setName]=useState(""); const [err,setErr]=useState(""); const [ok,setOk]=useState("");
  async function load(){ try{ setErr(""); setRows(await jget("/makes")); }catch(e){ setErr(String(e.message||e)); } }
  useEffect(()=>{ load(); }, []);

  async function onCreate(){
    try{
      setErr(""); setOk("");
      if(!name.trim()) return;
      // 需要後端提供 POST /makes
      await jpost("/makes",{ name: name.trim() });
      setName(""); setOk("已新增"); await load();
    }catch(e){ setErr(String(e.message||e)); }
  }
  async function onRename(id,oldName){
    const nn = window.prompt("修改品牌名稱", oldName);
    if(!nn || nn.trim()===oldName) return;
    try{
      setErr(""); setOk("");
      // 需要後端提供 PUT /makes/:id
      await jput(`/makes/${id}`,{ name: nn.trim() });
      setOk("已更新"); await load();
    }catch(e){ setErr(String(e.message||e)); }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">品牌管理</h2>
      {err && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm whitespace-pre-wrap">{err}</div>}
      {ok && <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-700 text-sm">{ok}</div>}

      <div className="flex gap-2 mb-3">
        <input className="border rounded px-2 py-1" value={name} onChange={e=>setName(e.target.value)} placeholder="新增品牌名稱" />
        <button className="border rounded px-3 py-1 hover:bg-gray-50" onClick={onCreate}>新增</button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="border px-2 py-1 text-left">ID</th>
            <th className="border px-2 py-1 text-left">Name</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.id}</td>
              <td className="border px-2 py-1">{r.name}</td>
              <td className="border px-2 py-1 text-center">
                <button className="border rounded px-2 py-0.5 hover:bg-gray-50" onClick={()=>onRename(r.id,r.name)}>改名</button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td className="border px-2 py-3 text-center text-gray-500" colSpan={3}>（尚無資料）</td></tr>}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-3">＊若你尚未在後端提供 <code>POST /makes</code>、<code>PUT /makes/:id</code>，我可以幫你把路由補上。</p>
    </div>
  );
}
