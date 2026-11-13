// src/pages/NotFound.jsx — 404 頁面
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--brand-bg)] text-white">
      <div className="text-center">
        <p className="text-7xl font-bold text-blue-400 mb-4">404</p>
        <h1 className="text-xl font-bold mb-2">找不到這個頁面</h1>
        <p className="text-surface-400 text-sm mb-8">您造訪的網址不存在或已被移除。</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary px-6 py-3 font-bold"
        >
          ← 回首頁
        </button>
      </div>
    </div>
  );
}
