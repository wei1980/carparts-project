// LINE Bot Flex Message 樣板
// 提供豐富的互動式訊息格式：商品卡片、確認對話框、選單等

import { TERMS } from '../constants/terms';

// ==================== 通用元件 ====================

// 標題區塊
export const buildHeader = (title, subtitle, color = '#1e3a5f') => ({
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
});

// 英雄圖片
export const buildHeroImage = (imageUrl, altText = '商品圖片') => ({
  type: 'image',
  url: imageUrl,
  altText,
  size: 'full',
  aspectRatio: '1.51:1',
  aspectMode: 'cover'
});

// 價格顯示
export const buildPriceRow = (label, price, isHighlight = false, strikethroughPrice) => ({
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
});

// 價格比較 (批發價 vs 建議售價)
export const buildPriceComparison = (wholesalePrice, msrpPrice) => ({
  type: 'box',
  layout: 'vertical',
  margin: 'md',
  contents: [
    {
      type: 'text',
      text: `${TERMS.WHOLESALE_PRICE_LABEL} ${TERMS.formatPrice(wholesalePrice)}`,
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
          text: `${TERMS.MSRP_PRICE_LABEL}`,
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
});

// 庫存狀態
export const buildStockBadge = (qty) => {
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
            text: inStock ? TERMS.IN_STOCK_LABEL : TERMS.PREORDER_LABEL,
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
};

// 通用型徽章
export const buildUniversalBadge = () => ({
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
});

// 改裝匹配徽章
export const buildModificationBadge = () => ({
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
});

// 商品資訊區塊
export const buildProductInfo = (product) => ({
  type: 'box',
  layout: 'vertical',
  margin: 'md',
  spacing: 'sm',
  contents: [
    {
      type: 'text',
      text: product.brand,
      color: '#3498db',
      size: 'sm',
      weight: 'bold'
    },
    {
      type: 'text',
      text: product.name,
      color: '#1e3a5f',
      size: 'lg',
      weight: 'bold',
      wrap: true
    },
    ...(product.category ? [{
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: product.category,
          color: '#666666',
          size: 'sm'
        },
        ...(product.subcategory ? [{
          type: 'text',
          text: ` > ${product.subcategory}`,
          color: '#999999',
          size: 'sm'
        }] : [])
      ]
    }] : []),
    ...(product.sku ? [{
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${TERMS.SKU_LABEL}: `,
          color: '#666666',
          size: 'sm',
          weight: 'bold'
        },
        {
          type: 'text',
          text: product.sku,
          color: '#666666',
          size: 'sm'
        }
      ]
    }] : []),
    ...(product.description ? [{
      type: 'text',
      text: product.description,
      color: '#666666',
      size: 'sm',
      wrap: true,
      marginTop: 'md'
    }] : [])
  ]
});

// 行動按鈕
export const buildActionButton = (label, action, style = 'primary', color) => {
  const baseButton = {
    type: 'button',
    action,
    height: 'sm',
    style: style === 'link' ? 'link' : style,
    color: color || (style === 'primary' ? '#1e3a5f' : style === 'secondary' ? '#ecf0f1' : '#3498db')
  };
  
  if (style === 'secondary') {
    baseButton.color = '#ecf0f1';
    baseButton.action = { ...action, label };
  }
  
  return {
    ...baseButton,
    margin: 'sm'
  };
};

// 確認對話框
export const buildConfirmDialog = (title, message, confirmAction, cancelAction) => ({
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
      buildActionButton(TERMS.ACTIONS.CANCEL, cancelAction || { type: 'postback', data: 'action=cancel' }, 'secondary'),
      buildActionButton(TERMS.ACTIONS.CONFIRM, confirmAction, 'primary', '#e74c3c')
    ]
  }
});

// 商品詳細卡片 (適用於搜尋結果、推薦商品)
export const buildProductCard = (product) => {
  const { 
    id, name, brand, imageUrl, msrpPrice, wholesalePrice, 
    stockQty, isUniversal, isModificationMatch, sku, category, subcategory 
  } = product;
  
  const contents = [];
  
  // Hero 圖片
  if (imageUrl) {
    contents.push(buildHeroImage(imageUrl, name));
  }
  
  // Body
  contents.push({
    type: 'box',
    layout: 'vertical',
    paddingAll: '16px',
    spacing: 'md',
    contents: [
      // 品牌 + 庫存
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
      // 名稱
      {
        type: 'text',
        text: name,
        color: '#1e3a5f',
        size: 'lg',
        weight: 'bold',
        wrap: true
      },
      // 分類路徑
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
            text: ` > ${subcategory}`,
            color: '#bbbbbb',
            size: 'xs'
          }] : [])
        ]
      }] : []),
      // 徽章
      ...(isUniversal ? [buildUniversalBadge()] : []),
      ...(isModificationMatch ? [buildModificationBadge()] : []),
      // 價格
      wholesalePrice && wholesalePrice > 0
        ? buildPriceComparison(wholesalePrice, msrpPrice)
        : buildPriceRow(TERMS.MSRP_PRICE_LABEL, msrpPrice, true)
    ]
  });
  
  // Footer - 行動按鈕
  const footer = {
    type: 'box',
    layout: 'horizontal',
    paddingAll: '16px',
    spacing: 'sm',
    contents: [
      buildActionButton(
        TERMS.ACTIONS.VIEW_DETAIL,
        { type: 'postback', data: `action=view_detail&part_id=${id}` },
        'primary'
      ),
      buildActionButton(
        TERMS.ACTIONS.ADD_TO_CART,
        { type: 'postback', data: `action=add_to_cart&part_id=${id}` },
        'secondary'
      )
    ]
  };
  
  return {
    type: 'bubble',
    hero: imageUrl ? buildHeroImage(imageUrl, name) : undefined,
    body: contents[1],
    footer
  };
};

// 多商品輪播 (Carousel)
export const buildProductCarousel = (products) => ({
  type: 'carousel',
  contents: products.map(p => buildProductCard(p))
});

// 搜尋結果摘要
export const buildSearchSummary = (total, fallbackVehicle) => ({
  type: 'bubble',
  header: buildHeader('🔍 搜尋結果', undefined, '#3498db'),
  body: {
    type: 'box',
    layout: 'vertical',
    paddingAll: '16px',
    spacing: 'md',
    contents: [
      {
        type: 'text',
        text: `找到 ${total} 筆相關商品`,
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
            text: `🚗 已自動以「${fallbackVehicle.make} ${fallbackVehicle.model}」範圍搜尋`,
            color: '#3498db',
            size: 'sm',
            wrap: true
          }
        ]
      }] : [])
    ]
  }
});

// AI 草稿通知
export const buildAiDraftNotification = (draftId, itemsFound, query) => ({
  type: 'bubble',
  header: buildHeader('🤖 AI 智慧找零件', '已建立待審核草稿', '#9b59b6'),
  body: {
    type: 'box',
    layout: 'vertical',
    paddingAll: '16px',
    spacing: 'md',
    contents: [
      {
        type: 'text',
        text: `查詢：「${query}」`,
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
            text: '找到商品數：',
            color: '#666666',
            size: 'sm'
          },
          {
            type: 'text',
            text: `${itemsFound} 筆`,
            color: '#9b59b6',
            size: 'lg',
            weight: 'bold',
            align: 'end'
          }
        ]
      },
      {
        type: 'text',
        text: '管理員審核通過後將自動上架並通知您',
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
        '查看草稿詳情',
        { type: 'postback', data: `action=view_ai_draft&draft_id=${draftId}` },
        'primary',
        '#9b59b6'
      )
    ]
  }
});

// 訂單狀態更新通知
export const buildOrderStatusNotification = (order) => {
  const { orderNumber, status, totalAmount, items } = order;
  
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
    PENDING_PAYMENT: '待付款',
    PAID: '已付款',
    PROCESSING: '處理中',
    SHIPPED: '已出貨',
    DELIVERED: '已送達',
    CANCELLED: '已取消',
    REFUNDED: '已退款'
  };
  
  return {
    type: 'bubble',
    header: buildHeader('📦 訂單狀態更新', orderNumber, statusColors[status] || '#1e3a5f'),
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
              text: '目前狀態：',
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
          text: `總金額：${TERMS.formatPrice(totalAmount)}`,
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
          text: '商品明細：',
          color: '#666666',
          size: 'sm',
          weight: 'bold'
        },
        ...items.map(item => ({
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
              text: `x${item.qty}`,
              color: '#999999',
              size: 'sm',
              align: 'end',
              flex: 1
            }
          ]
        }))
      ]
    }
  }
};

// 保養提醒通知
export const buildMaintenanceReminder = (reminder) => {
  const { vehicleName, mileage, dueMileage, dueDate, items } = reminder;
  
  return {
    type: 'bubble',
    header: buildHeader('🔧 保養提醒', vehicleName, '#e67e22'),
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
              text: '目前里程：',
              color: '#666666',
              size: 'sm',
              flex: 1
            },
            {
              type: 'text',
              text: `${mileage.toLocaleString()} km`,
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
              text: '建議保養里程：',
              color: '#666666',
              size: 'sm',
              flex: 1
            },
            {
              type: 'text',
              text: `${dueMileage.toLocaleString()} km`,
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
              text: '建議日期：',
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
          text: '建議保養項目：',
          color: '#666666',
          size: 'sm',
          weight: 'bold'
        },
        ...items.map(item => ({
          type: 'box',
          layout: 'horizontal',
          marginTop: 'xs',
          contents: [
            {
              type: 'text',
              text: `• ${item.name}`,
              color: '#333333',
              size: 'sm',
              flex: 3,
              wrap: true
            },
            {
              type: 'text',
              text: `每 ${item.interval} km`,
              color: '#999999',
              size: 'sm',
              align: 'end',
              flex: 1
            }
          ]
        }))
      ]
    }
  }
};

// 快速回覆選單
export const buildQuickReply = (items) => ({
  type: 'quickReply',
  items: items.map(item => ({
    type: 'action',
    action: {
      type: 'postback',
      label: item.label,
      data: item.data,
      displayText: item.label
    }
  }))
});

// 選單模板
export const buildMenuTemplate = (title, options) => ({
  type: 'bubble',
  header: buildHeader(title),
  body: {
    type: 'box',
    layout: 'vertical',
    paddingAll: '16px',
    spacing: 'md',
    contents: options.map((opt, index) => ({
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
    }))
  }
});

// ==================== 發送輔助函數 ====================

// 發送 Flex Message
export const sendFlexMessage = async (lineClient, userId, flexMessage) => {
  try {
    await lineClient.pushMessage(userId, {
      type: 'flex',
      altText: '車大師通知', // 通知欄顯示的替代文字
      contents: flexMessage
    });
    return { success: true };
  } catch (error) {
    console.error('LINE Flex Message 發送失敗:', error);
    return { success: false, error: error.message };
  }
};

// 批次發送
export const sendFlexMessageMulticast = async (lineClient, userIds, flexMessage) => {
  try {
    await lineClient.multicast(userIds, {
      type: 'flex',
      altText: '車大師通知',
      contents: flexMessage
    });
    return { success: true };
  } catch (error) {
    console.error('LINE Flex Message 群發失敗:', error);
    return { success: false, error: error.message };
  }
};

export default {
  buildHeader,
  buildHeroImage,
  buildPriceRow,
  buildPriceComparison,
  buildStockBadge,
  buildUniversalBadge,
  buildModificationBadge,
  buildProductInfo,
  buildActionButton,
  buildConfirmDialog,
  buildProductCard,
  buildProductCarousel,
  buildSearchSummary,
  buildAiDraftNotification,
  buildOrderStatusNotification,
  buildMaintenanceReminder,
  buildQuickReply,
  buildMenuTemplate,
  sendFlexMessage,
  sendFlexMessageMulticast
};