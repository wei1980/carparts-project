-- 退貨商品明細（多商品部分退貨：勾選商品 × 數量，自動計算退款金額）
CREATE TABLE "order_return_items" (
    "id" SERIAL PRIMARY KEY,
    "returnId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "order_returns"("id") ON DELETE CASCADE,
    CONSTRAINT "order_return_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "consumer_order_items"("id") ON DELETE CASCADE
);
CREATE INDEX "order_return_items_returnId_idx" ON "order_return_items"("returnId");
CREATE INDEX "order_return_items_orderItemId_idx" ON "order_return_items"("orderItemId");
