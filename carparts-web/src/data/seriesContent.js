// src/data/seriesContent.js — Phase 3：系列/情境內容（客戶版產品介紹）
// 說明：依品牌建立系列介紹內容，供 SeriesDetail 頁使用（零件查詢交由 /api/parts/recommended?brand= 提供）。
export const SERIES_CONTENT = [
  {
    slug: 'funk',
    title: 'FUNK 渦輪隔熱毯',
    description: '渦輪隔熱毯與引擎熱管理情境：長途行車、極端天氣下降低引擎熱負擔，安裝與保養情境說明。',
    brand: 'FUNK',
  },
  {
    slug: 'ebc',
    title: 'EBC 煞車來令片',
    description: 'EBC 來令片與煞車系統更新情境：車主保養或事故後更新，提供現貨與公司貨判定。',
    brand: 'EBC',
  },
  {
    slug: 'cts',
    title: 'CTS 性能零件',
    description: 'CTS 來令片與避震相關系列：高性能車款的下滑車與煞車需求情境。',
    brand: 'CTS',
  },
];
