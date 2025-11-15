// src/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";

async function jget(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}\n${text.slice(0,160)}`);
  if (!ct.includes("application/json")) throw new Error(`${url} 回傳 ${ct} 不是 JSON：\n${text.slice(0,160)}`);
  return JSON.parse(text);
}

export default function AdminDashboard() {
  const [health, setHealth] = useState(null);
  const [roots, setRoots] = useState([]);
  const [partsTotal, setPartsTotal] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setHealth(await jget("/health"));
        setRoots(await jget("/categories/roots"));
        const p = await jget("/parts?page=1&pageSize=1&raw=1");
        setPartsTotal(Number(p?.total || 0));
      } catch(e) {
        setErr(String(e.message || e));
      }
    })();
  }, []);

  return (
    <div>
      {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm whitespace-pre-wrap">{err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="後端狀態">{health?.ok ? "Online" : "Offline"}</Card>
        <Card title="主目錄數">{roots?.length ?? 0}</Card>
        <Card title="商品總數">{partsTotal}</Card>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl mt-1">{children}</div>
    </div>
  );
}
