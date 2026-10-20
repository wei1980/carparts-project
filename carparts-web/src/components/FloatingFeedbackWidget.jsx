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

  // 管理後台（/admin）不顯示即時客服
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <>
      <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
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
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 rounded-full px-4 py-3 flex items-center gap-2 cursor-pointer transition-all hover:scale-105">
          💬 即時客服
        </button>
      </div>

      {/* 回報 Modal */}
      {feedbackOpen && <FloatingFeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
