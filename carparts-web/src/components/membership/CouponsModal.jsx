// src/components/membership/CouponsModal.jsx
// 優惠券 Modal：【可使用】/【已使用·失效】/【兌換優惠碼】三頁籤
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { couponConditionText, partitionCoupons } from '../../data/membershipMock';

const TYPE_TAG = {
  FREE_SHIPPING: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  FIXED_AMOUNT: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  PERCENTAGE: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
};

const TYPE_LABEL = {
  FREE_SHIPPING: '免運券',
  FIXED_AMOUNT: '立折券',
  PERCENTAGE: '折扣券',
};

export default function CouponsModal({ coupons = [], onRedeem, onClose }) {
  const [tab, setTab] = useState('usable'); // usable | archived | redeem
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const { usable, archived } = partitionCoupons(coupons);
  const list = tab === 'usable' ? usable : tab === 'archived' ? archived : [];

  const handleRedeem = () => {
    const c = code.trim().toUpperCase();
    if (!c) return toast.error('請輸入優惠碼');
    setRedeeming(true);
    // 介面串接前：呼叫外部注入的兌換回呼，未注入時僅提示
    setTimeout(() => {
      setRedeeming(false);
      if (onRedeem) {
        onRedeem(c);
      } else {
        toast.success(`優惠碼 ${c} 兌換成功（Demo）`);
        setCode('');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl border border-gray-600 max-w-md w-full p-4 text-white max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">🎟️ 優惠券</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-2">✕</button>
        </div>

        {/* 頁籤 */}
        <div className="flex gap-2 mb-3">
          {[
            { key: 'usable', label: `可使用 (${usable.length})` },
            { key: 'archived', label: '已使用/失效' },
            { key: 'redeem', label: '兌換優惠碼' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/60 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 優惠券列表 */}
        {tab !== 'redeem' && (
          list.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              {tab === 'usable' ? '目前沒有可使用的優惠券' : '沒有已使用或失效的優惠券'}
            </p>
          ) : (
            <div className="space-y-2">
              {list.map(c => {
                const dim = tab === 'archived';
                return (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-3 ${
                      dim
                        ? 'border-gray-700/40 bg-gray-900/30 opacity-55'
                        : 'border-blue-500/40 bg-blue-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{c.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{couponConditionText(c)}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-bold ${TYPE_TAG[c.type]}`}>
                        {TYPE_LABEL[c.type]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <code className="text-xs font-mono bg-gray-900/70 border border-gray-700/60 rounded px-2 py-0.5 text-slate-300">
                        {c.code}
                      </code>
                      <span className="text-[10px] text-slate-500">
                        {dim
                          ? (c.isUsed ? `已使用 ${c.usedAt || ''}` : `已過期 ${c.validUntil}`)
                          : `有效期限 ${c.validUntil}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 兌換優惠碼 */}
        {tab === 'redeem' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">輸入優惠碼兌換，兌換後於結帳時選擇使用。</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="例如：VIPFREE26Q4"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-mono uppercase placeholder:normal-case"
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              />
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold transition"
              >
                {redeeming ? '兌換中…' : '兌換'}
              </button>
            </div>
            <div className="bg-gray-900/40 border border-gray-700/40 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 mb-1">本次可試用：</p>
              <div className="flex flex-wrap gap-1.5">
                {['NEWMEMBER50', 'MOD90', 'SAVE300'].map(sample => (
                  <button
                    key={sample}
                    onClick={() => setCode(sample)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-600 text-slate-400 hover:text-white hover:border-blue-500/50"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
