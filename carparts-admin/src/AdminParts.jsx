import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AdminParts() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  
  // 篩選與分頁狀態
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // 載入資料
  useEffect(() => {
    loadParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]); // 當頁碼或每頁筆數改變時重新載入

  async function loadParts(customKeyword) {
    try {
      setLoading(true); 
      setErr("");
      
      // 構建查詢字串
      const searchQ = customKeyword !== undefined ? customKeyword : keyword;
      const params = new URLSearchParams({
        page: page,
        limit: pageSize,
        q: searchQ
      });

      // ⚠️ 路徑已更新為後台專用路徑
      const res = await fetch(`/admin/parts?${params.toString()}`, { 
        headers: { Accept: "application/json" } 
      });
      
      const t = await res.text();
      if (!res.ok) throw new Error(t || `HTTP ${res.status}`);
      
      const data = JSON.parse(t);
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      setErr("載入失敗: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // 搜尋處理
  function handleSearch(e) {
    e.preventDefault();
    setPage(1); // 搜尋時重置回第一頁
    loadParts();
  }

  // 單筆刪除
  async function remove(id) {
    if (!window.confirm("確定刪除此零件? 此操作無法復原。")) return;
    try {
      // ⚠️ 路徑已更新
      const res = await fetch(`/admin/parts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      
      // 成功後從列表中移除
      setItems(items.filter(i => i.id !== id));
      setTotal(total - 1);
      alert("刪除成功");
    } catch (e) {
      alert("刪除失敗: " + (e.message || e));
    }
  }

  // 批次操作 (例如：批次上架、下架、刪除)
  async function batchAction(action) {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`確定對選取的 ${selectedIds.length} 筆資料執行 ${action} ?`)) return;

    try {
      // ⚠️ 路徑已更新
      const res = await fetch("/admin/parts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      alert("批次操作成功");
      setSelectedIds([]); // 清空選取
      loadParts(); // 重新載入列表
    } catch (e) {
      alert("操作失敗: " + e.message);
    }
  }

  // 處理選取框
  function toggleSelect(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">零件庫存管理</h1>
        <Link 
          to="/parts/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + 新增零件
        </Link>
      </div>

      {/* 搜尋列 */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="搜尋 SKU、名稱..."
          className="border p-2 rounded w-full max-w-sm"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <button type="submit" className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
          搜尋
        </button>
      </form>

      {/* 錯誤訊息 */}
      {err && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{err}</div>}

      {/* 批次操作列 */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 p-3 rounded mb-4 flex items-center gap-4">
          <span className="font-semibold text-blue-800">已選取 {selectedIds.length} 筆</span>
          <button onClick={() => batchAction('publish')} className="text-sm bg-white border border-blue-300 px-3 py-1 rounded hover:bg-blue-100 text-blue-700">批次上架</button>
          <button onClick={() => batchAction('unpublish')} className="text-sm bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-100 text-gray-700">批次下架</button>
          <button onClick={() => batchAction('delete')} className="text-sm bg-white border border-red-300 px-3 py-1 rounded hover:bg-red-50 text-red-700">批次刪除</button>
        </div>
      )}

      {/* 資料列表 */}
      <div className="bg-white shadow rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4">SKU</th>
                <th className="p-4">名稱</th>
                <th className="p-4">價格 (批發/零售)</th>
                <th className="p-4">庫存</th>
                <th className="p-4">狀態</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td className="p-4 font-mono text-sm">{item.sku}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">ID: {item.id}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <span className="text-gray-500 mr-2">MSRP: ${item.price?.msrp}</span>
                      <span className="font-bold text-green-700">${item.price?.wholesale}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {item.inventory?.qty > 0 ? (
                      <span className="text-green-600 font-bold">{item.inventory.qty}</span>
                    ) : (
                      <span className="text-orange-600 text-sm">預訂 ({item.inventory?.lead_weeks}週)</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {item.is_active ? '上架中' : '已下架'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Link to={`/parts/${item.id}`} className="text-blue-600 hover:underline">編輯</Link>
                    <button 
                      onClick={() => remove(item.id)}
                      className="text-red-600 hover:underline"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">查無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 簡單分頁 */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
        <div>共 {total} 筆資料</div>
        <div className="flex gap-2">
          <button 
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            上一頁
          </button>
          <span className="px-3 py-1 bg-white border rounded">第 {page} 頁</span>
          <button 
            disabled={page * pageSize >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
}