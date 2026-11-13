// src/pages/admin/AdminInventory.jsx
import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

export default function AdminInventory() {
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [logs, setLogs] = useState([]);
  const [editLog, setEditLog] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ qty_change: 0, type: 'IN', note: '' });
  const [showNewStock, setShowNewStock] = useState(false);
  const [newStockForm, setNewStockForm] = useState({ sku: '', name: '', brand: '', qty: 0, stockInAt: new Date().toISOString().slice(0, 16), note: '' });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  useEffect(() => { loadParts(); }, [lowStockOnly, inStockOnly]);

  const loadParts = () => {
      const params = {};
      if (search) params.search = search;
      if (lowStockOnly) params.lowStock = 'true';
      if (inStockOnly) params.inStock = 'true';

      adminClient.get('/inventory', { params })
        .then(res => setParts(res.data));
    };

  const loadLogs = (partId) => {
    setSelectedPart(partId);
    adminClient.get(`/inventory/${partId}/logs`)
      .then(res => setLogs(res.data));
  };

  // 【修復】：庫存調整自動判斷正負號邏輯
  const handleAdjust = async () => {
    if (!selectedPart || adjustForm.qty_change === 0) return;
    
    // 自動根據使用者選的類型 (type) 來決定數字的正負號
    let finalQtyChange = Math.abs(adjustForm.qty_change); // 先確保是正數
    if (adjustForm.type === 'OUT') {
      finalQtyChange = -finalQtyChange; // 如果選出貨，自動轉成負數
    }

    try {
      await adminClient.post(`/inventory/${selectedPart}/adjust`, { 
        ...adjustForm, 
        qty_change: finalQtyChange 
      });
      toast.success('庫存已更新');
      setAdjustForm({ qty_change: 0, type: 'IN', note: '' });
      loadParts();
      loadLogs(selectedPart);
    } catch (err) {
      toast.error('調整失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const handleSaveLog = async () => {
    if (!editLog || !editLog.type || editLog.qty_change === 0) return;
    try {
      const qty = Math.abs(editLog.qty_change);
      await adminClient.patch(`/inventory/${selectedPart}/logs/${editLog.id}`, {
        type: editLog.type,
        qty_change: editLog.type === 'OUT' ? -qty : qty,
        note: editLog.note,
      });
      toast.success('異動記錄已更新');
      setEditLog(null);
      loadLogs(selectedPart);
      loadParts();
    } catch (err) {
      toast.error('更新失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 【新增】：刪除庫存產品功能
  const handleDelete = async () => {
    if (!(await confirmDialog({ message: '確定要移除此庫存產品嗎？此動作將連同異動紀錄一起刪除且無法復原。' }))) return;
    try {
      await adminClient.delete(`/inventory/${selectedPart}`);
      toast.success('產品已成功移除');
      setSelectedPart(null); // 清空選取狀態
      setLogs([]);           // 清空歷史紀錄顯示
      loadParts();           // 重新載入列表
    } catch (err) {
      toast.error('移除失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const typeMap = { IN: '進貨', OUT: '出貨', ADJUST: '盤點調整', ORDER: '訂單出貨', NEW_STOCK: '新增庫存' };

  const handleNewStock = async () => {
    if (!newStockForm.sku || !newStockForm.name || !newStockForm.brand || !newStockForm.qty) {
      toast.error('請填寫完整：料號、名稱、品牌、數量');
      return;
    }
    try {
      await adminClient.post('/inventory/new-stock', newStockForm);
      toast.success('新增庫存成功');
      setShowNewStock(false);
      setNewStockForm({ sku: '', name: '', brand: '', qty: 0, stockInAt: new Date().toISOString().slice(0, 16), note: '' });
      loadParts();
    } catch (err) {
      toast.error('新增失敗：' + (err.response?.data?.error || err.message));
    }
  };

// 優化後的卡片排版元件
  const PartCard = ({ part, onClick, isSelected }) => (
    <div
      onClick={onClick}
      className={`group cursor-pointer bg-surface-800/90 hover:bg-surface-800 rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-lg ${
        isSelected 
          ? 'ring-2 ring-blue-500 border-blue-500 bg-surface-800' 
          : 'border-surface-700/80 hover:border-surface-600'
      }`}
    >
      <div>
        {/* 上方：品牌與啟用狀態 */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold tracking-wider text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded-md">
            {part.brand || '未分類'}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            part.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {part.is_active ? '上架中' : '已停用'}
          </span>
        </div>

        {/* 商品名稱 */}
        <h3 className="font-bold text-white text-base line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">
          {part.name}
        </h3>

        {/* SKU 料號 */}
        <p className="text-xs text-surface-400 font-mono mb-4">
          SKU: {part.sku}
        </p>
      </div>

      <div>
        {/* 中間：數據區塊（庫存、批發價、售價） */}
        <div className="grid grid-cols-3 gap-2 bg-surface-900/60 rounded-xl p-3 mb-3 border border-surface-750">
          <div className="text-center border-r border-surface-700/50 pr-1">
            <span className="block text-[10px] text-surface-400 mb-0.5">自有庫存</span>
            <span className={`font-bold text-base ${part.stock_qty <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
              {part.stock_qty}
            </span>
            <span className="block text-[9px] text-surface-500 mt-0.5">總代理：<span className="text-blue-400">{part.distributor_stock_qty || 0}</span></span>
          </div>
          <div className="text-center border-r border-surface-700/50 px-1">
            <span className="block text-[10px] text-surface-400 mb-0.5">批發價</span>
            <span className="font-semibold text-surface-200 text-xs">
              {part.wholesale_price ? `NT$ ${Number(part.wholesale_price).toLocaleString()}` : '—'}
            </span>
          </div>
          <div className="text-center pl-1">
            <span className="block text-[10px] text-surface-400 mb-0.5">建議售價</span>
            <span className="font-semibold text-blue-400 text-xs">
              {part.msrp_price ? `NT$ ${Number(part.msrp_price).toLocaleString()}` : '—'}
            </span>
          </div>
        </div>

        {/* 底部：分類標籤 */}
        <div className="flex items-center justify-between text-xs text-surface-500 pt-1">
          <span className="bg-surface-700/50 px-2 py-1 rounded text-surface-300 truncate max-w-[140px]">
            {part.subcategory?.category?.name || part.category || '一般零件'}
          </span>
          <span className="text-blue-400 text-[11px] font-medium group-hover:underline">
            點擊管理 ➔
          </span>
        </div>
      </div>
    </div>
  );

   return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">📦 庫存管理</h1>

      {/* 搜尋與篩選 */}
      <div className="flex gap-4 mb-6 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadParts()}
            placeholder="搜尋 SKU / 名稱 / 品牌..."
            className="w-full p-3 rounded bg-surface-700 text-white"
          />
        </div>
        <label className="flex items-center gap-2 text-white whitespace-nowrap">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
          僅顯示低庫存
        </label>
        <label className="flex items-center gap-2 text-white whitespace-nowrap">
          <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />
          僅顯示有庫存
        </label>
        <button onClick={() => setViewMode(v => v === 'grid' ? 'table' : 'grid')} className="px-4 py-2 rounded bg-surface-700 hover:bg-surface-600 text-white text-sm">
          {viewMode === 'grid' ? '📋 表格' : '🔲 卡片'}
        </button>
        <button onClick={() => setShowNewStock(true)} className="bg-emerald-600 px-6 py-3 rounded text-white hover:bg-emerald-500 transition-colors">➕ 新增庫存</button>
      </div>

      {/* 新增庫存 Modal */}
      {showNewStock && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewStock(false)}>
          <div className="bg-surface-800 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">➕ 新增商品庫存</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-surface-400">商品料號 (SKU) *</span>
                <input value={newStockForm.sku} onChange={e => setNewStockForm({...newStockForm, sku: e.target.value})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" placeholder="如：BRK-001" />
              </label>
              <label className="block">
                <span className="text-xs text-surface-400">商品名稱 *</span>
                <input value={newStockForm.name} onChange={e => setNewStockForm({...newStockForm, name: e.target.value})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" placeholder="如：前煞車卡鉗 6活塞" />
              </label>
              <label className="block">
                <span className="text-xs text-surface-400">品牌 *</span>
                <input value={newStockForm.brand} onChange={e => setNewStockForm({...newStockForm, brand: e.target.value})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" placeholder="如：Brembo" />
              </label>
              <label className="block">
                <span className="text-xs text-surface-400">入庫數量 *</span>
                <input type="number" value={newStockForm.qty} onChange={e => setNewStockForm({...newStockForm, qty: parseInt(e.target.value) || 0})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" min="1" />
              </label>
              <label className="block">
                <span className="text-xs text-surface-400">入庫時間 *</span>
                <input type="datetime-local" value={newStockForm.stockInAt} onChange={e => setNewStockForm({...newStockForm, stockInAt: e.target.value})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" />
              </label>
              <label className="block">
                <span className="text-xs text-surface-400">備註</span>
                <input value={newStockForm.note} onChange={e => setNewStockForm({...newStockForm, note: e.target.value})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" placeholder="如：採購單 PO-20240101" />
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowNewStock(false)} className="flex-1 px-4 py-2 rounded bg-surface-700 text-white hover:bg-surface-600 transition-colors">取消</button>
                <button onClick={handleNewStock} className="flex-1 px-4 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors">確認新增</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {parts.map(part => (
            <PartCard key={part.id} part={part} onClick={() => loadLogs(part.id)} isSelected={selectedPart === part.id} />
          ))}
          {parts.length === 0 && (
            <div className="col-span-full text-center py-12 text-surface-500">
              <p>無庫存資料</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-800 rounded-xl overflow-hidden">
            <table className="w-full text-white text-sm">
              <thead>
                <tr className="bg-surface-700">
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-left">名稱</th>
                  <th className="p-3 text-left">品牌</th>
                  <th className="p-3 text-right">自有庫存</th>
                  <th className="p-3 text-right">總代理庫存</th>
                  <th className="p-3 text-right">批發價</th>
                  <th className="p-3 text-right">售價</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => loadLogs(p.id)}
                    className={`border-t border-surface-700 cursor-pointer hover:bg-surface-750 ${selectedPart === p.id ? 'bg-blue-900' : ''} ${p.stock_qty <= 5 ? 'text-yellow-400' : ''}`}
                  >
                    <td className="p-3 font-mono">{p.sku}</td>
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">{p.brand}</td>
                    <td className="p-3 text-right font-bold">{p.stock_qty}</td>
                    <td className="p-3 text-right font-bold">{p.distributor_stock_qty || 0}</td>
                    <td className="p-3 text-right">NT$ {Number(p.wholesale_price).toLocaleString()}</td>
                    <td className="p-3 text-right">NT$ {Number(p.msrp_price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 異動記錄 + 調整 */}
          <div className="space-y-4">
            {selectedPart && (
              <div className="bg-surface-800 p-4 rounded-xl shadow-lg border border-surface-700">
                {/* 【新增】：標題區塊與刪除按鈕 */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="text-xl">🔧</span> 庫存調整
                  </h3>
                  <button 
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-950 text-red-400 hover:bg-red-600 hover:text-white rounded-md transition-colors border border-red-900/50 hover:border-red-500"
                    title="移除此庫存商品"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    移除產品
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-surface-400 block mb-1">調整類型</label>
                    <select
                      value={adjustForm.type}
                      onChange={e => setAdjustForm({ ...adjustForm, type: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-surface-700 text-white border border-surface-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="IN">📦 進貨 (增加)</option>
                      <option value="OUT">📤 出貨 (減少)</option>
                      <option value="ADJUST">⚖️ 盤點調整 (指定為盤點誤差)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-surface-400 block mb-1">調整數量</label>
                    <input
                      type="number"
                      value={Math.abs(adjustForm.qty_change) || ''} // 【修復】：永遠顯示為正數
                      onChange={e => setAdjustForm({ ...adjustForm, qty_change: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-lg bg-surface-700 text-white border border-surface-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="請輸入數量 (僅需填寫正數)"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-surface-400 block mb-1">備註說明</label>
                    <input
                      value={adjustForm.note}
                      onChange={e => setAdjustForm({ ...adjustForm, note: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-surface-700 text-white border border-surface-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="例如：採購單號或損耗原因"
                    />
                  </div>
                  
                  <button 
                    onClick={handleAdjust} 
                    className="w-full bg-blue-600 p-2.5 rounded-lg text-white font-bold hover:bg-blue-500 transition-colors mt-2 shadow-sm"
                  >
                    確認送出
                  </button>
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="bg-surface-800 p-4 rounded-xl border border-surface-700">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">📋</span> 異動記錄
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {logs.map(log => (
                    <div key={log.id} className="text-sm bg-surface-900/50 p-3 rounded-lg border border-surface-750">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                            log.qty_change > 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                          }`}>
                            {log.qty_change > 0 ? '增加' : '減少'} {Math.abs(log.qty_change)}
                          </span>
                          <span className="text-surface-300 font-medium">
                            {typeMap[log.type] || log.type}
                          </span>
                        </div>
                        <span className="text-xs text-surface-500">
                          {new Date(log.created_at).toLocaleString('zh-TW', {
                            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-2 text-xs">
                        <span className="text-surface-400">
                          {log.note ? `📝 ${log.note}` : '無備註'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="bg-surface-700 px-2 py-1 rounded text-surface-300">
                            結算庫存: <strong className="text-white">{log.qty_after}</strong>
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); setEditLog({ ...log, qty_change: Math.abs(log.qty_change) }); }}
                            className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 rounded text-surface-400 hover:text-white"
                            title="編輯異動記錄"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 編輯異動記錄 Modal */}
            {editLog && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditLog(null)}>
                <div className="bg-surface-800 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-white mb-4">✏️ 編輯異動記錄</h3>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs text-surface-400">類型</span>
                      <select value={editLog.type} onChange={e => setEditLog({...editLog, type: e.target.value})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white">
                        {Object.entries(typeMap).filter(([k]) => k !== 'NEW_STOCK').map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-surface-400">異動數量 (正數)</span>
                      <input type="number" value={editLog.qty_change} onChange={e => setEditLog({...editLog, qty_change: parseInt(e.target.value) || 0})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" min="0" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-surface-400">備註</span>
                      <input value={editLog.note || ''} onChange={e => setEditLog({...editLog, note: e.target.value})} className="w-full mt-1 p-2 rounded bg-surface-700 text-white" />
                    </label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => setEditLog(null)} className="flex-1 px-4 py-2 rounded bg-surface-700 text-white hover:bg-surface-600">取消</button>
                    <button onClick={handleSaveLog} className="flex-1 px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500">確認</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}