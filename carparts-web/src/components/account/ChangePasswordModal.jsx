// src/components/account/ChangePasswordModal.jsx
// 修改密碼 Modal：驗證舊密碼＋新密碼（至少 6 碼）＋確認新密碼
import { useState } from 'react';
import { consumerClient as api } from '../../api/client';
import { toast } from 'react-hot-toast';

export default function ChangePasswordModal({ onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError('');
    if (!oldPassword) return setError('請輸入舊密碼');
    if (newPassword.length < 6) return setError('新密碼至少 6 碼');
    if (newPassword !== confirmPassword) return setError('兩次輸入的新密碼不一致');

    setSubmitting(true);
    try {
      await api.patch('/auth/change-password', { oldPassword, newPassword });
      toast.success('✅ 密碼已更新');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '修改失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl border border-gray-600 max-w-sm w-full p-4 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">🔒 修改密碼</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-2">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">舊密碼 *</label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="輸入目前使用的密碼"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">新密碼 *（至少 6 碼）</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="輸入新密碼"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">確認新密碼 *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="再次輸入新密碼"
              className={inputCls}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold transition"
          >
            {submitting ? '更新中…' : '確認更新密碼'}
          </button>
        </div>
      </div>
    </div>
  );
}
