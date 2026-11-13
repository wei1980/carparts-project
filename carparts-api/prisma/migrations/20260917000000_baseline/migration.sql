-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('RECEIVED', 'QUOTING', 'CUSTOMER_CONFIRMED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplyStatus" AS ENUM ('IN_STOCK', 'PREORDER', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsumerOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'DEPOSIT_PAID', 'AWAITING_BALANCE');

-- CreateEnum
CREATE TYPE "ConsumerOrderType" AS ENUM ('INSTOCK', 'PREORDER', 'MIXED');

-- CreateEnum
CREATE TYPE "WorkshopRole" AS ENUM ('TRIAL', 'VERIFIED', 'ADMIN');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WishStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceRecordStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceItemKind" AS ENUM ('LABOR', 'PART');

-- CreateEnum
CREATE TYPE "StockLocation" AS ENUM ('OWN_WAREHOUSE', 'SUPPLIER_WAREHOUSE');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('IMPORT', 'DOMESTIC');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'ORDERED', 'IN_TRANSIT', 'CUSTOMS', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InsurancePolicyStatus" AS ENUM ('QUOTED', 'APPLIED', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "workshops" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "tax_id" TEXT,
    "line_id" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "job_title" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "shop_type" TEXT,
    "role" "WorkshopRole" NOT NULL DEFAULT 'TRIAL',
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "garage_address" TEXT,
    "garage_name" TEXT,
    "garage_phone" TEXT,
    "garage_slots" JSONB,
    "is_garage" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "garage_photos" JSONB,
    "opening_hours" JSONB,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_customers" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "last_visit" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_customer_visits" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "service_type" TEXT,
    "summary" TEXT,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_customer_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garage_labor_fees" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garage_labor_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_number" TEXT NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'SUBMITTED',
    "total_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "note" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "shipping_address" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "sku_snapshot" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "brand_snapshot" TEXT,
    "price_snapshot" DECIMAL(65,30) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "is_preorder" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_variants" (
    "id" SERIAL NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generation" TEXT NOT NULL,
    "engine_code" TEXT NOT NULL,
    "variant_name" TEXT NOT NULL,
    "specs" JSONB,
    "year_start" INTEGER NOT NULL,
    "year_end" INTEGER NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "drive_type" TEXT,

    CONSTRAINT "vehicle_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "parent_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_nav" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "subcategory_id" INTEGER,
    "category" TEXT,
    "image_url" TEXT,
    "description" TEXT,
    "specs" JSONB,
    "msrp_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "wholesale_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "preorder_lead_time_days" INTEGER NOT NULL DEFAULT 21,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stock_location" "StockLocation",
    "is_universal" BOOLEAN NOT NULL DEFAULT false,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts_on_categories" (
    "part_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "parts_on_categories_pkey" PRIMARY KEY ("part_id","category_id")
);

