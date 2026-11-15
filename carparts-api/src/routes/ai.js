// src/routes/ai.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/authMiddleware');
const axios = require('axios');

const prisma = require('../lib/prisma');

const AI_BASE_URL = process.env.AI_BASE_URL || 'http://127.0.0.1:8080/v1';
const AI_MODEL = process.env.AI_MODEL || 'Qwen3.6-35B-A3B-Uncensored';
// Hermes 的本地 llama-server（以及多數 OpenAI 相容端點）需要 Bearer token，
// 少了這個 header 一律回 401 Invalid API Key。
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_AUTH_HEADERS = {
  'Content-Type': 'application/json',
  ...(AI_API_KEY ? { Authorization: `Bearer ${AI_API_KEY}` } : {}),
};

// ============================================================
// 🔒 行照辨識限流：這個端點每次呼叫都會打一次 AI（真實成本），
//    先前完全沒有 auth 也沒有節流 → 任何人可匿名無限灌，把 AI 額度燒完。
//    以 IP 為 key，每 10 分鐘 10 次。
// ============================================================
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const aiRecognizeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ai-recognize:${ipKeyGenerator(req.ip)}`,
  message: { status: 429, error: '辨識次數過多，請稍後再試' },
});

// ==========================================
// 📷 記憶體上傳（辨識用，不落地）
// ==========================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // ⚠️ 必須帶 code：全域錯誤處理器依 code 決定回 4xx 並給人話，
    //    否則會落進 500「伺服器內部錯誤」，前端只看得懂「辨識失敗」。
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(Object.assign(new Error('僅接受圖片檔案'), { code: 'INVALID_FILE_TYPE' }));
  },
});

// ==========================================
// 🆕 改裝品照片儲存目錄（辨識完成後保存）
// ==========================================
const modPhotoDir = path.join(__dirname, '../../media/modifications');
if (!fs.existsSync(modPhotoDir)) fs.mkdirSync(modPhotoDir, { recursive: true });

const modPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: modPhotoDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `mod_${req.userId || 'anon'}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(Object.assign(new Error('僅接受圖片檔案'), { code: 'INVALID_FILE_TYPE' }));
  },
});

router.post('/recognize-part', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳圖片' });
    const base64 = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64}`;
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: AI_AUTH_HEADERS,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `你是一位專業的汽車改裝零件辨識專家。請辨識圖片中的改裝零件，並以 JSON 格式回覆。請務必回傳以下 JSON 結構，不要包含其他文字：{ "part_type": "煞車卡鉗/避震器/進氣套件/碟盤/輪圈/其他", "brand": "品牌名稱", "model": "型號", "confidence": 0.95 } 如果無法確定品牌或型號，請填入 "unknown"，confidence 給 0。只回傳 JSON。` },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('AI 服務錯誤:', response.status, JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'AI 服務暫時無法使用' });
    }
    const content = data.choices?.[0]?.message?.content || '';
    let result;
    try {
      const jsonStr = content.replace(/```json|```/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (e) {
      result = { error: '模型回覆格式錯誤', raw: content };
    }
    await prisma.partImageRecognitionLog.create({
      data: { userId: req.userId, imageUrl: imageUrl, rawResult: result, finalBrand: result.brand || null, finalModel: result.model || null, confidence: result.confidence || 0 },
    });
    res.json(result);
  } catch (error) {
    console.error('AI 辨識失敗:', error);
    res.status(500).json({ error: '辨識失敗',  });
  }
});

// ⚠️ 這個端點會呼叫 AI（有實際成本）：必須同時有 auth 與限流。
router.post('/recognize-registration', auth, aiRecognizeLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳行照圖片' });
    const base64 = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64}`;
    const prompt = `直接輸出 JSON，不要任何思考過程、不要 markdown 標記。你是一位專業的汽車監理資料辨識專家。請從這張行車執照（行照）圖片中，精確擷取以下欄位，並以嚴格的 JSON 格式回覆。若無法辨識某個欄位，請將該值設為 null。請務必回傳以下 JSON 結構：{ "licensePlate": "車牌號碼", "vin": "車身號碼 (VIN)", "make": "廠牌", "model": "車型", "year": 出廠年份, "engineNo": "引擎號碼" }`;
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: AI_AUTH_HEADERS,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.1,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('AI 服務錯誤:', response.status, JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'AI 服務暫時無法使用' });
    }
    let content = data.choices?.[0]?.message?.content || '';
    const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
    if (!content.trim() && reasoning.trim()) content = reasoning;
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      result = JSON.parse(jsonStr);
    } catch (e) {
      result = { error: '模型回覆格式錯誤', raw: content };
    }
    res.json(result);
  } catch (error) {
    console.error('行照辨識失敗:', error);
    res.status(500).json({ error: '辨識失敗',  });
  }
});

