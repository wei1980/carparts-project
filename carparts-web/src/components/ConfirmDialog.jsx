// src/components/ConfirmDialog.jsx — 取代原生 confirm() 的確認對話框（Admin 用）
// 用法：const ok = await confirmDialog({ message: '確定刪除？', confirmText: '刪除' });
import toast from 'react-hot-toast';

// 注意：toast.custom 會把同一則 toast 渲染到「每一個」已掛載的 <Toaster>，
// 所以整個 app 只應有一個 <Toaster>（main.jsx 的全域那個）。

/**
 * Promise 化確認對話框（基於 react-hot-toast custom）
 * @returns {Promise<boolean>} 確認=true / 取消或自動關閉=false
 *
 * 必定會 settle。react-hot-toast 2.x 的 toast.custom 不提供 onDismiss /
 * onAutoComplete 回呼（ToastOptions 只接受 id/icon/duration/position/...），
 * 所以逾時自動消失時沒有任何通知 — 這正是原本 promise 永遠 pending 的原因
 * （呼叫端 await 之後才 setLoading(false)，於是永久卡在 loading 骨架）。
 * 這裡自行以計時器對齊 toast 的 duration，確保逾時也會 resolve(false)。
 */
export function confirmDialog({ message, confirmText = '確定', cancelText = '取消', danger = true, duration = 30000 }) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    // 比 toast 的自動消失晚一點，確保對話框已從畫面消失後才結算
    timer = setTimeout(() => settle(false), duration + 200);

    const t = toast.custom(
      id => (
        <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3">
          <p className="text-sm text-slate-100 whitespace-pre-line">{message}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { toast.dismiss(id); settle(false); }}
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { toast.dismiss(id); settle(true); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {confirmText}
            </button>
          </div>
        </div>
      ),
      { duration, position: 'top-center' },
    );
    void t;
  });
}
