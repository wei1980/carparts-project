-- 修復：consumer_orders.updated_at 為 NOT NULL 但無預設值，導致建立訂單失敗
ALTER TABLE "consumer_orders" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
