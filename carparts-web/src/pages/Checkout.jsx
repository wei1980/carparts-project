// src/pages/Checkout.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumerClient as api } from '../api/client';
import { useCart } from '../context/CartContext';
import { vehicleAPI } from '../api';
import Navbar from '../components/Navbar';
import { confirmDialog } from '../components/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';

export default function Checkout() {
  const { cart, totalAmount, clearCart } = useCart();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [needInstallation, setNeedInstallation] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🆕 金流：匯款帳戶（由 API 取得，非寫死前端）
  const [bankInfo, setBankInfo] = useState(null);
  useEffect(() => {
    api.get('/consumer/orders/bank-info')
      .then(res => setBankInfo(res.data))
      .catch(err => console.warn('載入失敗:', err?.message || err));
  }, []);

  // 🆕 訂單加收費用（運費 NT$60＋稅金 5%；暫時由系統設定決定是否開啟）
  const [feeConfig, setFeeConfig] = useState({ enabled: false, shippingFee: 60, taxRate: 0.05 });
  useEffect(() => {
    api.get('/consumer/orders/order-fee')
      .then(res => setFeeConfig(res.data))
      .catch(() => { /* 靜默：預設不加收 */ });
  }, []);

  // 🆕 現貨/代購拆分（依庫存顯示；實際判定以後端回傳為準）
  // CartContext 只讀取，不改變 localStorage 結構
  // 現貨判定＝自備庫存＋總代理庫存
  const availableQtyOf = (item) => Number(item.part?.stock_qty ?? 0) + Number(item.part?.distributor_stock_qty ?? 0);
  // 效能：現貨/代購拆分與金額計算依賴 cart/feeConfig，以 useMemo 避免每次渲染重算
  const instockItems = useMemo(() => cart.filter(item => availableQtyOf(item) >= item.qty), [cart]);
  const preorderItems = useMemo(() => cart.filter(item => availableQtyOf(item) < item.qty), [cart]);
  const instockSubtotal = useMemo(() => instockItems.reduce((s, i) => s + Number(i.part.msrp_price) * i.qty, 0), [instockItems]);
  const preorderSubtotal = useMemo(() => preorderItems.reduce((s, i) => s + Number(i.part.msrp_price) * i.qty, 0), [preorderItems]);
  const subtotal = useMemo(() => instockSubtotal + preorderSubtotal, [instockSubtotal, preorderSubtotal]);
  // 🆕 運費＋稅金（開啟時計入；運費與稅金於本次一併收取）
  const orderFee = useMemo(() => feeConfig.enabled
    ? feeConfig.shippingFee + Math.round(subtotal * feeConfig.taxRate)
    : 0, [feeConfig, subtotal]);
  const payableAmount = Math.round(instockSubtotal + preorderSubtotal * 0.5) + orderFee; // 訂金 50%＋運費＋稅金
  const grandTotal = totalAmount + orderFee;
  const hasPreorder = preorderItems.length > 0;

  // 收貨資料
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  // 🆕 下單備註
  const [orderNote, setOrderNote] = useState('');

  // 🆕 就地驗證：欄位錯誤 + 提交失敗訊息
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);
  const vehicleRef = useRef(null);

  // 清除對應欄位錯誤（輸入時即時回饋）
  const clearErr = (key) => (setter) => (e) => {
    setter(e.target.value);
    setFieldErrors(prev => { if (!prev[key]) return prev; const n = { ...prev }; delete n[key]; return n; });
    if (submitError) setSubmitError('');
  };

  /** 驗證必填欄位；回傳 true=通過。失敗時設 fieldErrors 並聚焦第一個錯誤欄位 */
  const validateFields = () => {
    const e = {};
    if (!receiverName.trim()) e.receiverName = '請填寫收件人姓名';
    if (!receiverPhone.trim()) {
      e.receiverPhone = '請填寫聯絡電話';
    } else if (!/^09\d{8}$/.test(receiverPhone.trim().replace(/[-\s]/g, ''))) {
      e.receiverPhone = '手機格式需為 09xxxxxxxx';
    }
    if (!shippingAddress.trim()) {
      e.shippingAddress = '請填寫收貨地址';
    } else if (shippingAddress.trim().length < 8) {
      e.shippingAddress = '地址過短，請確認是否完整';
    }
    if (needInstallation && !selectedVehicle) e.selectedVehicle = '請選擇要安裝的車輛';

    setFieldErrors(e);
    // 聚焦第一個錯誤欄位
    const firstRef = { receiverName: nameRef, receiverPhone: phoneRef, shippingAddress: addressRef, selectedVehicle: vehicleRef };
    for (const key of Object.keys(e)) {
      firstRef[key]?.current?.focus?.();
      break;
    }
    return Object.keys(e).length === 0;
  };

  const navigate = useNavigate();

  // 載入客戶資料並自動填入
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.name) setReceiverName(user.name);
      if (user.phone) setReceiverPhone(user.phone);
      if (user.address) setShippingAddress(user.address);
    }

    if (localStorage.getItem('token')) {
      api.get('/auth/profile').then(res => {
        const profile = res.data;
        if (profile.name) setReceiverName(profile.name);
        if (profile.phone) setReceiverPhone(profile.phone);
        if (profile.address) setShippingAddress(profile.address);
      }).catch(err => console.warn('載入失敗:', err?.message || err));
    }

    vehicleAPI.getAll().then(res => {
      setVehicles(res.data);
      if (res.data.length > 0) setSelectedVehicle(res.data[0].id);
    }).catch(err => console.warn('載入失敗:', err?.message || err));
  }, []);

  const handleSubmit = async () => {
    // 🆕 就地驗證取代 alert
    if (!validateFields()) return;

    if (needInstallation) {
      const confirmed = await confirmDialog({
        message: `🔧 您選擇了「需要安裝服務」\n\n` +
        `📌 付款成功後，您可以選擇安裝車廠\n` +
        `📌 零件寄出後，可以從 [車廠預約] 設定施工時間\n` +
        `📌 安裝工資將由車廠線上報價\n\n` +
        `是否確認需要安裝服務？`
      });
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      // 轉換商品資料為 snake_case
      const items = cart.map(item => ({
        part_id: item.partId,
        quantity: item.qty
      }));

      // 組裝請求資料（使用 snake_case）
      const requestData = {
        items,
        shipping_address: shippingAddress,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        need_installation: needInstallation,
        note: orderNote.trim() || undefined, // 🆕 下單備註
      };

      // 只有需要安裝時才加入 vehicle_id
      if (needInstallation) {
        requestData.vehicle_id = selectedVehicle;
      }


      const orderRes = await api.post('/consumer/orders', requestData);

      // 🆕 成功資訊存 sessionStorage，Orders 頁顯示完整通知（取代 alert）
      try {
        sessionStorage.setItem('orderJustPlaced', JSON.stringify({
          order_number: orderRes.data.order_number,
          payable_amount: Number(orderRes.data.payable_amount).toLocaleString(),
          bank_code: orderRes.data.bank_info?.bank_code || '822',
          account_number: orderRes.data.bank_info?.account_number || '',
          is_import: orderRes.data.order_type !== 'INSTOCK',
          need_installation: needInstallation,
        }));
      } catch { /* storage 不可用時靜默，仍跳轉 */ }

      clearCart();
      navigate('/orders');
    } catch (err) {
      // 詳細錯誤日誌
      console.error('❌ 訂單錯誤回應:', err.response);
      console.error('❌ 錯誤資料:', err.response?.data);
      
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.message || 
                       JSON.stringify(err.response?.data) || 
                       err.message || 
                       '未知錯誤';

      // 檢查是否為庫存不足錯誤（支援多種格式）
      const isStockError = 
        errorMsg.includes('庫存不足') || 
        errorMsg.includes('庫存') || 
        errorMsg.includes('stock') ||
        errorMsg.includes('insufficient');

      if (isStockError) {
        // 庫存不足時，詢問客戶是否要繼續下單（進口訂購）
        const continueOrder = await confirmDialog({
          message: `⚠️ 部分商品庫存不足，需從國外進口\n\n` +
          `${errorMsg}\n\n` +
          `📌 進口商品預計需要 7-14 個工作天到貨\n` +
          `📌 訂單仍可成立，我們將為您安排進口\n\n` +
          `是否繼續下單？`
        });
        
        if (continueOrder) {
          // 重新設定 loading 狀態
          setLoading(true);
          try {
            const items = cart.map(item => ({
              part_id: item.partId,
              quantity: item.qty
            }));

            // 第二次請求加上 ignore_stock 參數（snake_case）
            const requestDataWithIgnore = {
              items,
              shipping_address: shippingAddress,
              receiver_name: receiverName,
              receiver_phone: receiverPhone,
              need_installation: needInstallation,
              note: orderNote.trim() || undefined, // 🆕 下單備註
              ignore_stock: true,   // 後端需支援此參數
            };

            if (needInstallation) {
              requestDataWithIgnore.vehicle_id = selectedVehicle;
            }


            const orderRes = await api.post('/consumer/orders', requestDataWithIgnore);

            // 🆕 成功資訊存 sessionStorage（進口代購版）
            try {
              sessionStorage.setItem('orderJustPlaced', JSON.stringify({
                order_number: orderRes.data.order_number,
                payable_amount: Number(orderRes.data.payable_amount).toLocaleString(),
                bank_code: orderRes.data.bank_info?.bank_code || '822',
                account_number: orderRes.data.bank_info?.account_number || '',
                is_import: true,
                need_installation: needInstallation,
              }));
            } catch { /* storage 不可用時靜默 */ }

            clearCart();
            navigate('/orders');
          } catch (err2) {
            const errorMsg2 = err2.response?.data?.error || err2.response?.data?.message || err2.message;
            // 🆕 inline 錯誤顯示取代 alert
            setSubmitError(`訂單失敗：${errorMsg2}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } finally {
            setLoading(false);
          }
        } else {
          // 客戶取消，結束 loading
          setLoading(false);
        }
      } else {
        // 其他錯誤 → inline 顯示
        setSubmitError(`訂單失敗：${errorMsg}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setLoading(false);
      }
    }
  };

  // 取得車輛顯示名稱
  const getVehicleDisplayName = (vehicle) => {
    const parts = [];
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    if (vehicle.generation) parts.push(`(${vehicle.generation})`);
    if (vehicle.year) parts.push(vehicle.year);
    if (vehicle.license_plate) {
      parts.push(`[${vehicle.license_plate}]`);
    } else if (vehicle.licensePlate) {
      parts.push(`[${vehicle.licensePlate}]`);
    }
    return parts.join(' ') || '未命名車輛';
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-surface-900 text-white">
        <Navbar />
        <main className="page-shell max-w-6xl py-6">
          <EmptyState
            icon={<span className="text-6xl">🛒</span>}
            title="購物車是空的"
            description="去逛逛，為你的愛車挑選適合的零件"
            primaryAction={{ label: '去逛商城', onClick: () => navigate('/shop') }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      <main className="page-shell max-w-6xl py-6">
        <h1 className="text-2xl font-bold mb-6">📦 結帳</h1>

        {/* 🆕 提交失敗 inline 橫幅 */}
        {submitError && (
          <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/40 text-red-300 rounded-xl px-4 py-3" role="alert">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium">{submitError}</p>
              <p className="text-xs text-red-400/70 mt-0.5">請確認欄位資料後重新送出；問題持續時請聯絡客服。</p>
            </div>
            <button onClick={() => setSubmitError('')} aria-label="關閉錯誤訊息" className="text-red-300/60 hover:text-red-200 transition">✕</button>
          </div>
        )}

        {/* 左右並列：訂單摘要 + 收貨資料 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
          {/* 左側：訂單摘要 */}
          <div className="bg-surface-800/50 rounded-2xl p-5 border border-surface-700/50 flex flex-col">
            <h2 className="font-bold mb-3 text-base">📋 訂單摘要</h2>
            <div className="flex-1 space-y-2 max-h-52 overflow-y-auto">
              {cart.map(item => (
                <div key={item.partId} className="flex justify-between text-sm py-1 border-b border-surface-700/30">
                  <span className="flex-1 truncate mr-2">
                    {item.part.name} 
                    <span className="text-surface-400 ml-2">x {item.qty}</span>
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    NT$ {(Number(item.part.msrp_price) * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <hr className="my-3 border-surface-600" />
            {/* 🆕 現貨/代購拆分顯示 */}
            {instockItems.length > 0 && (
              <div className="flex justify-between text-sm text-surface-300">
                <span>📦 現貨小計（{instockItems.length} 項）</span>
                <span>NT$ {instockSubtotal.toLocaleString()}</span>
              </div>
            )}
            {preorderItems.length > 0 && (
              <div className="text-sm mt-2">
                <div className="flex justify-between text-yellow-300">
                  <span>🚢 代購小計（{preorderItems.length} 項）</span>
                  <span>NT$ {preorderSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-surface-400 mt-1">
                  <span>　└ 訂金 50%</span>
                  <span>NT$ {(preorderSubtotal * 0.5).toLocaleString()}</span>
                </div>
              </div>
            )}
            {/* 🆕 訂單加收費用（系統設定開啟時顯示） */}
            {feeConfig.enabled && (
              <div className="text-sm mt-2 text-surface-300">
                <div className="flex justify-between">
                  <span>🚚 訂單運費</span>
                  <span>NT$ {feeConfig.shippingFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>🧾 稅金（{Math.round(feeConfig.taxRate * 100)}%）</span>
                  <span>NT$ {Math.round(subtotal * feeConfig.taxRate).toLocaleString()}</span>
                </div>
              </div>
            )}
            <div className="flex justify-between text-sm text-blue-300 font-bold mt-3 pt-3 border-t border-surface-600">
              <span>💰 本次應付（匯款）金額</span>
              <span>NT$ {payableAmount.toLocaleString()}</span>
            </div>
            {hasPreorder && (
              <p className="text-xs text-surface-500 mt-1">
                尾款 NT$ {(grandTotal - payableAmount).toLocaleString()} 於代購到貨後通知補付
              </p>
            )}

            {/* 🆕 匯款帳戶資訊（API 回傳，非寫死前端） */}
            <div className="mt-4 bg-green-900/20 border border-green-600/30 rounded-xl p-3.5">
              <h3 className="text-sm font-bold text-green-300 mb-1.5">🏦 匯款帳戶資訊</h3>
              {bankInfo ? (
                <div className="text-sm text-green-100 space-y-0.5">
                  <p>銀行：<span className="font-mono font-bold">{bankInfo.bank_code}</span> (中國信託)</p>
                  <p>帳號：<span className="font-mono font-bold tracking-wider">{bankInfo.account_number}</span></p>
                  <p className="text-xs text-green-200/70">戶名請見下單完成頁面／LINE 通知</p>
                </div>
              ) : (
                <p className="text-xs text-surface-400">載入帳戶資訊中…</p>
              )}
            </div>

                <div className="flex justify-between text-lg font-bold mt-4">
              <span>商品總額（不含運費與稅金）</span>
              <span className="text-green-400">NT$ {subtotal.toLocaleString()}</span>
            </div>
            {orderFee > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span>運費＋稅金</span>
                <span>NT$ {orderFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold mt-4">
              <span>應付總額</span>
              <span className="text-green-400">NT$ {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* 右側：收貨資料 */}
          <div className="bg-surface-800/50 rounded-2xl p-5 border border-surface-700/50">
            <h2 className="font-bold mb-3 text-base">📬 收貨資料</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="ck-name" className="block text-xs text-surface-400 mb-1">收件人姓名 *</label>
                <input
                  id="ck-name" ref={nameRef} aria-invalid={!!fieldErrors.receiverName}
                  value={receiverName}
                  onChange={clearErr('receiverName')(setReceiverName)}
                  className={`w-full px-3 py-2.5 bg-surface-700 border rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:border-transparent transition text-sm ${fieldErrors.receiverName ? 'border-red-500 focus:ring-red-500' : 'border-surface-600 focus:ring-blue-500'}`}
                  placeholder="請輸入收件人姓名"
                />
                {fieldErrors.receiverName && <p className="text-red-400 text-xs mt-1">{fieldErrors.receiverName}</p>}
              </div>

              <div>
                <label htmlFor="ck-phone" className="block text-xs text-surface-400 mb-1">聯絡電話 *</label>
                <input
                  id="ck-phone" ref={phoneRef} type="tel" inputMode="tel" aria-invalid={!!fieldErrors.receiverPhone}
                  value={receiverPhone}
                  onChange={clearErr('receiverPhone')(setReceiverPhone)}
                  className={`w-full px-3 py-2.5 bg-surface-700 border rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:border-transparent transition text-sm ${fieldErrors.receiverPhone ? 'border-red-500 focus:ring-red-500' : 'border-surface-600 focus:ring-blue-500'}`}
                  placeholder="09xxxxxxxx"
                />
                {fieldErrors.receiverPhone && <p className="text-red-400 text-xs mt-1">{fieldErrors.receiverPhone}</p>}
              </div>

              <div>
                <label htmlFor="ck-address" className="block text-xs text-surface-400 mb-1">收貨地址 *</label>
                <input
                  id="ck-address" ref={addressRef} aria-invalid={!!fieldErrors.shippingAddress}
                  value={shippingAddress}
                  onChange={clearErr('shippingAddress')(setShippingAddress)}
                  className={`w-full px-3 py-2.5 bg-surface-700 border rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:border-transparent transition text-sm ${fieldErrors.shippingAddress ? 'border-red-500 focus:ring-red-500' : 'border-surface-600 focus:ring-blue-500'}`}
                  placeholder="請輸入完整收貨地址（縣市/路街/巷弄號）"
                />
                {fieldErrors.shippingAddress && <p className="text-red-400 text-xs mt-1">{fieldErrors.shippingAddress}</p>}
              </div>

              {/* 🆕 下單備註 */}
              <div>
                <label className="block text-xs text-surface-400 mb-1">
                  訂單備註<span className="text-surface-500">（選填，例：到貨時間、特殊交代）</span>
                </label>
                <textarea
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value.slice(0, 200))}
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2.5 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm resize-none"
                  placeholder="有什麼想告訴商家的嗎？（最多 200 字）"
                />
                <p className="text-[10px] text-right text-surface-600">{orderNote.length}/200</p>
              </div>
            </div>
          </div>
        </div>

        {/* 安裝服務 - 一行搞定 */}
        <div className="bg-surface-800/50 rounded-2xl px-4 py-3 mb-4 border border-purple-500/30">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔧</span>
              <label className="text-sm font-medium text-surface-300">需要安裝</label>
              <input
                type="checkbox"
                checked={needInstallation}
                onChange={(e) => {
                  setNeedInstallation(e.target.checked);
                  if (!e.target.checked) setSelectedVehicle('');
                }}
                className="w-4 h-4 rounded bg-surface-700 border-surface-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-surface-900"
              />
            </div>
            
            {needInstallation && (
              <>
                <span className="text-surface-600">|</span>
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <label className="text-xs text-surface-400 whitespace-nowrap">車輛</label>
                  <select
                    ref={vehicleRef} aria-invalid={!!fieldErrors.selectedVehicle}
                    value={selectedVehicle}
                    onChange={e => { setSelectedVehicle(e.target.value); if (fieldErrors.selectedVehicle) setFieldErrors(prev => { const n = { ...prev }; delete n.selectedVehicle; return n; }); }}
                    className={`flex-1 px-3 py-1.5 bg-surface-700 border rounded-lg text-white text-sm focus:ring-2 focus:border-transparent transition ${fieldErrors.selectedVehicle ? 'border-red-500' : 'border-surface-600 focus:ring-purple-500'}`}
                  >
                    <option value="">請選擇</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {getVehicleDisplayName(v)}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-yellow-400 whitespace-nowrap">
                  💰 安裝工資將於預約安裝時由車廠報價
                </span>
              </>
            )}
          </div>
          {fieldErrors.selectedVehicle && (
            <p className="text-red-400 text-xs mt-1.5">⚠️ {fieldErrors.selectedVehicle}</p>
          )}
        </div>

        {/* 注意事項 - 精簡 */}
        <div className="bg-yellow-900/20 rounded-xl px-4 py-2.5 mb-4 border border-yellow-600/30">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-yellow-200/80">
            <span>📋 訂單成立後請於 24 小時內完成付款</span>
            <span>•</span>
            <span>📦 現貨商品付款後 1-2 工作天出貨</span>
            {needInstallation && (
              <>
                <span>•</span>
                <span>🔧 安裝服務可從 [車廠預約] 查詢</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-green-600 hover:bg-green-500 active:scale-[0.98] rounded-xl font-bold text-lg transition disabled:opacity-50 shadow-lg shadow-green-600/20"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              處理中...
            </span>
          ) : (
            `確認下單 - NT$ ${payableAmount.toLocaleString()}`
          )}
        </button>
      </main>
    </div>
  );
}