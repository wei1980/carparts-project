// src/services/lineFlexTemplates.js
// LINE Bot Flex Message 樣板 (API 專用版本)
// 從 carparts-web/src/line/flexTemplates.js 複製並調整為 CommonJS

const TERMS = {
  SKU: '料號',
  SKU_LABEL: '料號',
  WHOLESALE_PRICE: '批發價',
  WHOLESALE_PRICE_LABEL: '批發價',
  MSRP_PRICE: '建議售價',
  MSRP_PRICE_LABEL: '建議售價',
  RETAIL_PRICE: '零售價',
  RETAIL_PRICE_LABEL: '零售價',
  IN_STOCK: '現貨',
  IN_STOCK_LABEL: '現貨供應',
  PREORDER: '代購',
  PREORDER_LABEL: '代購商品',
  OUT_OF_STOCK: '缺貨',
  OUT_OF_STOCK_LABEL: '暫無庫存',
  UNIVERSAL: '通用',
  UNIVERSAL_LABEL: '通用 全車系',
  UNIVERSAL_DESCRIPTION: '此零件適用於所有車型',
  MODIFICATION_MATCH: '改裝專用',
  MODIFICATION_MATCH_LABEL: '改裝匹配',
  MODIFICATION_MATCH_DESCRIPTION: '此零件專為您的改裝配置設計',
  ORDER_STATUS: {
    PENDING_PAYMENT: '待付款',
    PAID: '已付款',
    PROCESSING: '處理中',
    SHIPPED: '已出貨',
    DELIVERED: '已送達',
    CANCELLED: '已取消',
    REFUNDED: '已退款',
    COMPLETED: '已完成'
  },
  SERVICE_STATUS: {
    PENDING: '待確認',
    CONFIRMED: '已確認',
    ARRIVED: '已到店',
    IN_PROGRESS: '施工中',
    COMPLETED: '已完工',
    CANCELLED: '已取消'
  },
  VEHICLE_FIELDS: {
    MAKE: '品牌',
    MODEL: '車系',
    GENERATION: '世代',
    YEAR: '年份',
    ENGINE: '引擎',
    DRIVE_TYPE: '驅動方式',
    TRANSMISSION: '變速箱',
    LICENSE_PLATE: '車牌號碼',
    VIN: '車架號碼'
  },
  CATEGORY: '分類',
  SUBCATEGORY: '子分類',
  BRAND: '品牌',
  ACTIONS: {
    ADD_TO_CART: '加入購物車',
    ADDED_TO_CART: '已加入購物車',
    BUY_NOW: '立即購買',
    VIEW_DETAIL: '查看詳情',
    EDIT: '編輯',
    DELETE: '刪除',
    SAVE: '儲存',
    CANCEL: '取消',
    CONFIRM: '確認',
    SUBMIT: '送出',
    RESET: '重置',
    SEARCH: '搜尋',
    FILTER: '篩選',
    EXPORT: '匯出',
    IMPORT: '匯入'
  },
  MESSAGES: {
    LOADING: '載入中...',
    NO_DATA: '暫無資料',
    ERROR_OCCURRED: '發生錯誤，請稍後再試',
    NETWORK_ERROR: '網路連線失敗',
    UNAUTHORIZED: '請先登入',
    FORBIDDEN: '權限不足',
    NOT_FOUND: '找不到資料',
    VALIDATION_ERROR: '輸入資料有誤，請檢查後重試',
    SAVE_SUCCESS: '儲存成功',
    SAVE_FAILED: '儲存失敗',
    DELETE_CONFIRM: '確定要刪除嗎？此操作無法復原。',
    DELETE_SUCCESS: '刪除成功',
    DELETE_FAILED: '刪除失敗'
  },
  VALIDATION: {
    REQUIRED: '此欄位為必填',
    MIN_LENGTH: (min) => `至少需要 ${min} 個字元`,
    MAX_LENGTH: (max) => `最多 ${max} 個字元`,
    INVALID_EMAIL: '電子郵件格式不正確',
    INVALID_PHONE: '手機號碼格式不正確 (09xxxxxxxx)',
    INVALID_NUMBER: '請輸入有效數字',
    INVALID_INTEGER: '請輸入整數',
    POSITIVE_NUMBER: '請輸入大於 0 的數字',
    INVALID_YEAR: '年份格式不正確 (四位數，如 2024)',
    INVALID_PRICE: '價格格式不正確',
    INVALID_SKU: '料號格式不正確',
    PASSWORD_MISMATCH: '兩次密碼輸入不一致',
    PASSWORD_TOO_SHORT: '密碼至少需要 8 個字元'
  },
  UNITS: {
    PIECE: '件',
    SET: '組',
    PAIR: '雙',
    METER: '公尺',
    KILOGRAM: '公斤',
    LITER: '公升'
  },
  formatPrice: (price, currency = 'NT$') => {
    if (price === null || price === undefined) return '—';
    const num = Number(price);
    if (isNaN(num)) return '—';
    return `${currency} ${num.toLocaleString()}`;
  },
  formatStock: (qty) => {
    if (qty === null || qty === undefined) return '暫無庫存';
    const num = Number(qty);
    if (isNaN(num)) return '暫無庫存';
    if (num > 0) return `現貨供應 ${num}件`;
    return '代購商品';
  }
};

