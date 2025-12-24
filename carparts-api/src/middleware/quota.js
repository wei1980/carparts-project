const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TRIAL_LIMIT = 100; // 試用會員每月 100 次

/**
 * 查詢配額限制 Middleware
 * 放在 GET /api/parts 路由之前
 */
async function checkQueryQuota(req, res, next) {
  const user = req.user; // 假設 auth middleware 已經注入 user
  
  // 1. 管理員與正式會員不限額
  if (!user || user.role === 'ADMIN' || user.role === 'VERIFIED') {
    return next();
  }

  // 2. 計算當月 Key (e.g., "2025-12")
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    // 3. 取得或建立當月紀錄
    // 使用 upsert 原子操作確保並發安全
    const usage = await prisma.workshopQueryUsage.upsert({
      where: {
        workshop_id_year_month: {
          workshop_id: user.id,
          year_month: yearMonth
        }
      },
      update: {
        // 這裡只讀取，不增加。增加是在查詢成功後 (Response interceptor) 或在此處預扣
        // 為了簡單起見，我們通常在「請求發生時」就計次
        query_count: { increment: 1 }
      },
      create: {
        workshop_id: user.id,
        year_month: yearMonth,
        query_count: 1
      }
    });

    // 4. 檢查是否爆量
    // 因為上面已經 +1，所以這裡檢查 > LIMIT
    if (usage.query_count > TRIAL_LIMIT) {
      return res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: '本月查詢配額已滿 (100次)。請聯繫業務升級正式會員以解鎖無限查詢。',
        current_usage: usage.query_count,
        limit: TRIAL_LIMIT
      });
    }

    // 將剩餘次數掛在 res.locals 以便 Response 使用
    res.locals.quotaRemaining = TRIAL_LIMIT - usage.query_count;
    
    next();

  } catch (error) {
    console.error('Quota Check Error:', error);
    // 系統錯誤時，建議 "Fail Open" (允許通過) 避免阻擋正常用戶，或 "Fail Closed"
    next(); 
  }
}

module.exports = checkQueryQuota;