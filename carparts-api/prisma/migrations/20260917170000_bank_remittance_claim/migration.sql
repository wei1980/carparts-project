-- Additive: preserve all existing orders and inventory.
CREATE TABLE "BankRemittanceClaim" (
  "fingerprint" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "stage" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "transactionDate" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankRemittanceClaim_pkey" PRIMARY KEY ("fingerprint")
);
CREATE UNIQUE INDEX "BankRemittanceClaim_orderId_stage_key" ON "BankRemittanceClaim"("orderId", "stage");
