/*
  Warnings:

  - The values [STOCK,LEAD,MTO] on the enum `AvailabilityMode` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `parent_id` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `generations` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `generations` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `makes` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `makes` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `models` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `models` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `part_compatibilities` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `parts` table. All the data in the column will be lost.
  - You are about to drop the column `vat_included` on the `parts` table. All the data in the column will be lost.
  - You are about to drop the column `weight_kg` on the `parts` table. All the data in the column will be lost.
  - You are about to drop the column `is_primary` on the `parts_on_categories` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `created_at` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the column `displacement_cc` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the column `drive_type` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the column `front_suspension` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the column `intake_type` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the column `power_ps` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the column `rear_suspension` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `vehicle_variants` table. All the data in the column will be lost.
  - You are about to drop the `garage_query_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `garages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `price_rules` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `lead_time_days` on table `parts` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SupplyStatus" AS ENUM ('IN_STOCK', 'PREORDER', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "WorkshopRole" AS ENUM ('ADMIN', 'WORKSHOP_OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "WorkshopSpecialty" AS ENUM ('EURO_BMW_MBENZ', 'JP_TOYOTA', 'DOMESTIC', 'EV_TESLA', 'PERFORMANCE', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "AvailabilityMode_new" AS ENUM ('stock', 'preorder');
ALTER TABLE "parts" ALTER COLUMN "availability_mode" TYPE "AvailabilityMode_new" USING ("availability_mode"::text::"AvailabilityMode_new");
ALTER TYPE "AvailabilityMode" RENAME TO "AvailabilityMode_old";
ALTER TYPE "AvailabilityMode_new" RENAME TO "AvailabilityMode";
DROP TYPE "AvailabilityMode_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "garage_query_logs" DROP CONSTRAINT "garage_query_logs_garage_id_fkey";

-- DropForeignKey
ALTER TABLE "garages" DROP CONSTRAINT "garages_user_id_fkey";

-- DropForeignKey
ALTER TABLE "generations" DROP CONSTRAINT "generations_model_id_fkey";

-- DropForeignKey
ALTER TABLE "models" DROP CONSTRAINT "models_make_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_part_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_garage_id_fkey";

-- DropForeignKey
ALTER TABLE "part_compatibilities" DROP CONSTRAINT "part_compatibilities_part_id_fkey";

-- DropForeignKey
ALTER TABLE "part_compatibilities" DROP CONSTRAINT "part_compatibilities_vehicle_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "parts_on_categories" DROP CONSTRAINT "parts_on_categories_category_id_fkey";

-- DropForeignKey
ALTER TABLE "parts_on_categories" DROP CONSTRAINT "parts_on_categories_part_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_variants" DROP CONSTRAINT "vehicle_variants_generation_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_variants" DROP CONSTRAINT "vehicle_variants_model_id_fkey";

-- DropIndex
DROP INDEX "categories_parent_id_idx";

-- DropIndex
DROP INDEX "categories_slug_key";

-- DropIndex
DROP INDEX "makes_name_key";

-- DropIndex
DROP INDEX "models_make_id_name_key";

-- DropIndex
DROP INDEX "users_role_idx";

-- DropIndex
DROP INDEX "users_username_key";

-- DropIndex
DROP INDEX "vehicle_variants_model_id_engine_code_year_from_year_to_key";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "parent_id",
ALTER COLUMN "slug" DROP NOT NULL;

-- AlterTable
ALTER TABLE "generations" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ALTER COLUMN "year_from" DROP NOT NULL,
ALTER COLUMN "year_to" DROP NOT NULL;

-- AlterTable
ALTER TABLE "makes" DROP COLUMN "created_at",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "models" DROP COLUMN "created_at",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "part_compatibilities" DROP COLUMN "note";

-- AlterTable
ALTER TABLE "parts" DROP COLUMN "currency",
DROP COLUMN "vat_included",
DROP COLUMN "weight_kg",
ADD COLUMN     "brand_id" INTEGER,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "msrp" INTEGER,
ADD COLUMN     "preorder_days" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "subcategory_id" INTEGER,
ADD COLUMN     "supply_status" "SupplyStatus",
ADD COLUMN     "wholesale_price" INTEGER,
ALTER COLUMN "lead_time_days" SET NOT NULL,
ALTER COLUMN "lead_time_days" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "parts_on_categories" DROP COLUMN "is_primary";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "username",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "workshop_id" INTEGER,
DROP COLUMN "role",
ADD COLUMN     "role" "WorkshopRole" NOT NULL DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "vehicle_variants" DROP COLUMN "created_at",
DROP COLUMN "displacement_cc",
DROP COLUMN "drive_type",
DROP COLUMN "front_suspension",
DROP COLUMN "intake_type",
DROP COLUMN "power_ps",
DROP COLUMN "rear_suspension",
DROP COLUMN "updated_at",
ADD COLUMN     "displacement" INTEGER,
ADD COLUMN     "drivetrain" TEXT,
ADD COLUMN     "power_hp" INTEGER,
ADD COLUMN     "transmission" TEXT,
ALTER COLUMN "year_from" DROP NOT NULL,
ALTER COLUMN "year_to" DROP NOT NULL;

-- DropTable
DROP TABLE "garage_query_logs";

-- DropTable
DROP TABLE "garages";

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "price_rules";

-- DropEnum
DROP TYPE "RuleType";

-- DropEnum
DROP TYPE "ScopeType";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "subcategories" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "business_type" TEXT,
    "line_id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "title" TEXT,
    "address" TEXT NOT NULL,
    "technician_count" INTEGER,
    "lift_count" INTEGER,
    "photos" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_specialties" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "specialty" "WorkshopSpecialty" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_plans" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "monthly_query_limit" INTEGER,
    "is_unlimited" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_query_usage" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "year_month" TEXT NOT NULL,
    "query_count" INTEGER NOT NULL DEFAULT 0,
    "rows_returned" INTEGER NOT NULL DEFAULT 0,
    "last_query_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_query_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_status" (
    "workshop_id" INTEGER NOT NULL,
    "is_verified_buyer" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_status_pkey" PRIMARY KEY ("workshop_id")
);

-- CreateIndex
CREATE INDEX "subcategories_category_id_idx" ON "subcategories"("category_id");

-- CreateIndex
CREATE INDEX "subcategories_is_active_idx" ON "subcategories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_category_id_name_key" ON "subcategories"("category_id", "name");

-- CreateIndex
CREATE INDEX "brands_name_idx" ON "brands"("name");

-- CreateIndex
CREATE INDEX "brands_is_active_idx" ON "brands"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "workshops_name_idx" ON "workshops"("name");

-- CreateIndex
CREATE INDEX "workshops_tax_id_idx" ON "workshops"("tax_id");

-- CreateIndex
CREATE INDEX "workshop_specialties_workshop_id_idx" ON "workshop_specialties"("workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_specialties_workshop_id_specialty_key" ON "workshop_specialties"("workshop_id", "specialty");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_plans_workshop_id_key" ON "workshop_plans"("workshop_id");

-- CreateIndex
CREATE INDEX "workshop_query_usage_workshop_id_idx" ON "workshop_query_usage"("workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_query_usage_workshop_id_year_month_key" ON "workshop_query_usage"("workshop_id", "year_month");

-- CreateIndex
CREATE INDEX "makes_name_idx" ON "makes"("name");

-- CreateIndex
CREATE INDEX "models_name_idx" ON "models"("name");

-- CreateIndex
CREATE INDEX "parts_name_idx" ON "parts"("name");

-- CreateIndex
CREATE INDEX "parts_brand_id_idx" ON "parts"("brand_id");

-- CreateIndex
CREATE INDEX "parts_subcategory_id_idx" ON "parts"("subcategory_id");

-- CreateIndex
CREATE INDEX "users_workshop_id_idx" ON "users"("workshop_id");

-- CreateIndex
CREATE INDEX "vehicle_variants_engine_code_idx" ON "vehicle_variants"("engine_code");
