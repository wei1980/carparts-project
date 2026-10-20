/**
 * Cache Keys & TTL Configuration
 * 集中管理快取鍵命名與 TTL
 */

// TTL 常數 (秒)
const TTL = {
  SHORT: 60,           // 1分鐘 - 極短暫存
  DEFAULT: 300,        // 5分鐘 - 一般快取
  MEDIUM: 600,         // 10分鐘 - 中等
  LONG: 1800,          // 30分鐘 - 較長
  VERY_LONG: 3600,     // 1小時 - 很少變動
  DAILY: 86400,        // 1天 - 靜態資料
  WEEKLY: 604800,      // 1週 - 極少變動
};

// 快取鍵前綴
const PREFIX = {
  VEHICLE: 'vehicle:',
  PART: 'part:',
  GARAGE: 'garage:',
  CATEGORY: 'category:',
  COMPATIBILITY: 'compat:',
  RECOMMENDATION: 'reco:',
  USER: 'user:',
  TAG: 'tag:',
  STATS: 'stats:',
};

// 快取鍵生成器
const KEYS = {
  // 車型相關
  vehicleYears: () => `${PREFIX.VEHICLE}years`,
  vehicleMakes: (year) => `${PREFIX.VEHICLE}makes:${year}`,
  vehicleModels: (make, year) => `${PREFIX.VEHICLE}models:${make}:${year}`,
  vehicleVariants: (make, model, year) => `${PREFIX.VEHICLE}variants:${make}:${model}:${year}`,
  vehicleDetail: (id) => `${PREFIX.VEHICLE}detail:${id}`,
  
  // 車型搜尋 (多條件)
  vehicleSearch: (params) => `${PREFIX.VEHICLE}search:${JSON.stringify(params)}`,

  // 零件相關
  partDetail: (id) => `${PREFIX.PART}detail:${id}`,
  partBySku: (sku) => `${PREFIX.PART}sku:${sku}`,
  partSearch: (params) => `${PREFIX.PART}search:${JSON.stringify(params)}`,
  partRecommended: (params) => `${PREFIX.PART}reco:${JSON.stringify(params)}`,
  partCompatibility: (vehicleId) => `${PREFIX.COMPATIBILITY}vehicle:${vehicleId}`,
  partByCategory: (categoryId) => `${PREFIX.PART}cat:${categoryId}`,
  partBySubcategory: (subcatId) => `${PREFIX.PART}subcat:${subcatId}`,
  
  // 改裝聯動
  modificationFitment: (modType, modPartId) => `${PREFIX.COMPATIBILITY}fitment:${modType}:${modPartId}`,
  vehicleModifications: (vehicleId) => `${PREFIX.COMPATIBILITY}vehicle:${vehicleId}`,
  affectedParts: (vehicleId) => `${PREFIX.COMPATIBILITY}affected:${vehicleId}`,

  // 車廠相關
  garageList: (params) => `${PREFIX.GARAGE}list:${JSON.stringify(params)}`,
  garageDetail: (id) => `${PREFIX.GARAGE}detail:${id}`,
  garageAppointments: (garageId, params) => `${PREFIX.GARAGE}appts:${garageId}:${JSON.stringify(params)}`,
  garageReports: (garageId, month) => `${PREFIX.GARAGE}reports:${garageId}:${month}`,
  garageCustomers: (garageId, params) => `${PREFIX.GARAGE}customers:${garageId}:${JSON.stringify(params)}`,
  garageCustomerDetail: (garageId, customerId) => `${PREFIX.GARAGE}customer:${garageId}:${customerId}`,
  garageStats: (garageId, month) => `${PREFIX.STATS}garage:${garageId}:${month}`,
  
  // 客戶管理
  customerList: (garageId, params) => `${PREFIX.GARAGE}customers:${garageId}:${JSON.stringify(params)}`,
  customerDetail: (garageId, customerId) => `${PREFIX.GARAGE}customer:${garageId}:${customerId}`,
  customerTags: (garageId) => `${PREFIX.TAG}garage:${garageId}`,
  
  // 分類樹
  categoryTree: () => `${PREFIX.CATEGORY}tree`,
  categoryDetail: (id) => `${PREFIX.CATEGORY}detail:${id}`,
  
  // 統計
  garageDashboardStats: (garageId) => `${PREFIX.STATS}dashboard:${garageId}`,
  monthlyRevenue: (garageId, month) => `${PREFIX.STATS}revenue:${garageId}:${month}`,
  
  // 用戶端
  userVehicle: (userId) => `${PREFIX.USER}vehicle:${userId}`,
  userAppointments: (userId) => `${PREFIX.USER}appts:${userId}`,
  userModifications: (vehicleId) => `${PREFIX.USER}mods:${vehicleId}`,
  
  // 庫存/庫存預警
  lowStockAlerts: () => `${PREFIX.PART}lowstock`,
  partStock: (partId) => `${PREFIX.PART}stock:${partId}`,
};

// 標籤系統 (用於批次失效)
const TAGS = {
  VEHICLE_DATA: 'vehicle_data',
  PART_DATA: 'part_data',
  GARAGE_DATA: 'garage_data',
  COMPATIBILITY: 'compatibility',
  CATEGORY: 'category',
  GARAGE_LIST: 'garage_list',
  CUSTOMER_DATA: 'customer_data',
  APPOINTMENT: 'appointment',
  INVENTORY: 'inventory',
};

// 鍵值 -> 標籤對應 (用於批次失效)
const KEY_TO_TAGS = {
  [PREFIX.VEHICLE]: [TAGS.VEHICLE_DATA, TAGS.COMPATIBILITY],
  [PREFIX.PART]: [TAGS.PART_DATA, TAGS.COMPATIBILITY, TAGS.INVENTORY],
  [PREFIX.GARAGE]: [TAGS.GARAGE_DATA, TAGS.GARAGE_LIST],
  [PREFIX.CATEGORY]: [TAGS.CATEGORY],
  [PREFIX.COMPATIBILITY]: [TAGS.COMPATIBILITY],
  [PREFIX.USER]: [TAGS.VEHICLE_DATA],
  [PREFIX.TAG]: [TAGS.CUSTOMER_DATA],
  [PREFIX.STATS]: [TAGS.GARAGE_DATA],
};

module.exports = {
  TTL,
  PREFIX,
  KEYS,
  TAGS,
  KEY_TO_TAGS,
};