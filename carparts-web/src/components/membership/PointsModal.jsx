// src/components/membership/PointsModal.jsx
// 紅利點數 Modal：大字可用點數 + 【點數明細】/【即將到期】分頁
import { useState } from 'react';
import { POINT_VALUE_NTD } from '../../types/membership';
import { filterExpiringSoon } from '../../data/membershipMock';

const TYPE_STYLE = {
  EARN: { label: '獲得', amount: 'text-green-400' },
  REDEEM: { label: '折抵', amount: 'text-red-400' },
  EXPIRED: { label: '到期', amount: 'text-slate-500' },
};

export default function PointsModal({ points = 0, history = [], onClose }) {
  const [tab, setTab] = useState('detail'); // detail | expiring

  const expiring = filterExpiringSoon(history, 90);
  const list = tab === 'detail' ? history : expiring;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-800 rounded-2xl border border-surface-600 max-w-md w-full p-4 text-white max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">💎 紅利點數</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-2">✕</button>
        </div>

        {/* 可用點數大字 */}
        <div className="bg-emerald-900/15 border border-emerald-600/30 rounded-xl p-4 text-center mb-3">
          <p className="text-4xl font-black text-emerald-400">
            {points.toLocaleString()}
            <span className="text-base font-normal text-slate-400 ml-1">點</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            ＝ NT$ {(points * POINT_VALUE_NTD).toLocaleString()} 折抵金額（1 點 = NT$ 1 元）
          </p>
        </div>

        {/* 分頁標籤 */}
        <div className="flex gap-2 mb-3">
          {[
            { key: 'detail', label: '點數明細' },
            { key: 'expiring', label: `即將到期 (${expiring.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-700/60 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 列表 */}
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            {tab === 'expiring' ? '✅ 90 天內無到期點數' : '尚無點數紀錄'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {list.map(r => {
              const ts = TYPE_STYLE[r.type] || TYPE_STYLE.EARN;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-surface-900/40 border border-surface-700/40 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{r.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {r.createdAt}
                      {r.type === 'EARN' && r.expireAt ? ` · 到期日 ${r.expireAt}` : ''}
                      <span className="ml-1.5 text-slate-400">{ts.label}</span>
                    </p>
                  </div>
                  <span className={`text-sm font-bold font-mono ${ts.amount}`}>
                    {r.amount > 0 ? `+${r.amount}` : r.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-slate-500 mt-3">
          ※ 消費每滿 NT$ 100 獲得 1 點，依 VIP 等級倍數加成；點數自發放日起 1 年有效，折抵上限為訂單金額 30%。
        </p>
      </div>
    </div>
  );
}
