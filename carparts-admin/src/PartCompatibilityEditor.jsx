import React, { useEffect, useState } from "react";
import VehicleFilter from "./VehicleFilter.jsx";

export default function PartCompatibilityEditor({ partId, initialList, onChange }) {
  // 適用車型列表
  const [compatVehicles, setCompatVehicles] = useState(initialList || []);
  const [vehicleSelection, setVehicleSelection] = useState({
    makeId: "", modelId: "", year: "", variantId: "", summary: ""
  });
  const [loading, setLoading] = useState(false);

  // 如果 parent 更新了 initialList (例如重新載入後)，這裡也同步
  useEffect(() => {
    if (initialList) setCompatVehicles(initialList);
  }, [initialList]);

  // 新增適用車型
  async function handleAddVehicle() {
    // 檢查是否有選 variantId
    if (!vehicleSelection.variantId) {
      alert("請先在上方選擇車型並按下「確定」，待顯示「目前車型」後再點擊加入。");
      return;
    }

    // 檢查是否重複
    if (compatVehicles.some(v => v.id === Number(vehicleSelection.variantId))) {
      alert("此車型已在列表中");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/admin/parts/${partId}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicleSelection.variantId })
      });
      
      if (!res.ok) throw new Error("加入失敗");
      
      // 加入成功後，清空選擇 (觸發 VehicleFilter 重置)
      setVehicleSelection({ makeId: "", modelId: "", year: "", variantId: "", summary: "" });

      // 通知父層重新整理
      if (onChange) {
        onChange();
      } else {
        alert("加入成功");
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 移除適用車型
  async function handleRemoveVehicle(vehicleId) {
    if (!window.confirm("確定移除此適用車型?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/admin/parts/${partId}/vehicles/${vehicleId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("移除失敗");
      
      // 移除後通知父層
      if (onChange) {
        onChange();
      } else {
        setCompatVehicles(prev => prev.filter(v => v.id !== vehicleId));
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      {/* 1. 加入區塊 */}
      <div className="bg-blue-50 p-4 rounded mb-6 border border-blue-100">
        <h3 className="font-bold text-blue-800 mb-2">新增適用車型</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <VehicleFilter value={vehicleSelection} onChange={setVehicleSelection} />
          
          <button 
            onClick={handleAddVehicle}
            disabled={!vehicleSelection.variantId || loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed h-10"
          >
            {loading ? "處理中..." : "+ 加入列表"}
          </button>
        </div>
        {/* 修正提示文字與符號 */}
        <p className="text-xs text-gray-500 mt-2">
          步驟：選擇「年份 → 廠牌 → 車系 → 規格」並按 <b>確定</b>，確認選取後再按 <b>+ 加入列表</b>。
        </p>
      </div>

      {/* 2. 列表區塊 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">已設定的車型 ({compatVehicles.length})</h3>
        <button onClick={() => onChange && onChange()} className="text-sm text-blue-600 hover:underline">重新整理列表</button>
      </div>
      
      {compatVehicles.length === 0 ? (
        <div className="text-gray-500 text-center py-8 border rounded border-dashed bg-gray-50">
          尚未設定任何適用車型
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 whitespace-nowrap">廠牌</th>
                <th className="p-3 whitespace-nowrap">車系</th>
                <th className="p-3 whitespace-nowrap">年份/世代</th>
                <th className="p-3 w-full">引擎/規格</th>
                <th className="p-3 text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {compatVehicles.map(v => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{v.make}</td>
                  <td className="p-3 font-medium">{v.model}</td>
                  <td className="p-3 text-gray-600">
                    {v.year_start === v.year_end ? v.year_start : `${v.year_start}-${v.year_end}`} 
                    {v.generation && ` (${v.generation})`}
                  </td>
                  <td className="p-3 text-sm">
                    <span className="font-semibold text-gray-700">{v.engine_code}</span>
                    {v.variant_name !== v.model && <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-1 rounded">{v.variant_name}</span>}
                    
                    {/* 安全渲染規格 */}
                    {v.specs && typeof v.specs === 'object' && Object.entries(v.specs).map(([key, val]) => (
                        <span key={key} className="ml-2 text-xs text-gray-400" title={key}>{String(val)}</span>
                    )).slice(0, 2)}
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => handleRemoveVehicle(v.id)}
                      className="text-red-600 hover:text-red-800 hover:underline text-sm px-2 py-1 rounded hover:bg-red-50 transition"
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}