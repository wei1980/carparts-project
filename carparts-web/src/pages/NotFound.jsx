// src/pages/NotFound.jsx — 404 頁面
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-7xl font-bold text-blue-400 mb-4">404</p>
        <h1 className="text-xl font-bold mb-2">找不到這個頁面</h1>
        <p className="text-gray-400 text-sm mb-8">您造訪的網址不存在或已被移除。</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl font-medium transition"
        >
          ← 回首頁
        </button>
      </div>
    </div>
  );
}
