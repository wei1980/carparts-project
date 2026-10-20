// src/services/modificationService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 改裝聯動服務：處理改裝項目對零件推薦的影響
 */
class ModificationService {
  /**
   * 取得車輛的所有結構化改裝項目
   */
  async getVehicleModifications(vehicleId) {
    return await prisma.vehicleModification.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * 根據改裝項目查找受影響的目標零件
   * @param {Array} modifications - 車輛的改裝陣列
   * @returns {Array} 受影響零件清單，含 fitmentRule 與說明
   */
  async getAffectedParts(modifications) {
    if (!modifications || modifications.length === 0) return [];

    // 1. 找出所有改裝零件對應的 Part (modPart)
    const modPartQueries = modifications.map(m => 
      prisma.part.findFirst({
        where: { 
          name: { contains: m.model, mode: 'insensitive' },
          brand: { equals: m.brand, mode: 'insensitive' },
          is_active: true
        }
      })
    );
    const modParts = await Promise.all(modPartQueries);
    const validModPartIds = modParts.filter(p => p).map(p => p.id);

    if (validModPartIds.length === 0) return [];

    // 2. 查詢 PartModificationFitment 找出受影響零件
    const fitments = await prisma.partModificationFitment.findMany({
      where: {
        modPartId: { in: validModPartIds }
      },
      include: {
        targetPart: {
          where: { is_active: true }
        },
        modPart: true
      }
    });

    // 3. 過濾並加入改裝規格比對邏輯
    const results = [];
    for (const f of fitments) {
      if (!f.targetPart) continue;
      
      // 找出對應的改裝項目
      const mod = modifications.find(m => 
        m.brand.toLowerCase() === f.modPart.brand.toLowerCase() &&
        m.model.toLowerCase() === f.modPart.name.toLowerCase()
      );

      // 4. 規格比對（若有 fitmentRule）
      let matched = true;
      let matchDetails = [];
      if (f.fitmentRule && mod?.specJson) {
        const rule = f.fitmentRule;
        const spec = mod.specJson;
        
        for (const [key, expectedValue] of Object.entries(rule)) {
          const actualValue = spec[key];
          if (actualValue !== undefined && actualValue !== expectedValue) {
            matched = false;
            matchDetails.push({ key, expected: expectedValue, actual: actualValue });
          } else if (actualValue !== undefined) {
            matchDetails.push({ key, expected: expectedValue, actual: actualValue, matched: true });
          }
        }
      }

      results.push({
        fitmentId: f.id,
        modificationType: f.modificationType,
        modPart: { 
          id: f.modPart.id, 
          name: f.modPart.name, 
          brand: f.modPart.brand, 
          sku: f.modPart.sku 
        },
        targetPart: { 
          id: f.targetPart.id, 
          name: f.targetPart.name, 
          brand: f.targetPart.brand, 
          sku: f.targetPart.sku,
          msrp_price: f.targetPart.msrp_price,
          wholesale_price: f.targetPart.wholesale_price,
          image_url: f.targetPart.image_url,
          subcategory_id: f.targetPart.subcategory_id
        },
        fitmentRule: f.fitmentRule,
        notes: f.notes,
        matched,
        matchDetails
      });
    }

    return results;
  }

  /**
   * 依改裝類型分組受影響零件
   */
  groupByModificationType(affectedParts) {
    const grouped = {};
    for (const p of affectedParts) {
      const type = p.modificationType || 'other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(p);
    }
    return grouped;
  }

  /**
   * 為特定零件類型（來令片/濾芯/輪胎）取得改裝專用推薦
   */
  async getModificationRecommendations(vehicleId, targetPartType) {
    const modifications = await this.getVehicleModifications(vehicleId);
    const affected = await this.getAffectedParts(modifications);
    
    // 過濾目標類型
    const targetParts = affected.filter(p => {
      // 這裡可以根據 targetPart 的 subcategory 或 category 判斷
      // 暫時用 modificationType 對應
      const typeMap = {
        'caliper': 'pad',      // 卡鉗 → 來令片
        'wheel_set': 'tire',   // 輪圈 → 輪胎
        'intake_kit': 'filter' // 進氣 → 濾芯
      };
      return typeMap[p.modificationType] === targetPartType;
    });

    return targetParts.map(p => ({
      ...p.targetPart,
      modificationContext: {
        modType: p.modificationType,
        modPart: p.modPart,
        matched: p.matched,
        matchDetails: p.matchDetails,
        notes: p.notes
      }
    }));
  }

  /**
   * 檢查零件是否與車輛改裝相容
   */
  async checkCompatibility(vehicleId, partId) {
    const modifications = await this.getVehicleModifications(vehicleId);
    const affected = await this.getAffectedParts(modifications);
    
    // 檢查是否有強制要求的改裝零件
    const requiredFitments = affected.filter(f => f.fitmentRule && Object.keys(f.fitmentRule).length > 0);
    
    if (requiredFitments.length === 0) {
      return { compatible: true, warnings: [] };
    }

    const warnings = [];
    for (const f of requiredFitments) {
      if (f.targetPart.id === partId) {
        if (!f.matched) {
          warnings.push({
            type: 'modification_mismatch',
            message: `此零件規格與您的 ${f.modPart.brand} ${f.modPart.name} 改裝可能不相容`,
            details: f.matchDetails
          });
        }
      }
    }

    return { 
      compatible: warnings.length === 0, 
      warnings 
    };
  }
}

module.exports = new ModificationService();