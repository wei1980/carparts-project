import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const location = useLocation();
  
  // 簡單的選單項目定義
  const menuItems = [
    { label: "儀表板", path: "/admin" },
    { label: "商品管理", path: "/admin/parts" },
    { label: "分類管理", path: "/admin/categories" }, // 如果有實作
    { label: "車型資料", path: "/admin/vehicles" },
    { label: "汽車廠牌", path: "/admin/makes" },
    { label: "商品品牌", path: "/admin/brands" },
    { label: "會員管理", path: "/admin/users" },
    { label: "保養廠審核", path: "/admin/shops/review" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 左側側邊欄 */}
      <aside className="w-64 bg-slate-800 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wider">後台管理系統</h1>
          <div className="text-xs text-slate-400 mt-1">CarParts Admin</div>
        </div>
        
        <nav className="mt-6">
          <ul>
            {menuItems.map((item) => {
              // 判斷是否為當前頁面 (簡易判斷)
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

        <div className="absolute bottom-0 w-64 p-4 border-t border-slate-700">
          <Link to="/shop" className="block text-center text-sm text-slate-400 hover:text-white">
            ← 返回前台商店
          </Link>
        </div>
      </aside>

      {/* 右側內容區 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 頂部導航 (可選) */}
        <header className="bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center">
          <h2 className="font-semibold text-gray-700">
            {menuItems.find(m => location.pathname.startsWith(m.path) && m.path !== "/admin")?.label || "儀表板"}
          </h2>
          <div className="text-sm text-gray-500">管理員</div>
        </header>

        {/* 頁面內容 */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}