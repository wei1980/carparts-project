// src/components/FeedbackModal.jsx 意見與瑕疵回報 Modal
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const CATEGORIES = [
  { id: 'defect', icon: '🐞', label: '畫面/系統瑕疵' },
  { id: 'order', icon: '🛒', label: '購物/結帳疑問' },
  { id: 'suggest', icon: '💡', label: '功能建議' },
];

export default function FeedbackModal({ onClose }) {
  const { user } = useAuth();
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  // 自動捕捉當前頁面網址（Hidden Context）
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    if (!message.trim()) {
      toast.error('請輸入您的寶貴意見或發生的問題');
      return;
    }
    setSending(true);
    // 後端回報端點尚未提供：先輸出至控制台，後續可接 POST /api/feedback
    console.info('[Feedback]', JSON.stringify({
      category: CATEGORIES.find(c => c.id === category)?.label,
      page: pageUrl,
      user: user ? `${user.name || ''}（${user.phone || user.email || '未填寫'}）` : '訪客（未登入）',
      message: message.trim(),
      createdAt: new Date().toISOString(),
    }));
    toast.success('感謝您的反饋！我們將盡快處理。');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">💡 意見與瑕疵回報</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        {/* 自動捕捉資訊（Hidden Context） */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3 text-[11px] text-slate-400 space-y-1 mb-4">
          <p>📍 回報頁面：<span className="text-slate-300 break-all">{pageUrl}</span></p>
          <p>👤 使用者：<span className="text-slate-300">
            {user ? `${user.name || '未填寫'}（${user.phone || user.email || '未填寫'}）` : '訪客（未登入）'}
          </span></p>
        </div>

        {/* 回報類別單選 */}
        <p className="text-xs text-slate-400 mb-2">回報類別</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CATEGORIES.map(c => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`text-xs py-2 px-1 rounded-lg border transition text-center ${
                category === c.id
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span className="block text-base mb-0.5">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* 說明文字框 */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="請輸入您的寶貴意見或發生的問題..."
          className="w-full bg-slate-900/60 border border-slate-600 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 resize-none"
        />

        {/* 按鈕 */}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 transition text-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all text-sm disabled:opacity-50"
          >
            送出回報
          </button>
        </div>
      </div>
    </div>
  );
}
