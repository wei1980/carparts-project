// src/services/partService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 零件服務層：封裝對 Part 模型的常見操作
 */
class PartService {
  // 取得單一零件（含關聯資料）
  async findById(id, includeOptions = {}) {
    return await prisma.part.findUnique({
      where: { id },
      include: includeOptions,
    });
  }

  // 根據條件查找零件列表（支援分頁、排序、篩選）
  async findMany({ where, include, orderBy, skip, take }) {
    const [parts, total] = await prisma.$transaction([
      prisma.part.findMany({ where, include, orderBy, skip, take }),
      prisma.part.count({ where }),
    ]);
    return { parts, total };
  }

  // 建立新零件
  async create(data) {
    return await prisma.part.create({ data });
  }

  // 更新零件
  async update(id, data) {
    return await prisma.part.update({ where: { id }, data });
  }

  // 刪除零件
  async delete(id) {
    return await prisma.part.delete({ where: { id } });
  }

  // 批次刪除
  async deleteMany(ids) {
    return await prisma.part.deleteMany({ where: { id: { in: ids } } });
  }

  // 批次更新（發布/下架）
  async updateMany(ids, data) {
    return await prisma.part.updateMany({ where: { id: { in: ids } }, data });
  }

  // Upsert（依 SKU）
  async upsertBySku(sku, data) {
    return await prisma.part.upsert({
      where: { sku },
      update: data,
      create: { sku, ...data },
    });
  }

  // 取得零件的相容車輛
  async getCompatibleVehicles(partId) {
    return await prisma.partCompatibility.findMany({
      where: { partId },
      select: { vehicleId: true },
    });
  }

  // 取得零件的分類關聯
  async getPartCategories(partId) {
    return await prisma.partsOnCategories.findMany({
      where: { partId },
      select: { categoryId: true },
    });
  }
}

module.exports = new PartService();