// ==================== 通用元件 ====================

function buildHeader(title, subtitle, color) {
  color = color || '#1e3a5f';
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: color,
    paddingAll: '16px',
    contents: [
      {
        type: 'text',
        text: title,
        color: '#ffffff',
        size: 'xl',
        weight: 'bold',
        wrap: true
      },
      ...(subtitle ? [{
        type: 'text',
        text: subtitle,
        color: '#ffffffcc',
        size: 'sm',
        marginTop: '4px',
        wrap: true
      }] : [])
    ]
  };
}

function buildHeroImage(imageUrl, altText) {
  altText = altText || '商品圖片';
  return {
    type: 'image',
    url: imageUrl,
    altText: altText,
    size: 'full',
    aspectRatio: '1.51:1',
    aspectMode: 'cover'
  };
}

function buildPriceRow(label, price, isHighlight) {
  isHighlight = isHighlight || false;
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: label,
        color: '#666666',
        size: 'sm',
        flex: 1
      },
      {
        type: 'text',
        text: TERMS.formatPrice(price),
        color: isHighlight ? '#e74c3c' : '#1e3a5f',
        size: isHighlight ? 'xl' : 'md',
        weight: 'bold',
        align: 'end',
        flex: 2
      }
    ],
    margin: 'md'
  };
}

function buildPriceComparison(wholesalePrice, msrpPrice) {
  return {
    type: 'box',
    layout: 'vertical',
    margin: 'md',
    contents: [
      {
        type: 'text',
        text: TERMS.WHOLESALE_PRICE_LABEL + ' ' + TERMS.formatPrice(wholesalePrice),
        color: '#27ae60',
        size: 'lg',
        weight: 'bold'
      },
      {
        type: 'box',
        layout: 'horizontal',
        marginTop: '4px',
        contents: [
          {
            type: 'text',
            text: TERMS.MSRP_PRICE_LABEL,
            color: '#999999',
            size: 'sm'
          },
          {
            type: 'text',
            text: TERMS.formatPrice(msrpPrice),
            color: '#999999',
            size: 'sm',
            decoration: 'lineThrough',
            align: 'end'
          }
        ]
      }
    ]
  };
}

