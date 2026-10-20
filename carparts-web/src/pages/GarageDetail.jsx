// src/pages/GarageDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { vehicleAPI } from '../api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

export default function GarageDetail() {
  const { id } = useParams(); // 获取 URL 中的 ID
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  // 模拟保养记录 (实际应该从后端 API 获取)
  const [maintenanceRecords] = useState([
    { date: '2025-01-15', type: '常規保養', mileage: '15,000 km', cost: 'NT$ 3,500' },
    { date: '2024-08-22', type: '更換輪胎', mileage: '11,200 km', cost: 'NT$ 12,000' },
    { date: '2024-03-10', type: '大保養 + 變速箱油', mileage: '8,500 km', cost: 'NT$ 8,200' },
  ]);

  useEffect(() => {
    loadVehicleDetail();
  }, [id]);

  const loadVehicleDetail = async () => {
    setLoading(true);
    try {
      // 假设后端有获取单台车辆详情的接口
      const res = await vehicleAPI.getById(id); 
      setVehicle(res.data);
    } catch (err) {
      toast.error('載入車輛詳情失敗');
      navigate('/profile'); // 加载失败退回个人主页
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">載入車輛詳情中...</p>
      </div>
    );
  }

  if (!vehicle) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-12">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/profile" className="hover:text-blue-400 transition">我的車輛</Link>
          <span>/</span>
          <span className="text-white font-medium">{vehicle.make} {vehicle.model}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左侧：车辆核心详情卡片 */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{vehicle.make} {vehicle.model}</h1>
                  <p className="text-blue-400 mt-1">{vehicle.generation || '標準版'}</p>
                </div>
                <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs border border-blue-500/20">
                  {vehicle.engine || '引擎規格未填'}
                </span>
              </div>

              {/* 扩展数据展示 Grid */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/30">
                  <p className="text-xs text-gray-400 mb-1">出廠年份</p>
                  <p className="text-white font-medium">{vehicle.year || '未設定'}</p>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/30">
                  <p className="text-xs text-gray-400 mb-1">車牌號碼</p>
                  <p className="text-white font-medium text-blue-300">{vehicle.licensePlate || '未設定'}</p>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/30 col-span-2">
                  <p className="text-xs text-gray-400 mb-1">車身號碼 (VIN)</p>
                  <p className="text-white font-medium break-all">{vehicle.vin || '未設定'}</p>
                </div>
                
                {/* 演示扩展字段 */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/30">
                  <p className="text-xs text-gray-400 mb-1">排氣量 (cc)</p>
                  <p className="text-white font-medium">{vehicle.displacement || '2000'}</p>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/30">
                  <p className="text-xs text-gray-400 mb-1">變速箱</p>
                  <p className="text-white font-medium">{vehicle.transmission || '8速自排'}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700/50 flex justify-end gap-3">
                <button 
                  onClick={() => navigate(`/garage/${id}/edit`)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
                >
                  編輯詳細規格
                </button>
                <button 
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
                >
                  返回列表
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：近期保养/维修记录 */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 shadow-lg h-fit">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">🛠️ 近期保養紀錄</h2>
                <button className="text-xs text-blue-400 hover:text-blue-300">查看全部 →</button>
              </div>
              
              <div className="space-y-4">
                {maintenanceRecords.map((record, index) => (
                  <div key={index} className="flex items-start justify-between border-b border-gray-700/50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-white">{record.type}</p>
                      <p className="text-xs text-gray-400 mt-1">{record.date} · {record.mileage}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-400 font-medium">{record.cost}</p>
                    </div>
                  </div>
                ))}
                
                {maintenanceRecords.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">尚無保養紀錄</p>
                )}
              </div>

              <button className="w-full mt-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm transition">
                ➕ 新增保養紀錄
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}