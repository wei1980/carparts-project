// src/routes/garages.js
const express = require('express');
const router = express.Router();
const { garageListCacheMiddleware } = require('../middleware/cacheMiddleware');
const { getBookingCapacity } = require('../utils/bookingCapacity');
const prisma = require('../lib/prisma');

// 台灣縣市列表
const CITIES = [
  '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣',
  '苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣', '嘉義市',
  '嘉義縣', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣',
  '台東縣', '澎湖縣', '金門縣', '連江縣',
];

// 從地址中解析縣市
function parseCity(address) {
  if (!address) return '其他';
  for (const city of CITIES) {
    if (address.includes(city)) return city;
  }
  return '其他';
}

// 從 garage_slots 中取得圖片路徑
function getGarageImage(garage) {
  if (!garage) return null;
  // 優先使用封面照，其次名片
  if (garage.cover_photo) return garage.cover_photo;
  if (garage.business_card) return garage.business_card;
  return null;
}

// GET /api/garages — 取得合作車廠列表（支援縣市篩選、分組、LBS 排序）
router.get('/', garageListCacheMiddleware(300), async (req, res) => {
  try {
    const { lat, lng, search, city, groupBy, myCity, sortBy } = req.query;
    const where = { is_garage: true, is_active: true };

    // 關鍵字搜尋
    if (search) {
      where.OR = [
        { garage_name: { contains: search, mode: 'insensitive' } },
        { company_name: { contains: search, mode: 'insensitive' } },
        { garage_address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 🆕 縣市篩選
    if (city) {
      where.garage_address = { contains: city };
    }

    const garages = await prisma.workshop.findMany({
      where,
      select: {
        id: true,
        garage_name: true,
        garage_phone: true,
        garage_address: true,
        lat: true,
        lng: true,
        rating: true,
        review_count: true,
        garage_slots: true,
        garage_photos: true, // 🆕 店面照（列表封面用）
      },
      orderBy: { garage_address: 'asc' }, // 🆕 預設按地址排序
    });

    // 🆕 處理每個車廠：解析縣市、提取圖片
    const parseJson = (v) => {
      if (v == null) return null;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return null; }
    };
    const processed = garages.map(g => {
      const slots = g.garage_slots || {};
      const photos = (parseJson(g.garage_photos) || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      return {
        id: g.id,
        garage_name: g.garage_name,
        garage_phone: g.garage_phone,
        garage_address: g.garage_address,
        lat: g.lat,
        lng: g.lng,
        rating: g.rating,
        review_count: g.review_count,
        city: parseCity(g.garage_address),
        image: photos[0]?.url || getGarageImage(slots), // 🆕 店面照優先當封面
        cover_photo: slots.cover_photo || null,
        business_card: slots.business_card || null,
      };
    });

    // 🆕 同縣市限制：myCity 傳入時只回傳該縣市車廠（客戶地址解析出的縣市）
    let finalList = processed;
    if (myCity) {
      const userCity = parseCity(String(myCity));
      finalList = processed.filter(g => g.city === userCity);
    }

    // 🆕 如果要求按縣市分組
    if (groupBy === 'city') {
      const grouped = {};
      // 按縣市順序排序
      const sortedCities = [...CITIES, '其他'];
      for (const c of sortedCities) {
        const list = finalList.filter(g => g.city === c);
        if (list.length > 0) {
          grouped[c] = list;
        }
      }
      return res.json(grouped);
    }

    // 🆕 距離排序：客戶地址 → 依車廠 lat/lng 計算直線距離排序（近→遠）
    if (sortBy === 'distance' || (lat && lng)) {
      let userLat = lat ? parseFloat(lat) : null;
      let userLng = lng ? parseFloat(lng) : null;

      // 未傳座標時，嘗試用客戶地址查座標（內建縣市中心點近似）
      if ((userLat == null || userLng == null) && myCity) {
        const centers = {
          '台北市': [25.0330, 121.5654], '新北市': [25.0120, 121.4650], '基隆市': [25.1276, 121.7392],
          '桃園市': [24.9936, 121.3010], '新竹市': [24.8138, 120.9675], '新竹縣': [24.8394, 121.0059],
          '苗栗縣': [24.5602, 120.8214], '台中市': [24.1477, 120.6736], '彰化縣': [24.0811, 120.5387],
          '南投縣': [23.8388, 120.9853], '雲林縣': [23.7569, 120.5528], '嘉義市': [23.4800, 120.4491],
          '嘉義縣': [23.4589, 120.3000], '台南市': [22.9999, 120.2270], '高雄市': [22.6273, 120.3014],
          '屏東縣': [22.6693, 120.4867], '宜蘭縣': [24.7011, 121.7453], '花蓮縣': [23.9871, 121.6016],
          '台東縣': [22.7583, 121.1444], '澎湖縣': [23.5711, 119.5675], '金門縣': [24.4367, 118.3186],
          '連江縣': [26.1608, 119.9514],
        };
        const c = parseCity(String(myCity));
        if (centers[c]) { [userLat, userLng] = centers[c]; }
      }

      if (userLat != null && userLng != null) {
        finalList.forEach(g => {
          g.distance = g.lat && g.lng
            ? Math.round(Math.sqrt((g.lat - userLat) ** 2 + (g.lng - userLng) ** 2) * 111 * 10) / 10 // ≈km
            : Infinity;
        });
        finalList.sort((a, b) => a.distance - b.distance);
      }
    }

    res.json(finalList);
  } catch (error) {
    console.error('取得車廠列表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/garages/:id/availability?date=YYYY-MM-DD — 該日已被預約的時段（只回時間，不含客戶資料）
router.get('/:id/availability', async (req, res) => {
  try {
    const garageId = parseInt(req.params.id, 10);
    const dateStr = String(req.query.date || '');
    if (!Number.isInteger(garageId)) return res.status(400).json({ error: '車廠 ID 格式錯誤' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: '日期格式需為 YYYY-MM-DD' });

    const garage = await prisma.workshop.findFirst({
      where: { id: garageId, is_garage: true, is_active: true },
      select: { id: true, garage_slots: true },
    });
    if (!garage) return res.status(404).json({ error: '車廠不存在' });

    const start = new Date(`${dateStr}T00:00:00`);
    if (isNaN(start.getTime())) return res.status(400).json({ error: '日期格式錯誤' });
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const rows = await prisma.appointment.findMany({
      where: {
        garage_id: garageId,
        scheduled_at: { gte: start, lt: end },
        status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'] },
      },
      select: { scheduled_at: true },
    });

    const counts = {};
    for (const r of rows) {
      const d = new Date(r.scheduled_at);
      const key = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const booked = Object.keys(counts).sort();
    const capacity = getBookingCapacity(garage.garage_slots);

    res.json({ date: dateStr, capacity, booked, counts });
  } catch (error) {
    console.error('取得可預約時段失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/garages/:id — 車廠詳情
router.get('/:id', async (req, res) => {
  try {
    const garage = await prisma.workshop.findFirst({
      where: { id: parseInt(req.params.id), is_garage: true },
      select: {
        id: true,
        garage_name: true,
        garage_phone: true,
        garage_address: true,
        lat: true,
        lng: true,
        rating: true,
        review_count: true,
        garage_slots: true,
        shop_type: true,
        garage_photos: true,   // 🆕 店面照
        opening_hours: true,   // 🆕 營業時間
      },
    });
    if (!garage) return res.status(404).json({ error: '車廠不存在' });

    // 工資表：schema 沒有 Workshop.laborFees 關聯，改用獨立查詢避免 Prisma 500
    const laborFees = await prisma.garageLaborFee.findMany({
      where: { workshop_id: garage.id, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    const parseJson = (v) => {
      if (v == null) return null;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return null; }
    };
    const slots = garage.garage_slots || {};
    const photos = (parseJson(garage.garage_photos) || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    res.json({
      ...garage,
      city: parseCity(garage.garage_address),
      image: getGarageImage(slots),
      cover_photo: slots.cover_photo || null,
      business_card: slots.business_card || null,
      garage_photos: photos,
      opening_hours: parseJson(garage.opening_hours),
      labor_fees: laborFees || [],
      booking_capacity: getBookingCapacity(slots),
    });
  } catch (error) {
    console.error('取得車廠詳情失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;