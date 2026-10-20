// src/components/membership/VipTierModal.jsx
// VIP 等級詳情 Modal：當前等級權益、升級進度、四等級權益對比表
import { VIP_TIERS, calcMembershipStatus } from '../../types/membership';

const TIER_STYLE = {
  BRONZE: { badge: 'bg-amber-700/30 text-amber-500 border-amber-700/40', bar: 'bg-amber-600' },
  SILVER: { badge: 'bg-slate-400/20 text-slate-300 border-slate-400/40', bar: 'bg-slate-400' },
  GOLD: { badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', bar: 'bg-yellow-400' },
  DIAMOND: { badge: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40', bar: 'bg-cyan-300' },
};

export default function VipTierModal({ currentTier = 'GOLD', currentYearSpent = 0, onClose }) {
  const status = calcMembershipStatus(currentTier, currentYearSpent);
  const style = TIER_STYLE[currentTier] || TIER_STYLE.BRONZE;
  const next = status._next;
  const remaining = next ? next.minAnnualSpent - currentYearSpent : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl border border-gray-600 max-w-lg w-full p-4 text-white max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">🏆 VIP 會員等級</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-2">✕</button>
        </div>

        {/* 當前等級卡片 */}
        <div className={`rounded-xl border p-3 mb-3 ${style.badge}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg font-bold">{getTierName(currentTier)}</span>
            <span className="text-xs font-bold">點數回饋 {status.pointMultiplier.toFixed(1)}x</span>
          </div>
          <ul className="text-xs space-y-0.5">
            {status.benefits.map(b => <li key={b}>✔ {b}</li>)}
          </ul>
        </div>

        {/* 升級進度 */}
        {next ? (
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-3 mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">距離下一等級「{next.name}」</span>
              <span className="text-slate-300 font-bold">還差 NT$ {remaining.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-mono">年度累積消費 NT$ {currentYearSpent.toLocaleString()}</span>
              <span className="font-mono text-slate-400">/ NT$ {next.minAnnualSpent.toLocaleString()}</span>
            </div>
            <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${style.bar}`}
                style={{ width: `${status.progressPercentage}%` }}
              />
            </div>
            <div className="text-right text-xs font-bold mt-1 text-blue-400">
              {status.progressPercentage}%
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-3 mb-3 text-sm text-cyan-300">
            ✦ 已達最高等級，專屬權益全面啟用
          </div>
        )}

        {/* 四等級權益對比表 */}
        <div className="border border-gray-700/60 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-900/60 text-slate-400">
                <th className="text-left px-2.5 py-2 font-medium">等級</th>
                <th className="text-right px-2.5 py-2 font-medium">年度消費門檻</th>
                <th className="text-right px-2.5 py-2 font-medium">點數回饋</th>
                <th className="text-left px-2.5 py-2 font-medium">專屬權益</th>
              </tr>
            </thead>
            <tbody>
              {VIP_TIERS.map(t => {
                const active = t.tier === currentTier;
                const ts = TIER_STYLE[t.tier];
                return (
                  <tr
                    key={t.tier}
                    className={`border-t border-gray-700/50 ${active ? 'bg-yellow-500/10' : ''}`}
                  >
                    <td className="px-2.5 py-2">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${ts.badge}`}>
                        {t.name}
                      </span>
                    </td>
                    <td className="text-right px-2.5 py-2 font-mono">
                      {t.minAnnualSpent === 0 ? '—' : `NT$ ${t.minAnnualSpent.toLocaleString()}`}
                    </td>
                    <td className="text-right px-2.5 py-2 font-mono">{t.pointMultiplier.toFixed(1)}x</td>
                    <td className="px-2.5 py-2 text-slate-300 leading-tight">
                      {t.benefits.map(b => <div key={b}>{b}</div>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          ※ 年度累積消費以每年 1/1–12/31 計算，次年重新累積；點數回饋依實際付款金額計算。
        </p>
      </div>
    </div>
  );
}

function getTierName(tier) {
  return VIP_TIERS.find(t => t.tier === tier)?.name || tier;
}
