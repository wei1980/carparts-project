// LINE Bot Flex Message 模板
// 參考 LINE 官方 Flex Message 規格：https://developers.line.biz/en/reference/messaging-api/#flex-message

import { formatPrice } from '../constants/terms';

// ========== 通用組件 ==========

// 標題區塊
export const headerBlock = (title, subtitle = '') => ({
  type: 'box',
  layout: 'vertical',
  contents: [
    {
      type: 'text',
      text: title,
      weight: 'bold',
      size: 'xl',
      color: '#1a1a2e',
      wrap: true,
    },
    ...(subtitle ? [{
      type: 'text',
      text: subtitle,
      size: 'sm',
      color: '#666666',
      margin: 'md',
      wrap: true,
    }] : []),
  ],
  paddingAll: '20px',
  backgroundColor: '#f8f9fa',
  borderWidth: '1px',
  borderColor: '#eaeaea',
});

// 分隔線
export const separator = () => ({
  type: 'separator',
  margin: 'md',
});

// 圖片區塊
export const imageBlock = (imageUrl, aspectRatio = '20:13') => ({
  type: 'image',
  url: imageUrl,
  size: 'full',
  aspectRatio,
  aspectMode: 'cover',
  margin: 'md',
});

// 價格顯示區塊
export const priceBlock = (msrpPrice, wholesalePrice = null, isGarage = false) => {
  const displayPrice = isGarage && wholesalePrice ? wholesalePrice : msrpPrice;
  const label = isGarage && wholesalePrice ? '批發價' : '售價';
  
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      {
        type: 'text',
        text: label,
        size: 'sm',
        color: '#888888',
        flex: 0,
      },
      {
        type: 'text',
        text: formatPrice(displayPrice),
        size: 'xl',
        weight: 'bold',
        color: isGarage && wholesalePrice ? '#10b981' : '#3b82f6',
        flex: 0,
      },
      ...(isGarage && wholesalePrice ? [{
        type: 'text',
        text: formatPrice(msrpPrice),
        size: 'sm',
        color: '#999999',
        decoration: 'line-through',
        flex: 0,
      }] : []),
    ],
  };
};

// 庫存狀態標籤
export const stockBadge = (qty) => {
  if (!qty || qty <= 0) {
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '缺貨',
          size: 'xs',
          color: '#ffffff',
          backgroundColor: '#ef4444',
          paddingHorizontal: '8px',
          paddingVertical: '2px',
          cornerRadius: '4px',
        },
      ],
    };
  }
  if (qty <= 5) {
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `庫存 ${qty} 件`,
          size: 'xs',
          color: '#ffffff',
          backgroundColor: '#f59e0b',
          paddingHorizontal: '8px',
          paddingVertical: '2px',
          cornerRadius: '4px',
        },
      ],
    };
  }
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: `現貨 ${qty} 件`,
        size: 'xs',
        color: '#ffffff',
        backgroundColor: '#10b981',
        paddingHorizontal: '8px',
        paddingVertical: '2px',
        cornerRadius: '4px',
      },
    ],
  };
};

// 按鈕區塊
export const actionButton = (label, action, style = 'primary') => {
  const styles = {
    primary: { color: '#3b82f6', backgroundColor: '#eff6ff' },
    secondary: { color: '#6b7280', backgroundColor: '#f3f4f6' },
    success: { color: '#10b981', backgroundColor: '#ecfdf5' },
    danger: { color: '#ef4444', backgroundColor: '#fef2f2' },
  };
  
  const s = styles[style] || styles.primary;
  
  return {
    type: 'button',
    style: 'link',
    height: 'sm',
    action: typeof action === 'string' 
      ? { type: 'uri', label, uri: action }
      : action,
    color: s.color,
    gravity: 'center',
    margin: 'sm',
    cornerRadius: '8px',
  };
};

// 彈性按鈕群組
export const buttonGroup = (buttons) => ({
  type: 'box',
  layout: 'horizontal',
  spacing: 'sm',
  margin: 'md',
  contents: buttons.map(btn => ({
    type: 'button',
    ...btn,
    flex: 1,
    height: 'sm',
  })),
});

// ========== 具體訊息模板 ==========

