// src/components/ui/EmptyState.jsx — 共用空狀態元件（Sprint 1 / P1-19、P2-06）
// 規範：icon（ReactNode）+ title + description + primaryAction/secondaryAction
// 取代各頁各自寫死的「一行字」空狀態（Orders／Appointments／Checkout／Wishlist…）
import React from 'react';

export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
}) {
  return (
    <div
      data-testid="empty-state"
      className={`text-center py-16 px-4 rounded-2xl bg-[#131a22] border border-[#26313d] ${className}`}
    >
      {icon && (
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1a232e] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-bold text-slate-200">{title}</h2>
      {description && <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <button onClick={primaryAction.onClick} className="btn-primary px-6 py-3 font-bold">
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn-secondary px-6 py-3 font-bold">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
