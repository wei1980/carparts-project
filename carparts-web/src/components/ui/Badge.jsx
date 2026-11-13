// src/components/ui/Badge.jsx — 共用徽章（Sprint 2 / design tokens）
// 規範：tone blue/green/amber/red/slate/purple；顏色改用 token 系 class
import React from 'react';

const tones = {
  blue: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  green: 'bg-green-500/15 text-green-400 border border-green-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  red: 'bg-red-500/15 text-red-400 border border-red-500/30',
  slate: 'bg-slate-700/60 text-slate-300 border border-slate-600/50',
  purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
};

export default function Badge({ tone = 'blue', children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tones[tone] || tones.blue} ${className}`}>
      {children}
    </span>
  );
}
