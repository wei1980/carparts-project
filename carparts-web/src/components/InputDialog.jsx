// src/components/InputDialog.jsx — 取代原生 window.prompt() 的文字輸入對話框
// 用法：const reason = await inputDialog({ message: '駁回原因：', placeholder: '請輸入…' });
//        回傳字串；使用者取消 → null。
//
// 為什麼不用 window.prompt：原生對話框無法客製樣式、無法顯示提示說明、
// 文字無法多行，且在部分瀏覽器/自動化環境會被阻擋。
//
// 與 ConfirmDialog 相同：整個 app 只掛一個 <Toaster>（main.jsx），
// 且保證 Promise 必定 settle（計時器對齊 toast 的 duration）。
import toast from 'react-hot-toast';
import { useState } from 'react';

export function inputDialog({
  message,
  placeholder = '',
  defaultValue = '',
  confirmText = '確定',
  cancelText = '取消',
  danger = false,
  duration = 30000,
  allowEmpty = false,
}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    timer = setTimeout(() => settle(null), duration + 200);

    toast.custom(
      (id) => (
        <InputDialogBody
          id={id}
          message={message}
          placeholder={placeholder}
          defaultValue={defaultValue}
          confirmText={confirmText}
          cancelText={cancelText}
          danger={danger}
          allowEmpty={allowEmpty}
          onCancel={() => { toast.dismiss(id); settle(null); }}
          onConfirm={(value) => { toast.dismiss(id); settle(value); }}
        />
      ),
      { duration, position: 'top-center' },
    );
  });
}

function InputDialogBody({ id, message, placeholder, defaultValue, confirmText, cancelText, danger, allowEmpty, onCancel, onConfirm }) {
  // 每次渲染都重建 draft：toast.custom 的 render function 會在狀態變化時重跑，
  // 所以 draft 必須放在子元件的 state 裡，否則輸入內容會在每次重繪被清空。
  const [value, setValue] = useState(defaultValue);
  const canSubmit = allowEmpty || value.trim().length > 0;

  return (
    <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3">
      <p className="text-sm text-slate-100 whitespace-pre-line">{message}</p>
      <input
        autoFocus
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onConfirm(value.trim()); }}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
        >
          {cancelText}
        </button>
        <button
          onClick={() => onConfirm(value.trim())}
          disabled={!canSubmit}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

export default inputDialog;
