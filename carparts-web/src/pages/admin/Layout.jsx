// src/layouts/AdminLayout.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const menuItems = [
  { path: '/admin', label: '儀表板', icon: '📊' },
  { path: '/admin/appointments', label: '預約管理', icon: '📅' },
  { path: '/admin/garages', label: '車廠管理', icon: '🏪' },
  { path: '/admin/orders', label: '訂單管理', icon: '📦' },
  { path: '/admin/bank', label: '銀行對帳', icon: '🏦' },
  { path: '/admin/inventory', label: '庫存管理', icon: '📦' },
  { path: '/admin/procurement', label: '進貨成本', icon: '🚢' },
  { path: '/admin/parts', label: '商品管理', icon: '🛒' }, // 新增商品管理
  { path: '/admin/categories', label: '商品目錄', icon: '🗂️' },
  { path: '/admin/users', label: '會員管理', icon: '👤' },
  { path: '/admin/vehicle-approval', label: '車型審核', icon: '🚙' },
  { path: '/admin/ai-drafts', label: 'AI 草稿審核', icon: '🤖' },
  { path: '/admin/settings', label: '系統設定', icon: '⚙️' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  return (
    <>
    <div className="min-h-screen bg-gray-900 flex">
      {/* 側邊欄 */}
      <div className={`bg-gray-800 ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          {sidebarOpen && <h1 className="text-white font-bold text-lg">🔧 車大師</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition
                ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          {sidebarOpen && (
            <p className="text-gray-400 text-sm mb-2">{adminUser.company_name || '管理員'}</p>
          )}
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
            {sidebarOpen ? '🚪 登出' : '🚪'}
          </button>
        </div>
      </div>

      {/* 主內容 */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
    </>
  );
}