import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const location = useLocation();
  
  // 按路徑長度降序排列：較長的路徑先比對，避免 /admin 先匹配到 /admin/compatibility
  const menuItems = [
    { label: "儀表板", path: "/admin" },
    { label: "商品管理", path: "/admin/parts" },
    { label: "分類管理", path: "/admin/categories" },
    { label: "車型資料", path: "/admin/vehicles" },
    { label: "相容性報表", path: "/admin/compatibility" },
    { label: "汽車廠牌", path: "/admin/makes" },
    { label: "商品品牌", path: "/admin/brands" },
    { label: "會員管理", path: "/admin/users" },
    { label: "保養廠審核", path: "/admin/shops/review" },
  ].sort((a, b) => b.path.length - a.path.length);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex-shrink-0 relative flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wider">後台管理系統</h1>
          <div className="text-xs text-slate-400 mt-1">CarParts Admin</div>
        </div>
        
        <nav className="flex-1 mt-6 overflow-y-auto">
          <ul>
            {menuItems.map((item) => {
              const isActive = item.path === "/admin" 
                ? location.pathname === "/admin" 
                : location.pathname.startsWith(item.path);

              return (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className={`block px-6 py-3 transition-colors ${
                      isActive 
                        ? "bg-blue-600 text-white border-r-4 border-blue-300" 
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <Link to="/shop" className="block text-center text-sm text-slate-400 hover:text-white transition-colors">
            ← 返回前台商店
          </Link>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <header className="bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center flex-shrink-0">
          <h2 className="font-semibold text-gray-700">
            {menuItems.find(m => location.pathname.startsWith(m.path) && m.path !== "/admin")?.label || "儀表板"}
          </h2>
          <div className="text-sm text-gray-500">管理員</div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}