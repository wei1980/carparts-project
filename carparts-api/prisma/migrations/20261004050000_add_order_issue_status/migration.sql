-- Add OrderIssue.status: REPORTED(已回報) → PROCESSING(客服處理中) → RESOLVED(結案)
ALTER TABLE "order_issues" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'REPORTED';