// 1. 商品搜尋結果卡片
export const productSearchResultCard = (product, isGarage = false) => ({
  type: 'bubble',
  size: 'kilo',
  hero: product.image_url ? {
    type: 'image',
    url: product.image_url,
    size: 'full',
    aspectRatio: '20:13',
    aspectMode: 'cover',
  } : undefined,
  body: {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    paddingAll: '16px',
    contents: [
      // 品牌
      {
        type: 'text',
        text: product.brand || '',
        size: 'xs',
        color: '#3b82f6',
        weight: 'bold',
      },
      // 名稱
      {
        type: 'text',
        text: product.name,
        size: 'lg',
        weight: 'bold',
        color: '#1a1a2e',
        wrap: true,
        maxLines: 2,
      },
      // 分類
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        marginTop: 'sm',
        contents: [
          {
            type: 'text',
            text: product.category || '',
            size: 'xs',
            color: '#888888',
          },
          product.subcategory_id && {
            type: 'text',
            text: '·',
            size: 'xs',
            color: '#cccccc',
          },
          product.subcategory_id && {
            type: 'text',
            text: product.subcategory_id,
            size: 'xs',
            color: '#888888',
          },
        ].filter(Boolean),
      },
      // 價格
      priceBlock(product.msrp_price, product.wholesale_price, isGarage),
      // 庫存狀態
      stockBadge(product.stock_qty),
      // 料號（車廠才看得到）
      ...(isGarage && product.sku ? [{
        type: 'text',
        text: `料號: ${product.sku}`,
        size: 'xs',
        color: '#888888',
        marginTop: 'sm',
      }] : []),
    ],
  },
  footer: {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    paddingAll: '16px',
    contents: [
      actionButton('查看詳情', {
        type: 'postback',
        label: '查看詳情',
        data: `action=view_product&product_id=${product.id}`,
      }, 'primary'),
      actionButton('加入購物車', {
        type: 'postback',
        label: '加入購物車',
        data: `action=add_to_cart&product_id=${product.id}`,
      }, 'success'),
    ],
  },
});

// 2. 訂單確認通知
export const orderConfirmationMessage = (order) => ({
  type: 'bubble',
  size: 'mega',
  header: headerBlock('✅ 訂單已確認', `訂單編號: ${order.order_number}`),
  body: {
    type: 'box',
    layout: 'vertical',
    spacing: 'md',
    paddingAll: '20px',
    contents: [
      // 狀態
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: '狀態',
            size: 'sm',
            color: '#888888',
            flex: 1,
          },
          {
            type: 'text',
            text: getOrderStatusText(order.status),
            size: 'sm',
            color: getOrderStatusColor(order.status),
            weight: 'bold',
            flex: 1,
            align: 'end',
          },
        ],
      },
      separator(),
      // 商品列表
      ...order.items.slice(0, 3).map(item => ({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          item.image_url ? {
            type: 'image',
            url: item.image_url,
            size: '40px',
            aspectRatio: '1:1',
          } : undefined,
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            flex: 1,
            contents: [
              {
                type: 'text',
                text: item.name_snapshot,
                size: 'sm',
                weight: 'bold',
                color: '#1a1a2e',
                wrap: true,
              },
              {
                type: 'text',
                text: `${formatPrice(item.price_snapshot)} × ${item.qty}`,
                size: 'xs',
                color: '#888888',
              },
            ],
          },
          {
            type: 'text',
            text: formatPrice(Number(item.price_snapshot) * item.qty),
            size: 'sm',
            weight: 'bold',
            color: '#1a1a2e',
            align: 'end',
          },
        ].filter(Boolean),
      })),
      // 更多商品
      ...(order.items.length > 3 ? [{
        type: 'text',
        text: `... 還有 ${order.items.length - 3} 項商品`,
        size: 'xs',
        color: '#888888',
        marginTop: 'sm',
      }] : []),
      separator(),
      // 金額摘要
      {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          amountRow('商品小計', formatPrice(order.subtotal_amount)),
          amountRow('運費', formatPrice(order.shipping_fee || 0)),
          ...(order.deposit_required ? [
            amountRow('已付訂金', formatPrice(order.deposit_amount), '#10b981'),
          ] : []),
          separator(),
          amountRow('總計', formatPrice(order.total_amount), '#1a1a2e', 'xl', true),
        ],
      },
    ],
  },
  footer: {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    paddingAll: '20px',
    contents: [
      actionButton('查看訂單詳情', {
        type: 'uri',
        label: '查看訂單詳情',
        uri: `https://your-domain.com/orders/${order.id}`,
      }, 'primary'),
      actionButton('聯繫客服', {
        type: 'uri',
        label: '聯繫客服',
        uri: 'https://line.me/R/ti/p/@your-line-id',
      }, 'secondary'),
    ],
  },
});

