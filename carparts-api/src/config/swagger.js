/**
 * OpenAPI 3.0 文件設定
 * 整合 swagger-jsdoc + swagger-ui-express
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: '車大師 (Carparts) API',
      version: '1.0.0',
      description: `
        車大師 B2B2C 汽車零件平台 API 文件
        
        ## 認證方式
        - **Bearer Token (JWT)**: 大多數 API 需要在 Header 加入 \`Authorization: Bearer <token>\`
        - **車廠專用**: 部分需要 \`garageToken\`（純車廠 session）
        
        ## 角色權限
        - **customer**: 一般車主（前台商城、訂單、愛車、保養）
        - **garage**: 車廠/維修廠（工單、預約、客戶、報表、採購）
        - **admin**: 管理員（完整 CRUD、審核、分析、銀行對帳）
        
        ## 速率限制
        - 一般 API: 100 req/min/IP
        - 批量匯入: 10 req/min/IP
        - AI 搜尋: 5 req/min/user
        
        ## 錯誤碼說明
        | 代碼 | 說明 |
        |------|------|
        | VALIDATION_ERROR | 輸入驗證失敗 |
        | UNAUTHORIZED | 未登入或 Token 過期 |
        | FORBIDDEN | 權限不足 |
        | NOT_FOUND | 資源不存在 |
        | CONFLICT | 資源衝突（如重複 SKU） |
        | INTERNAL_ERROR | 伺服器內部錯誤 |
      `,
      contact: {
        name: '車大師技術支援',
        email: 'support@carparts.example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '本地開發環境',
      },
      {
        url: 'https://api.carparts.example.com',
        description: '正式環境',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '一般用戶 JWT Token',
        },
        garageAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '車廠專用 Token',
        },
      },
      schemas: {
        // ========== 通用回應 ==========
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {},
            error: { type: 'string' },
            errorId: { type: 'string' },
            errorCode: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            parts: { type: 'array', items: { $ref: '#/components/schemas/Part' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
            modificationMatches: { type: 'object' },
            fallbackVehicle: { $ref: '#/components/schemas/VehicleVariant' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 12 },
            totalPages: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 120 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: '驗證失敗' },
            errorId: { type: 'string', example: 'err_abc123' },
            errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
            details: { type: 'object' },
          },
        },

        // ========== 使用者/認證 ==========
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            lineId: { type: 'string' },
            isApproved: { type: 'boolean' },
            address: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['phone', 'password'],
          properties: {
            phone: { type: 'string', pattern: '^09\\d{8}$' },
            password: { type: 'string', minLength: 8 },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'phone', 'password', 'confirmPassword'],
          properties: {
            name: { type: 'string', maxLength: 50 },
            phone: { type: 'string', pattern: '^09\\d{8}$' },
            password: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string' },
            agreeTerms: { type: 'boolean' },
          },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },

        // ========== 車輛 ==========
        VehicleVariant: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            make: { type: 'string', example: 'Toyota' },
            model: { type: 'string', example: 'Camry' },
            generation: { type: 'string', example: 'XV70' },
            yearStart: { type: 'integer', example: 2023 },
            yearEnd: { type: 'integer', example: 2024 },
            engineCode: { type: 'string', example: '2.5L' },
            variantName: { type: 'string', example: 'Toyota Camry 2.5L' },
            specs: { type: 'object' },
            driveType: { type: 'string', example: 'FWD' },
            transmission: { type: 'string', example: 'AT' },
            isApproved: { type: 'boolean' },
          },
        },
        VehicleProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            variantId: { type: 'integer' },
            make: { type: 'string' },
            model: { type: 'string' },
            generation: { type: 'string' },
            year: { type: 'integer' },
            engine: { type: 'string' },
            licensePlate: { type: 'string' },
            vin: { type: 'string' },
            nickname: { type: 'string' },
            mileage: { type: 'integer' },
            purchaseDate: { type: 'string', format: 'date' },
            modifications: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ========== 零件 ==========
        Part: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            sku: { type: 'string', example: 'K&N-33-2031' },
            name: { type: 'string', example: '高效能空氣濾清器' },
            brand: { type: 'string', example: 'K&N' },
            category: { type: 'string', example: '進氣系統' },
            subcategoryId: { type: 'integer' },
            subcategoryName: { type: 'string' },
            imageUrl: { type: 'string', format: 'uri' },
            description: { type: 'string' },
            specs: { type: 'object' },
            msrpPrice: { type: 'number', format: 'decimal', example: 2500 },
            wholesalePrice: { type: 'number', format: 'decimal', example: 2000 },
            stockQty: { type: 'integer', example: 50 },
            preorderLeadTimeDays: { type: 'integer', example: 21 },
            isActive: { type: 'boolean' },
            isUniversal: { type: 'boolean' },
            salesCount: { type: 'integer' },
            viewCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            compatibleVehicles: {
              type: 'array',
              items: { $ref: '#/components/schemas/VehicleVariant' },
            },
          },
        },
        PartCreateRequest: {
          type: 'object',
          required: ['sku', 'name', 'brand', 'category', 'subcategoryId', 'msrpPrice', 'wholesalePrice', 'stockQty'],
          properties: {
            sku: { type: 'string', pattern: '^[A-Z0-9\\-_]{3,50}$' },
            name: { type: 'string', maxLength: 100 },
            brand: { type: 'string', maxLength: 50 },
            category: { type: 'string' },
            subcategoryId: { type: 'integer' },
            msrpPrice: { type: 'number', minimum: 0 },
            wholesalePrice: { type: 'number', minimum: 0 },
            stockQty: { type: 'integer', minimum: 0 },
            preorderLeadTimeDays: { type: 'integer', minimum: 0, default: 21 },
            description: { type: 'string', maxLength: 2000 },
            specs: { type: 'object' },
            imageUrl: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean', default: true },
            isUniversal: { type: 'boolean', default: false },
          },
        },

        // ========== 分類 ==========
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            slug: { type: 'string' },
            parentId: { type: 'integer', nullable: true },
            sortOrder: { type: 'integer' },
            isActive: { type: 'boolean' },
            isNav: { type: 'boolean' },
            subcategories: {
              type: 'array',
              items: { $ref: '#/components/schemas/Subcategory' },
            },
          },
        },
        Subcategory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            categoryId: { type: 'integer' },
            name: { type: 'string' },
            sortOrder: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },

        // ========== 訂單 ==========
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            orderNumber: { type: 'string' },
            workshopId: { type: 'integer', nullable: true },
            userId: { type: 'string', format: 'uuid', nullable: true },
            status: { 
              type: 'string', 
              enum: ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'ARRIVED', 'IN_PROGRESS'] 
            },
            subtotalAmount: { type: 'number', format: 'decimal' },
            shippingFee: { type: 'number', format: 'decimal' },
            totalAmount: { type: 'number', format: 'decimal' },
            depositRequired: { type: 'boolean' },
            depositAmount: { type: 'number', format: 'decimal' },
            balanceAmount: { type: 'number', format: 'decimal' },
            shippingAddress: { type: 'string' },
            trackingNumber: { type: 'string' },
            paymentLast5Digits: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' },
            },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            partId: { type: 'integer' },
            skuSnapshot: { type: 'string' },
            nameSnapshot: { type: 'string' },
            priceSnapshot: { type: 'number', format: 'decimal' },
            qty: { type: 'integer' },
            isPreorder: { type: 'boolean' },
            promisedWeeks: { type: 'integer' },
            promisedWeeksMin: { type: 'integer', nullable: true },
            promisedWeeksMax: { type: 'integer', nullable: true },
          },
        },
        ConsumerOrder: {
          type: 'object',
          allOf: [
            { $ref: '#/components/schemas/Order' },
            {
              type: 'object',
              properties: {
                userId: { type: 'string', format: 'uuid' },
                isImportOrder: { type: 'boolean' },
                needInstallation: { type: 'boolean' },
                note: { type: 'string' },
                receiverName: { type: 'string' },
                receiverPhone: { type: 'string' },
              },
            },
          ],
        },

        // ========== 採購單 (B2B) ==========
        PurchaseOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            poNumber: { type: 'string' },
            workshopId: { type: 'integer' },
            status: { 
              type: 'string', 
              enum: ['SUBMITTED', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'] 
            },
            totalAmount: { type: 'number', format: 'decimal' },
            note: { type: 'string' },
            contactName: { type: 'string' },
            contactPhone: { type: 'string' },
            shippingAddress: { type: 'string' },
            confirmedAt: { type: 'string', format: 'date-time', nullable: true },
            shippedAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/PurchaseOrderItem' },
            },
          },
        },
        PurchaseOrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            purchaseOrderId: { type: 'integer' },
            partId: { type: 'integer' },
            skuSnapshot: { type: 'string' },
            nameSnapshot: { type: 'string' },
            brandSnapshot: { type: 'string' },
            priceSnapshot: { type: 'number', format: 'decimal' },
            qty: { type: 'integer' },
            isPreorder: { type: 'boolean' },
          },
        },

        // ========== 車廠/工單 ==========
        Workshop: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            companyName: { type: 'string' },
            taxId: { type: 'string' },
            lineId: { type: 'string' },
            contactPerson: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            garageName: { type: 'string' },
            garageAddress: { type: 'string' },
            garagePhone: { type: 'string' },
            isApproved: { type: 'boolean' },
            isActive: { type: 'boolean' },
            lat: { type: 'number', format: 'float' },
            lng: { type: 'number', format: 'float' },
            rating: { type: 'number', format: 'float' },
            reviewCount: { type: 'integer' },
            openingHours: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ServiceRecord: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            vehicleId: { type: 'integer' },
            workshopId: { type: 'integer' },
            appointmentId: { type: 'integer', nullable: true },
            mileage: { type: 'integer' },
            serviceDate: { type: 'string', format: 'date' },
            totalAmount: { type: 'number', format: 'decimal' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kind: { type: 'string', enum: ['LABOR', 'PART'] },
                  name: { type: 'string' },
                  unitPrice: { type: 'number', format: 'decimal' },
                  quantity: { type: 'integer' },
                  note: { type: 'string' },
                },
              },
            },
            technicianId: { type: 'integer', nullable: true },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WorkOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            workshopId: { type: 'integer' },
            appointmentId: { type: 'integer', nullable: true },
            vehicleId: { type: 'integer' },
            technicianId: { type: 'integer' },
            bayId: { type: 'integer' },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED'] 
            },
            laborItems: { type: 'array', items: { type: 'object' } },
            partItems: { type: 'array', items: { type: 'object' } },
            totalAmount: { type: 'number', format: 'decimal' },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            workshopId: { type: 'integer' },
            userId: { type: 'string', format: 'uuid' },
            vehicleId: { type: 'integer' },
            scheduledAt: { type: 'string', format: 'date-time' },
            serviceType: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] 
            },
            symptoms: { type: 'string' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ========== AI 智慧搜尋 ==========
        AiPartDraft: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            customerVehicleId: { type: 'string', format: 'uuid' },
            query: { type: 'string' },
            sourceType: { type: 'string', enum: ['text', 'image', 'voice'] },
            status: { type: 'string', enum: ['pending', 'processing', 'ready', 'approved', 'rejected'] },
            resultJson: { type: 'object' },
            itemsFound: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AiSearchRequest: {
          type: 'object',
          required: ['query', 'customerVehicleId'],
          properties: {
            query: { type: 'string', maxLength: 500 },
            customerVehicleId: { type: 'string', format: 'uuid' },
          },
        },

        // ========== 保養提醒 ==========
        MaintenanceReminder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'string', format: 'uuid' },
            vehicleId: { type: 'integer' },
            type: { 
              type: 'string', 
              enum: ['OIL', 'TIRE', 'BRAKE', 'BATTERY', 'COOLANT', 'TRANSMISSION', 'INSPECTION', 'OTHER'] 
            },
            intervalKm: { type: 'integer' },
            intervalMonths: { type: 'integer' },
            lastServiceKm: { type: 'integer' },
            lastServiceDate: { type: 'string', format: 'date' },
            nextReminderKm: { type: 'integer', nullable: true },
            nextReminderDate: { type: 'string', format: 'date', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ========== 願望清單 ==========
        WishItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
            partPhoto: { type: 'string', format: 'uri' },
            status: { type: 'string', enum: ['PENDING', 'FOUND', 'NOTIFIED', 'PURCHASED', 'EXPIRED'] },
            targetPrice: { type: 'number', format: 'decimal', nullable: true },
            notifiedAt: { type: 'string', format: 'date-time', nullable: true },
            partId: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ========== 銀行對帳 ==========
        BankTransaction: {
          type: 'object',
          properties: {
            row: { type: 'integer' },
            date: { type: 'string', format: 'date' },
            amount: { type: 'number', format: 'decimal' },
            memo: { type: 'string' },
            remitter: { type: 'string' },
          },
        },
        ReconciliationMatch: {
          type: 'object',
          properties: {
            transaction: { $ref: '#/components/schemas/BankTransaction' },
            order: { $ref: '#/components/schemas/Order' },
            stage: { type: 'string', enum: ['deposit', 'balance', 'full'] },
            matched: { type: 'boolean' },
          },
        },

        // ========== 健康檢查 ==========
        HealthCheck: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            database: { type: 'boolean' },
            redis: { type: 'boolean' },
            memory: { type: 'object' },
          },
        },
      },
    },
    security: [
      { bearerAuth: [] },
    ],
    tags: [
      { name: 'Auth', description: '認證授權' },
      { name: 'Vehicles', description: '車型查詢' },
      { name: 'Parts', description: '零件商城' },
      { name: 'Categories', description: '分類管理' },
      { name: 'Orders', description: '訂單管理' },
      { name: 'Cart', description: '購物車' },
      { name: 'Wishlist', description: '願望清單' },
      { name: 'MyCar', description: '我的愛車/保養' },
      { name: 'Appointments', description: '預約服務' },
      { name: 'ServiceRecords', description: '保養記錄' },
      { name: 'AI', description: 'AI 智慧搜尋' },
      { name: 'Garage', description: '車廠後台' },
      { name: 'Admin', description: '管理後台' },
      { name: 'Bank', description: '銀行對帳' },
      { name: 'Health', description: '健康檢查' },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/app.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec, swaggerUi, swaggerJsdoc };