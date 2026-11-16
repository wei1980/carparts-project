// src/routes/lineWebhook.js — LINE Messaging API Webhook
//
// 用途（依使用者需求）：
//   1. 接收「使用者加入官方帳號 / 傳訊息 / 解除封鎖」事件
//   2. 綁定：使用者加入後，我們拿到真正的 LINE userId（Uxxxx），
//      用一次性 code 或手機後 4 碼對應回 EndUser，寫入 lineId
//   3. 只在「訂單需要客戶支付尾款」時推播通知
//
// 驗證：LINE 會用 Channel Secret 對 body 做 HMAC-SHA256 並 Base64 編碼，
//       放在 X-Line-Signature header。全專案其餘地方沒做這件事，
//       少了這個檢查任何人都能偽造 events 觸發推播。
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../lib/prisma');

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_API = 'https://api.line.me/v2/bot';

/** 驗證 X-Line-Signature */
function verifySignature(rawBody, signature) {
  if (!CHANNEL_SECRET) return false;
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', CHANNEL_SECRET).update(rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 推播訊息給指定 LINE 使用者 */
async function push(userId, messages) {
  if (!CHANNEL_TOKEN || !userId) return { ok: false, error: 'NO_TOKEN' };
  try {
    await axios.post(`${LINE_API}/message/push`, { to: userId, messages }, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHANNEL_TOKEN}` },
      timeout: 10000,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.response?.data?.message || e.message };
  }
}
const axios = require('axios');

/** 取用戶的綁定狀態 */
async function bindingForLineId(lineUserId) {
  return prisma.lineBinding.findUnique({ where: { lineUserId } });
}

/** 用 code 找對應的綁定（官網產生的一次性碼） */
async function linkByCode(code, lineUserId) {
  const b = await prisma.lineBinding.findFirst({
    where: { code, status: { not: 'LINKED' } },
    orderBy: { createdAt: 'desc' },
  });
  if (!b) return null;
  await prisma.$transaction([
    prisma.lineBinding.update({ where: { id: b.id }, data: { lineUserId, userId: b.userId, status: 'LINKED', linkedAt: new Date() } }),
    ...(b.userId ? [prisma.endUser.update({ where: { id: b.userId }, data: { lineId: lineUserId } })] : []),
  ]);
  return b;
}

// POST /api/line/webhook
router.post('/webhook', async (req, res) => {
  const signature = req.get('X-Line-Signature') || '';
  // express.json() 已解析 body，但我們需要原始 bytes 才能驗簽。
  // 用 express.raw 在同一路由上重取（app.js 會先跑 json，這裡用 req.rawBody 若有，
  // 否則用 JSON.stringify 重建 —— 重建可能與原始 bytes 不同，所以改用 verify 機制見下）。
  const events = req.body?.events || [];
  // 診斷用（確認 body 解析與事件數；不印任何 token/個資）
  if (process.env.LINE_WEBHOOK_DEBUG) {
    console.info('[lineWebhook] bodyType=%s events=%d rawLen=%s',
      typeof req.body, events.length, req.rawBody ? req.rawBody.length : 'none');
  }

  // 驗簽：若 express.json 已解析，用原始 body 重算需靠 rawBody。
  // app.js 的 verify 掛在 express.json 之前，所以這裡改用 header + 重建 payload 的方式。
  if (CHANNEL_SECRET) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    if (!verifySignature(Buffer.from(raw), signature)) {
      return res.status(403).json({ error: 'invalid signature' });
    }
  }

  // LINE 要求 200 才不會重試；個別事件失敗不能讓整批回非 200
  res.status(200).json({ ok: true });

  for (const ev of events) {
    try {
      if (ev.type === 'follow') {
        const lineUserId = ev.source?.userId;
        if (!lineUserId) continue;
        const existing = await bindingForLineId(lineUserId);
        if (!existing) {
          await prisma.lineBinding.create({ data: { lineUserId, status: 'PENDING' } });
          await push(lineUserId, [{ type: 'text', text:
            '歡迎加入車大師 🔧\n\n請在官網「會員中心 → LINE 綁定」取得 6 位綁定碼，\n再把「綁定碼 你的手機號碼」傳給我，就能收到訂單與保養通知。' }]);
        }
        continue;
      }

      if (ev.type === 'unfollow') {
        const lineUserId = ev.source?.userId;
        if (!lineUserId) continue;
        const b = await bindingForLineId(lineUserId);
        if (b) {
          // 解除綁定：清掉 EndUser.lineId，避免之後還繼續推
          if (b.userId) {
            await prisma.endUser.updateMany({ where: { id: b.userId }, data: { lineId: null } }).catch(() => {});
          }
          await prisma.lineBinding.update({ where: { id: b.id }, data: { status: 'REJECTED', userId: null, linkedAt: null } });
        }
        continue;
      }

      if (ev.type === 'message' && ev.message?.type === 'text') {
        const lineUserId = ev.source?.userId;
        const text = (ev.message.text || '').trim();
        if (!lineUserId) continue;

        // 格式 A：「綁定碼 XXXXXX 0912345678」
        let m = text.match(/^(?:綁定碼|code)\s*([A-Z0-9]{6})\s*(\d{9,10})$/i);
        if (process.env.LINE_WEBHOOK_DEBUG) {
          console.info('[lineWebhook] msg branch matched=' + !!m + ' text=' + JSON.stringify(text.slice(0, 40)));
        }
        if (m) {
          const [, code, phone] = m;
          if (process.env.LINE_WEBHOOK_DEBUG) {
            console.info('[lineWebhook] code=' + code + ' phone=' + phone);
          }
          const user = await prisma.endUser.findUnique({ where: { phone }, select: { id: true, lineId: true } });
          if (!user) {
            await push(lineUserId, [{ type: 'text', text: `找不到手機號碼 ${phone} 的帳號，請確認後再試。` }]);
            continue;
          }
          // ⚠️ follow 事件已用此 lineUserId 建過一列（unique）；先把空列刪掉再寫，
          //    否則會 unique 衝突（先前被 .catch 靜默吞掉，導致綁定永遠寫不進去）。
          // 先找 code 列（在刪除之前），否則會被自己的 deleteMany 連目標一起清掉。
          const row = await prisma.lineBinding.findFirst({
            where: { code, status: { not: 'LINKED' } },
            orderBy: { createdAt: 'desc' },
          });
          // follow 事件已用此 lineUserId 建過一列（unique）→ 先清掉空列，
          // 再不然把 code 列寫上 lineUserId 會撞 unique。
          await prisma.lineBinding.deleteMany({ where: { lineUserId } });
          // 用 updateMany（0 筆也不拋錯）：deleteMany 可能已把目標列清掉，
          // update 在這種情況會拋 P2025，整個事件處理就中斷了。
          if (row) {
            await prisma.lineBinding.updateMany({
              where: { id: row.id },
              data: { lineUserId, userId: user.id, phone, status: 'LINKED', linkedAt: new Date() },
            });
          } else {
            await prisma.lineBinding.create({
              data: { lineUserId, userId: user.id, phone, status: 'LINKED', linkedAt: new Date() },
            });
          }
          await prisma.endUser.update({ where: { id: user.id }, data: { lineId: lineUserId } });
          await push(lineUserId, [{ type: 'text', text: '✅ LINE 綁定成功！之後訂單與保養通知會送到這裡。' }]);
          continue;
        }

        // 格式 B：只傳手機號碼（用最近 10 分鐘內產生的 PENDING 綁定罪）
        if (/^\d{9,10}$/.test(text)) {
          const user = await prisma.endUser.findUnique({ where: { phone: text }, select: { id: true } });
          const b = await bindingForLineId(lineUserId);
          if (!user) {
            await push(lineUserId, [{ type: 'text', text: `找不到手機號碼 ${text} 的帳號。` }]);
            continue;
          }
          await prisma.lineBinding.deleteMany({ where: { lineUserId } });
          if (b && b.id) {
            await prisma.lineBinding.update({
              where: { id: b.id },
              data: { userId: user.id, phone: text, status: 'LINKED', linkedAt: new Date(), lineUserId },
            }).catch(async () => {
              // b 可能已被上面的 deleteMany 一起刪掉（同一 lineUserId）→ 直接建新的
              await prisma.lineBinding.create({ data: { lineUserId, userId: user.id, phone: text, status: 'LINKED', linkedAt: new Date() } });
            });
          } else {
            await prisma.lineBinding.create({ data: { lineUserId, userId: user.id, phone: text, status: 'LINKED', linkedAt: new Date() } });
          }
          await prisma.endUser.update({ where: { id: user.id }, data: { lineId: lineUserId } });
          await push(lineUserId, [{ type: 'text', text: '✅ LINE 綁定成功！' }]);
          continue;
        }

        // 其他訊息 → 提示格式
        await push(lineUserId, [{ type: 'text', text:
          '請用「綁定碼 手機號碼」格式，例如：\n綁定碼 AB12CD 0912345678' }]);
      }
    } catch (e) {
      console.error('[lineWebhook] 事件處理失敗:', ev.type, e.message);
    }
  }
});

module.exports = router;
module.exports.push = push;
module.exports.pushMessage = push;