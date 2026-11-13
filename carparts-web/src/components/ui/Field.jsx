// src/components/ui/Field.jsx — 共用表單欄位（Sprint 2 / design tokens）
// 規範：label + required marker + hint/error；輸入內任意控制元由 children 提供
import React from 'react';

export default function Field({ label, htmlFor, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-surface-100 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-400" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-surface-100">{hint}</p>
      ) : null}
    </div>
  );
}
