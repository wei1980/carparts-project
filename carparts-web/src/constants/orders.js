// src/constants/orders.js — 訂單頁面靜態常數與領域純函式
// 抽離自 src/pages/Orders.jsx（第一階段重構：模組化與瘦身）
export const statusMap = {
  PENDING_PAYMENT: '待付款',
  PAYMENT_REVIEW: '匯款審核中',
  DEPOSIT_PAID: '已付款（訂金）',
  AWAITING_BALANCE: '待補尾款',
  PAID: '已付款',
  SHIPPED: '已出貨',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

// 色彩系統收斂：amber＝需要注意｜gray＝中性資訊｜green＝完成/成功｜red＝負面
export const statusColor = {
  PENDING_PAYMENT: 'text-amber-400 bg-amber-900/30',  // 待付款：需注意
  PAYMENT_REVIEW: 'text-amber-400 bg-amber-900/30',   // 審核中：需注意
  DEPOSIT_PAID: 'text-gray-400 bg-gray-800/40',       // 訂金已付：中性進度
  AWAITING_BALANCE: 'text-amber-400 bg-amber-900/30', // 待補尾款：需行動
  PAID: 'text-gray-400 bg-gray-800/40',               // 已付款：中性
  SHIPPED: 'text-green-400 bg-green-900/30',          // 已出貨：完成
  COMPLETED: 'text-green-400 bg-green-900/30',        // 已完成：完成
  CANCELLED: 'text-red-400 bg-red-900/30',            // 已取消：負面
};

export const orderTypeMap = { INSTOCK: '現貨', PREORDER: '代購', MIXED: '現貨+代購' };

// ===== 🆕 訂單進度條 =====
export const PROGRESS_STEPS = [
  { key: 'PENDING_PAYMENT', label: '待付款' },
  { key: 'PAYMENT_REVIEW',  label: '匯款審核' },
  { key: 'PAID',            label: '已付款' },
  { key: 'ARRIVED',         label: '到貨' },
  { key: 'SHIPPED',         label: '已出貨' },
  { key: 'COMPLETED',       label: '完成' },
];
// 狀態 → 進度條位置（索引）；-1 表示不適用（取消）
export const STATUS_STEP_INDEX = {
  PENDING_PAYMENT: 0,
  DEPOSIT_PAID: 2,        // 訂金已付（後台已確認收款）→ 進度視同已付款
  PAYMENT_REVIEW: 1,
  AWAITING_BALANCE: 3,    // 待補尾款 = 商品已到貨 → 通知客戶支付尾款
  PAID: 2,
  SHIPPED: 4,
  COMPLETED: 5,
};

// ===== 🆕 退貨申請 Modal =====
export const RETURN_REASON_MAP = {
  DEFECT: '商品瑕疵/損壞',
  MISMATCH: '規格/型號不符',
  CHANGE_MIND: '不想要了',
  OTHER: '其他原因',
};
export const RETURN_STATUS_MAP = {
  PENDING: '待審核',
  APPROVED: '已核可（請寄回商品）',
  REJECTED: '已駁回',
  RECEIVED: '已收到退回商品',
  REFUNDED: '已退款',
  EXCHANGED: '換貨完成',
};
export const RETURN_STATUS_COLOR = {
  PENDING: 'text-amber-400 bg-amber-900/30',     // 待審核：需注意
  APPROVED: 'text-gray-400 bg-gray-800/40',      // 已核可：中性進度
  REJECTED: 'text-red-400 bg-red-900/30',        // 已駁回：負面
  RECEIVED: 'text-gray-400 bg-gray-800/40',      // 已收貨：中性進度
  REFUNDED: 'text-green-400 bg-green-900/30',    // 已退款：完成
  EXCHANGED: 'text-cyan-300 bg-cyan-900/30',     // 換貨完成：完成
};

// 退貨期限：收貨後 7 天（起算：出貨日，無則用最後更新日）
export function returnDeadline(order) {
  const anchor = order.shipped_at || order.updated_at;
  if (!anchor) return null;
  return new Date(new Date(anchor).getTime() + 7 * 24 * 60 * 60 * 1000);
}
export const canReturnOrder = (o) =>
  ['SHIPPED', 'COMPLETED'].includes(o.status) &&
  (() => { const d = returnDeadline(o); return d ? new Date() <= d : false; })();

// ===== 🆕 銀行代碼下拉選單資料（依央行/財金公司金融機構代號）=====
export const BANK_LIST = [
  { code: '004', name: '臺灣銀行' },
  { code: '005', name: '臺灣土地銀行' },
  { code: '006', name: '合作金庫商業銀行' },
  { code: '007', name: '第一商業銀行' },
  { code: '008', name: '華南商業銀行' },
  { code: '009', name: '彰化商業銀行' },
  { code: '011', name: '上海商業儲蓄銀行' },
  { code: '012', name: '台北富邦商業銀行' },
  { code: '013', name: '國泰世華商業銀行' },
  { code: '016', name: '高雄銀行' },
  { code: '017', name: '兆豐國際商業銀行' },
  { code: '018', name: '全國農業金庫' },
  { code: '020', name: '瑞穗銀行' },
  { code: '021', name: '花旗(台灣)商業銀行' },
  { code: '022', name: '美商美國銀行' },
  { code: '023', name: '泰國盤谷銀行' },
  { code: '025', name: '菲律賓首都銀行' },
  { code: '048', name: '王道商業銀行' },
  { code: '050', name: '臺灣中小企業銀行' },
  { code: '052', name: '渣打國際商業銀行' },
  { code: '053', name: '台中商業銀行' },
  { code: '054', name: '京城商業銀行' },
  { code: '072', name: '德商德意志銀行' },
  { code: '075', name: '東亞銀行' },
  { code: '081', name: '滙豐（台灣）商業銀行' },
  { code: '082', name: '法商法國巴黎銀行' },
  { code: '101', name: '瑞興商業銀行' },
  { code: '102', name: '華泰商業銀行' },
  { code: '103', name: '臺灣新光商業銀行' },
  { code: '104', name: '台北市第五信用合作社' },
  { code: '108', name: '陽信商業銀行' },
  { code: '114', name: '基隆市第一信用合作社' },
  { code: '115', name: '基隆市第二信用合作社' },
  { code: '118', name: '板信商業銀行' },
  { code: '119', name: '淡水第一信用合作社' },
  { code: '120', name: '新北市淡水信用合作社' },
  { code: '124', name: '宜蘭信用合作社' },
  { code: '127', name: '桃園信用合作社' },
  { code: '130', name: '新竹第一信用合作社' },
  { code: '132', name: '新竹第三信用合作社' },
  { code: '146', name: '台中市第二信用合作社' },
  { code: '147', name: '三信商業銀行' },
  { code: '158', name: '彰化市第一信用合作社' },
  { code: '161', name: '彰化市第五信用合作社' },
  { code: '162', name: '彰化市第六信用合作社' },
  { code: '163', name: '彰化市第十信用合作社' },
  { code: '165', name: '彰化縣鹿港信用合作社' },
  { code: '178', name: '嘉義市第三信用合作社' },
  { code: '188', name: '台南第三信用合作社' },
  { code: '200', name: '汐止區農會' },
  { code: '204', name: '高雄市第三信用合作社' },
  { code: '213', name: '後龍鎮農會' },
  { code: '215', name: '花蓮第一信用合作社' },
  { code: '216', name: '花蓮第二信用合作社 / 草屯鎮農會' },
  { code: '219', name: '新化區農會' },
  { code: '222', name: '澎湖縣第一信用合作社' },
  { code: '223', name: '澎湖縣第二信用合作社 / 獅潭鄉農會' },
  { code: '224', name: '金門縣信用合作社' },
  { code: '226', name: '大湖地區農會' },
  { code: '229', name: '關西鎮農會' },
  { code: '232', name: '湖口鄉農會' },
  { code: '234', name: '寶山鄉農會' },
  { code: '237', name: '竹東地區農會' },
  { code: '253', name: '芎林鄉農會' },
  { code: '270', name: '南投市農會' },
  { code: '278', name: '水里鄉農會' },
  { code: '280', name: '鹿谷鄉農會' },
  { code: '285', name: '頭城鎮農會' },
  { code: '287', name: '林口區農會' },
  { code: '288', name: '木柵區農會' },
  { code: '290', name: '深坑區農會' },
  { code: '293', name: '新店地區農會' },
  { code: '295', name: '石碇區農會' },
  { code: '296', name: '坪林區農會' },
  { code: '298', name: '三峽區農會' },
  { code: '299', name: '三重區農會' },
  { code: '300', name: '新竹市農會' },
  { code: '329', name: '印尼商印尼人民銀行' },
  { code: '374', name: '霧峰區農會' },
  { code: '387', name: '連加網路商業股份有限公司(連加支付)' },
  { code: '388', name: '全盈支付金融科技股份有限公司' },
  { code: '389', name: '全支付電子支付股份有限公司' },
  { code: '390', name: '悠遊卡股份有限公司(悠遊付)' },
  { code: '391', name: '一卡通票證股份有限公司' },
  { code: '392', name: '愛金卡股份有限公司' },
  { code: '395', name: '橘子支行動支付股份有限公司' },
  { code: '396', name: '街口電子支付股份有限公司' },
  { code: '397', name: '歐付寶電子支付股份有限公司' },
  { code: '398', name: '簡單行動支付股份有限公司' },
  { code: '500', name: '基隆區漁會 / 蘇澳區漁會' },
  { code: '502', name: '頭城區漁會' },
  { code: '508', name: '通苑區漁會' },
  { code: '512', name: '雲林區漁會' },
  { code: '515', name: '嘉義區漁會' },
  { code: '517', name: '台南市區漁會' },
  { code: '518', name: '台南縣區漁會' },
  { code: '520', name: '高雄區漁會 / 小港區漁會 / 南龍區漁會' },
  { code: '521', name: '興達港區漁會 / 彌陀區漁會 / 永安區漁會 / 梓官區漁會 / 林園區漁會' },
  { code: '523', name: '東港區漁會 / 枋寮區漁會 / 林邊區漁會 / 琉球區漁會' },
  { code: '524', name: '新港區漁會' },
  { code: '525', name: '澎湖區漁會' },
  { code: '526', name: '金門區漁會' },
  { code: '538', name: '冬山鄉農會' },
  { code: '542', name: '峨眉鄉農會' },
  { code: '549', name: '三灣鄉農會' },
  { code: '551', name: '官田區農會' },
  { code: '552', name: '善化區農會' },
  { code: '556', name: '學甲區農會' },
  { code: '557', name: '新市區農會' },
  { code: '558', name: '安定區農會' },
  { code: '559', name: '山上區農會' },
  { code: '562', name: '西港區農會' },
  { code: '564', name: '白河區農會' },
  { code: '565', name: '龍崎區農會' },
  { code: '567', name: '南化區農會' },
  { code: '568', name: '七股區農會' },
  { code: '574', name: '竹山鎮農會' },
  { code: '577', name: '魚池鄉農會' },
  { code: '579', name: '國姓鄉農會' },
  { code: '581', name: '信義鄉農會' },
  { code: '583', name: '仁愛鄉農會' },
  { code: '586', name: '中寮鄉農會' },
  { code: '587', name: '埔里鎮農會' },
  { code: '596', name: '苗栗市農會' },
  { code: '598', name: '蘇澳鎮農會' },
  { code: '600', name: '農會跨行轉帳（各基層農會通用代號） / 彰化漁會 / 桃園漁會 / 瑞芳漁會 / 萬里漁會 / 新竹漁會' },
  { code: '605', name: '基隆市農會' },
  { code: '606', name: '水林鄉農會' },
  { code: '608', name: '南庄鄉農會 / 後壁區農會 / 鹿野鄉農會' },
  { code: '612', name: '豐原區農會' },
  { code: '613', name: '名間鄉農會 / 集集鎮農會' },
  { code: '614', name: '二林鎮農會 / 埤頭鄉農會 / 竹塘鄉農會 / 芬園鄉農會 / 永靖鄉農會 / 芳苑鄉農會 / 秀水鄉農會 / 埔心鄉農會' },
  { code: '616', name: '斗六市農會 / 斗南鎮農會 / 大埤鄉農會 / 古坑鄉農會 / 台西鄉農會 / 四湖鄉農會 / 口湖鄉農會 / 水林鄉農會 / 北港鎮農會 / 西螺鎮農會 / 莿桐鄉農會' },
  { code: '617', name: '水上鄉農會 / 朴子市農會 / 東石鄉農會 / 布袋鎮農會 / 竹崎鄉農會 / 溪口鄉農會 / 鹿草鄉農會 / 民雄鄉農會 / 梅山鄉農會 / 新港鄉農會 / 義竹鄉農會 / 六腳鄉農會 / 太保市農會 / 番路鄉農會 / 阿里山鄉農會 / 大林鎮農會' },
  { code: '618', name: '柳營區農會 / 佳里區農會 / 將軍區農會 / 北門區農會 / 楠西區農會 / 永康區農會 / 善化區農會 / 六甲區農會 / 玉井區農會 / 歸仁區農會 / 新營區農會 / 鹽水區農會' },
  { code: '619', name: '阿蓮區農會 / 鳳山區農會 / 岡山區農會 / 小港區農會 / 仁武區農會 / 林園區農會 / 永安區農會 / 內門區農會 / 茄萣區農會 / 鳥松區農會 / 燕巢區農會 / 彌陀區農會 / 杉林區農會 / 路竹區農會 / 六龜區農會 / 田寮區農會 / 湖內區農會 / 甲仙區農會 / 旗山區農會 / 美濃區農會 / 橋頭區農會 / 大寮區農會 / 大樹區農會 / 梓官區農會 / 大社區農會' },
  { code: '620', name: '高樹鄉農會 / 南州鄉農會 / 屏東市農會 / 屏東縣農會 / 潮州鎮農會 / 新園鄉農會 / 枋山鄉農會 / 枋寮鄉農會 / 竹田鄉農會 / 內埔鄉農會 / 崁頂鄉農會 / 萬丹鄉農會 / 萬巒鄉農會 / 琉球鄉農會 / 車城鄉農會 / 長治鄉農會 / 里港鄉農會 / 佳冬鄉農會 / 滿州鄉農會 / 麟洛鄉農會 / 東港鎮農會 / 恆春鎮農會' },
  { code: '621', name: '吉安鄉農會 / 新秀地區農會 / 富里鄉農會 / 壽豐鄉農會' },
  { code: '622', name: '成功鎮農會 / 池上鄉農會 / 台東地區農會 / 鹿野鄉農會 / 太麻里鄉農會 / 關山鎮農會 / 長濱鄉農會 / 東河鄉農會' },
  { code: '624', name: '澎湖縣農會' },
  { code: '627', name: '連江縣農會' },
  { code: '631', name: '頭屋鄉農會' },
  { code: '632', name: '景美區農會' },
  { code: '636', name: '麻豆區農會' },
  { code: '638', name: '鳳榮地區農會' },
  { code: '639', name: '玉溪地區農會' },
  { code: '642', name: '瑞穗鄉農會' },
  { code: '643', name: '潮州鎮農會' },
  { code: '646', name: '大城鄉農會' },
  { code: '649', name: '西螺鎮農會' },
  { code: '650', name: '福興鄉農會' },
  { code: '651', name: '彰化市農會' },
  { code: '665', name: '楊梅區農會' },
  { code: '680', name: '光豐地區農會 / 南港區農會' },
  { code: '685', name: '土庫鎮農會' },
  { code: '688', name: '冬山鄉農會 / 泰山區農會' },
  { code: '693', name: '東勢鄉農會' },
  { code: '697', name: '下營區農會' },
  { code: '698', name: '社頭鄉農會' },
  { code: '700', name: '中華郵政' },
  { code: '762', name: '七股區農會' },
  { code: '763', name: '花壇鄉農會' },
  { code: '767', name: '蘆竹區農會' },
  { code: '768', name: '芬園鄉農會' },
  { code: '769', name: '清水區農會' },
  { code: '770', name: '屏東市農會' },
  { code: '773', name: '觀音區農會' },
  { code: '775', name: '西湖鄉農會' },
  { code: '776', name: '五股區農會' },
  { code: '777', name: '北港鎮農會' },
  { code: '780', name: '鶯歌區農會' },
  { code: '781', name: '三峽區農會' },
  { code: '785', name: '蘆洲區農會' },
  { code: '786', name: '五結鄉農會' },
  { code: '789', name: '大園區農會' },
  { code: '790', name: '汐止區農會' },
  { code: '791', name: '芎林鄉農會' },
  { code: '792', name: '瑞芳地區農會' },
  { code: '796', name: '石碇區農會' },
  { code: '797', name: '三灣鄉農會' },
  { code: '798', name: '石門區農會' },
  { code: '799', name: '八德區農會' },
  { code: '800', name: '南庄鄉農會 / 造橋鄉農會' },
  { code: '803', name: '聯邦商業銀行' },
  { code: '805', name: '遠東國際商業銀行' },
  { code: '806', name: '元大商業銀行' },
  { code: '807', name: '永豐商業銀行' },
  { code: '808', name: '玉山商業銀行' },
  { code: '809', name: '凱基商業銀行' },
  { code: '810', name: '星展（台灣）商業銀行' },
  { code: '812', name: '台新國際商業銀行' },
  { code: '816', name: '安泰商業銀行' },
  { code: '822', name: '中國信託商業銀行' },
  { code: '823', name: '將來商業銀行' },
  { code: '824', name: '連線商業銀行（LINE Bank）' },
  { code: '826', name: '樂天國際商業銀行' },
  { code: '854', name: '沙鹿區農會' },
  { code: '858', name: '梧棲區農會' },
  { code: '860', name: '中埔鄉農會' },
  { code: '866', name: '阿里山鄉農會' },
  { code: '868', name: '東勢區農會' },
  { code: '869', name: '古坑鄉農會' },
  { code: '870', name: '屏東縣農會' },
  { code: '871', name: '萬巒鄉農會' },
  { code: '872', name: '復興區農會' },
  { code: '878', name: '銅鑼鄉農會' },
  { code: '879', name: '新社區農會' },
  { code: '880', name: '石岡區農會 / 梅山鄉農會' },
  { code: '882', name: '大肚區農會' },
  { code: '883', name: '外埔區農會' },
  { code: '886', name: '和平區農會' },
  { code: '889', name: '神岡區農會' },
  { code: '891', name: '花蓮市農會' },
  { code: '895', name: '西螺鎮農會' },
  { code: '897', name: '新店地區農會' },
  { code: '901', name: '羅東鎮農會' },
  { code: '902', name: '竹東地區農會' },
  { code: '903', name: '後龍鎮農會' },
  { code: '904', name: '線西鄉農會' },
  { code: '906', name: '頭份市農會' },
  { code: '907', name: '竹南鎮農會' },
  { code: '908', name: '通霄鎮農會' },
  { code: '910', name: '苗栗市農會' },
  { code: '914', name: '卓蘭鎮農會' },
  { code: '915', name: '公館鄉農會' },
  { code: '917', name: '伸港鄉農會' },
  { code: '922', name: '臺南市農會' },
  { code: '924', name: '溪湖鎮農會' },
  { code: '928', name: '鹿港鎮農會' },
  { code: '930', name: '臺中市農會' },
  { code: '931', name: '竹北市農會' },
  { code: '933', name: '太平區農會' },
  { code: '935', name: '峨眉鄉農會' },
  { code: '938', name: '橫山鄉農會' },
  { code: '939', name: '三星地區農會' },
  { code: '985', name: '土城區農會' },
  { code: '986', name: '內湖區農會' },
  { code: '987', name: '潭子區農會' },
  { code: '989', name: '嘉義市農會' },
];
export const BANK_NAME_BY_CODE = Object.fromEntries(BANK_LIST.map(b => [b.code, b.name]));
export const findBank = (code) => BANK_LIST.find(b => b.code === code);

// ===== 🆕 退貨原因選項（附說明）=====
export const RETURN_REASON_OPTIONS = Object.entries(RETURN_REASON_MAP).map(([key, label]) => ({
  key,
  label,
  hint: {
    DEFECT: '商品有瑕疵或損壞',
    MISMATCH: '規格或型號與訂購不符',
    CHANGE_MIND: '個人因素（代購商品不可退）',
    OTHER: '其他原因（代購商品不可退）',
  }[key],
}));

// ===== 🆕 物流單號（點擊查詢 + 一鍵複製）=====
export const TRACKING_URL = (code) => `https://www.17track.net/zh-tw/track?nums=${encodeURIComponent(code)}`;
// 🆕 依物流業者產生查貨網址：業者網址含 {number} 併入單號；不含則連查貨首頁；無業者資訊回退 17track
export const carrierTrackUrl = (carrier, code) => {
  if (carrier?.trackingUrl) {
    return carrier.trackingUrl.includes('{number}')
      ? carrier.trackingUrl.replace('{number}', encodeURIComponent(code))
      : carrier.trackingUrl;
  }
  return TRACKING_URL(code);
};
