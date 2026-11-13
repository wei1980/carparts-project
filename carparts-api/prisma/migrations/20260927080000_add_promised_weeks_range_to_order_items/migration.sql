-- AlterTable: add preorder week range columns
ALTER TABLE "order_items" ADD COLUMN     "promised_weeks_min" INTEGER;
ALTER TABLE "order_items" ADD COLUMN     "promised_weeks_max" INTEGER;
ALTER TABLE "consumer_order_items" ADD COLUMN     "promised_weeks_min" INTEGER;
ALTER TABLE "consumer_order_items" ADD COLUMN     "promised_weeks_max" INTEGER;