// 3. 願望清單降價通知
export const priceDropNotification = (product, oldPrice, newPrice) => ({
  type: 'bubble',
  size: 'kilo',
  hero: product.image_url ? imageBlock(product.image_url) : undefined,
  body: {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    paddingAll: '16px',
    contents: [
      {
        type: 'text',
        text: '🎉 降價提醒',
        size: 'xl',
        weight: 'bold',
        color: '#ef4444',
      },
      {
        type: 'text',
        text: '您關注的商品降價了！',
        size: 'md',
        color: '#666666',
        marginTop: 'sm',
      },
      separator(),
      {
        type: 'text',
        text: product.name,
        size: 'lg',
        weight: 'bold',
        color: '#1a1a2e',
        wrap: true,
      },
      {
        type: 'text',
        text: product.brand,
        size: 'sm',
        color: '#3b82f6',
      },
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        marginTop: 'md',
        contents: [
          {
            type: 'text',
            text: formatPrice(oldPrice),
            size: 'lg',
            color: '#999999',
            decoration: 'line-through',
          },
          {
            type: 'text',
            text: formatPrice(newPrice),
            size: 'xl',
            weight: 'bold',
            color: '#ef4444',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `省 ${formatPrice(oldPrice - newPrice)}`,
                size: 'sm',
                color: '#10b981',
                weight: 'bold',
                backgroundColor: '#ecfdf5',
                paddingHorizontal: '8px',
                paddingVertical: '2px',
                cornerRadius: '4px',
              },
            ],
          },
        ],
      },
      stockBadge(product.stock_qty),
    ],
  },
  footer: {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    paddingAll: '16px',
    contents: [
      actionButton('立即購買', {
        type: 'postback',
        label: '立即購買',
        data: `action=buy_now&product_id=${product.id}`,
      }, 'primary'),
      actionButton('移除通知', {
        type: 'postback',
        label: '移除通知',
        data: `action=remove_wishlist&product_id=${product.id}`,
      }, 'secondary'),
    ],
  },
});

// 4. 保養提醒
export const maintenanceReminderMessage = (reminder, vehicle) => ({
  type: 'bubble',
  size: 'kilo',
  header: headerBlock('🔧 保養提醒', `${vehicle.make} ${vehicle.model} ${vehicle.licensePlate || ''}`),
  body: {
    type: 'box',
    layout: 'vertical',
    spacing: 'md',
    paddingAll: '20px',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: '保養項目',
            size: 'sm',
            color: '#888888',
            flex: 1,
          },
          {
            type: 'text',
            text: getMaintenanceTypeLabel(reminder.type),
            size: 'sm',
            weight: 'bold',
            color: '#1a1a2e',
            flex: 1,
            align: 'end',
          },
        ],
      },
      separator(),
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: '建議里程',
            size: 'sm',
            color: '#888888',
            flex: 1,
          },
          {
            type: 'text',
            text: `${reminder.intervalKm.toLocaleString()} km`,
            size: 'sm',
            weight: 'bold',
            color: '#1a1a2e',
            flex: 1,
            align: 'end',
          },
        ],
      },
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: '建議間隔',
            size: 'sm',
            color: '#888888',
            flex: 1,
          },
          {
            type: 'text',
            text: `${reminder.intervalMonths} 個月`,
            size: 'sm',
            weight: 'bold',
            color: '#1a1a2e',
            flex: 1,
            align: 'end',
          },
        ],
      },
      separator(),
      {
        type: 'text',
        text: '目前里程已達建議保養標準，建議盡快預約服務。',
        size: 'sm',
        color: '#ef4444',
        wrap: true,
      },
    ],
  },
  footer: {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    paddingAll: '20px',
    contents: [
      actionButton('立即預約', {
        type: 'uri',
        label: '立即預約',
        uri: `https://your-domain.com/garages?vehicle_id=${vehicle.id}`,
      }, 'primary'),
      actionButton('稍後處理', {
        type: 'postback',
        label: '稍後處理',
        data: `action=dismiss_reminder&reminder_id=${reminder.id}`,
      }, 'secondary'),
    ],
  },
});

