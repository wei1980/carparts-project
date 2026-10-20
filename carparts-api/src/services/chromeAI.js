// src/services/chromeAI.js
const puppeteer = require('puppeteer-core');

const CHROME_DEBUG_URL = 'http://localhost:9222';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getOrCreatePage(browser, url) {
  const targetDomain = new URL(url).hostname;
  const pages = await browser.pages();
  for (const page of pages) {
    const pageUrl = page.url();
    if (pageUrl.includes(targetDomain)) {
      if (!pageUrl.includes(url)) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      }
      return page;
    }
  }
  const newPage = await browser.newPage();
  await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return newPage;
}

async function clearAndType(page, selector, text) {
  await page.waitForSelector(selector, { visible: true, timeout: 15000 });
  await page.bringToFront();

  // 清空輸入框
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');

  // 使用原生 setter 設定完整文字
  const success = await page.evaluate((sel, value) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el.isContentEditable) {
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      return false;
    }
    return true;
  }, selector, text);

  if (!success) {
    // 後備：使用剪貼簿
    const { execSync } = require('child_process');
    execSync(`echo ${text.replace(/"/g, '\\"')} | clip`, { shell: 'cmd.exe' });
    await page.keyboard.down('Control');
    await page.keyboard.press('V');
    await page.keyboard.up('Control');
  }

  await sleep(500);
  await page.keyboard.press('Enter');
  console.debug('📤 問題已送出');
}

/**
 * 等待 AI 產生新回覆，支援更穩定的偵測與後備機制
 */
async function waitForNewResponse(page, selectors, previousCount, timeoutMs = 60000) {
  const startTime = Date.now();
  let lastText = '';
  let stableCount = 0;
  let response = '';

  async function getMessages() {
    return await page.evaluate((sels) => {
      let elements = [];
      for (const sel of sels) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
          elements = Array.from(found);
          break;
        }
      }
      const texts = elements.map(el => el.innerText.trim()).filter(t => t.length > 0);
      return { count: texts.length, lastText: texts[texts.length - 1] || '' };
    }, selectors);
  }

  while (Date.now() - startTime < timeoutMs) {
    const currentInfo = await getMessages();

    if (currentInfo.count > previousCount) {
      const currentText = currentInfo.lastText;
      if (currentText.length >= 20) {
        if (currentText === lastText) {
          stableCount++;
          if (stableCount >= 3) {
            response = currentText;
            break;
          }
        } else {
          stableCount = 0;
          lastText = currentText;
        }
      } else {
        stableCount = 0;
        lastText = currentText;
      }
    }
    await sleep(1000);
  }

  if (!response) {
    console.warn('⏱️ 等待超時，嘗試取用最後一條訊息作為後備');
    try {
      const fallbackInfo = await getMessages();
      if (fallbackInfo.count > previousCount && fallbackInfo.lastText.length >= 20) {
        response = fallbackInfo.lastText;
        console.debug('✅ 後備取得回覆，長度:', response.length);
      } else {
        const allText = await page.evaluate((sels) => {
          for (const sel of sels) {
            const elements = document.querySelectorAll(sel);
            if (elements.length > 0) {
              const last = Array.from(elements).pop();
              return last ? last.innerText.trim() : '';
            }
          }
          return '';
        }, selectors);
        if (allText && allText.length > 20) {
          response = allText;
          console.debug('✅ 後備直接抓取到最後訊息，長度:', response.length);
        }
      }
    } catch (err) {
      console.warn('後備取訊息失敗:', err.message);
    }
  }

  return response;
}

/**
 * 帶有重試機制的查詢
 */
async function queryAIWebsiteWithRetry(url, query, inputSelectors, responseSelectors, timeoutMs = 60000, retries = 1) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await queryAIWebsite(url, query, inputSelectors, responseSelectors, timeoutMs);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ 查詢 ${url} 嘗試 ${attempt+1} 失敗:`, error.message);
      if (attempt < retries) {
        console.debug('🔄 等待 5 秒後重試...');
        await sleep(5000);
        // 嘗試重新連接 Chrome
        try {
          await puppeteer.connect({ browserURL: CHROME_DEBUG_URL, defaultViewport: null, protocolTimeout: 180000 });
        } catch {}
      }
    }
  }
  throw lastError;
}

async function queryAIWebsite(url, query, inputSelectors, responseSelectors, timeoutMs = 60000) {
  const browser = await puppeteer.connect({ 
    browserURL: CHROME_DEBUG_URL, 
    defaultViewport: null,
    protocolTimeout: 180000  // 增加協議超時
  });
  const page = await getOrCreatePage(browser, url);

  try {
    await page.waitForSelector('body', { timeout: 15000 });

    let inputSelector = null;
    for (const sel of inputSelectors) {
      try {
        await page.waitForSelector(sel, { visible: true, timeout: 15000 });
        inputSelector = sel;
        break;
      } catch {}
    }
    if (!inputSelector) throw new Error(`找不到輸入框 (${url})`);

    // 記錄當前訊息數量
    const previousCount = await page.evaluate((sels) => {
      for (const sel of sels) {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          return elements.length;
        }
      }
      return 0;
    }, responseSelectors);

    console.debug(`📊 輸入前訊息數量: ${previousCount}`);

    await clearAndType(page, inputSelector, query);

    const effectiveTimeout = timeoutMs || 90000;
    const response = await waitForNewResponse(page, responseSelectors, previousCount, effectiveTimeout);
    if (!response) {
      console.warn('⚠️ 未偵測到新回覆，可能輸入失敗或頁面結構變更');
    } else {
      console.debug(`✅ 成功取得回覆，長度: ${response.length}`);
    }
    return response;
  } finally {
    await browser.disconnect();
  }
}

async function queryDeepSeek(query) {
  return queryAIWebsiteWithRetry(
    'https://chat.deepseek.com/',
    query,
    ['textarea', 'div[contenteditable="true"]', 'input[type="text"]'],
    ['.message-content', '[class*="message"] [class*="content"]', '[class*="assistant"] [class*="content"]', 'div[class*="markdown"]', 'div[class*="response"]'],
    90000,
    1  // 重試一次
  );
}

async function queryGemini(query) {
  return queryAIWebsiteWithRetry(
    'https://gemini.google.com/app',
    query,
    ['div[contenteditable="true"]', 'textarea', 'input[type="text"]'],
    ['.response-content', '[class*="response"] [class*="content"]', '[class*="model-response"]', 'div[class*="markdown"]'],
    90000,
    1
  );
}

async function queryChatGPT(query) {
  return queryAIWebsiteWithRetry(
    'https://chatgpt.com/',
    query,
    ['textarea', 'div[contenteditable="true"]', 'input[type="text"]'],
    ['.markdown', '[class*="response"] [class*="content"]', '[class*="assistant"] [class*="content"]'],
    90000,
    1
  );
}

module.exports = { queryDeepSeek, queryGemini, queryChatGPT };