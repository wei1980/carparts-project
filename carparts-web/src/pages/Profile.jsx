// src/pages/Profile.jsx 會員中心（暗色跑車風格 · 三區塊布局）
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { consumerClient as api } from '../api/client';
import ErrorState from '../components/ErrorState';
import toast from 'react-hot-toast';
import ChangePasswordModal from '../components/account/ChangePasswordModal';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState(null); // password
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchUserProfile(); }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data?.id) updateUser(res.data);
      setProfileError('');
    } catch (err) {
      console.error('取得用戶最新資料失敗:', err);
      setProfileError(err?.response?.data?.error || err?.message || '取得會員資料失敗');
    }
  };

  // 觸發檔案選擇
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 處理頭像上傳
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. 前端驗證檔案類型與大小（限制 5MB）
    if (!file.type.startsWith('image/')) {
      return toast.error('請上傳圖片檔案 (JPG, PNG, GIF)');
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('圖片大小不能超過 5MB');
    }

    // 2. 準備 FormData
    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      // 呼叫後端 API（需自行實作此端點）
      const res = await api.post('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 3. 更新全域狀態與本地端預覽
      if (res.data?.avatar_url) {
        updateUser({ ...user, avatar_url: res.data.avatar_url });
        toast.success('大頭照更新成功！');
      }
    } catch (err) {
      toast.error('上傳失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      <main className="page-shell max-w-6xl">

        {/* 🆕 會員資料載入失敗：顯示 ErrorState + 重試 */}
        {profileError && <ErrorState message={profileError} onRetry={fetchUserProfile} />}

        {/* ===== 區塊 A：Top Hero（基本資料 + VIP 升級進度） ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* 左卡片：個人基本資料 */}
          <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-8xl opacity-5 pointer-events-none">🏆</div>

            <div className="flex items-center gap-5 relative z-10">

              {/* ===== 頭像區塊 ===== */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center text-3xl overflow-hidden border-2 border-blue-500/30">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>👤</span>
                  )}
                </div>

                {/* 懸浮編輯遮罩 */}
                {!uploading && (
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="absolute inset-0 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition cursor-pointer text-xs"
                  >
                    <span className="text-lg">📷</span>
                    <span className="mt-0.5 font-medium">更換</span>
                  </button>
                )}

                {/* 上傳中 Loading 遮罩 */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}

                {/* 隱藏的檔案上傳 Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              {/* =================== */}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white">{user?.name || '未填寫'}</h1>
                </div>

                {/* 聯絡資訊標籤群 */}
                <div className="flex flex-wrap gap-2 text-xs text-slate-300 my-4">
                  <span className="bg-slate-700/50 border border-slate-600/60 rounded-lg px-2.5 py-1">📧 {user?.email || '信箱未填寫'}</span>
                  <span className="bg-slate-700/50 border border-slate-600/60 rounded-lg px-2.5 py-1">📱 {user?.phone || '電話未填寫'}</span>
                  {user?.lineId ? (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg px-2.5 py-1">💬 LINE: 已連動</span>
                  ) : (
                    <span className="bg-slate-700/50 border border-slate-600/60 rounded-lg px-2.5 py-1 text-slate-500">💬 LINE: 未連動</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              ✏️ 編輯個人／收件資料
            </button>
          </section>

          {/* 右卡片：會員權益（尚未上線，不顯示任何模擬數字） */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-bold">會員權益</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              紅利點數、會員等級與優惠券正在規劃中；上線後會在這裡顯示你的回饋與折抵。
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              <li>✓ 訂單與售後進度查詢</li>
              <li>✓ 保養提醒與回廠建議</li>
              <li>✓ 願望清單降價通知</li>
            </ul>
            <button
              onClick={() => navigate('/orders')}
              className="mt-6 w-full rounded-xl border border-slate-600 py-2.5 font-medium text-slate-300 transition-all hover:border-blue-500/50 hover:text-blue-300"
            >
              查看我的訂單 →
            </button>
          </section>
        </div>

        {/* ===== 區塊 B：常用入口（只連到真實頁面，不顯示模擬數字） ===== */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: '我的訂單', desc: '查看付款、出貨與售後進度', path: '/orders' },
            { label: '我的預約', desc: '確認時間、車廠報價與評價', path: '/appointments' },
            { label: '願望清單', desc: '追蹤零件，降價時通知你', path: '/wishlist' },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="group rounded-xl border border-slate-700/80 bg-slate-800/60 p-5 text-left transition-all hover:border-slate-600"
            >
              <p className="text-sm font-bold text-slate-200 group-hover:text-blue-300">{item.label}</p>
              <p className="mt-1 text-[11px] text-slate-500 group-hover:text-slate-400">{item.desc} →</p>
            </button>
          ))}
        </div>

        {/* ===== 區塊 C：設定與安全網格 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 預設收件地址 */}
          <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">📍 預設收件地址</h2>
            <p className={`text-sm ${user?.address ? 'text-slate-200' : 'text-slate-500 italic'}`}>
              {user?.address || '尚未填寫，補上後結帳更快速。'}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500/50 hover:text-blue-300 transition"
              >
                ✏️ 編輯
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500/50 hover:text-blue-300 transition"
              >
                + 新增地址
              </button>
            </div>
          </section>

          {/* 帳號與安全設定 */}
          <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">🔒 帳號安全與連動</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">密碼修改</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">定期更新密碼以保護帳號安全</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal('password')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition shrink-0"
                >
                  修改密碼
                </button>
              </div>

              <div className="border-t border-slate-700/60 pt-4">
                <p className="text-sm font-medium text-slate-200 mb-2">第三方帳號連動</p>
                <div className="flex flex-wrap gap-2">
                  {user?.lineId ? (
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg px-2.5 py-1">
                      💬 LINE: {user.lineId}（已綁定）
                    </span>
                  ) : (
                    <span className="text-[11px] bg-slate-700/50 border border-slate-600/60 rounded-lg px-2.5 py-1 text-slate-500">
                      💬 LINE: 未連動
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ===== 帳號 Modal ===== */}
      {modal === 'password' && (
        <ChangePasswordModal onClose={() => setModal(null)} />
      )}
    </div>
  );
}
