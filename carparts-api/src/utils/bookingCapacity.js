// src/utils/bookingCapacity.js
// 每個車廠的「同一時段可接車數」。
// 優先順序：garage_slots.booking_capacity → garage_slots.bays 啟用數量 → 1
function parseSlots(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

function getBookingCapacity(slots) {
  const data = parseSlots(slots);

  const explicit = Number(data.booking_capacity);
  if (Number.isInteger(explicit) && explicit >= 1) return Math.min(explicit, 20);

  if (Array.isArray(data.bays)) {
    const active = data.bays.filter((b) => b && b.is_active !== false).length;
    if (active > 0) return Math.min(active, 20);
  }

  return 1;
}

module.exports = { getBookingCapacity, parseSlots };
