/**
 * Database Index Optimizations
 * 針對高頻查詢路徑優化 PostgreSQL 索引
 * 執行方式：node scripts/create-indexes.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createOptimizedIndexes() {
  console.log('🔧 Creating optimized database indexes...\n');

  const indexes = [
    // ===== Appointment 相關索引 =====
    // 車廠查詢預約：依 garage_id + 狀態 + 時間
    {
      name: 'idx_appointment_garage_status_time',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_appointment_garage_status_time" 
            ON "appointments" ("garage_id", "status", "scheduled_at");`,
    },
    
    // 車主查詢預約：依 user_id + 時間
    {
      name: 'idx_appointment_user_time',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_appointment_user_time" 
            ON "appointments" ("user_id", "scheduled_at");`,
    },
    
    // 預約狀態篩選
    {
      name: 'idx_appointment_status',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_appointment_status" 
            ON "appointments" ("status");`,
    },
    
    // 提出時間排序
    {
      name: 'idx_appointment_proposed_at',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_appointment_proposed_at" 
            ON "appointments" ("proposed_at") WHERE "proposed_at" IS NOT NULL;`,
    },

    // ===== Part 相關索引 =====
    // 零件相容性查詢：依 vehicle_id (最常用)
    {
      name: 'idx_part_compat_vehicle',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_compat_vehicle" 
            ON "part_vehicle_compatibility" ("vehicle_id");`,
    },
    
    // 零件相容性：依 part_id (反向查詢)
    {
      name: 'idx_part_compat_part',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_compat_part" 
            ON "part_vehicle_compatibility" ("part_id");`,
    },
    
    // 零件搜尋：依分類 + 活躍狀態
    {
      name: 'idx_part_category_active',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_category_active" 
            ON "parts" ("category", "is_active") WHERE "is_active" = true;`,
    },
    
    // 零件搜尋：依子分類
    {
      name: 'idx_part_subcategory',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_subcategory" 
            ON "parts" ("subcategory_id") WHERE "is_active" = true;`,
    },
    
    // 零件品牌搜尋
    {
      name: 'idx_part_brand',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_brand" 
            ON "parts" ("brand") WHERE "is_active" = true;`,
    },
    
    // 熱門度排序：銷量
    {
      name: 'idx_part_sales_count',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_sales_count" 
            ON "parts" ("sales_count" DESC) WHERE "is_active" = true;`,
    },
    
    // 熱門度排序：點閱數
    {
      name: 'idx_part_view_count',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_view_count" 
            ON "parts" ("view_count" DESC) WHERE "is_active" = true;`,
    },
    
    // 價格排序
    {
      name: 'idx_part_price',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_price" 
            ON "parts" ("msrp_price") WHERE "is_active" = true;`,
    },
    
    // 庫存狀態
    {
      name: 'idx_part_stock',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_stock" 
            ON "parts" ("stock_qty") WHERE "is_active" = true;`,
    },
    
    // 通用型零件
    {
      name: 'idx_part_universal',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_part_universal" 
            ON "parts" ("is_universal") WHERE "is_universal" = true AND "is_active" = true;`,
    },

    // ===== VehicleVariant 索引 =====
    // 年份 + 廠牌 + 車型 + 年份範圍
    {
      name: 'idx_vehicle_variant_lookup',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_vehicle_variant_lookup" 
            ON "vehicle_variants" ("make", "model", "year_start", "year_end");`,
    },
    
    // 引擎代碼查詢
    {
      name: 'idx_vehicle_variant_engine',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_vehicle_variant_engine" 
            ON "vehicle_variants" ("engine_code");`,
    },

    // ===== Garage/Workshop 索引 =====
    // 車廠列表：依地址 (縣市篩選)
    {
      name: 'idx_workshop_address',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workshop_address" 
            ON "workshops" ("garage_address") WHERE "is_garage" = true AND "is_active" = true;`,
    },
    
    // 車廠座標 (LBS 排序)
    {
      name: 'idx_workshop_coords',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workshop_coords" 
            ON "workshops" ("lat", "lng") WHERE "is_garage" = true AND "is_active" = true AND "lat" IS NOT NULL AND "lng" IS NOT NULL;`,
    },
    
    // 車廠評價
    {
      name: 'idx_garage_review_garage',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_garage_review_garage" 
            ON "garage_reviews" ("garage_id");`,
    },

    // ===== PartModificationFitment 索引 =====
    // 改裝零件 -> 目標零件
    {
      name: 'idx_mod_fitment_mod_part',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_mod_fitment_mod_part" 
            ON "part_modification_fitment" ("mod_part_id");`,
    },
    
    // 目標零件反向查詢
    {
      name: 'idx_mod_fitment_target_part',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_mod_fitment_target_part" 
            ON "part_modification_fitment" ("target_part_id");`,
    },
    
    // 改裝類型篩選
    {
      name: 'idx_mod_fitment_type',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_mod_fitment_type" 
            ON "part_modification_fitment" ("modification_type");`,
    },

    // ===== VehicleModification 索引 =====
    // 車輛改裝查詢
    {
      name: 'idx_vehicle_mod_vehicle',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_vehicle_mod_vehicle" 
            ON "vehicle_modifications" ("vehicle_id");`,
    },
    
    // 類別 + 類型複合索引
    {
      name: 'idx_vehicle_mod_category_type',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_vehicle_mod_category_type" 
            ON "vehicle_modifications" ("category", "part_type");`,
    },

    // ===== WorkshopCustomer 索引 =====
    // 車廠客戶查詢
    {
      name: 'idx_workshop_customer_workshop',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workshop_customer_workshop" 
            ON "workshop_customers" ("workshop_id");`,
    },
    
    // 手機號碼唯一查詢
    {
      name: 'idx_workshop_customer_phone',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workshop_customer_phone" 
            ON "workshop_customers" ("workshop_id", "phone");`,
    },
    
    // 標籤陣列查詢 (GIN 索引)
    {
      name: 'idx_workshop_customer_tags',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workshop_customer_tags" 
            ON "workshop_customers" USING GIN ("tags");`,
    },

    // ===== WorkshopCustomerVisit 索引 =====
    // 來車記錄查詢
    {
      name: 'idx_customer_visit_customer',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_customer_visit_customer" 
            ON "workshop_customer_visits" ("customer_id", "created_at" DESC);`,
    },
    
    // 車廠查詢所有來車記錄
    {
      name: 'idx_customer_visit_workshop',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_customer_visit_workshop" 
            ON "workshop_customer_visits" ("workshop_id", "created_at" DESC);`,
    },

    // ===== ServiceRecord 索引 =====
    // 工單查詢
    {
      name: 'idx_service_record_vehicle',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_service_record_vehicle" 
            ON "service_records" ("vehicle_id", "completed_at" DESC);`,
    },
    
    {
      name: 'idx_service_record_garage',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_service_record_garage" 
            ON "service_records" ("garage_id", "completed_at" DESC);`,
    },

    // ===== ConsumerOrder 索引 =====
    // 訂單查詢
    {
      name: 'idx_consumer_order_user',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_consumer_order_user" 
            ON "consumer_orders" ("user_id", "created_at" DESC);`,
    },
    
    {
      name: 'idx_consumer_order_status',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_consumer_order_status" 
            ON "consumer_orders" ("status");`,
    },

    // ===== VehicleProfile 索引 =====
    // 用戶車輛
    {
      name: 'idx_vehicle_profile_user',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_vehicle_profile_user" 
            ON "vehicle_profiles" ("user_id");`,
    },

    // ===== MaintenanceReminder 索引 =====
    // 到期提醒查詢
    {
      name: 'idx_maintenance_reminder_due',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_reminder_due" 
            ON "maintenance_reminders" ("due_date") WHERE "enabled" = true;`,
    },
    
    {
      name: 'idx_maintenance_reminder_user',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_reminder_user" 
            ON "maintenance_reminders" ("user_id", "vehicle_id") WHERE "enabled" = true;`,
    },

    // ===== WishItem 索引 =====
    // 降價通知查詢
    {
      name: 'idx_wish_item_user',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_wish_item_user" 
            ON "wish_items" ("user_id");`,
    },
    
    {
      name: 'idx_wish_item_part',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_wish_item_part" 
            ON "wish_items" ("part_id") WHERE "part_id" IS NOT NULL;`,
    },
  ];

  console.log(`Total indexes to create: ${indexes.length}\n`);

  for (const idx of indexes) {
    try {
      console.log(`Creating: ${idx.name}...`);
      await prisma.$executeRawUnsafe(idx.sql);
      console.log(`  ✅ Done\n`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('already exists')) {
        console.log(`  ⚠️ Already exists, skipping\n`);
      } else {
        console.error(`  ❌ Failed: ${err.message}\n`);
      }
    }
  }

  console.log('✅ All indexes processed!');
}

async function analyzeTableStats() {
  console.log('\n📊 Analyzing table statistics...\n');
  
  const tables = [
    'appointments', 'parts', 'part_vehicle_compatibility',
    'vehicle_variants', 'workshops', 'garage_reviews',
    'part_modification_fitment', 'vehicle_modifications',
    'workshop_customers', 'workshop_customer_visits',
    'service_records', 'consumer_orders', 'vehicle_profiles',
    'maintenance_reminders', 'wish_items', 'part_modification_fitment',
    'workshop_customer'
  ];

  for (const table of tables) {
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT 
          schemaname,
          relname as tablename,
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size(relid)) as total_size,
          pg_size_pretty(pg_relation_size(relid)) as table_size,
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
        FROM pg_stat_user_tables
        WHERE relname = '${table}';
      `);
      
      if (result.length > 0) {
        const t = result[0];
        console.log(`${t.tablename}: ${t.row_count} rows, Table: ${t.table_size}, Index: ${t.index_size}, Total: ${t.total_size}`);
      }
    } catch (err) {
      // 忽略不存在的表
    }
  }
}

async function main() {
  try {
    await createOptimizedIndexes();
    await analyzeTableStats();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();