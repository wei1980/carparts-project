// src/pages/admin/AdminSettings.jsx
import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    lineNotifyEnabled: true,
    notifyOnConfirm: true,
    notifyOnComplete: true,
    notifyOnCancel: true,
    notifyOnOrderPaid: true,
    notifyOnOrderShipped: true,
    notifyOnPoCreated: true,
    notifyChannel: 'line',
  });
  const [saved, setSaved] = useState(false);
  const [notifyTesting, setNotifyTesting] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  // 🆕 低庫存警示設定
  const [stockCfg, setStockCfg] = useState({ lowStockEnabled: false, lowStockThreshold: 5, lowStockIntervalHours: 24 });
  const [stockChecking, setStockChecking] = useState(false);
  // 🆕 物流業者管理（點單號自動連至查貨網頁）
  const [carriers, setCarriers] = useState([]);
  const [carrierEdit, setCarrierEdit] = useState(null); // { id?, name, code, trackingUrl, enabled, sortOrder }

  useEffect(() => {
    adminClient.get('/settings')
      .then(res => setSettings(res.data)).catch(err => console.warn('載入失敗:', err?.message || err));
    // 🆕 載入低庫存警示設定
    adminClient.get('/stock-alerts')
      .then(res => setStockCfg(prev => ({ ...prev, ...res.data })))
      .catch(err => console.warn('載入低庫存設定失敗:', err?.message || err));
    // 🆕 載入物流業者
    adminClient.get('/carriers')
      .then(res => setCarriers(res.data))
      .catch(err => console.warn('載入業者失敗:', err?.message || err));
  }, []);

  // 🆕 載入物流業者清單
  const loadCarriers = () => {
    adminClient.get('/carriers')
      .then(res => setCarriers(res.data))
      .catch(err => console.warn('載入業者失敗:', err?.message || err));
  };

  // 🆕 儲存物流業者（新增或更新）
  const saveCarrier = async () => {
    if (!carrierEdit?.name?.trim() || !carrierEdit?.code?.trim()) {
      return toast.error('請填寫業者名稱與代碼');
    }
    try {
      if (carrierEdit.id) {
        await adminClient.patch(`/carriers/${carrierEdit.id}`, carrierEdit);
        toast.success('業者已更新');
      } else {
        await adminClient.post('/carriers', carrierEdit);
        toast.success('業者已新增');
      }
      setCarrierEdit(null);
      loadCarriers();
    } catch (err) {
      toast.error('操作失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 刪除物流業者（未使用才可刪）
  const deleteCarrier = async (c) => {
    if (!(await confirmDialog({ message: `刪除業者「${c.name}」？已被訂單使用的業者無法刪除。` }))) return;
    try {
      await adminClient.delete(`/carriers/${c.id}`);
      toast.success('業者已刪除');
      loadCarriers();
    } catch (err) {
      toast.error('操作失敗：' + (err.response?.data?.error || err.message));
    }
  };

  // 🆕 儲存低庫存設定
  const saveStockCfg = async () => {
    try {
      await adminClient.patch('/stock-alerts', stockCfg);
      toast.success('低庫存警示設定已儲存');
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗');
    }
  };

  // 🆕 手動觸發檢查
  const runStockCheck = async () => {
    setStockChecking(true);
    try {
      const r = await adminClient.post('/stock-alerts/check?force=1');
      if (r.data.alerted) toast.success(`已推播警示（${r.data.count} 項低庫存）`);
      else if (r.data.reason === 'no_low_stock') toast.success('目前無低庫存商品');
      else if (r.data.reason === 'disabled') toast.error('功能未開啟，請先開啟總開關');
      else if (r.data.reason === 'admin_no_line') toast.error('管理員未綁定 LINE，無法推播');
      else toast('已檢查，無需推播', { icon: 'ℹ️' });
    } catch (err) {
      toast.error('檢查失敗');
    } finally {
      setStockChecking(false);
    }
  };

  const saveSettings = async () => {
    try {
      await adminClient.patch('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error('儲存失敗');
    }
  };

  const toggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupMsg('備份中...');
    try {
      await adminClient.post('/backup');
      setBackupMsg('✅ 備份成功');
    } catch {
      setBackupMsg('❌ 備份失敗');
    } finally {
      setBackingUp(false);
    }
  };

  const items = [
    { key: 'lineNotifyEnabled', label: '🔔 LINE 推播總開關', desc: '關閉後所有 LINE 通知都不會發送' },
    { key: 'notifyOnConfirm', label: '預約確認通知', desc: '管理員確認預約時通知車主' },
    { key: 'notifyOnComplete', label: '施工完成通知', desc: '車廠回報施工完成時通知車主' },
    { key: 'notifyOnCancel', label: '預約取消通知', desc: '預約被取消時通知車主' },
    { key: 'notifyOnOrderPaid', label: '訂單付款通知', desc: '訂單標記已付款時通知車主' },
    { key: 'notifyOnOrderShipped', label: '訂單出貨通知', desc: '訂單標記已出貨時通知車主' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">⚙️ 系統設定</h1>

      {/* LINE 推播設定 */}
      <div className="bg-surface-800 p-6 rounded-xl max-w-2xl mb-6">
        <h2 className="text-lg font-bold text-white mb-4">📱 LINE 推播設定</h2>

        <div className="space-y-4">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-surface-700">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-surface-400 text-sm">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`w-14 h-7 rounded-full transition-colors relative ${
                  settings[item.key] ? 'bg-green-600' : 'bg-surface-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${
                    settings[item.key] ? 'left-8' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={saveSettings}
          className={`mt-6 px-6 py-3 rounded font-bold text-white transition ${
            saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saved ? '✅ 已儲存' : '💾 儲存設定'}
        </button>
      </div>

      {/* 🆕 訂單加收費用（暫時方案：未開發票，由系統設定決定是否加收） */}
      <div className="bg-surface-800 p-6 rounded-xl max-w-2xl mb-6">
        <h2 className="text-lg font-bold text-white mb-4">💰 訂單加收費用（暫時方案）</h2>

        <div className="py-3 border-b border-surface-700 flex items-center justify-between">
          <div>
            <p className="text-white font-medium">🚚 每筆訂單加收運費 NT$60 ＋ 稅金 5%</p>
            <p className="text-surface-400 text-sm">目前尚未開發票，暫時由系統設定決定是否加收；開啟後結帳金額會自動計入運費與稅金</p>
          </div>
          <button
            onClick={() => toggle('orderFeeEnabled')}
            className={`w-14 h-7 rounded-full transition-colors relative ${
              settings.orderFeeEnabled ? 'bg-green-600' : 'bg-surface-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${
                settings.orderFeeEnabled ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 🆕 採購單通知（車廠下單 → 通知管理者） */}
      <div className="bg-surface-800 p-6 rounded-xl max-w-2xl mb-6">
        <h2 className="text-lg font-bold text-white mb-4">🛒 採購單通知（車廠下單時通知我）</h2>

        <div className="py-3 border-b border-surface-700">
          <p className="text-white font-medium">📣 通知通道</p>
          <p className="text-surface-400 text-sm mb-2">
            憑證在 carparts-api/.env（ADMIN_LINE_USER_ID／TELEGRAM_BOT_TOKEN＋TELEGRAM_CHAT_ID）
          </p>
          <select
            value={settings.notifyChannel || 'line'}
            onChange={e => setSettings(s => ({ ...s, notifyChannel: e.target.value }))}
            className="h-10 px-3 bg-surface-700 border border-surface-600 rounded-lg text-white"
          >
            <option value="line">LINE</option>
            <option value="telegram">Telegram</option>
            <option value="both">LINE + Telegram（同時發送）</option>
            <option value="off">關閉（不通知）</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-surface-700">
          <div>
            <p className="text-white font-medium">🔔 車廠下採購單時通知</p>
            <p className="text-surface-400 text-sm">關閉後，車廠送出採購單不會推播給管理者</p>
          </div>
          <button
            onClick={() => toggle('notifyOnPoCreated')}
            className={`w-14 h-7 rounded-full transition-colors relative ${settings.notifyOnPoCreated !== false ? 'bg-green-600' : 'bg-surface-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${settings.notifyOnPoCreated !== false ? 'left-8' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-surface-700">
          <div>
            <p className="text-white font-medium">📦 採購單狀態變更通知車廠</p>
            <p className="text-surface-400 text-sm">平台確認/出貨時，主動推播 LINE 給車廠聯絡人（workshop.line_id）</p>
          </div>
          <button
            onClick={() => toggle('notifyOnPoStatus')}
            className={`w-14 h-7 rounded-full transition-colors relative ${settings.notifyOnPoStatus !== false ? 'bg-green-600' : 'bg-surface-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${settings.notifyOnPoStatus !== false ? 'left-8' : 'left-1'}`} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={async () => {
              setNotifyTesting(true);
              try {
                const res = await adminClient.post('/settings/notify-test');
                if (res.data.success) toast.success(`測試訊息已發送：${res.data.sent.join(' + ')}`);
                else toast.error(`發送失敗：${(res.data.errors || []).join('；') || '請檢查憑證'}`);
              } catch (err) {
                toast.error(err.response?.data?.error || '發送失敗');
              } finally {
                setNotifyTesting(false);
              }
            }}
            disabled={notifyTesting}
            className="px-5 py-2.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-sm"
          >
            {notifyTesting ? '發送中…' : '🧪 發送測試訊息'}
          </button>
          <span className="text-surface-400 text-xs">先用測試訊息確認通道可用，記得先按「儲存設定」</span>
        </div>
      </div>

      {/* 🆕 低庫存警示 */}
      <div className="bg-surface-800 p-6 rounded-xl max-w-2xl mb-6">
        <h2 className="text-lg font-bold text-white mb-4">⚠️ 低庫存警示</h2>
        <div className="flex items-center justify-between py-3 border-b border-surface-700">
          <div>
            <p className="text-white font-medium">🔔 啟用低庫存 LINE 警示</p>
            <p className="text-surface-400 text-sm">庫存低於門檻時推播給管理員（每小時自動檢查）</p>
          </div>
          <button
            onClick={() => setStockCfg(c => ({ ...c, lowStockEnabled: !c.lowStockEnabled }))}
            className={`w-14 h-7 rounded-full transition-colors relative ${stockCfg.lowStockEnabled ? 'bg-green-600' : 'bg-surface-600'}`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${stockCfg.lowStockEnabled ? 'left-8' : 'left-1'}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-surface-700">
          <label className="block">
            <span className="text-surface-400 text-sm">庫存門檻（≤ 此值警示）</span>
            <input type="number" min="0" value={stockCfg.lowStockThreshold}
              onChange={e => setStockCfg(c => ({ ...c, lowStockThreshold: e.target.value }))}
              className="w-full mt-1 p-2 rounded bg-surface-700 text-white" />
          </label>
          <label className="block">
            <span className="text-surface-400 text-sm">提醒間隔（小時，防轟炸）</span>
            <input type="number" min="1" max="168" value={stockCfg.lowStockIntervalHours}
              onChange={e => setStockCfg(c => ({ ...c, lowStockIntervalHours: e.target.value }))}
              className="w-full mt-1 p-2 rounded bg-surface-700 text-white" />
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={saveStockCfg} className="px-6 py-2.5 rounded font-bold text-white bg-blue-600 hover:bg-blue-700 transition">
            💾 儲存警示設定
          </button>
          <button onClick={runStockCheck} disabled={stockChecking}
            className="px-6 py-2.5 rounded font-bold text-white bg-surface-600 hover:bg-surface-500 disabled:opacity-50 transition">
            {stockChecking ? '檢查中…' : '⚡ 立即檢查一次'}
          </button>
        </div>
      </div>

      {/* 🆕 物流業者管理（查貨網頁連結可由後台維護） */}
      <div className="bg-surface-800 p-6 rounded-xl max-w-2xl mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">🚚 物流業者（點單號自動連至查貨網頁）</h2>
          <button
            onClick={() => setCarrierEdit({ name: '', code: '', trackingUrl: '', enabled: true, sortOrder: carriers.length + 1 })}
            className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-xs font-bold"
          >
            ＋ 新增業者
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {carriers.map(c => (
            <div key={c.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${c.enabled ? 'border-surface-700 bg-surface-900/40' : 'border-surface-800 bg-surface-900/20 opacity-50'}`}>
              <span className="font-bold text-surface-100 whitespace-nowrap">{c.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">{c.code}</span>
              {c.trackingUrl ? (
                <a href={c.trackingUrl} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-cyan-400 underline decoration-dotted underline-offset-2 hover:text-cyan-200 text-xs" title={c.trackingUrl}>
                  {c.trackingUrl.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <span className="flex-1 truncate text-surface-600 text-xs">未設定查貨網址</span>
              )}
              <button
                onClick={() => setCarrierEdit({ id: c.id, name: c.name, code: c.code, trackingUrl: c.trackingUrl || '', enabled: c.enabled, sortOrder: c.sort_order })}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                title="編輯名稱與查貨網址"
              >✎</button>
              <button
                onClick={() => deleteCarrier(c)}
                className="px-2 py-1 bg-red-900/50 hover:bg-red-800/60 rounded text-xs text-red-300"
                title="刪除（已被訂單使用則需先停用）"
              >✕</button>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-surface-500 mt-2">提示：查貨網址可含 {'{number}'} 併入物流單號（如 …/track?nums={'{number}'}）；不含則僅連至查貨首頁。</p>
      </div>

      {/* 🆕 業者編輯對話框 */}
      {carrierEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setCarrierEdit(null)} role="dialog" aria-label="物流業者編輯">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-surface-800 border border-surface-700 rounded-xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white">{carrierEdit.id ? '編輯物流業者' : '新增物流業者'}</h3>
            <div>
              <label className="block text-xs text-surface-400 mb-1">業者名稱 *</label>
              <input
                value={carrierEdit.name}
                onChange={e => setCarrierEdit({ ...carrierEdit, name: e.target.value })}
                placeholder="例：新竹物流"
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">業者代碼 *（英文短碼）</label>
              <input
                value={carrierEdit.code}
                onChange={e => setCarrierEdit({ ...carrierEdit, code: e.target.value })}
                placeholder="例：HCT"
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">查貨網址（可含 {'{number}'} 併入單號）</label>
              <input
                value={carrierEdit.trackingUrl}
                onChange={e => setCarrierEdit({ ...carrierEdit, trackingUrl: e.target.value })}
                placeholder="例：https://www.hct.com.tw/Search/SearchGoods_n.aspx"
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={carrierEdit.enabled}
                  onChange={e => setCarrierEdit({ ...carrierEdit, enabled: e.target.checked })}
                  className="text-cyan-500"
                />
                啟用
              </label>
              <label className="flex items-center gap-2 text-sm text-surface-300">
                排序
                <input
                  type="number"
                  min="0"
                  value={carrierEdit.sortOrder ?? 0}
                  onChange={e => setCarrierEdit({ ...carrierEdit, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  className="w-20 px-2 py-1.5 bg-surface-700 border border-surface-600 rounded-lg text-sm font-mono"
                />
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveCarrier} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold">儲存</button>
              <button onClick={() => setCarrierEdit(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 資料庫備份 */}
      <div className="bg-surface-800 p-6 rounded-xl max-w-2xl">
        <h2 className="text-lg font-bold text-white mb-4">🗄️ 資料庫備份</h2>
        <p className="text-surface-400 text-sm mb-4">
          手動觸發資料庫備份，備份檔將儲存在伺服器 backups 目錄中。
        </p>
		<button
		onClick={handleBackup}
		disabled={backingUp}
		className="bg-blue-600 px-6 py-3 rounded font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
		>
		{backingUp ? '備份中...' : '🗄️ 完整備份（資料庫 + 程式碼）'}
		</button>
        {backupMsg && (
          <p className={`mt-3 text-sm ${backupMsg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
            {backupMsg}
          </p>
        )}
      </div>
    </div>
  );
}