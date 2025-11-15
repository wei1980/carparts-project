-- CreateEnum
CREATE TYPE "AvailabilityMode" AS ENUM ('STOCK', 'LEAD', 'MTO');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('DISCOUNT', 'MARKUP', 'FIXED');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('CATEGORY', 'BRAND', 'PART');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DEALER', 'STAFF', 'CUSTOMER');

-- CreateTable
CREATE TABLE "makes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "makes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" SERIAL NOT NULL,
    "make_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generations" (
    "id" SERIAL NOT NULL,
    "model_id" INTEGER NOT NULL,
    "name" TEXT,
    "year_from" INTEGER NOT NULL,
    "year_to" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_variants" (
    "id" SERIAL NOT NULL,
    "model_id" INTEGER NOT NULL,
    "generation_id" INTEGER,
    "name" TEXT,
    "engine_code" TEXT,
    "year_from" INTEGER NOT NULL,
    "year_to" INTEGER NOT NULL,
    "displacement_cc" INTEGER,
    "power_ps" INTEGER,
    "intake_type" TEXT,
    "drive_type" TEXT,
    "front_suspension" TEXT,
    "rear_suspension" TEXT,
    "fuel_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "msrp_twd" INTEGER,
    "wholesale_twd" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "weight_kg" DOUBLE PRECISION,
    "vat_included" BOOLEAN NOT NULL DEFAULT true,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "availability_mode" "AvailabilityMode",
    "lead_time_days" INTEGER,
    "image_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_nav" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts_on_categories" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parts_on_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_compatibilities" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "vehicle_variant_id" INTEGER NOT NULL,
    "note" JSONB,

    CONSTRAINT "part_compatibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "buyer" JSONB,
    "shipping_address" TEXT,
    "shipping_twd" INTEGER DEFAULT 0,
    "total_twd" INTEGER,
    "note" TEXT,
    "garage_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price_twd" INTEGER,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garages" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "tax_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garage_query_logs" (
    "id" SERIAL NOT NULL,
    "garage_id" INTEGER NOT NULL,
    "query_type" TEXT NOT NULL,
    "reset_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garage_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_rules" (
    "id" SERIAL NOT NULL,
    "role" "UserRole" NOT NULL,
    "type" "RuleType" NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_value" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "makes_name_key" ON "makes"("name");

-- CreateIndex
CREATE INDEX "models_make_id_idx" ON "models"("make_id");

-- CreateIndex
CREATE UNIQUE INDEX "models_make_id_name_key" ON "models"("make_id", "name");

-- CreateIndex
CREATE INDEX "generations_model_id_idx" ON "generations"("model_id");

-- CreateIndex
CREATE INDEX "generations_year_from_year_to_idx" ON "generations"("year_from", "year_to");

-- CreateIndex
CREATE INDEX "vehicle_variants_model_id_idx" ON "vehicle_variants"("model_id");

-- CreateIndex
CREATE INDEX "vehicle_variants_generation_id_idx" ON "vehicle_variants"("generation_id");

-- CreateIndex
CREATE INDEX "vehicle_variants_year_from_year_to_idx" ON "vehicle_variants"("year_from", "year_to");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_variants_model_id_engine_code_year_from_year_to_key" ON "vehicle_variants"("model_id", "engine_code", "year_from", "year_to");

-- CreateIndex
CREATE UNIQUE INDEX "parts_sku_key" ON "parts"("sku");

-- CreateIndex
CREATE INDEX "parts_brand_idx" ON "parts"("brand");

-- CreateIndex
CREATE INDEX "parts_category_idx" ON "parts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_is_active_idx" ON "categories"("is_active");

-- CreateIndex
CREATE INDEX "parts_on_categories_part_id_idx" ON "parts_on_categories"("part_id");

-- CreateIndex
CREATE INDEX "parts_on_categories_category_id_idx" ON "parts_on_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "parts_on_categories_part_id_category_id_key" ON "parts_on_categories"("part_id", "category_id");

-- CreateIndex
CREATE INDEX "part_compatibilities_part_id_idx" ON "part_compatibilities"("part_id");

-- CreateIndex
CREATE INDEX "part_compatibilities_vehicle_variant_id_idx" ON "part_compatibilities"("vehicle_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_compatibilities_part_id_vehicle_variant_id_key" ON "part_compatibilities"("part_id", "vehicle_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_part_id_idx" ON "order_items"("part_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "garages_name_key" ON "garages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "garages_phone_key" ON "garages"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "garages_tax_id_key" ON "garages"("tax_id");

-- CreateIndex
CREATE UNIQUE INDEX "garage_query_logs_garage_id_query_type_reset_date_key" ON "garage_query_logs"("garage_id", "query_type", "reset_date");

-- CreateIndex
CREATE INDEX "price_rules_role_idx" ON "price_rules"("role");

-- CreateIndex
CREATE INDEX "price_rules_scope_type_scope_value_idx" ON "price_rules"("scope_type", "scope_value");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "makes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_variants" ADD CONSTRAINT "vehicle_variants_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_variants" ADD CONSTRAINT "vehicle_variants_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts_on_categories" ADD CONSTRAINT "parts_on_categories_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts_on_categories" ADD CONSTRAINT "parts_on_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibilities" ADD CONSTRAINT "part_compatibilities_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibilities" ADD CONSTRAINT "part_compatibilities_vehicle_variant_id_fkey" FOREIGN KEY ("vehicle_variant_id") REFERENCES "vehicle_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garages" ADD CONSTRAINT "garages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garage_query_logs" ADD CONSTRAINT "garage_query_logs_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