// ==========================================================
// 🆕 改裝品拍照辨識（用於我的愛車 → 目前改裝品）
// ==========================================================
router.post('/recognize-modification', auth, modPhotoUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳改裝品照片' });

    const { vehicleInfo, categoryHint } = req.body;
    const imageBase64 = fs.readFileSync(req.file.path).toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
    const photoUrl = `/media/modifications/${req.file.filename}`;

    const prompt = `直接輸出 JSON，不要任何思考過程、不要 markdown 標記。你是一位資深的汽車改裝品鑑定專家，精通全球改裝品牌。

你能辨識：
- 煞車：Brembo, AP Racing, Alcon, Endless, Project Mu, Dixcel, StopTech
- 避震：KW, Öhlins, Bilstein, Tein, HKS, BC Racing, Cusco, ST Suspensions
- 輪框：Rays, BBS, Work, Enkei, OZ, Advan, SSR, Volk
- 進氣：HKS, AEM, Injen, K&N, GruppeM, BMC
- 排氣：Akrapovič, HKS, Fujitsubo, Tomei, Invidia, Milltek
- 底盤：Cusco, Hardrace, Whiteline, Spoon, Ultra Racing

請辨識這張改裝品照片${vehicleInfo ? `（安裝於：${vehicleInfo}）` : ''}${categoryHint ? `（使用者標記大類：${categoryHint}）` : ''}。

請嚴格回傳以下 JSON（無法判斷的欄位填 null，不要瞎猜）：
{
  "category": "brakes|suspension|wheels|intake|exhaust|chassis|interior|electronics|other",
  "partType": "caliper|coilover|wheel_set|intake_kit|catback|其他具體類型（英文小寫）",
  "brand": "品牌英文原名",
  "model": "型號",
  "specJson": {
    "color": "顏色",
    "visibleMarkings": "照片上可見的文字或標誌",
    "estimatedSize": "估計尺寸（如煞車碟盤直徑）"
  },
  "confidence": 0.0-1.0 之間的數字,
  "reasoning": "20字內的判斷依據"
}`;

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: AI_AUTH_HEADERS,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('AI 服務錯誤:', response.status, JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'AI 服務暫時無法使用' });
    }

    let content = data.choices?.[0]?.message?.content || '';
    const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
    if (!content.trim() && reasoning.trim()) content = reasoning;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content.replace(/```json|```/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('AI 回傳解析失敗，原始內容:', content);
      return res.status(500).json({ error: 'AI 回傳格式無法解析', raw: content });
    }

    // 記錄辨識歷程（沿用現有的 log 表，失敗不影響回傳）
    try {
      await prisma.partImageRecognitionLog.create({
        data: {
          userId: req.userId,
          imageUrl: photoUrl,
          rawResult: result,
          finalBrand: result.brand || null,
          finalModel: result.model || null,
          confidence: result.confidence || 0,
        },
      });
    } catch (logErr) {
      console.warn('辨識記錄失敗（不影響回傳）:', logErr.message);
    }

    res.json({
      success: true,
      photoUrl,
      result: {
        category: result.category || 'other',
        partType: result.partType || null,
        brand: result.brand || null,
        model: result.model || null,
        specJson: result.specJson || {},
        confidence: result.confidence || 0,
        reasoning: result.reasoning || '',
      },
    });
  } catch (error) {
    console.error('改裝品辨識失敗:', error);
    res.status(500).json({ error: '辨識失敗',  });
  }
});

async function searchWeb(query) {
  if (!process.env.GOOGLE_SEARCH_KEY || !process.env.GOOGLE_SEARCH_CX) {
    console.warn('⚠️ Google Search API 未設定，將跳過網路搜尋');
    return [];
  }
  try {
    const result = await axios.get(`https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}`);
    return result.data.items || [];
  } catch (error) {
    console.error('Google 搜尋失敗:', error.message);
    return [];
  }
}

