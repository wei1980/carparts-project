// src/components/GarageNav.jsx — 車廠後台共用導覽
// 桌機：一列連結；手機／平板：漢堡選單 + 抽屜，解決 7 顆按鈕在 390px 溢出的問題。
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const LINKS = [
  { key: 'dashboard', label: '工作台', path: '/garage/dashboard' },
  { key: 'calendar', label: '行事曆', path: '/garage/calendar' },
  { key: 'work-orders', label: '工單', path: '/garage/work-orders' },
  { key: 'customers', label: '客戶', path: '/garage/customers' },
  { key: 'reports', label: '報表', path: '/garage/reports' },
  { key: 'settings', label: '門店設定', path: '/garage/settings' },
];

export default function GarageNav({ active, right = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // 換頁時自動關閉抽屜
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('garageToken');
    localStorage.removeItem('garageUser');
    navigate('/garage/login', { replace: true });
  };

  const current = active || LINKS.find(l => location.pathname.startsWith(l.path))?.key;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-surface-700 bg-surface-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/garage/dashboard')}
            className="flex shrink-0 items-center gap-2"
            aria-label="回到車廠工作台"
          >
            <img src="/logo.png" alt="" width="320" height="133" className="h-8 w-auto object-contain" />
            <span className="hidden text-sm font-bold tracking-wide text-slate-200 sm:inline">車廠後台</span>
          </button>

          {/* 桌機導覽 */}
          <nav className="ml-4 hidden items-center gap-1 xl:flex" aria-label="車廠功能">
            {LINKS.map((link) => {
              const isActive = current === link.key;
              return (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => navigate(link.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-500/15 text-blue-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {right}
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 xl:inline-flex"
            >
              登出
            </button>
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-label={open ? '關閉選單' : '開啟選單'}
              aria-expanded={open}
              aria-controls="garage-mobile-menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 xl:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                {open
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />}
              </svg>
            </button>
          </div>
        </div>

        {/* 手機抽屜 */}
        {open && (
          <div id="garage-mobile-menu" className="border-t border-surface-700 bg-surface-900 xl:hidden">
            <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-4 py-3 sm:px-6" aria-label="車廠功能（手機）">
              {LINKS.map((link) => {
                const isActive = current === link.key;
                return (
                  <button
                    key={link.key}
                    type="button"
                    onClick={() => navigate(link.path)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                      isActive ? 'bg-blue-500/15 text-blue-300' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-red-500/10"
              >
                登出
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
