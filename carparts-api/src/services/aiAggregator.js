// src/services/aiAggregator.js
const { queryDeepSeek, queryGemini, queryChatGPT } = require('./chromeAI');
const axios = require('axios');

const AI_BASE_URL = process.env.AI_BASE_URL || 'http://127.0.0.1:8080/v1';
const AI_MODEL = process.env.AI_MODEL || 'Qwen3.6-35B-A3B-Uncensored';

/**
 * 從可能包含額外文字的內容中提取 JSON 物件或陣列
 * 特別針對不完整 JSON 且包含 "parts" 陣列的情況
 */
function extractJson(text) {
  if (!text) return null;

  // 移除 markdown 標記
  let cleaned = text.replace(/```json|```/g, '').trim();

  // 嘗試直接解析
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 嘗試提取最外層的 { ... } 或 [ ... ]，採用括號深度匹配
  const start = cleaned.search(/[\[\{]/);
  if (start !== -1) {
    const candidate = cleaned.slice(start);
    let depth = 0;
    let end = -1;
    const openChar = candidate[0];
    const closeChar = openChar === '[' ? ']' : '}';
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end !== -1) {
      const jsonStr = candidate.slice(0, end + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {}
    } else {
      // 若閉合不完整，嘗試提取 "parts" 陣列
      const partsMatch = candidate.match(/"parts"\s*:\s*(\[[\s\S]*?)(?=\}\]?\s*$|\}\]?\s*[,\}])/);
      if (partsMatch) {
        let arrayStr = partsMatch[1];
        // 嘗試補全陣列
        try {
          // 嘗試補全閉合括號
          let bracketCount = 0;
          let inString = false;
          let escaped = false;
          for (let i = 0; i < arrayStr.length; i++) {
            const ch = arrayStr[i];
            if (escaped) { escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (!inString) {
              if (ch === '[') bracketCount++;
              else if (ch === ']') bracketCount--;
            }
          }
          // 如果陣列未閉合，補上對應的 ]
          while (bracketCount > 0) {
            arrayStr += ']';
            bracketCount--;
          }
          // 嘗試解析
          const partsArray = JSON.parse(arrayStr);
          return { parts: partsArray };
        } catch {}
      }
    }
  }

  // 最後嘗試用正則暴力提取 "parts" 陣列中的每個物件
  // 這種方法可能不精確，但可救回部分數據
  try {
    const partObjects = [];
    const objectRegex = /\{[^{}]*"sku"[^{}]*"name"[^{}]*"brand"[^{}]*\}/g;
    const objects = text.match(objectRegex);
    if (objects && objects.length > 0) {
      for (const objStr of objects) {
        try {
          const obj = JSON.parse(objStr);
          if (obj.name || obj.sku) partObjects.push(obj);
        } catch {}
      }
      if (partObjects.length > 0) return { parts: partObjects };
    }
  } catch {}

  // 記錄失敗
  console.warn('extractJson 失敗，原始內容前 500 字:', text.slice(0, 500));
  return null;
}

