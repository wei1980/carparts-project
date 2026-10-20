/**
 * OpenAPI 3.0 Specification for Carparts API
 * 產生方式：npx swagger-jsdoc -d swaggerConfig.js -o swagger.json
 * 或整合到 Express: app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
 */

const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: '車大師 (Carparts) API',
      version: '1.0.0',
      description: `
        車大師 B2B2C 汽車零件平台 API 文件
        
        ## 架構說明
        - **carparts-api**: Express + Prisma + PostgreSQL (Port 3000)
        - **carparts-web**: React 19 + Vite + Tailwind 4 (Port 5173)
        
        ## 認證方式
        - **JWT Bearer Token**: 大多數 API 需要在 Header 中攜帶 \`Authorization: Bearer <token>\`
        - **車廠專屬**: 特定端點需攜帶 \`garageToken\` 以獲取批發價/料號
        
        ## 角色權限
        - **匿名/車主**: 瀏覽商品、下單、查詢車型、我的愛車、願望清單
        - **車廠**: 管理預約、工單、客戶、報表、採購單、服務記錄
        - **管理員**: 完整 CRUD、用戶管理、商品管理、車型審核、銀行對帳、系統設定
        
        ## 錯誤回應格式
        所有錯誤回應皆符合統一格式：
        \`\`\`json
        {
          "error": "錯誤訊息",
          "errorId": "追蹤碼 (UUID)",
          "errorCode": "錯誤代碼 (如: VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR)"
        }
        \`\`\`
        
        ## 分頁格式
        列表端點支援分頁參數：
        \`\`\`
        ?page=1&pageSize=12&sort=hot
        \`\`\`
        回應包含：
        \`\`\`json
        {
          "parts": [...],
          "pagination": {
            "page": 1,
            "pageSize": 12,
            "totalPages": 5,
            "total": 58
          }
        }
        \`\`\`
      `,
      contact: {
        name: '車大師開發團隊',
        email: 'dev@carparts.example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '本地開發環境'
      },
      {
        url: 'https://api.carparts.example.com',
        description: '生產環境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token 從 /api/auth/login 取得'
        },
        garageAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '車廠專用 Token，從 /api/garage/login 取得，用於獲取批發價/料號'
        }
      },
      schemas: {
        // ==================== 通用回應 ====================
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: '找不到資料' },
            errorId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            errorCode: { type: 'string', example: 'NOT_FOUND' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: '操作成功' }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 12 },
            totalPages: { type: 'integer', example: 5 },
            total: { type: 'integer', example: 58 }
          }
        },
        
        // ==================== 認證相關 ====================
        AuthRegisterRequest: {
          type: 'object',
          required: ['email', 'phone', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            phone: { type: 'string', pattern: '^09\\d{8}$', example: '0912345678' },
            password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePass123' },
            name: { type: 'string', maxLength: 50, example: '王小明' }
          }
        },
        AuthLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', format: 'password', example: 'SecurePass123' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT Token' },
            user: { $ref: '#/components/schemas/UserProfile' }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            lineId: { type: 'string', nullable: true },
            isApproved: { type: 'boolean' },
            address: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // ==================== 車型相關 ====================
        VehicleMake: {
          type: 'object',
          properties: {
            make: { type: 'string', example: 'Toyota' }
          }
        },
        VehicleModel: {
          type: 'object',
          properties: {
            model: { type: 'string', example: 'Camry' }
          }
        },
        VehicleYear: {
          type: 'object',
          properties: {
            year_start: { type: 'integer', example: 2023 }
          }
        },
        VehicleVariant: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            make: { type: 'string', example: 'Toyota' },
            model: { type: 'string', example: 'Camry' },
            generation: { type: 'string', example: 'XV70' },
            engine_code: { type: 'string', example: '2.5L' },
            variant_name: { type: 'string', example: 'Toyota Camry 2.5L' },
            year_start: { type: 'integer', example: 2023 },
            year_end: { type: 'integer', example: 2023 },
            drive_type: { type: 'string', example: 'FWD' },
            transmission: { type: 'string', example: 'AT' },
            is_approved: { type: 'boolean', example: true }
          }
        },
        EngineOption: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            code: { type: 'string', example: '2.5L' },
            display: { type: 'string', example: '2.5L (2.5) - 203hp - Gasoline - FWD' }
          }
        },
        VehicleProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            variantId: { type: 'integer', nullable: true },
            vin: { type: 'string', nullable: true },
            licensePlate: { type: 'string', nullable: true },
            make: { type: 'string', nullable: true },
            model: { type: 'string', nullable: true },
            generation: { type: 'string', nullable: true },
            year: { type: 'integer', nullable: true },
            engine: { type: 'string', nullable: true },
            modifications: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            regPhotoUrl: { type: 'string', nullable: true }
          }
        },
        
        // ==================== 分類相關 ====================
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: '進氣系統' },
            slug: { type: 'string', nullable: true, example: 'intake' },
            parent_id: { type: 'integer', nullable: true },
            sort_order: { type: 'integer', example: 0 },
            is_active: { type: 'boolean', example: true },
            is_nav: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Subcategory: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            category_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: '空氣濾清器' },
            sort_order: { type: 'integer', example: 0 },
            is_active: { type: 'boolean', example: true }
          }
        },
        
        // ==================== 零件相關 ====================
        Part: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            sku: { type: 'string', example: 'AF-TOY-001' },
            name: { type: 'string', example: 'Toyota Camry 空氣濾清器' },
            brand: { type: 'string', example: 'K&N' },
            category: { type: 'string', example: '進氣系統' },
            subcategory_id: { type: 'integer', nullable: true },
            image_url: { type: 'string', nullable: true, example: '/media/parts/intake/airfilter/k&n/af-toy-001.webp' },
            description: { type: 'string', nullable: true },
            msrp_price: { type: 'number', format: 'decimal', example: 2500 },
            wholesale_price: { type: 'number', format: 'decimal', example: 2000, description: '僅車廠可見' },
            stock_qty: { type: 'integer', example: 50 },
            preorder_lead_time_days: { type: 'integer', example: 21 },
            is_active: { type: 'boolean', example: true },
            is_universal: { type: 'boolean', example: false },
            sales_count: { type: 'integer', example: 120 },
            view_count: { type: 'integer', example: 500 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        PartRecommendedResponse: {
          type: 'object',
          properties: {
            parts: {
              type: 'array',
              items: { $ref: '#/components/schemas/Part' }
            },
            pagination: { $ref: '#/components/schemas/PaginationResponse' },
            fallbackVehicle: { $ref: '#/components/schemas/VehicleVariant' },
            modificationMatches: {
              type: 'object',
              nullable: true,
              properties: {
                message: { type: 'string' },
                matchedParts: { type: 'array', items: { type: 'integer' } }
              }
            }
          }
        },
        PartDetailResponse: {
          allOf: [
            { $ref: '#/components/schemas/Part' },
            {
              type: 'object',
              properties: {
                compatible_vehicles: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/VehicleVariant' }
                }
              }
            }
          ]
        },
        
        // ==================== 購物車/訂單 ====================
        CartItem: {
          type: 'object',
          properties: {
            part: { $ref: '#/components/schemas/Part' },
            quantity: { type: 'integer', example: 1 }
          }
        },
        ConsumerOrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            part_id: { type: 'integer' },
            sku_snapshot: { type: 'string' },
            name_snapshot: { type: 'string' },
            price_snapshot: { type: 'number', format: 'decimal' },
            qty: { type: 'integer' },
            is_preorder: { type: 'boolean' }
          }
        },
        ConsumerOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_number: { type: 'string', example: 'ORD-20240101-0001' },
            userId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'], example: 'PENDING_PAYMENT' },
            subtotal_amount: { type: 'number', format: 'decimal' },
            shipping_fee: { type: 'number', format: 'decimal' },
            total_amount: { type: 'number', format: 'decimal' },
            payment_last_5_digits: { type: 'string', nullable: true },
            deposit_required: { type: 'boolean' },
            shipping_address: { type: 'string' },
            tracking_number: { type: 'string', nullable: true },
            receiver_name: { type: 'string' },
            receiver_phone: { type: 'string' },
            note: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            items: { type: 'array', items: { $ref: '#/components/schemas/ConsumerOrderItem' } }
          }
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['items', 'receiver_name', 'receiver_phone', 'shipping_address'],
          properties: {
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['part_id', 'quantity'],
                properties: {
                  part_id: { type: 'integer' },
                  quantity: { type: 'integer', minimum: 1 }
                }
              }
            },
            receiver_name: { type: 'string', maxLength: 50 },
            receiver_phone: { type: 'string', pattern: '^09\\d{8}$' },
            shipping_address: { type: 'string', maxLength: 200 },
            note: { type: 'string', maxLength: 500, nullable: true }
          }
        },
        
        // ==================== 願望清單 ====================
        WishItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
            partPhoto: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['PENDING', 'QUOTED', 'FOUND', 'EXPIRED', 'CANCELLED'], example: 'PENDING' },
            handledBy: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            notifiedAt: { type: 'string', format: 'date-time', nullable: true },
            partId: { type: 'integer', nullable: true },
            targetPrice: { type: 'number', format: 'decimal', nullable: true },
            notifiedAtPrice: { type: 'number', format: 'decimal', nullable: true },
            part: { $ref: '#/components/schemas/Part', nullable: true }
          }
        },
        CreateWishRequest: {
          type: 'object',
          required: ['description'],
          properties: {
            description: { type: 'string', maxLength: 500 },
            partPhoto: { type: 'string', format: 'uri', nullable: true },
            targetPrice: { type: 'number', minimum: 0, nullable: true },
            customerVehicleId: { type: 'integer', nullable: true }
          }
        },
        
        // ==================== 車廠端 ====================
        GarageAppointment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            workshop_id: { type: 'integer' },
            userId: { type: 'string', format: 'uuid' },
            vehicleId: { type: 'string', format: 'uuid' },
            scheduled_at: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'PENDING' },
            note: { type: 'string', nullable: true },
            install_items: { type: 'array', items: { type: 'object' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            user: { $ref: '#/components/schemas/UserProfile' },
            vehicle: { $ref: '#/components/schemas/VehicleProfile' }
          }
        },
        GarageWorkOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            workshop_id: { type: 'integer' },
            appointment_id: { type: 'integer', nullable: true },
            customer_id: { type: 'integer', nullable: true },
            status: { type: 'string', enum: ['DRAFT', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED'], example: 'DRAFT' },
            total_amount: { type: 'number', format: 'decimal' },
            note: { type: 'string', nullable: true },
            items: { type: 'array', items: { type: 'object' } },
            labor_items: { type: 'array', items: { type: 'object' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        GarageCustomer: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            workshop_id: { type: 'integer' },
            name: { type: 'string' },
            phone: { type: 'string' },
            line_id: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            note: { type: 'string', nullable: true },
            visit_count: { type: 'integer', example: 0 },
            last_visit: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        
        // ==================== 管理端 ====================
        AdminUser: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            company_name: { type: 'string' },
            role: { type: 'string', enum: ['TRIAL', 'STANDARD', 'PREMIUM', 'ADMIN'], example: 'STANDARD' },
            is_approved: { type: 'boolean' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        AdminPart: {
          allOf: [
            { $ref: '#/components/schemas/Part' },
            {
              type: 'object',
              properties: {
                // 管理端額外欄位
              }
            }
          ]
        },
        
        // ==================== 銀行對帳 ====================
        BankTransaction: {
          type: 'object',
          properties: {
            row: { type: 'integer', example: 2 },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            amount: { type: 'number', format: 'decimal', example: 3500 },
            memo: { type: 'string', example: '王小明 12345' },
            remitter: { type: 'string', example: '王小明' }
          }
        },
        ReconciliationMatch: {
          type: 'object',
          properties: {
            matched: { type: 'boolean' },
            stage: { type: 'string', enum: ['deposit', 'balance', 'full'] },
            transaction: { $ref: '#/components/schemas/BankTransaction' },
            order: { $ref: '#/components/schemas/ConsumerOrder' }
          }
        },
        
        // ==================== 健康檢查 ====================
        HealthCheck: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: true },
            timestamp: { type: 'string', format: 'date-time' },
            database: { type: 'string', enum: ['connected', 'disconnected'] },
            redis: { type: 'string', enum: ['connected', 'disconnected'] },
            uptime: { type: 'number', example: 3600 }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ],
    tags: [
      { name: 'Auth', description: '認證授權' },
      { name: 'Vehicles', description: '車型查詢 (公開)' },
      { name: 'Parts', description: '零件搜尋與詳情' },
      { name: 'Cart', description: '購物車' },
      { name: 'Orders', description: '訂單管理' },
      { name: 'Wishlist', description: '願望清單/降價通知' },
      { name: 'MyCar', description: '我的愛車/保養提醒' },
      { name: 'Garage', description: '車廠端功能' },
      { name: 'Admin', description: '管理後台' },
      { name: 'AI', description: 'AI 智慧找零件' },
      { name: 'Health', description: '健康檢查' }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/app.js'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerSpec, options };