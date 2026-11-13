// src/components/ui/Card.jsx — 共用卡片（Sprint 2 / design tokens）
// 規範：title + actions + children；深色 surface token
import React from 'react';

export default function Card({ title, actions, children, className = '', ...rest }) {
  const hasHead = title || actions;
  return (
    <div className={`bg-surface-800 rounded-2xl border border-surface-700 ${className}`} {...rest}>
      {hasHead && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h3 className="font-bold text-lg text-white">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={hasHead ? 'px-6 pb-6 pt-4' : 'p-6'}>{children}</div>
    </div>
  );
}
