-- 訂單稅金欄位（5% 稅金，系統設定開啟時計入）
ALTER TABLE "consumer_orders" ADD COLUMN "tax_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;
