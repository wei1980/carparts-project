// src/routes/support.js — 即時客服雙向通道
// 去程：官網訊息 → POST /messages → Hermes webhook（HMAC V2）→ Telegram
// 回程：Telegram 回覆 → Hermes adapter → POST /replies（內部密碼）→ SSE 推播到官網
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const WEBHOOK_URL = process.env.HERMES_WEBHOOK_URL || 'http://127.0.0.1:8644/webhooks/carparts-live-chat';
const WEBHOOK_SECRET = process.env.HERMES_WEBHOOK_SECRET || '';
// 內部回覆端點密碼（Hermes adapter 轉送客服回覆時用）
const INTERNAL_SECRET = process.env.SUPPORT_INTERNAL_SECRET || '';

// 會話碼：6 字元大寫字母+數字（排除易混淆的 I/L/O/0/1）
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

// 簡易記憶體限速：每 IP 每分鐘最多 5 則（Hermes 端另有 per-route 限速）
const rateHits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of rateHits) {
    const fresh = arr.filter((t) => now - t < 60000);
    if (fresh.length) rateHits.set(ip, fresh);
    else rateHits.delete(ip);
  }
}, 60000).unref();

// SSE 訂閱者：conversationId → Set<res>
const sseClients = new Map();

function broadcast(conversationId, message) {
  const set = sseClients.get(conversationId);
  if (!set || !set.size) return;
  const frame = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
  for (const res of set) {
    try { res.write(frame); } catch { /* 串流已關閉 */ }
  }
}

