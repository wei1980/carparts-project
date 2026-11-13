// src/components/ui/Button.jsx — 共用按鈕（Sprint 2 / design tokens）
// 規範：variant primary/secondary/danger/ghost；size sm/md/lg；loading；fullWidth
// 顏色改用 design token（primary-* / surface-*），不再使用 Tailwind gray-*
import React from 'react';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClass =
    variant === 'secondary'
      ? 'bg-surface-700 hover:bg-surface-600 text-surface-100 border border-surface-600'
      : variant === 'danger'
        ? 'bg-red-600 hover:bg-red-500 text-white'
        : variant === 'ghost'
          ? 'bg-transparent text-primary-400 hover:bg-primary-500/10'
          : 'bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white';
  const sizeClass = size === 'sm' ? 'h-8 px-3 text-sm' : size === 'lg' ? 'h-12 px-6 text-lg' : 'h-11 px-4 text-base';

  return (
    <button
      className={`${base} ${variantClass} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
