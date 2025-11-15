// src/AdminParts.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

function price(n) {
  if (n == null) return "-";
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `NT$ ${v.toLocaleString()}`;
}

// 與前台一致的供應狀態顯示
function computeStatus(p) {
  const qty = Number(p?.stock_qty ?? 0);
  const mode = (p?.availability_mode || "").toLowerCase();
  const lead = Number(p?.lead_time_days ?? 0);

  if (qty > 0 || mode === "stock") {
    const stockText = qty > 0 ? `庫存量：${qty}` : "庫存：—";
    return `${stockText}（現貨）`;
  }
  if (mode === "lead" && lead > 0) return `備貨約 ${lead} 天`;
  if (mode === "mto") return "接單生產";
  return "未設定";
}

export default function AdminParts() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const page = Number(params.get("page") || 1);
  const pageSize = 20;
  const search = params.get("q") || "";

  const qstr = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("page", page);
    qs.set("pageSize", pageSize);
    if (search) qs.set("search", search);
    return qs.toString();
  }, [page, pageSize, search]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const res = await fetch(`/parts?${qstr}`, { headers: { Accept: "application/json" } });
        const t = await res.text();
        if (!res.ok) throw new Error(t || `HTTP ${res.status}`);
        const data = JSON.parse(t);
        setItems(data.items || []);
        setTotal(Number(data.total || 0));
      } catch (e) {
        setErr(String(e.message || e));
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [qstr]);

  function changePage(p) {
    const np = Math.max(1, p);
    const next = new URLSearchParams(params);
    next.set("page", String(np));
    setParams(next);
  }

  async function remove(id) {
    if (!window.confirm("確認刪除此商品？")) return;
    try {
      const r = await fetch(`/parts/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
      // 重新整理
      const next = new URLSearchParams(params);
      setParams(next);
    } catch (e) {
      alert("刪除失敗：" + String(e.message || e));
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-[1200px] mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">商品管理</h2>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-1.5"
            placeholder="搜尋（SKU/名稱/品牌/分類）"
            defaultValue={search}
            onKeyDown={(e)=>{
              if (e.key === "Enter") {
                const next = new URLSearchParams(params);
                next.set("q", e.currentTarget.value.trim());
                next.set("page", "1");
                setParams(next);
              }
            }}
          />
          <Link className="border rounded px-3 py-1.5 bg-black text-white hover:opacity-90" to="/admin/parts/new">新增商品</Link>
        </div>
      </div>

      {err && <div className="mb-3 p-2 border border-red-200 bg-red-50 text-red-700 text-sm">{err}</div>}
      {loading && <div className="p-3 text-sm text-gray-500">載入中…</div>}

      {!loading && (
        <div className="overflow-auto border rounded">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-3 py-2 w-20">#</th>
                <th className="px-3 py-2">名稱</th>
                <th className="px-3 py-2">品牌</th>
                <th className="px-3 py-2">分類</th>
                <th className="px-3 py-2">建議售價</th>
                <th className="px-3 py-2">批發價格</th>
                <th className="px-3 py-2">相容車型數量</th>
                <th className="px-3 py-2">供應狀態</th>
                <th className="px-3 py-2 w-40">操作</th>
              </tr>
            </thead>
            <tbody>
              {!items.length && (
                <tr><td className="px-3 py-4 text-center text-gray-500" colSpan={9}>無資料</td></tr>
              )}
              {items.map((p, idx) => {
                const compatCount = Array.isArray(p.part_compatibilities) ? p.part_compatibilities.length : 0;
                const cats = Array.isArray(p.categories) && p.categories.length
                  ? p.categories.join("、")
                  : (p.category || "");
                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{(page-1)*pageSize + idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">SKU：{p.sku}</div>
                    </td>
                    <td className="px-3 py-2">{p.brand || "-"}</td>
                    <td className="px-3 py-2">{cats || "-"}</td>
                    <td className="px-3 py-2">{price(p.msrp_twd)}</td>
                    <td className="px-3 py-2">{price(p.wholesale_twd)}</td>
                    <td className="px-3 py-2">{compatCount}</td>
                    <td className="px-3 py-2">{computeStatus(p)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Link className="border rounded px-2 py-1 hover:bg-gray-50" to={`/admin/parts/${p.id}`}>編輯</Link>
                        <button className="border rounded px-2 py-1 hover:bg-gray-50" onClick={() => remove(p.id)}>刪除</button>
                        <a className="border rounded px-2 py-1 hover:bg-gray-50" href={`/p/${encodeURIComponent(p.sku)}`} target="_blank" rel="noreferrer">前台</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 簡易分頁 */}
      {!loading && pages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">共 {total} 件　第 {page} / {pages}</div>
          <div className="flex gap-2">
            <button className="border rounded px-3 py-1.5" disabled={page<=1} onClick={()=>changePage(page-1)}>上一頁</button>
            <button className="border rounded px-3 py-1.5" disabled={page>=pages} onClick={()=>changePage(page+1)}>下一頁</button>
          </div>
        </div>
      )}
    </div>
  );
}