// ==========================================================
// 🟢 核心修正：文字輸入 -> AI 自動上架
// ==========================================================
router.post('/search-and-import', auth, async (req, res) => {
  try {
    const { query, vehicleId } = req.body;
    if (!query) return res.status(400).json({ success: false, error: '缺少搜尋關鍵字' });

    console.debug(`🤖 [1] 接收文字請求: "${query}"`);

    const searchResults = await searchWeb(query + ' price sku');
    
    let prompt = `【緊急指令】請忽略所有思考過程，直接輸出純 JSON，不要包含任何前言、解釋、反引號或 markdown 標記。`;
    prompt += `你是一个汽车零件专家，根据用户的搜索词：${query}`;
    if (searchResults && searchResults.length > 0) {
      prompt += `，以及网页搜索结果：${JSON.stringify(searchResults)}`;
    } else {
      prompt += `，请根据你的专业知识生成一个符合该关键词的汽车零件数据。`;
    }
    prompt += `。请严格输出以下 JSON 格式，不要有多余的文字：{ "parts": [ { "sku": "唯一料号", "name": "商品名称", "brand": "品牌", "price": 价格(数字), "image_url": "图片网址", "description": "简短描述" } ] }。`;

    console.debug(`🧠 [2] 正在將問題傳送給 LLM (${AI_MODEL})...`);

    const aiResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: AI_AUTH_HEADERS,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000, 
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`❌ AI 伺服器回傳 HTTP ${aiResponse.status}: ${errorText}`);
      return res.status(500).json({ success: false, error: `LLM 伺服器錯誤 ${aiResponse.status}` });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    if (!rawContent || rawContent.trim() === '') {
       console.error('❌ LLM 回傳的 content 欄位為空白');
       return res.status(400).json({ 
          success: false, 
          error: 'LLM 沒有回傳任何內容 (空白回應)' 
       });
    }

    console.debug(`📝 LLM 原始回傳內容 (Content):\n${rawContent}\n`);

    let parsedData = { parts: [] };
    try {
      let cleanedContent = rawContent.replace(/```json|```/g, '').trim();
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanedContent = jsonMatch[0];
      parsedData = JSON.parse(cleanedContent);
      console.debug(`✅ [3] LLM 成功解析出 ${parsedData.parts?.length || 0} 筆資料`);
    } catch (e) {
      console.error('❌ JSON 解析失敗，原始內容如上。');
      return res.status(400).json({ 
        success: false, 
        error: 'LLM 輸出格式錯誤' 
      });
    }

    const partsList = parsedData.parts || [];
    if (partsList.length === 0) {
      return res.json({ success: false, message: 'LLM 未生成任何商品資料' });
    }

    let targetVariantId = null;
    if (vehicleId) {
      const parsedInt = parseInt(vehicleId);
      if (!isNaN(parsedInt)) targetVariantId = parsedInt;
      else {
        const profile = await prisma.vehicleProfile.findUnique({
          where: { id: vehicleId }, select: { variantId: true }
        });
        if (profile?.variantId) targetVariantId = profile.variantId;
      }
    }

    let createdCount = 0;
    for (const item of partsList) {
      const finalSku = item.sku || `AI-${Date.now()}`;
      const existing = await prisma.part.findUnique({ where: { sku: finalSku } });
      if (!existing) {
        const newPart = await prisma.part.create({
          data: {
            sku: finalSku,
            name: item.name || query,
            brand: item.brand || '未知品牌',
            msrp_price: parseFloat(item.price) || 0,
            image_url: item.image_url || '',
            stock_qty: 0,
          }
        });
        if (targetVariantId) {
          await prisma.partCompatibility.create({
            data: { part_id: newPart.id, vehicle_id: targetVariantId }
          });
        }
        createdCount++;
      }
    }

    res.json({ success: true, message: `已成功自動上架 ${createdCount} 個商品`, partCount: createdCount });

  } catch (error) {
    console.error('❌ AI 自動上架發生錯誤:', error);
    res.status(500).json({ success: false, error: '伺服器處理 AI 請求失敗' });
  }
});

module.exports = router;