function buildStockBadge(qty) {
  const inStock = qty > 0;
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'md',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: inStock ? (TERMS.IN_STOCK_LABEL + ' ' + qty + TERMS.UNITS.PIECE) : TERMS.PREORDER_LABEL,
            color: inStock ? '#27ae60' : '#f39c12',
            size: 'sm',
            weight: 'bold'
          }
        ],
        backgroundColor: inStock ? '#e8f8f5' : '#fef9e7',
        borderColor: inStock ? '#27ae60' : '#f39c12',
        borderWidth: '1px',
        cornerRadius: '4px',
        paddingAll: '8px',
        flex: 1
      }
    ]
  };
}

function buildUniversalBadge() {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'md',
    contents: [
      {
        type: 'text',
        text: TERMS.UNIVERSAL_LABEL,
        color: '#3498db',
        size: 'xs',
        weight: 'bold',
        backgroundColor: '#ebf5fb',
        paddingHorizontal: '8px',
        paddingVertical: '4px',
        cornerRadius: '4px'
      }
    ]
  };
}

function buildModificationBadge() {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'md',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'icon',
            url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png',
            size: 'sm'
          },
          {
            type: 'text',
            text: TERMS.MODIFICATION_MATCH_LABEL,
            color: '#27ae60',
            size: 'xs',
            weight: 'bold',
            marginLeft: '4px'
          }
        ],
        backgroundColor: '#e8f8f5',
        paddingAll: '8px',
        cornerRadius: '4px'
      }
    ]
  };
}

function buildActionButton(label, action, style, color) {
  style = style || 'primary';
  const baseButton = {
    type: 'button',
    action: action,
    height: 'sm',
    style: style === 'link' ? 'link' : style,
    color: color || (style === 'primary' ? '#1e3a5f' : style === 'secondary' ? '#ecf0f1' : '#3498db')
  };
  
  if (style === 'secondary') {
    baseButton.color = '#ecf0f1';
    baseButton.action = Object.assign({}, action, { label: label });
  }
  
  return Object.assign({}, baseButton, { margin: 'sm' });
}

function buildConfirmDialog(title, message, confirmAction, cancelAction) {
  return {
    type: 'bubble',
    header: buildHeader(title, undefined, '#e74c3c'),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: message,
          color: '#1e3a5f',
          size: 'md',
          wrap: true,
          weight: 'bold'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      paddingAll: '16px',
      spacing: 'sm',
      contents: [
        buildActionButton('取消', cancelAction || { type: 'postback', data: 'action=cancel' }, 'secondary'),
        buildActionButton('確認', confirmAction, 'primary', '#e74c3c')
      ]
    }
  };
}

function buildProductCard(product) {
  const id = product.id;
  const name = product.name;
  const brand = product.brand;
  const imageUrl = product.imageUrl;
  const msrpPrice = product.msrpPrice;
  const wholesalePrice = product.wholesalePrice;
  const stockQty = product.stockQty;
  const isUniversal = product.isUniversal;
  const isModificationMatch = product.isModificationMatch;
  const sku = product.sku;
  const category = product.category;
  const subcategory = product.subcategory;
  
  const contents = [];
  
  if (imageUrl) {
    contents.push(buildHeroImage(imageUrl, name));
  }
  
  contents.push({
    type: 'box',
    layout: 'vertical',
    paddingAll: '16px',
    spacing: 'md',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: brand,
            color: '#3498db',
            size: 'sm',
            weight: 'bold',
            flex: 1
          },
          buildStockBadge(stockQty)
        ]
      },
      {
        type: 'text',
        text: name,
        color: '#1e3a5f',
        size: 'lg',
        weight: 'bold',
        wrap: true
      },
      ...(category ? [{
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: category,
            color: '#999999',
            size: 'xs'
          },
          ...(subcategory ? [{
            type: 'text',
            text: ' > ' + subcategory,
            color: '#bbbbbb',
            size: 'xs'
          }] : [])
        ]
      }] : []),
      ...(isUniversal ? [buildUniversalBadge()] : []),
      ...(isModificationMatch ? [buildModificationBadge()] : []),
      wholesalePrice && wholesalePrice > 0
        ? buildPriceComparison(wholesalePrice, msrpPrice)
        : buildPriceRow(TERMS.MSRP_PRICE_LABEL, msrpPrice, true)
    ]
  });
  
  const footer = {
    type: 'box',
    layout: 'horizontal',
    paddingAll: '16px',
    spacing: 'sm',
    contents: [
      buildActionButton(
        '查看詳情',
        { type: 'postback', data: 'action=view_detail&part_id=' + id },
        'primary'
      ),
      buildActionButton(
        '加入購物車',
        { type: 'postback', data: 'action=add_to_cart&part_id=' + id },
        'secondary'
      )
    ]
  };
  
  return {
    type: 'bubble',
    hero: imageUrl ? buildHeroImage(imageUrl, name) : undefined,
    body: contents[1] || contents[0],
    footer: footer
  };
}

