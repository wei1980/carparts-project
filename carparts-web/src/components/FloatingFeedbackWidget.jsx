// src/components/FloatingFeedbackWidget.jsx 全站右下角常駐「即時客服」懸浮按鈕 + 對話視窗
// 架構（雙向）：
//   去程：訪客訊息 → POST /api/support/messages → Hermes webhook（HMAC V2）→ Telegram
//   回程：客服於 Telegram 回覆含「會話：XXXXXX」的轉發訊息 → Hermes adapter
//        → POST /api/support/replies（內部密碼）→ SSE 推播到此對話窗
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { consumerClient as api } from '../api/client';
import FloatingFeedbackModal from './FeedbackModal';

const CONV_KEY = 'supportConversation';

function loadConv() {
  try { return JSON.parse(localStorage.getItem(CONV_KEY) || 'null'); } catch { return null; }
}
function saveConv(c) {
  try { localStorage.setItem(CONV_KEY, JSON.stringify(c)); } catch { /* 隱私模式 */ }
}
// DB 訊息列 → 氣泡
function toBubble(m) {
  return { id: m.id, from: m.direction === 'OUT' ? 'agent' : 'me', text: m.text };
}

export default function FloatingFeedbackWidget() {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [conv, setConv] = useState(loadConv);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const location = useLocation();
  const panelRef = useRef(null);
  const scrollRef = useRef(null);

  // 開啟對話視窗（首次開啟時建立會話）
  const openChat = useCallback(async () => {
    setChatOpen(true);
    if (conv || connecting) return;
    setConnecting(true);
    try {
      const res = await api.post('/support/conversations', {
        name: user?.name || '',
        phone: user?.phone || '',
        page: window.location.pathname,
      });
      const c = { conversationId: res.data.conversationId, code: res.data.code, token: res.data.token };
      setConv(c);
      saveConv(c);
    } catch (err) {
      console.error('[support] 開會話失敗:', err?.response?.data || err.message);
    } finally {
      setConnecting(false);
    }
  }, [conv, connecting, user]);

  // 點擊外部 / Escape 關閉對話視窗
  useEffect(() => {
    if (!chatOpen) return;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setChatOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setChatOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [chatOpen]);

  // SSE 訂閱：先收歷史訊息，再即時接收客服回覆
  useEffect(() => {
    if (!chatOpen || !conv) return;
    let es = null;
    try {
      es = new EventSource(`/api/support/stream?conversationId=${conv.conversationId}&token=${conv.token}`);
      es.addEventListener('history', (e) => {
        try { setMessages(JSON.parse(e.data).map(toBubble)); } catch { /* 壞幀 */ }
      });
      es.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, toBubble(msg)]));
        } catch { /* 壞幀 */ }
      });
    } catch { /* EventSource 不支援時靜默降級 */ }
    return () => { if (es) es.close(); };
  }, [chatOpen, conv]);

  // 新訊息自動捲到底
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, chatOpen, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !conv) return;
    setSending(true);
    setInput('');
    const tempId = 'tmp-' + Date.now();
    setMessages((m) => [...m, { id: tempId, from: 'me', text }]);
    try {
      const res = await api.post('/support/messages', {
        conversationId: conv.conversationId,
        token: conv.token,
        name: user?.name || '',
        phone: user?.phone || '',
        message: text,
        page: window.location.pathname,
      });
      // 伺服器開了新會話（本地會話失效時）→ 更新並重新訂閱
      if (res.data?.conversationId && res.data.conversationId !== conv.conversationId) {
        const c = { conversationId: res.data.conversationId, code: res.data.code, token: res.data.token };
        setConv(c);
        saveConv(c);
      }
    } catch (err) {
      const reason = err?.response?.data?.error || '連線失敗';
      setMessages((m) => [
        ...m.filter((x) => x.id !== tempId),
        { id: tempId + '-err', from: 'err', text: `⚠️ 訊息送出失敗（${reason}），請再試一次` },
      ]);
    } finally {
      setSending(false);
    }
  };

  // 管理後台、車廠後台與登入頁不顯示車主即時客服
  const GARAGE_PORTAL_PATHS = [
    '/garage/login', '/garage/dashboard', '/garage/calendar', '/garage/customers',
    '/garage/work-orders', '/garage/settings', '/garage/reports', '/garage/appointments',
  ];
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    GARAGE_PORTAL_PATHS.some((p) => location.pathname.startsWith(p))
  ) return null;

  // 車廠詳情頁有固定的預約 CTA，客服球往上移避免重疊
  const hasStickyBookingCta = /^\/garages\/[^/]+\/?$/.test(location.pathname);

  return (
    <>
      <div
        ref={panelRef}
        className={`fixed ${hasStickyBookingCta ? 'bottom-44' : 'bottom-24'} right-4 z-40 flex flex-col items-end xl:bottom-6 xl:right-6`}
      >
        {/* 對話視窗 */}
        {chatOpen && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-80 max-w-[calc(100vw-3rem)] mb-3 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3">
            {/* 標頭 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${conv ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-sm font-bold text-slate-100">即時客服</span>
                {conv?.code && <span className="text-[10px] text-slate-500 font-mono">會話 {conv.code}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setChatOpen(false); setFeedbackOpen(true); }}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-700/60 transition"
                  title="意見與瑕疵回報">
                  回報
                </button>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label="關閉"
                  className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-700/60 transition">
                  ✕
                </button>
              </div>
            </div>

            {/* 訊息列表 */}
            <div ref={scrollRef} className="flex-1 min-h-[220px] max-h-[50vh] overflow-y-auto px-3 py-3 space-y-2">
              {connecting && (
                <p className="text-xs text-slate-400 text-center py-6">連線中…</p>
              )}
              {!connecting && !conv && (
                <p className="text-xs text-slate-400 text-center py-6">連線失敗，請關閉後重試</p>
              )}
              {!connecting && conv && messages.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6 leading-relaxed">
                  有問題隨時問我們 🛵<br />訊息會直接轉發給客服人員
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug break-words ${
                    m.from === 'me'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : m.from === 'agent'
                        ? 'bg-emerald-700 text-white rounded-bl-sm'
                        : 'bg-red-900/80 text-red-100 rounded-bl-sm'
                  }`}>
                    {m.from === 'agent' && (
                      <span className="block text-[10px] text-emerald-300/80 mb-0.5">客服</span>
                    )}
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 text-slate-400 px-3 py-2 rounded-2xl text-xs">傳送中…</div>
                </div>
              )}
            </div>

            {/* 輸入列 */}
            <div className="p-3 border-t border-slate-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={conv ? '輸入訊息…' : '等待連線…'}
                maxLength={2000}
                disabled={!conv}
                className="flex-1 min-w-0 bg-slate-900/70 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || sending || !conv}
                aria-label="傳送訊息"
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm font-bold transition">
                傳送
              </button>
            </div>
          </div>
        )}

        {/* 主按鈕 */}
        <button
          type="button"
          onClick={openChat}
          aria-label="即時客服"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition-all hover:scale-105 hover:bg-blue-500 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span className="hidden sm:inline">即時客服</span>
        </button>
      </div>

      {/* 回報 Modal */}
      {feedbackOpen && <FloatingFeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