/** 以 Hermes webhook HMAC V2 簽章轉發訊息：X-Webhook-Signature-V2 = hex HMAC-SHA256("<timestamp>.<body>") */
function deliverToHermes(payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(Buffer.concat([Buffer.from(timestamp), Buffer.from('.'), body]))
      .digest('hex');

    const url = new URL(WEBHOOK_URL);
    const req = http.request(
      {
        host: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
          'X-Webhook-Signature-V2': signature,
          'X-Webhook-Timestamp': timestamp,
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          if (res.statusCode === 200) resolve(true);
          else reject(new Error(`webhook HTTP ${res.statusCode} ${text.slice(0, 120)}`));
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('webhook 逾時')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** 驗證並取得會話（conversationId + token 兩者皆須符合） */
async function resolveConversation(conversationId, token) {
  if (typeof conversationId !== 'string' || typeof token !== 'string' || !conversationId || !token) return null;
  const conv = await prisma.supportConversation.findUnique({ where: { id: conversationId } });
  if (!conv || conv.token !== token) return null;
  return conv;
}

/** 開新會話（訪客），回傳含 code/token 的會話 */
async function createConversation({ name, phone, page } = {}) {
  let code;
  do {
    code = genCode();
  } while (await prisma.supportConversation.findUnique({ where: { code } }));
  return prisma.supportConversation.create({
    data: {
      code,
      token: crypto.randomBytes(24).toString('hex'),
      customerName: typeof name === 'string' && name.trim() ? name.trim().slice(0, 50) : null,
      customerPhone: typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 20) : null,
      page: typeof page === 'string' && page.trim() ? page.trim().slice(0, 200) : null,
    },
  });
}

// POST /api/support/conversations — 開會話（訪客開啟對話窗時呼叫）
// body: { name?, phone?, page? }
router.post('/conversations', async (req, res) => {
  try {
    const { name, phone, page } = req.body || {};
    const conv = await createConversation({ name, phone, page });
    res.status(201).json({ conversationId: conv.id, code: conv.code, token: conv.token });
  } catch (error) {
    console.error('[support] 開會話失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/support/messages — 客戶訊息（去程 → Hermes → Telegram）
// body: { conversationId?, token?, name?, phone?, message, page? }
// 未帶有效會話時自動開新會話並回傳，供前端保存
router.post('/messages', async (req, res) => {
  try {
    const { conversationId, token, name, phone, message, page } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: '請輸入訊息內容' });
    }
    const text = message.trim().slice(0, 2000);

    // 限速
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    const recent = (rateHits.get(ip) || []).filter((t) => now - t < 60000);
    if (recent.length >= 5) {
      return res.status(429).json({ error: '發送太頻繁，請稍後再試' });
    }
    recent.push(now);
    rateHits.set(ip, recent);

    // 會話：有效就用、無效/未帶就開新的
    let conv = await resolveConversation(conversationId, token);
    if (!conv) conv = await createConversation({ name, phone, page });

    // 存訊息（IN）
    await prisma.supportMessage.create({
      data: { conversationId: conv.id, direction: 'IN', author: conv.customerName || '訪客', text },
    });

    // 回填會話頭（首次出現的姓名/電話/頁面）
    const patch = {};
    if (!conv.customerName && typeof name === 'string' && name.trim()) patch.customerName = name.trim().slice(0, 50);
    if (!conv.customerPhone && typeof phone === 'string' && phone.trim()) patch.customerPhone = phone.trim().slice(0, 20);
    if (!conv.page && typeof page === 'string' && page.trim()) patch.page = page.trim().slice(0, 200);
    if (Object.keys(patch).length) {
      conv = { ...conv, ...(await prisma.supportConversation.update({ where: { id: conv.id }, data: patch })) };
    }

    if (!WEBHOOK_SECRET) {
      console.warn('[support] HERMES_WEBHOOK_SECRET 未設定，訊息無法轉發');
      return res.status(502).json({ error: '訊息轉發服務尚未設定' });
    }

    const payload = {
      customer_name: conv.customerName || '訪客（未登入）',
      customer_phone: conv.customerPhone || '未提供',
      page: conv.page || '',
      conversation_code: conv.code,
      conversation_id: conv.id,
      sent_at: new Date().toISOString(),
      message: text,
    };

    try {
      await deliverToHermes(payload);
      res.status(201).json({
        ok: true, delivered: true,
        conversationId: conv.id, code: conv.code, token: conv.token,
      });
    } catch (err) {
      console.error('[support] 轉發 Hermes webhook 失敗:', err.message);
      res.status(502).json({ error: '訊息轉發失敗，請稍後再試' });
    }
  } catch (error) {
    console.error('[support] 即時客服訊息處理失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/support/replies — 客服回覆（回程：Hermes adapter 轉送，僅限內部）
// headers: X-Internal-Secret
// body: { code, text }
router.post('/replies', async (req, res) => {
  try {
    if (!INTERNAL_SECRET || req.get('X-Internal-Secret') !== INTERNAL_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { code, text } = req.body || {};
    if (typeof code !== 'string' || !/^[A-Z0-9]{6}$/.test(code)) {
      return res.status(400).json({ error: '會話碼格式錯誤' });
    }
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '回覆內容不可空白' });
    }
    const conv = await prisma.supportConversation.findUnique({ where: { code } });
    if (!conv) {
      return res.status(404).json({ error: '會話不存在' });
    }
    const msg = await prisma.supportMessage.create({
      data: { conversationId: conv.id, direction: 'OUT', author: '客服', text: text.trim().slice(0, 4000) },
    });
    broadcast(conv.id, msg);
    res.status(201).json({ ok: true, conversationId: conv.id, message: msg });
  } catch (error) {
    console.error('[support] 客服回覆處理失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/support/conversations/:code — 查會話是否存在（內部：Hermes adapter 路由前預檢）
router.get('/conversations/:code', async (req, res) => {
  try {
    if (!INTERNAL_SECRET || req.get('X-Internal-Secret') !== INTERNAL_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { code } = req.params;
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      return res.status(400).json({ error: '會話碼格式錯誤' });
    }
    const conv = await prisma.supportConversation.findUnique({
      where: { code },
      select: { id: true, code: true, status: true },
    });
    if (!conv) {
      return res.status(404).json({ error: '會話不存在' });
    }
    res.status(200).json({ ok: true, conversation: conv });
  } catch (error) {
    console.error('[support] 查會話失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/support/stream — SSE 訂閱會話（客服回覆即時推播到官網）
// query: conversationId, token
router.get('/stream', async (req, res) => {
  let heartbeat;
  try {
    const { conversationId, token } = req.query;
    const conv = await resolveConversation(conversationId, token);
    if (!conv) {
      return res.status(401).json({ error: '會話驗證失敗' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');

    // 先送歷史訊息，再訂閱即時訊息
    const history = await prisma.supportMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.write(`event: history\ndata: ${JSON.stringify(history)}\n\n`);

    const set = sseClients.get(conv.id) || new Set();
    set.add(res);
    sseClients.set(conv.id, set);

    heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* 已關閉 */ } }, 25000);
    req.on('close', () => {
      clearInterval(heartbeat);
      set.delete(res);
      if (!set.size) sseClients.delete(conv.id);
    });
  } catch (error) {
    console.error('[support] SSE 串流失敗:', error);
    if (heartbeat) clearInterval(heartbeat);
    try { res.end(); } catch { /* 已關閉 */ }
  }
});

module.exports = router;