function buildProductCarousel(products) {
  return {
    type: 'carousel',
    contents: products.map(function(p) { return buildProductCard(p); })
  };
}

function buildSearchSummary(total, fallbackVehicle) {
  return {
    type: 'bubble',
    header: buildHeader('\uD83D\uDD0D \u641C\u5C0B\u7D50\u679C', undefined, '#3498db'),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: '\u627E\u5230 ' + total + ' \u7C5A\u76F8\u95DC\u5546\u54C1',
          color: '#1e3a5f',
          size: 'xl',
          weight: 'bold'
        },
        ...(fallbackVehicle ? [{
          type: 'box',
          layout: 'vertical',
          marginTop: 'md',
          paddingAll: '12px',
          backgroundColor: '#ebf5fb',
          cornerRadius: '8px',
          contents: [
            {
              type: 'text',
              text: '\uD83D\uDE97 \u5DF2\u81EA\u52D5\u4EE5\u300C' + fallbackVehicle.make + ' ' + fallbackVehicle.model + '\u300D\u7BC4\u570F\u641C\u5C0B',
              color: '#3498db',
              size: 'sm',
              wrap: true
            }
          ]
        }] : [])
      ]
    }
  };
}

function buildAiDraftNotification(draftId, itemsFound, query) {
  return {
    type: 'bubble',
    header: buildHeader('\uD83E\uDD16 AI \u667A\u6167\u627E\u96B6\u4EF6', '\u5DF2\u5EFA\u7ACB\u5F85\u5BA1\u6838\u8349\u7A3F', '#9b59b6'),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: '\u67E5\u8A62\uFF1A\uFF0C' + query + '\uFF0C',
          color: '#666666',
          size: 'sm',
          wrap: true
        },
        {
          type: 'box',
          layout: 'horizontal',
          marginTop: 'md',
          contents: [
            {
              type: 'text',
              text: '\u627E\u5230\u5546\u54C1\u6578\uFF1A',
              color: '#666666',
              size: 'sm'
            },
            {
              type: 'text',
              text: itemsFound + ' \u7C5A',
              color: '#9b59b6',
              size: 'lg',
              weight: 'bold',
              align: 'end'
            }
          ]
        },
        {
          type: 'text',
          text: '\u7BA1\u7406\u54E1\u5BE9\u6838\u901A\u904E\u5F8C\u5C07\u81EA\u52D5\u4E0A\u67B6\u4E26\u901A\u77E5\u60A8',
          color: '#999999',
          size: 'xs',
          marginTop: 'md',
          wrap: true
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      paddingAll: '16px',
      spacing: 'sm',
      contents: [
        buildActionButton(
          '\u67E5\u770B\u8349\u7A3F\u8A73\u60C5',
          { type: 'postback', data: 'action=view_ai_draft&draft_id=' + draftId },
          'primary',
          '#9b59b6'
        )
      ]
    }
  };
}

