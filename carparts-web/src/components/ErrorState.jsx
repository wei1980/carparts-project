// src/components/ErrorState.jsx — 資料載入失敗的統一呈現
// 用法：<ErrorState message="車輛資料載入失敗" onRetry={() => load()} />
//      <ErrorState compact message="..." onRetry={...} />  ← 行內小版（側欄/卡片內）
export default function ErrorState({ message = '載入失敗，請稍後再試', onRetry, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <span className="text-xs flex-1">{message}</span>
        {onRetry && (
          <button onClick={onRetry} className="text-xs underline underline-offset-2 hover:text-red-200 transition shrink-0">
            重試
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-slate-300 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry}
          className="mt-4 px-5 py-2 rounded-xl bg-[#1a232e] border border-[#2c3947] text-sm text-slate-200 hover:border-slate-500 transition">
          🔄 重試
        </button>
      )}
    </div>
  );
}