function median(numbers) {
  if (!numbers || numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isRelevant(part, query) {
  if (!query || !query.trim()) return true;
  const keywords = query.toLowerCase().split(/[\s,，、/]+/).filter(k => k.length > 1);
  const partText = [part.name, part.description, part.category, part.subcategory, part.brand]
    .filter(Boolean).join(' ').toLowerCase();
  return keywords.some(kw => partText.includes(kw));
}

function mergeParts(aiParts, query) {
  const validAiParts = aiParts.filter(ai => ai.parts && ai.parts.length > 0);
  if (validAiParts.length === 0) return [];

  const allParts = validAiParts.flatMap(ai => ai.parts);
  const relevantParts = allParts.filter(part => isRelevant(part, query));

  const grouped = new Map();
  for (const part of relevantParts) {
    const key = part.sku || part.name || JSON.stringify(part);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(part);
  }

  const mergedParts = [];
  for (const [, parts] of grouped.entries()) {
    const base = { ...parts[0] };
    const prices = parts.map(p => p.msrp_price).filter(v => v != null);
    const wholes = parts.map(p => p.wholesale_price).filter(v => v != null);
    base.msrp_price = median(prices);
    base.wholesale_price = median(wholes);

    for (const field of ['sku', 'name', 'brand', 'description', 'image_url', 'category', 'subcategory']) {
      for (const p of parts) {
        if (p[field] != null && p[field] !== '') {
          base[field] = p[field];
          break;
        }
      }
    }

    let longestDesc = base.description || '';
    for (const p of parts) {
      if (p.description && p.description.length > longestDesc.length) {
        longestDesc = p.description;
      }
    }
    base.description = longestDesc || null;
    base.price_note = prices.length > 1 ? `${Math.min(...prices)}-${Math.max(...prices)}` : null;
    mergedParts.push(base);
  }

  return mergedParts;
}

async function aggregateAIResults(promptForWeb, vehicleInfo, originalQuery = '') {
  const webAIs = [
    { name: 'DeepSeek', query: queryDeepSeek },
    { name: 'Gemini', query: queryGemini },
    { name: 'ChatGPT', query: queryChatGPT },
  ];

  const responses = [];
  for (const ai of webAIs) {
    try {
      const raw = await ai.query(promptForWeb);
      responses.push({ name: ai.name, raw });
      console.debug(`✅ ${ai.name} 查詢成功`);
    } catch (error) {
      console.warn(`⚠️ ${ai.name} 查詢失敗:`, error.message);
      responses.push({ name: ai.name, raw: null });
    }
  }

  // 解析每個 AI 的原始回應，提取 parts
  const aiParts = responses.map((res) => {
    let parts = [];
    if (res.raw) {
      const parsed = extractJson(res.raw);
      if (parsed && Array.isArray(parsed.parts)) {
        parts = parsed.parts;
      } else if (Array.isArray(parsed)) {
        parts = parsed;
      }
      if (parts.length === 0) {
        console.warn(`⚠️ ${res.name} 回覆無法解析為 JSON 或無 parts，原始內容前 200 字:`, res.raw.slice(0, 200));
      }
    }
    return { name: res.name, raw: res.raw, parts };
  });

  const totalParts = aiParts.reduce((sum, ai) => sum + ai.parts.length, 0);
  console.debug(`📊 各 AI 解析後零件總數: ${totalParts}`);

  let finalParts = [];

  const hasParts = aiParts.some(ai => ai.parts.length > 0);
  if (hasParts) {
    const partsSummary = aiParts.map(ai => ({
      source: ai.name,
      count: ai.parts.length,
      parts: ai.parts.slice(0, 10),
    }));

    const hermesPrompt = `你是一位專業的汽車零件整合專家。以下是三個 AI 推薦的零件清單（已解析為 JSON 陣列），請合併這些清單，去重、取中位數價格，並輸出最終的結構化 JSON。

【車輛資訊】${JSON.stringify(vehicleInfo)}

【各 AI 零件清單】
${JSON.stringify(partsSummary, null, 2)}

【輸出格式】
{
  "parts": [
    {
      "sku": "零件編號",
      "name": "零件名稱",
      "brand": "品牌",
      "description": "描述",
      "msrp_price": 建議售價(數字或 null),
      "wholesale_price": 批發價(數字或 null),
      "category": "標準分類",
      "subcategory": "子分類",
      "image_url": "圖片網址",
      "price_note": "價格範圍(可選)"
    }
  ]
}

請只輸出 JSON，不要任何解釋或標記。`;

    try {
      const hermesResponse = await axios.post(
        `${AI_BASE_URL}/chat/completions`,
        {
          model: AI_MODEL,
          messages: [{ role: 'user', content: hermesPrompt }],
          temperature: 0,
          max_tokens: 1500,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 150000, // 統一超時
        }
      );

      console.debug('📦 Hermes 回應狀態:', hermesResponse.status);

      const message = hermesResponse.data.choices?.[0]?.message;
      const content = message?.content || '';
      const reasoning = message?.reasoning_content || '';

      let finalJson = extractJson(content);
      if (!finalJson && reasoning.trim()) {
        console.debug('🔁 content 為空，嘗試從 reasoning_content 提取 JSON');
        finalJson = extractJson(reasoning);
      }

      if (finalJson && Array.isArray(finalJson.parts)) {
        finalParts = finalJson.parts;
        console.debug(`✅ Hermes 整合成功，產出 ${finalParts.length} 筆零件`);
      } else {
        console.warn('⚠️ Hermes 回傳無效格式，將使用後備合併');
      }
    } catch (error) {
      console.warn('⚠️ Hermes 整合失敗，使用後備合併:', error.message);
    }
  } else {
    console.warn('⚠️ 所有 AI 均無有效 parts，跳過 Hermes 整合');
  }

  if (finalParts.length === 0) {
    console.debug('🔄 執行後備合併（基於解析後的 parts）');
    finalParts = mergeParts(aiParts, originalQuery);
    console.debug(`📦 後備合併產出 ${finalParts.length} 筆零件`);
  }

  const filteredParts = finalParts.filter(part => isRelevant(part, originalQuery));
  if (filteredParts.length < finalParts.length) {
    console.debug(`🔍 相關性過濾: 移除 ${finalParts.length - filteredParts.length} 筆不相關零件`);
  }

  return { parts: filteredParts };
}

module.exports = { aggregateAIResults };