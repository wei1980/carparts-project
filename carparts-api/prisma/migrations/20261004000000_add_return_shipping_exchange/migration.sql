-- 退貨運費＋內建換貨單
ALTER TABLE "order_returns" ADD COLUMN "returnShippingFee" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "order_returns" ADD COLUMN "isExchange" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "order_returns" ADD COLUMN "exchangeTrackingCode" TEXT;
ALTER TABLE "order_returns" ADD COLUMN "exchangeShippedAt" TIMESTAMP(3);
ALTER TYPE "ReturnStatus" ADD VALUE 'EXCHANGED';