function buildOrderStatusNotification(order) {
  const orderNumber = order.orderNumber;
  const status = order.status;
  const totalAmount = order.totalAmount;
  const items = order.items;
  
  const statusColors = {
    PENDING_PAYMENT: '#f39c12',
    PAID: '#3498db',
    PROCESSING: '#9b59b6',
    SHIPPED: '#27ae60',
    DELIVERED: '#27ae60',
    CANCELLED: '#e74c3c',
    REFUNDED: '#e74c3c'
  };
  
  const statusText = {
    PENDING_PAYMENT: '\u5F85\u4ED8\u6B3E',
    PAID: '\u5DF2\u4ED8\u6B3E',
    PROCESSING: '\u8655\u7406\u4E2D',
    SHIPPED: '\u5DF2\u51FA\u8CA8',
    DELIVERED: '\u5DF2\u9001\u9054',
    CANCELLED: '\u5DF2\u53D6\u6D88',
    REFUNDED: '\u5DF2\u9000\u6B3E'
  };
  
  return {
    type: 'bubble',
    header: buildHeader('\uD83D\uDCE6 \u8A02\u55AE\u72B6\u614B\u66F4\u65B0', orderNumber, statusColors[status] || '#1e3a5f'),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '\u76EE\u524D\u72B6\u614B\uFF1A',
              color: '#666666',
              size: 'sm',
              flex: 1
            },
            {
              type: 'text',
              text: statusText[status] || status,
              color: statusColors[status] || '#1e3a5f',
              size: 'md',
              weight: 'bold',
              align: 'end',
              flex: 2
            }
          ]
        },
        {
          type: 'text',
          text: '\u7E3C\u91D1\u984D\uFF1A' + TERMS.formatPrice(totalAmount),
          color: '#1e3a5f',
          size: 'md',
          weight: 'bold'
        },
        {
          type: 'separator',
          margin: 'md'
        },
        {
          type: 'text',
          text: '\u5546\u54C1\u660E\u7D30\uFF1A',
          color: '#666666',
          size: 'sm',
          weight: 'bold'
        },
        ...items.map(function(item) {
          return {
            type: 'box',
            layout: 'horizontal',
            marginTop: 'xs',
            contents: [
              {
                type: 'text',
                text: item.name,
                color: '#333333',
                size: 'sm',
                flex: 3,
                wrap: true
              },
              {
                type: 'text',
                text: 'x' + item.qty,
                color: '#999999',
                size: 'sm',
                align: 'end',
                flex: 1
              }
            ]
          };
        })
      ]
    }
  };
}

function buildMaintenanceReminder(reminder) {
  const vehicleName = reminder.vehicleName;
  const mileage = reminder.mileage;
  const dueMileage = reminder.dueMileage;
  const dueDate = reminder.dueDate;
  const items = reminder.items;
  
  return {
    type: 'bubble',
    header: buildHeader('\uD83D\uD2C7 \u4FDD\u9990\u63D0\u9192', vehicleName, '#e67e22'),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '\u76EE\u524D\u91CC\u7A0B\uFF1A',
              color: '#666666',
              size: 'sm',
              flex: 1
            },
            {
              type: 'text',
              text: mileage.toLocaleString() + ' km',
              color: '#1e3a5f',
              size: 'md',
              weight: 'bold',
              align: 'end',
              flex: 2
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '\u5EFA\u8B70\u4FDD\u9990\u91CC\u7A0B\uFF1A',
              color: '#666666',
              size: 'sm',
              flex: 1
            },
            {
              type: 'text',
              text: dueMileage.toLocaleString() + ' km',
              color: '#e67e22',
              size: 'md',
              weight: 'bold',
              align: 'end',
              flex: 2
            }
          ]
        },
        ...(dueDate ? [{
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '\u5EFA\u8B70\u65E5\u671F\uFF1A',
              color: '#666666',
              size: 'sm',
              flex: 1
            },
            {
              type: 'text',
              text: dueDate,
              color: '#e67e22',
              size: 'md',
              weight: 'bold',
              align: 'end',
              flex: 2
            }
          ]
        }] : []),
        {
          type: 'separator',
          margin: 'md'
        },
        {
          type: 'text',
          text: '\u5EFA\u8B70\u4FDD\u9990\u9805\u76EE\uFF1A',
          color: '#666666',
          size: 'sm',
          weight: 'bold'
        },
        ...items.map(function(item) {
          return {
            type: 'box',
            layout: 'horizontal',
            marginTop: 'xs',
            contents: [
              {
                type: 'text',
                text: '\u2022 ' + item.name,
                color: '#333333',
                size: 'sm',
                flex: 3,
                wrap: true
              },
              {
                type: 'text',
                text: '\u6BCF ' + item.interval + ' km',
                color: '#999999',
                size: 'sm',
                align: 'end',
                flex: 1
              }
            ]
          };
        })
      ]
    }
  };
}