-- CreateTable
CREATE TABLE "part_vehicle_compatibility" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,

    CONSTRAINT "part_vehicle_compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_caliper_fitment" (
    "id" SERIAL NOT NULL,
    "pad_id" INTEGER NOT NULL,
    "caliper_id" INTEGER NOT NULL,

    CONSTRAINT "part_caliper_fitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotal_amount" DECIMAL(65,30) NOT NULL,
    "shipping_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "payment_last_5_digits" TEXT,
    "deposit_required" BOOLEAN NOT NULL DEFAULT false,
    "shipping_address" TEXT NOT NULL,
    "tracking_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "sku_snapshot" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "price_snapshot" DECIMAL(65,30) NOT NULL,
    "qty" INTEGER NOT NULL,
    "is_preorder" BOOLEAN NOT NULL DEFAULT false,
    "promised_weeks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_query_usage" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "year_month" TEXT NOT NULL,
    "query_count" INTEGER NOT NULL DEFAULT 0,
    "rows_returned" INTEGER NOT NULL DEFAULT 0,
    "last_query_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_query_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPartDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "customerVehicleId" TEXT,
    "query" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT,
    "raw_content" TEXT,
    "result_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPartDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "qty_change" INTEGER NOT NULL,
    "qty_after" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndUser" (
    "id" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lineId" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "resetCodeExpires" TIMESTAMP(3),
    "resetCodeHash" TEXT,
    "currentVehicleId" TEXT,

    CONSTRAINT "EndUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" INTEGER,
    "vin" TEXT,
    "licensePlate" TEXT,
    "make" TEXT,
    "model" TEXT,
    "generation" TEXT,
    "year" INTEGER,
    "engine" TEXT,
    "modifications" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regPhotoUrl" TEXT,

    CONSTRAINT "VehicleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_modifications" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "partType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "specJson" JSONB,
    "installedAt" TIMESTAMP(3),
    "installedMileageKm" INTEGER,
    "laborCost" INTEGER,
    "warrantyUntil" TIMESTAMP(3),
    "garageId" INTEGER,
    "beforePhotoUrls" JSONB,
    "afterPhotoUrls" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_modifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_modification_fitments" (
    "id" SERIAL NOT NULL,
    "modificationType" TEXT NOT NULL,
    "modPartId" INTEGER NOT NULL,
    "targetPartId" INTEGER NOT NULL,
    "fitmentRule" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_modification_fitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partPhoto" TEXT,
    "status" "WishStatus" NOT NULL DEFAULT 'PENDING',
    "handledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "partId" INTEGER,
    "targetPrice" DECIMAL(65,30),
    "notifiedAtPrice" DECIMAL(65,30),

    CONSTRAINT "WishItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartImageRecognitionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "rawResult" JSONB NOT NULL,
    "finalBrand" TEXT,
    "finalModel" TEXT,
    "confidence" DOUBLE PRECISION,
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartImageRecognitionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ConsumerOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotal_amount" DECIMAL(65,30) NOT NULL,
    "shipping_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "payment_last_5_digits" TEXT,
    "deposit_required" BOOLEAN NOT NULL DEFAULT false,
    "shipping_address" TEXT NOT NULL,
    "tracking_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_import_order" BOOLEAN NOT NULL DEFAULT false,
    "need_installation" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "receiver_name" TEXT NOT NULL,
    "receiver_phone" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "balanceAmount" DECIMAL(65,30),
    "balancePaidAt" TIMESTAMP(3),
    "bankDepositDate" TIMESTAMP(3),
    "bankLastFiveDigits" TEXT,
    "bankRemitterName" TEXT,
    "depositAmount" DECIMAL(65,30),
    "depositPaidAt" TIMESTAMP(3),
    "orderType" "ConsumerOrderType" NOT NULL DEFAULT 'INSTOCK',
    "trackingCodeDomestic" TEXT,
    "trackingCodeInternational" TEXT,
    "idempotency_key" TEXT,

    CONSTRAINT "consumer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "sku_snapshot" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "price_snapshot" DECIMAL(65,30) NOT NULL,
    "qty" INTEGER NOT NULL,
    "is_preorder" BOOLEAN NOT NULL DEFAULT false,
    "promised_weeks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "consumer_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "garage_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_type" TEXT,
    "part_ids" JSONB,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "install_items" JSONB,
    "proposed_at" TIMESTAMP(3),
    "quote_amount" INTEGER,
    "quote_note" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" SERIAL NOT NULL,
    "garage_id" INTEGER NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "user_id" TEXT,
    "technician_id" TEXT,
    "bay_id" INTEGER,
    "appointment_id" INTEGER,
    "service_type" TEXT NOT NULL DEFAULT 'REPAIR',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "initial_notes" TEXT,
    "estimated_completion" TIMESTAMP(3),
    "quote_amount" INTEGER,
    "quote_note" TEXT,
    "quote_valid_until" TIMESTAMP(3),
    "quote_sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "photos" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_items" (
    "id" SERIAL NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'PART',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_labor_items" (
    "id" SERIAL NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "labor_fee_id" INTEGER,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'LABOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_labor_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_status_history" (
    "id" SERIAL NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "from_status" "WorkOrderStatus" NOT NULL,
    "to_status" "WorkOrderStatus" NOT NULL,
    "note" TEXT,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bays" (
    "id" SERIAL NOT NULL,
    "garage_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" SERIAL NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "garage_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "mileage_km" INTEGER,
    "status" "ServiceRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_record_items" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "kind" "ServiceItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "part_sku" TEXT,
    "part_brand" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "service_record_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_reminders" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "interval_km" INTEGER,
    "interval_days" INTEGER,
    "base_mileage" INTEGER,
    "due_date" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "payment_terms" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" SERIAL NOT NULL,
    "shipment_no" TEXT NOT NULL,
    "type" "ShipmentType" NOT NULL DEFAULT 'IMPORT',
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "supplier_id" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "goods_cost_twd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "intl_freight_twd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "local_freight_twd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "customs_duty_twd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "customs_other_twd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paid_amount_twd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "allocation_method" TEXT NOT NULL DEFAULT 'BY_AMOUNT',
    "ordered_at" TIMESTAMP(3),
    "eta_date" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" SERIAL NOT NULL,
    "shipment_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price_twd" DECIMAL(65,30) NOT NULL,
    "landed_unit_cost" DECIMAL(65,30),

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "insurer_name" TEXT NOT NULL,
    "coverage" JSONB,
    "base_premium" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "policy_number" TEXT,
    "status" "InsurancePolicyStatus" NOT NULL DEFAULT 'QUOTED',
    "premium" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garage_reviews" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "garage_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garage_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workshops_email_key" ON "workshops"("email");

-- CreateIndex
CREATE INDEX "workshop_customers_workshop_id_idx" ON "workshop_customers"("workshop_id");

-- CreateIndex
CREATE INDEX "idx_workshop_customer_workshop" ON "workshop_customers"("workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_customers_workshop_id_phone_key" ON "workshop_customers"("workshop_id", "phone");

-- CreateIndex
CREATE INDEX "workshop_customer_visits_customer_id_idx" ON "workshop_customer_visits"("customer_id");

-- CreateIndex
CREATE INDEX "workshop_customer_visits_workshop_id_idx" ON "workshop_customer_visits"("workshop_id");

-- CreateIndex
CREATE INDEX "garage_labor_fees_workshop_id_idx" ON "garage_labor_fees"("workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_workshop_id_idx" ON "purchase_orders"("workshop_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "vehicle_variants_make_model_generation_year_start_idx" ON "vehicle_variants"("make", "model", "generation", "year_start");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "subcategories_category_id_idx" ON "subcategories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "parts_sku_key" ON "parts"("sku");

-- CreateIndex
CREATE INDEX "parts_subcategory_id_idx" ON "parts"("subcategory_id");

-- CreateIndex
CREATE INDEX "parts_sales_count_idx" ON "parts"("sales_count");

-- CreateIndex
CREATE INDEX "parts_view_count_idx" ON "parts"("view_count");

-- CreateIndex
CREATE INDEX "parts_on_categories_category_id_idx" ON "parts_on_categories"("category_id");

-- CreateIndex
CREATE INDEX "parts_on_categories_part_id_idx" ON "parts_on_categories"("part_id");

-- CreateIndex
CREATE INDEX "part_vehicle_compatibility_vehicle_id_idx" ON "part_vehicle_compatibility"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_part_compat_vehicle" ON "part_vehicle_compatibility"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_vehicle_compatibility_part_id_vehicle_id_key" ON "part_vehicle_compatibility"("part_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "part_caliper_fitment_caliper_id_idx" ON "part_caliper_fitment"("caliper_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_caliper_fitment_pad_id_caliper_id_key" ON "part_caliper_fitment"("pad_id", "caliper_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_query_usage_workshop_id_year_month_key" ON "workshop_query_usage"("workshop_id", "year_month");

-- CreateIndex
CREATE INDEX "inventory_logs_part_id_idx" ON "inventory_logs"("part_id");

-- CreateIndex
CREATE INDEX "inventory_logs_created_at_idx" ON "inventory_logs"("created_at");

-- CreateIndex
CREATE INDEX "inventory_logs_type_idx" ON "inventory_logs"("type");

-- CreateIndex
CREATE INDEX "inventory_logs_part_id_created_at_idx" ON "inventory_logs"("part_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "EndUser_phone_key" ON "EndUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "EndUser_currentVehicleId_key" ON "EndUser"("currentVehicleId");

-- CreateIndex
CREATE INDEX "VehicleProfile_userId_idx" ON "VehicleProfile"("userId");

-- CreateIndex
CREATE INDEX "VehicleProfile_id_idx" ON "VehicleProfile"("id");

-- CreateIndex
CREATE INDEX "VehicleProfile_userId_variantId_idx" ON "VehicleProfile"("userId", "variantId");

-- CreateIndex
CREATE INDEX "vehicle_modifications_vehicleId_idx" ON "vehicle_modifications"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_modifications_category_partType_idx" ON "vehicle_modifications"("category", "partType");

-- CreateIndex
CREATE INDEX "part_modification_fitments_modPartId_idx" ON "part_modification_fitments"("modPartId");

-- CreateIndex
CREATE INDEX "part_modification_fitments_targetPartId_idx" ON "part_modification_fitments"("targetPartId");

-- CreateIndex
CREATE UNIQUE INDEX "part_modification_fitments_modificationType_modPartId_targe_key" ON "part_modification_fitments"("modificationType", "modPartId", "targetPartId");

-- CreateIndex
CREATE INDEX "WishItem_userId_idx" ON "WishItem"("userId");

-- CreateIndex
CREATE INDEX "WishItem_partId_idx" ON "WishItem"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_orders_order_number_key" ON "consumer_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_orders_idempotency_key_key" ON "consumer_orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "consumer_orders_userId_idx" ON "consumer_orders"("userId");

-- CreateIndex
CREATE INDEX "consumer_orders_userId_status_idx" ON "consumer_orders"("userId", "status");

-- CreateIndex
CREATE INDEX "consumer_orders_status_idx" ON "consumer_orders"("status");

-- CreateIndex
CREATE INDEX "consumer_orders_created_at_idx" ON "consumer_orders"("created_at");

-- CreateIndex
CREATE INDEX "consumer_orders_vehicle_id_idx" ON "consumer_orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "consumer_order_items_order_id_idx" ON "consumer_order_items"("order_id");

-- CreateIndex
CREATE INDEX "appointments_vehicle_id_idx" ON "appointments"("vehicle_id");

-- CreateIndex
CREATE INDEX "appointments_garage_id_idx" ON "appointments"("garage_id");

-- CreateIndex
CREATE INDEX "appointments_user_id_idx" ON "appointments"("user_id");

-- CreateIndex
CREATE INDEX "appointments_garage_id_status_idx" ON "appointments"("garage_id", "status");

-- CreateIndex
CREATE INDEX "appointments_vehicle_id_status_idx" ON "appointments"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "appointments_garage_id_scheduled_at_idx" ON "appointments"("garage_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_status_scheduled_at_idx" ON "appointments"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_appointment_id_key" ON "work_orders"("appointment_id");

-- CreateIndex
CREATE INDEX "work_orders_garage_id_idx" ON "work_orders"("garage_id");

-- CreateIndex
CREATE INDEX "work_orders_vehicle_id_idx" ON "work_orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "work_orders_user_id_idx" ON "work_orders"("user_id");

-- CreateIndex
CREATE INDEX "work_orders_technician_id_idx" ON "work_orders"("technician_id");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_garage_id_status_idx" ON "work_orders"("garage_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_vehicle_id_status_idx" ON "work_orders"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_garage_id_created_at_idx" ON "work_orders"("garage_id", "created_at");

-- CreateIndex
CREATE INDEX "work_order_items_work_order_id_idx" ON "work_order_items"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_items_part_id_idx" ON "work_order_items"("part_id");

-- CreateIndex
CREATE INDEX "work_order_labor_items_work_order_id_idx" ON "work_order_labor_items"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_status_history_work_order_id_idx" ON "work_order_status_history"("work_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "bays_garage_id_code_key" ON "bays"("garage_id", "code");

-- CreateIndex
CREATE INDEX "service_records_vehicle_id_idx" ON "service_records"("vehicle_id");

-- CreateIndex
CREATE INDEX "service_records_garage_id_idx" ON "service_records"("garage_id");

-- CreateIndex
CREATE INDEX "service_records_user_id_idx" ON "service_records"("user_id");

-- CreateIndex
CREATE INDEX "service_records_garage_id_status_idx" ON "service_records"("garage_id", "status");

-- CreateIndex
CREATE INDEX "service_records_vehicle_id_status_idx" ON "service_records"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "service_records_vehicle_id_completed_at_idx" ON "service_records"("vehicle_id", "completed_at");

-- CreateIndex
CREATE INDEX "maintenance_reminders_user_id_idx" ON "maintenance_reminders"("user_id");

-- CreateIndex
CREATE INDEX "maintenance_reminders_vehicle_id_idx" ON "maintenance_reminders"("vehicle_id");

-- CreateIndex
CREATE INDEX "maintenance_reminders_enabled_idx" ON "maintenance_reminders"("enabled");

-- CreateIndex
CREATE INDEX "maintenance_reminders_user_id_enabled_idx" ON "maintenance_reminders"("user_id", "enabled");

-- CreateIndex
CREATE INDEX "maintenance_reminders_vehicle_id_enabled_idx" ON "maintenance_reminders"("vehicle_id", "enabled");

-- CreateIndex
CREATE INDEX "maintenance_reminders_due_date_idx" ON "maintenance_reminders"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_no_key" ON "shipments"("shipment_no");

-- CreateIndex
CREATE INDEX "shipment_items_shipment_id_idx" ON "shipment_items"("shipment_id");

-- CreateIndex
CREATE INDEX "shipment_items_part_id_idx" ON "shipment_items"("part_id");

-- CreateIndex
CREATE INDEX "insurance_policies_user_id_idx" ON "insurance_policies"("user_id");

-- CreateIndex
CREATE INDEX "insurance_policies_vehicle_id_idx" ON "insurance_policies"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "garage_reviews_appointment_id_key" ON "garage_reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "garage_reviews_garage_id_idx" ON "garage_reviews"("garage_id");

-- CreateIndex
CREATE INDEX "garage_reviews_user_id_idx" ON "garage_reviews"("user_id");

-- CreateIndex
CREATE INDEX "idx_garage_review_garage" ON "garage_reviews"("garage_id");

