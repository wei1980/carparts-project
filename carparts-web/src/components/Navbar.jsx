// src/components/Navbar.jsx — 客戶端導覽列（對稱放大選單 + 嚴格單行不換行）
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CurrentVehiclePicker from './CurrentVehiclePicker';

export default function Navbar() {
  const { logout, user } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // 🆕 登出：清除 token 後強制跳轉到登入頁（replace 避免使用者按上一頁返回）
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const items = [
    { label: '愛車', icon: MIconCar, path: '/my-car' },
    { label: '會員', icon: MIconUser, path: '/profile' },
    { label: '訂單', icon: MIconOrder, path: '/orders' },
    { label: '願望', icon: MIconHeart, path: '/wishlist' },
    { label: '預約', icon: MIconCalendar, path: '/appointments' },
    { label: '車廠', icon: MIconGarage, path: '/garages' },
    { label: '購物車', icon: MIconCart, path: '/cart', badge: itemCount > 0 ? itemCount : null, highlight: true },
  ];

  const mobileItems = [
    items[0], // 愛車
    items[2], // 訂單
    items[4], // 預約
    items[5], // 車廠
    items[6], // 購物車
  ];

  return (
    <>
      {/* ===== 桌面版頂部導航（md 以上顯示，嚴格單行 flex-nowrap）===== */}
      <nav className="hidden md:block bg-[#0b0f14]/95 border-b border-[#1e2833] sticky top-0 z-50 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between flex-nowrap gap-x-2 lg:gap-x-4">

          {/* 左側：LOGO */}
          <div onClick={() => navigate('/')} className="flex items-center cursor-pointer group flex-shrink-0">
            <div className="h-10 lg:h-11 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <img src="/logo.png" alt="車大師" className="h-full w-auto object-contain" />
            </div>
          </div>

          {/* 中間：對稱放大選單（橫向滑動/不換行） */}
          <div className="flex items-center justify-center gap-1 xl:gap-1.5 flex-shrink-0">
            {items.map(({ label, icon: Icon, path, badge, highlight }) => (
              <NavTab key={path} active={isActive(path)} onClick={() => navigate(path)} badge={badge} highlight={highlight}>
                <Icon active={isActive(path)} highlight={highlight} />
                <span className={`text-sm lg:text-[16px] font-bold tracking-wide transition-colors whitespace-nowrap ${
                  highlight 
                    ? 'text-blue-300 group-hover:text-white' 
                    : isActive(path) 
                      ? 'text-blue-400' 
                      : 'text-slate-300 group-hover:text-white'
                }`}>
                  {label}
                </span>
              </NavTab>
            ))}
          </div>

          {/* 右側：車輛選擇器（收緊寬度防止壓迫）與登出按鈕 */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0 max-w-[260px] lg:max-w-[320px]">
            {/* 🆕 未登入時不顯示車輛選擇器 */}
            {user ? (
              <div className="flex-1 min-w-0 truncate">
                <CurrentVehiclePicker />
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition px-3 py-1.5"
              >
                登入 / 註冊
              </button>
            )}
            <div className="w-px h-5 bg-[#2a3644] flex-shrink-0" />
            <button
              onClick={handleLogout}
              title="登出"
              aria-label="登出"
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H9" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ===== 手機版頂部導航 ===== */}
      <nav className="md:hidden bg-[#0b0f14]/95 border-b border-[#1e2833] sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center cursor-pointer">
            <div className="h-11 flex items-center">
              <img src="/logo.png" alt="車大師" className="h-full w-auto object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/profile')} aria-label="會員中心"
              className={`p-2 rounded-lg transition-colors ${isActive('/profile') ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white'}`}>
              <MIconUser active={isActive('/profile')} />
            </button>
            <button onClick={() => navigate('/wishlist')} aria-label="願望清單"
              className={`relative p-2 rounded-lg transition-colors ${isActive('/wishlist') ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white'}`}>
              <MIconHeart active={isActive('/wishlist')} />
            </button>
            <button onClick={handleLogout} title="登出" aria-label="登出"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H9" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* 🆕 未登入時，手機版不顯示車輛選擇器 */}
      {user && (
        <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 bg-[#0b0f14]">
          <CurrentVehiclePicker mobile />
        </div>
      )}

      {/* ===== 手機版底部 tab bar ===== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0b0f14]/97 border-t border-[#1e2833] backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around h-16">
          {mobileItems.map(({ label, icon: Icon, path, badge }) => {
            const active = isActive(path);
            return (
              <button key={path} onClick={() => navigate(path)} aria-label={label} aria-current={active ? 'page' : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? 'text-blue-400' : 'text-slate-400 active:text-white'}`}>
                <span className="relative">
                  <Icon active={active} />
                  {badge != null && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-bold px-0.5 shadow">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className={`text-xs font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-400 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="md:hidden h-16" aria-hidden="true" />
    </>
  );
}

// ========== 導航項目容器元件 ==========
function NavTab({ active, onClick, badge, highlight, children }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center gap-1.5 px-2.5 lg:px-3.5 py-2 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-blue-500/15 border border-blue-500/40 shadow-sm shadow-blue-500/20'
          : highlight 
            ? 'bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30'
            : 'hover:bg-white/10 hover:border-white/10 border border-transparent'
      }`}
    >
      {children}

      {badge != null && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-black px-1 shadow-lg shadow-red-500/40 animate-pulse">
          {badge > 99 ? '99+' : badge}
        </span>
      )}

      {active && (
        <span className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-400 rounded-full shadow-sm shadow-blue-400" />
      )}
    </button>
  );
}

/* ========== 圖示組件 ========== */
const iconCls = (active, highlight) =>
  `w-5 h-5 lg:w-5.5 lg:h-5.5 flex-shrink-0 ${active ? 'text-blue-400' : highlight ? 'text-blue-300' : 'text-slate-400 group-hover:text-white'} transition-colors duration-200`;

function MIconUser({ active, highlight }) {
  return (
    <svg className={iconCls(active, highlight)} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function MIconOrder({ active, highlight }) {
  return (
    <svg className={iconCls(active, highlight)} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4.5M9 8h6M7.5 3.75h9a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25z" />
    </svg>
  );
}

function MIconCalendar({ active, highlight }) {
  return (
    <svg className={iconCls(active, highlight)} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function MIconCar({ active, highlight }) {
  return (
    <svg className={iconCls(active, highlight)} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function MIconHeart({ active, highlight }) {
  return (
    <svg className={iconCls(active, highlight)} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function MIconGarage({ active, highlight }) {
  return (
    <svg className={iconCls(active, highlight)} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75m-6.75 3.75h13.5V9.75L12 5.25 3.75 9.75v7.5z" />
    </svg>
  );
}

function MIconCart({ active, highlight }) {
  return (
    <svg className={iconCls(active, highlight)} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}