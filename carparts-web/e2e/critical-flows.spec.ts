// e2e/vehicle-selection.spec.ts
// 車型選擇流程 E2E 測試

import { test, expect } from '@playwright/test';

test.describe('車型選擇流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
  });

  test('首頁顯示車型選擇器', async ({ page }) => {
    // 檢查車型選擇器元件是否存在
    await expect(page.locator('[data-testid="vehicle-selector"], select[name="make"]').first()).toBeVisible();
  });

  test('完整車型選擇流程：品牌 → 車系 → 年份 → 引擎 → 車型代碼', async ({ page }) => {
    // 選擇品牌
    const makeSelect = page.locator('select[name="make"]').first();
    await expect(makeSelect).toBeVisible();
    await makeSelect.selectOption('Toyota');
    
    // 等待車系載入
    await page.waitForTimeout(500);
    const modelSelect = page.locator('select[name="model"]').first();
    await expect(modelSelect).toBeEnabled();
    await modelSelect.selectOption('Camry');
    
    // 等待年份載入
    await page.waitForTimeout(500);
    const yearSelect = page.locator('select[name="year"]').first();
    await expect(yearSelect).toBeEnabled();
    await yearSelect.selectOption('2023');
    
    // 等待引擎載入
    await page.waitForTimeout(500);
    const engineSelect = page.locator('select[name="engine"]').first();
    await expect(engineSelect).toBeEnabled();
    await engineSelect.selectOption({ index: 1 }); // 選擇第一個非預設選項
    
    // 等待車型代碼載入
    await page.waitForTimeout(500);
    const variantSelect = page.locator('select[name="variant"]').first();
    await expect(variantSelect).toBeEnabled();
  });

  test('品牌過濾功能', async ({ page }) => {
    const makeSelect = page.locator('select[name="make"]').first();
    const options = await makeSelect.locator('option').allTextContents();
    expect(options).toContain('Toyota');
    expect(options).toContain('Honda');
    expect(options).toContain('Mazda');
  });
});

test.describe('AI 智慧找零件', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-search');
    await page.waitForLoadState('networkidle');
  });

  test('文字搜尋建立草稿', async ({ page }) => {
    // 輸入搜尋關鍵字
    await page.fill('input[placeholder*="關鍵字"]', 'Toyota Camry 空氣濾清器');
    
    // 點擊搜尋按鈕
    await page.click('button:has-text("搜尋")');
    
    // 等待草稿建立
    await expect(page.locator('text=草稿').first()).toBeVisible({ timeout: 10000 });
  });

  test('圖片上傳搜尋', async ({ page }) => {
    // 準備測試圖片
    const filePath = 'tests/fixtures/test-part.jpg';
    
    // 上傳圖片
    await page.setInputFiles('input[type="file"]', filePath);
    
    // 點擊搜尋
    await page.click('button:has-text("搜尋")');
    
    // 等待處理
    await expect(page.locator('text=草稿').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('車廠端 - 排程管理', () => {
  test.beforeEach(async ({ page }) => {
    // 登入車廠帳號 (需要先註冊/登入)
    await page.goto('/garage/login');
    await page.waitForLoadState('networkidle');
  });

  test('排程日曆視圖切換', async ({ page }) => {
    await page.goto('/garage/schedule');
    await page.waitForLoadState('networkidle');
    
    // 切換日/週/月視圖
    await page.click('button:has-text("日")');
    await expect(page.locator('[data-view="day"]')).toBeVisible();
    
    await page.click('button:has-text("週")');
    await expect(page.locator('[data-view="week"]')).toBeVisible();
    
    await page.click('button:has-text("月")');
    await expect(page.locator('[data-view="month"]')).toBeVisible();
  });
});

test.describe('車廠端 - 工單流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/garage/work-orders');
    await page.waitForLoadState('networkidle');
  });

  test('建立新工單', async ({ page }) => {
    // 點擊新增工單
    await page.click('button:has-text("新增工單"), button:has-text("建立工單")');
    
    // 填寫表單
    await page.fill('input[name="licensePlate"]', 'ABC-1234');
    await page.selectOption('select[name="serviceType"]', 'REPAIR');
    
    // 提交
    await page.click('button[type="submit"]:has-text("建立"), button:has-text("確定")');
    
    // 驗證成功
    await expect(page.locator('text=工單建立成功')).toBeVisible({ timeout: 5000 });
  });

  test('工單狀態流轉', async ({ page }) => {
    // 進入工單詳情
    await page.click('table tbody tr:first-child button:has-text("詳情"), a:has-text("詳情")');
    
    // 修改狀態
    await page.selectOption('select[name="status"]', 'IN_PROGRESS');
    await page.click('button:has-text("更新"), button:has-text("儲存")');
    
    // 驗證
    await expect(page.locator('text=更新成功')).toBeVisible();
  });
});

test.describe('購物車與結帳流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
  });

  test('加入購物車並結帳', async ({ page }) => {
    // 選擇第一個商品
    await page.click('.product-card:first-child button:has-text("加入購物車")');
    
    // 開啟購物車
    await page.click('[data-testid="cart-icon"], button:has-text("購物車")');
    
    // 確認商品在購物車
    await expect(page.locator('.cart-item')).toBeVisible();
    
    // 結帳
    await page.click('button:has-text("結帳"), button:has-text("去結帳")');
    
    // 填寫結帳資訊
    await page.fill('input[name="receiver_name"]', '測試用戶');
    await page.fill('input[name="receiver_phone"]', '0912345678');
    await page.fill('input[name="shipping_address"]', '台北市信義區測試路123號');
    
    // 提交訂單
    await page.click('button[type="submit"]:has-text("送出訂單"), button:has-text("確認下單")');
    
    // 驗證訂單建立
    await expect(page.locator('text=訂單建立成功, text=訂單號碼')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('響應式設計測試', () => {
  test('手機版車型選擇器', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 檢查行動版選單或選擇器
    await expect(page.locator('select[name="make"]').first()).toBeVisible();
  });

  test('平板版排程視圖', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/garage/schedule');
    await page.waitForLoadState('networkidle');
    
    // 週視圖應正常顯示
    await expect(page.locator('[data-view="week"]')).toBeVisible();
  });
});