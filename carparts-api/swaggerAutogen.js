/**
 * Swagger 自動產生腳本
 * 使用 swagger-autogen 掃描 Express 路由並產生 OpenAPI 3.0 規格
 * 執行：node swaggerAutogen.js
 */

const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: '車大師 (Carparts) API',
    version: '1.0.0',
    description: `
      車大師 B2B2C 汽車零件平台 API 文件 (自動產生)
      
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
      // 這裡會自動從路由註解推導，也可手動補充
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
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./src/app.js', './src/routes/*.js'];

// swagger-autogen 會自動掃描路由並產生規格
swaggerAutogen(outputFile, endpointsFiles, doc)
  .then(() => {
    console.log('✅ Swagger 規格已產生至', outputFile);
    
    // 可選：複製到公開目錄供前端使用
    // const fs = require('fs');
    // fs.copyFileSync(outputFile, '../carparts-web/public/swagger.json');
  })
  .catch(err => {
    console.error('❌ Swagger 產生失敗:', err);
    process.exit(1);
  });