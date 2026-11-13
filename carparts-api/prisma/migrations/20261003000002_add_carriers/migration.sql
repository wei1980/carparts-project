-- 🆕 物流業者表（查貨網頁連結可由後台管理）＋ 訂單國內物流業者關聯
CREATE TABLE "carriers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "trackingUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carriers_code_key" ON "carriers"("code");

-- 預設物流業者（查貨網址已查證）
INSERT INTO "carriers" ("name", "code", "trackingUrl", "enabled", "sort_order", "created_at") VALUES
    ('新竹物流', 'HCT', 'https://www.hct.com.tw/Search/SearchGoods_n.aspx', true, 1, NOW()),
    ('郵局', 'POST', 'https://postserv.post.gov.tw/pstmail/main_mail.html', true, 2, NOW()),
    ('7-11店到店', '711', 'https://eservice.7-11.com.tw/', true, 3, NOW()),
    ('全家店到店', 'FAMILY', 'https://fmec.famiport.com.tw/FP_Entrance/QueryBox', true, 4, NOW());

ALTER TABLE "consumer_orders" ADD COLUMN "domesticCarrierId" INTEGER;
ALTER TABLE "consumer_orders" ADD CONSTRAINT "consumer_orders_domesticCarrierId_fkey" FOREIGN KEY ("domesticCarrierId") REFERENCES "carriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "consumer_orders_domesticCarrierId_idx" ON "consumer_orders"("domesticCarrierId");