function buildQuickReply(items) {
  return {
    type: 'quickReply',
    items: items.map(function(item) {
      return {
        type: 'action',
        action: {
          type: 'postback',
          label: item.label,
          data: item.data,
          displayText: item.label
        }
      };
    })
  };
}

function buildMenuTemplate(title, options) {
  return {
    type: 'bubble',
    header: buildHeader(title),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: options.map(function(opt, index) {
        return {
          type: 'button',
          action: {
            type: 'postback',
            label: opt.label,
            data: opt.data,
            displayText: opt.label
          },
          style: 'secondary',
          marginTop: index === 0 ? 'none' : 'sm',
          height: 'sm'
        };
      })
    }
  };
}

function sendFlexMessage(lineClient, userId, flexMessage) {
  return lineClient.pushMessage(userId, {
    type: 'flex',
    altText: '\u8ECA\u5927\u5E2B\u901A\u77E5',
    contents: flexMessage
  }).then(function() {
    return { success: true };
  }).catch(function(error) {
    console.error('LINE Flex Message \u767C\u9001\u5931\u6557:', error);
    return { success: false, error: error.message };
  });
}

function sendFlexMessageMulticast(lineClient, userIds, flexMessage) {
  return lineClient.multicast(userIds, {
    type: 'flex',
    altText: '\u8ECA\u5927\u5E2B\u901A\u77E5',
    contents: flexMessage
  }).then(function() {
    return { success: true };
  }).catch(function(error) {
    console.error('LINE Flex Message \u7FA4\u767C\u5931\u6557:', error);
    return { success: false, error: error.message };
  });
}

const statusText = {
  PENDING_PAYMENT: '\u5F85\u4ED8\u6B3E',
  PAID: '\u5DF2\u4ED8\u6B3E',
  PROCESSING: '\u8655\u7406\u4E2D',
  SHIPPED: '\u5DF2\u51FA\u8CA8',
  DELIVERED: '\u5DF2\u9001\u9054',
  CANCELLED: '\u5DF2\u53D6\u6D88',
  REFUNDED: '\u5DF2\u9000\u6B3E'
};

module.exports = {
  TERMS: TERMS,
  buildHeader: buildHeader,
  buildHeroImage: buildHeroImage,
  buildPriceRow: buildPriceRow,
  buildPriceComparison: buildPriceComparison,
  buildStockBadge: buildStockBadge,
  buildUniversalBadge: buildUniversalBadge,
  buildModificationBadge: buildModificationBadge,
  buildActionButton: buildActionButton,
  buildConfirmDialog: buildConfirmDialog,
  buildProductCard: buildProductCard,
  buildProductCarousel: buildProductCarousel,
  buildSearchSummary: buildSearchSummary,
  buildAiDraftNotification: buildAiDraftNotification,
  buildOrderStatusNotification: buildOrderStatusNotification,
  buildMaintenanceReminder: buildMaintenanceReminder,
  buildQuickReply: buildQuickReply,
  buildMenuTemplate: buildMenuTemplate,
  sendFlexMessage: sendFlexMessage,
  sendFlexMessageMulticast: sendFlexMessageMulticast,
  statusText: statusText
};