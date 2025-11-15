import { NavLink, Outlet, Link } from "react-router-dom";

const linkBase =
  "block px-3 py-2 rounded hover:bg-gray-100 transition";
const linkActive =
  "bg-gray-200 text-gray-900 font-medium";
const linkIdle =
  "text-gray-700";

export default function AdminLayout() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="border-r bg-white">
        <div className="p-4 border-b">
          <Link to="/admin" className="text-lg font-semibold">
            後台管理
          </Link>
        </div>
        <nav className="p-3 space-y-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkIdle}`
            }
          >
            儀表板
          </NavLink>

          <div className="mt-2 text-xs text-gray-400 px-1">商品</div>
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkIdle}`
            }
          >
            商品目錄管理
          </NavLink>
          <NavLink
            to="/admin/parts"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkIdle}`
            }
          >
            商品管理
          </NavLink>

          <div className="mt-2 text-xs text-gray-400 px-1">車型</div>
          <NavLink
            to="/admin/makes"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkIdle}`
            }
          >
            汽車廠牌
          </NavLink>
          {/* ✅ 新增的車型管理入口 */}
          <NavLink
            to="/admin/vehicles"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkIdle}`
            }
          >
            車型管理
          </NavLink>
        </nav>
      </aside>

      {/* Main */}
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
