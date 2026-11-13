// src/components/ui/Dialog.jsx — 共用對話框（Sprint 2 / design tokens）
// 規範：open + onClose + title + children + footer；ESC／點遮罩關閉、含 dialog 語意
import React, { useEffect } from 'react';

export default function Dialog({ open, onClose, title, children, footer, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h3 className="font-bold text-lg text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="text-surface-100 hover:text-white transition"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-surface-700 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
