// src/AdminCategories.jsx
import { useEffect, useMemo, useState } from "react";

async function jget(url){
  const r = await fetch(url, { headers:{ Accept:"application/json" }});
  const t = await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);
}
async function jpost(url, body){
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body: JSON.stringify(body) });
  const t = await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);
}
async function jput(url, body){
  const r = await fetch(url, { method:"PUT", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body: JSON.stringify(body) });
  const t = await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);
}
async function jdel(url){
  const r = await fetch(url, { method:"DELETE", headers:{ Accept:"application/json" } });
  const t = await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);
}

export default function AdminCategories() {
  const [tree, setTree] = useState([]);
  const [flat, setFlat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // 選取中的分類
  const [sel, setSel] = useState(null);

  // 表單
  const [form, setForm] = useState({
    id: null,
    name: "",
    slug: "",
    parent_id: null,
    sort_order: 0,
    is_active: true,
    is_nav: true,
  });

  const parentOptions = useMemo(() => {
    // 允許選擇為 root（null），以及所有存在的分類（避免選自己或子孫）
    const list = [{ id: null, name: "（最上層）" }, ...flat.map(c => ({ id: c.id, name: c.name }))];
    return list;
  }, [flat]);

  function setField(k, v){
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function flatten(nodes, out = []) {
    for (const n of nodes) {
      out.push(n);
      if (n.children?.length) flatten(n.children, out);
    }
    return out;
  }

  async function load(){
    setLoading(true); setErr(""); setOk("");
    try{
      // 取整棵樹（包含未啟用）
      const nodes = await jget("/categories/tree?all=1");
      setTree(nodes);
      setFlat(flatten(nodes, []));
      // 若沒有選中，預設選第一個；或清空表單
      if (!sel && nodes.length) onPick(nodes[0]);
      if (!nodes.length) clearForm();
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);

  function clearForm(){
    setSel(null);
    setForm({ id:null, name:"", slug:"", parent_id:null, sort_order:0, is_active:true, is_nav:true });
  }

  function onPick(node){
    setSel(node);
    setForm({
      id: node.id,
      name: node.name ?? "",
      slug: node.slug ?? "",
      parent_id: node.parent_id ?? null,
      sort_order: node.sort_order ?? 0,
      is_active: Boolean(node.is_active),
      is_nav: Boolean(node.is_nav),
    });
  }

  async function onCreate(isChild){
    const parent_id = isChild && sel ? sel.id : null;
    const name = prompt(`輸入${isChild ? "子分類" : "主分類"}名稱：`);
    if (!name) return;
    try{
      setLoading(true); setErr(""); setOk("");
      const row = await jpost("/categories", { name, parent_id, is_active:true, is_nav:true, sort_order:0 });
      setOk("已新增");
      await load();
      // 自動選到新建的這筆
      const found = (await jget("/categories")).find(c => c.id === row.id);
      if (found) setSel(found);
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setLoading(false); }
  }

  async function onSave(e){
    e?.preventDefault?.();
    if (!form.id) return;
    const { id, ...payload } = form;
    try{
      setLoading(true); setErr(""); setOk("");
      const row = await jput(`/categories/${id}`, payload);
      setOk("已儲存");
      await load();
      // 選回來
      const found = (await jget("/categories")).find(c => c.id === row.id);
      if (found) setSel(found);
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setLoading(false); }
  }

  async function onDelete(force=false){
    if (!sel?.id) return;
    const msg = force
      ? "確定要刪除此分類以及其底下所有子分類與商品掛載嗎？（不可復原）"
      : "確定要刪除此分類嗎？（若有子分類或掛載會失敗）";
    if (!confirm(msg)) return;
    try{
      setLoading(true); setErr(""); setOk("");
      await jdel(`/categories/${sel.id}${force ? "?force=1" : ""}`);
      setOk("已刪除");
      clearForm();
      await load();
    }catch(e){ setErr(String(e.message||e)); }
    finally{ setLoading(false); }
  }

  function Tree({ nodes, depth=0 }){
    return (
      <ul className="pl-2">
        {nodes.map(n=>(
          <li key={n.id} className="py-0.5">
            <button
              className={`px-1 rounded ${sel?.id===n.id ? "bg-gray-200" : "hover:bg-gray-50"}`}
              onClick={()=>onPick(n)}
              title={n.slug}
            >
              {"— ".repeat(depth)}{n.name}{!n.is_active && <span className="text-xs text-gray-500">（停用）</span>}
            </button>
            {n.children?.length ? <Tree nodes={n.children} depth={depth+1} /> : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">商品目錄</h2>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-1 hover:bg-gray-50" onClick={()=>onCreate(false)}>＋ 新增主分類</button>
          <button className="border rounded px-3 py-1 hover:bg-gray-50" onClick={()=>onCreate(true)} disabled={!sel}>＋ 新增子分類</button>
        </div>
      </div>

      {err && <div className="mb-3 p-2 border border-red-200 bg-red-50 text-red-700 text-sm whitespace-pre-wrap">{err}</div>}
      {ok && <div className="mb-3 p-2 border border-green-200 bg-green-50 text-green-700 text-sm">{ok}</div>}
      {loading && <div className="mb-2 text-sm text-gray-500">載入中…</div>}

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
        {/* 左：樹狀 */}
        <div className="border rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-2">分類樹</div>
          {tree.length ? <Tree nodes={tree} /> : <div className="text-sm text-gray-500">尚無分類，請先新增主分類。</div>}
        </div>

        {/* 右：編輯表單 */}
        <div className="border rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-2">編輯</div>

          {!sel ? (
            <div className="text-sm text-gray-500">請從左側選擇一個分類，或使用上方按鈕新增。</div>
          ) : (
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">ID</label>
                <input className="border rounded px-2 py-1 w-full bg-gray-50" value={form.id ?? ""} disabled />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Slug</label>
                <input
                  className="border rounded px-2 py-1 w-full"
                  value={form.slug}
                  onChange={(e)=>setField("slug", e.target.value)}
                  placeholder="留空自動生成"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">名稱</label>
                <input
                  className="border rounded px-2 py-1 w-full"
                  value={form.name}
                  onChange={(e)=>setField("name", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">父層</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={form.parent_id ?? ""}
                  onChange={(e)=>setField("parent_id", e.target.value === "" ? null : Number(e.target.value))}
                >
                  {parentOptions.map(o=>(
                    <option key={String(o.id)} value={o.id ?? ""}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">排序（小→大）</label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-full"
                  value={form.sort_order}
                  onChange={(e)=>setField("sort_order", Number(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_active} onChange={(e)=>setField("is_active", e.target.checked)} />
                  啟用
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_nav} onChange={(e)=>setField("is_nav", e.target.checked)} />
                  顯示於導覽
                </label>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="border rounded px-4 py-1.5 hover:bg-gray-50">儲存</button>
                <button
                  type="button"
                  className="border rounded px-4 py-1.5 hover:bg-gray-50"
                  onClick={()=>onDelete(false)}
                >刪除</button>
                <button
                  type="button"
                  className="border rounded px-4 py-1.5 hover:bg-gray-50"
                  onClick={()=>onDelete(true)}
                  title="刪除此分類及其所有子分類與商品掛載"
                >強制刪除（含子樹）</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