// 5. 預約確認
export const appointmentConfirmationMessage = (appointment, garage) => ({
  type: 'bubble',
  size: 'kilo',
  header: headerBlock('📅 預約已確認', garage.name),
  body: {
    type: 'box',
    layout: 'vertical',
    spacing: 'md',
    paddingAll: '20px',
    contents: [
      infoRow('服務類型', appointment.serviceType),
      separator(),
      infoRow('預約時間', formatDateTime(appointment.scheduled_at)),
      separator(),
      infoRow('車輛', `${appointment.vehicle.make} ${appointment.vehicle.model} ${appointment.vehicle.licensePlate || ''}`),
      separator(),
      appointment.symptoms && {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          { type: 'text', text: '車輛症狀', size: 'sm', color: '#888888' },
          { type: 'text', text: appointment.symptoms, size: 'sm', color: '#1a1a2e', wrap: true },
        ],
      },
    ].filter(Boolean),
  },
  footer: {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    paddingAll: '20px',
    contents: [
      actionButton('查看詳情', {
        type: 'uri',
        label: '查看詳情',
        uri: `https://your-domain.com/appointments/${appointment.id}`,
      }, 'primary'),
      actionButton('取消預約', {
        type: 'postback',
        label: '取消預約',
        data: `action=cancel_appointment&appointment_id=${appointment.id}`,
      }, 'danger'),
    ],
  },
});

// 6. 推播通知（文字訊息備用）
export const textFallback = (title, body, url) => 
  `${title}\n\n${body}\n\n👉 ${url}`;

// ========== 輔助函數 ==========

const amountRow = (label, value, color = '#666666', size = 'sm', bold = false) => ({
  type: 'box',
  layout: 'horizontal',
  contents: [
    { type: 'text', text: label, size, color: '#888888', flex: 1 },
    { type: 'text', text: value, size, color, weight: bold ? 'bold' : 'regular', flex: 1, align: 'end' },
  ],
});

const infoRow = (label, value) => ({
  type: 'box',
  layout: 'horizontal',
  contents: [
    { type: 'text', text: label, size: 'sm', color: '#888888', flex: 1 },
    { type: 'text', text: value, size: 'sm', color: '#1a1a2e', weight: 'bold', flex: 2, align: 'end', wrap: true },
  ],
});

const getOrderStatusText = (status) => {
  const map = {
    PENDING_PAYMENT: '待付款',
    PAID: '已付款',
    CONFIRMED: '已確認',
    PROCESSING: '處理中',
    SHIPPED: '已出貨',
    DELIVERED: '已送達',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REFUNDED: '已退款',
    ARRIVED: '已到店',
    IN_PROGRESS: '施工中',
  };
  return map[status] || status;
};

const getOrderStatusColor = (status) => {
  const map = {
    PENDING_PAYMENT: '#f59e0b',
    PAID: '#3b82f6',
    CONFIRMED: '#10b981',
    PROCESSING: '#8b5cf6',
    SHIPPED: '#06b6d4',
    DELIVERED: '#10b981',
    COMPLETED: '#22c55e',
    CANCELLED: '#ef4444',
    REFUNDED: '#f97316',
    ARRIVED: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
  };
  return map[status] || '#666666';
};

const getMaintenanceTypeLabel = (type) => {
  const map = {
    OIL: '機油更換',
    TIRE: '輪胎檢查/換位',
    BRAKE: '煞車系統',
    BATTERY: '電池檢查',
    COOLANT: '冷卻液更換',
    TRANSMISSION: '變速箱油',
    INSPECTION: '定期檢查',
    OTHER: '其他保養',
  };
  return map[type] || type;
};

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default {
  headerBlock,
  separator,
  imageBlock,
  priceBlock,
  stockBadge,
  actionButton,
  buttonGroup,
  productSearchResultCard,
  orderConfirmationMessage,
  priceDropNotification,
  maintenanceReminderMessage,
  appointmentConfirmationMessage,
  textFallback,
};