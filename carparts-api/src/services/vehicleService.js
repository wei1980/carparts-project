// src/services/vehicleService.js
const prisma = require('../lib/prisma');

/**
 * 車輛服務層：封裝對 VehicleVariant、VehicleProfile 等模型的常見操作
 */
class VehicleService {
  // 取得所有已審核的車型變體（年份、品牌、車型等）
  async findApprovedVariants({ where, include, orderBy, skip, take }) {
    const [variants, total] = await prisma.$transaction([
      prisma.vehicleVariant.findMany({ where, include, orderBy, skip, take }),
      prisma.vehicleVariant.count({ where }),
    ]);
    return { variants, total };
  }

  // 取得單一車型變體
  async findVariantById(id, includeOptions = {}) {
    return await prisma.vehicleVariant.findUnique({
      where: { id },
      include: includeOptions,
    });
  }

  // 取得品牌列表（已審核）
  async getMakes({ year }) {
    const where = { is_approved: true };
    if (year) {
      where.year_start = { lte: parseInt(year) };
      where.year_end = { gte: parseInt(year) };
    }
    return await prisma.vehicleVariant.findMany({
      where,
      select: { make: true },
      distinct: ['make'],
      orderBy: { make: 'asc' },
    });
  }

  // 取得車型列表（已審核，依品牌）
  async getModels({ make, year }) {
    const where = { is_approved: true, make: String(make) };
    if (year) {
      where.year_start = { lte: parseInt(year) };
      where.year_end = { gte: parseInt(year) };
    }
    return await prisma.vehicleVariant.findMany({
      where,
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    });
  }

  // 取得世代列表（已審核，依品牌+車型）
  async getGenerations({ make, model, year }) {
    const where = { is_approved: true, make: String(make), model: String(model) };
    if (year) {
      where.year_start = { lte: parseInt(year) };
      where.year_end = { gte: parseInt(year) };
    }
    return await prisma.vehicleVariant.findMany({
      where,
      select: { generation: true },
      distinct: ['generation'],
      orderBy: { generation: 'asc' },
    });
  }

  // 取得車輛變體（依 make/model/generation/year 範圍）
  async findVariantsByCriteria({ make, model, generation, yearStart, yearEnd }) {
    const where = { is_approved: true };
    if (make) where.make = { equals: make, mode: 'insensitive' };
    if (model) where.model = { equals: model, mode: 'insensitive' };
    if (generation) where.generation = { equals: generation, mode: 'insensitive' };
    if (yearStart !== undefined) where.year_start = { lte: yearStart };
    if (yearEnd !== undefined) where.year_end = { gte: yearEnd };
    return await prisma.vehicleVariant.findMany({ where });
  }

  // 建立或更新車輛變體（通常用於種子匯入）
  async upsertVariant(data) {
    // 假設有唯一約束：make+model+generation+year_start+year_end
    return await prisma.vehicleVariant.upsert({
      where: {
        make_model_gen_year: {
          make: data.make,
          model: data.model,
          generation: data.generation,
          year_start: data.year_start,
          year_end: data.year_end,
        },
      },
      update: data,
      create: data,
    });
  }

  // 取得使用者的愛車列表
  async getUserVehicles(userId) {
    return await prisma.vehicleProfile.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  // 取得單一使用者愛車
  async getUserVehicleById(userId, vehicleId) {
    return await prisma.vehicleProfile.findFirst({
      where: { userId, id: vehicleId },
    });
  }

  // 建立使用者愛車
  async createUserVehicle(data) {
    return await prisma.vehicleProfile.create({ data });
  }

  // 更新使用者愛車
  async updateUserVehicle(id, data) {
    return await prisma.vehicleProfile.update({ where: { id }, data });
  }

  // 刪除使用者愛車
  async deleteUserVehicle(id) {
    return await prisma.vehicleProfile.delete({ where: { id } });
  }
}

module.exports = new VehicleService();