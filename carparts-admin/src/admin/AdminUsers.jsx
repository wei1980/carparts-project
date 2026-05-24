import { useState } from "react";

export default function AdminUsers() {
  const [rows, setRows] = useState([
    { id: 1, name: "經銷商A", email: "dealerA@example.com", role: "dealer" },
    { id: 2, name: "內部同仁", email: "staff@example.com", role: "staff" },
  ]);
  const [form, setForm] = useState({ name: "", email: "", role: "dealer" });

  function addRow() {
    if (!form.name.trim() || !form.email.trim()) return;
    const next = { id: Date.now(), name: form.name.trim(), email: form.email.trim(), role: form.role };
    setRows([...rows, next]);
    setForm({ name: "", email: "", role: "dealer" });
  }
  function removeRow(id) {
    if (!confirm("刪除此用戶？")) return;
    setRows(rows.filter(r => r.id !== id));
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">用戶管理</h1>

      <div className="border p-3 rounded mb-4">
        <div className="flex gap-2 mb-2">
          <input className="border p-2 flex-1" placeholder="名稱" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border p-2 flex-1" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          <select className="border p-2" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
            <option value="dealer">經銷商</option>
            <option value="staff">內部</option>
            <option value="admin">管理者</option>
          </select>
          <button className="px-4 py-2 bg-black text-white" onClick={addRow}>新增</button>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left w-20">ID</th>
              <th className="px-3 py-2 text-left">名稱</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left w-32">角色</th>
              <th className="px-3 py-2 text-left w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.role}</td>
                <td className="px-3 py-2">
                  <button className="border rounded px-2 py-1 hover:bg-gray-50" onClick={() => removeRow(r.id)}>刪除</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-4 text-center text-gray-500" colSpan={5}>尚無用戶</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-2">＊此頁目前為前端範例。若要串接後端，請提供 /users CRUD 路由與資料表。</p>
    </div>
  );
}
