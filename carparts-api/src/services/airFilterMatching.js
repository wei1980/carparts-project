// src/services/airFilterMatching.js
// 空濾模糊比對核心演算法 - 從 run_match_new_files.py 移植而來
// 策略：Model_core ≥ 60% → Gen ≥ 50% → Engine 100% → Disp/HP 容許誤差

const prisma = require('../lib/prisma');

// ===== 常數與正規化規則 =====

const SUFFIX_PATTERNS = [
  /\bV\d+\b/i, /\bRS\b/i, /\bGT\b/i, /\bGTR\b/i, /\bAMG\b/i,
  /\bM\d*\b/i, /\bTDI\b/i, /\bTSI\b/i, /\bTFSI\b/i, /\bFSI\b/i,
  /\bCDTI\b/i, /\bCRDI\b/i, /\bDI-D\b/i, /\bHDi\b/i, /\bDTI\b/i,
  /\bTCI\b/i, /\bGDI\b/i, /\bMPI\b/i, /\bVVT\b/i, /\bVTEC\b/i,
];

const THRESHOLDS = {
  modelCore: 0.60,      // 模型核心相似度門檻
  generation: 0.50,     // 世代相似度門檻
  engineExact: true,    // 引擎代碼需完全一致（正規化後）
  dispAbs: 50,          // 排量絕對容許誤差
  dispRel: 0.02,        // 排量相對容許誤差 2%
  hpAbs: 10,            // 馬力絕對容許誤差
  hpRel: 0.06,          // 馬力相對容許誤差 6%
};

const STRATEGY_SCORES = {
  exact_engine_fuzzy_model_gen: 100,
  engine_model_gen: 90,
  model_gen: 80,
  engine_disp_hp: 70,
  engine_model: 60,
  model_only: 50,
  gen_engine_disp_hp: 40,
  gen_engine: 30,
  engine_disp_hp_only: 20,
  engine_only: 10,
  ambiguous: 0,  // 歧義標記
};

const AMBIGUITY_THRESHOLD = 0.05;  // 分差 < 5% 標記為歧義

// ===== 正規化函數 =====

/** 移除 "Type "、" (MkN)"、" (FL)"、" (Facelift)"、" LCI" 前綴/後綴，轉大寫 */
function normGen(g) {
  if (!g) return '';
  let s = g.trim();
  s = s.replace(/^Type\s+/i, '');
  s = s.replace(/\s*\(Mk\d+\)/i, '');
  s = s.replace(/\s*\(FL\)/i, '');
  s = s.replace(/\s*\(Facelift\)/i, '');
  s = s.replace(/\s+LCI$/i, '');  // 移除結尾的 LCI
  s = s.replace(/^LCI\s+/i, '');  // 移除開頭的 LCI
  return s.toUpperCase();
}

/** 將 Gen 字串分割為代碼集合（支援 / 或 , 分隔） */
function parseGenSet(g) {
  if (!g) return new Set();
  const norm = normGen(g);
  // 以 / 或 , 分割，過濾空值
  return new Set(norm.split(/[\/,]/).map(s => s.trim()).filter(Boolean));
}

/** 提取模型核心代碼（如 "M5"、"A4"、"320i"），移除性能後綴 */
function normModelCore(m) {
  if (!m) return '';
  let s = m.trim();
  
  // 先提取代碼模式：1-3字母 + 1-3數字 + 可選1字母（如 M5, A4, 320i, RS3, Giulia）
  const codeMatch = s.match(/\b([A-Z]{1,3}\d{1,3}[A-Z]?)\b/i);
  if (codeMatch) return codeMatch[1].toUpperCase();
  
  // 再移除性能後綴
  for (const re of SUFFIX_PATTERNS) {
    s = s.replace(re, '');
  }
  s = s.replace(/\s+/g, ' ').trim();
  
  // 取第一個有意義的詞（非純數字、非單字母）
  const words = s.split(/\s+/);
  for (const w of words) {
    if (w.length > 1 && !/^\d+$/.test(w)) {
      return w.toUpperCase();
    }
  }
  
  // 最後退回原始第一個詞
  return m.trim().split(/\s+/)[0].toUpperCase();
}

/** 完整模型名正規化（僅去首尾空白） */
function normModelFull(m) {
  return m ? m.trim() : '';
}

/** 引擎代碼正規化：去空白、轉大寫 */
function normEngine(e) {
  return e ? e.trim().toUpperCase() : '';
}

/** 取引擎主代碼（第一個空格前） */
function getEngineMainCode(e) {
  if (!e) return '';
  return e.trim().toUpperCase().split(/\s+/)[0];
}

/** 排量轉數值（cc） */
function normDisp(d) {
  if (!d) return null;
  const n = parseFloat(d);
  return isNaN(n) ? null : n;
}

/** 馬力轉數值（ps） */
function normHp(h) {
  if (!h) return null;
  const n = parseFloat(h);
  return isNaN(n) ? null : n;
}

/** 解析年份範圍字串 → 年份陣列
 * 支援格式：
 * - "01/2020 - 12/2023" (MM/YYYY - MM/YYYY)
 * - "11/13 - 12/19" (MM/YY - MM/YY)
 * - "2020-2023"
 * - "2020;2021;2022"
 * - "2020"
 */
function parseYearRange(yrStr) {
  if (!yrStr) return [];
  const s = String(yrStr).trim();
  const years = [];

  // MM/YYYY - MM/YYYY 或 MM/YY - MM/YY
  let m = s.match(/^(\d{1,2})\/(\d{2,4})\s*-\s*(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let startYear = parseInt(m[2]);
    let endYear = parseInt(m[4]);
    if (startYear < 100) startYear += startYear > 50 ? 1900 : 2000;
    if (endYear < 100) endYear += endYear > 50 ? 1900 : 2000;
    for (let y = startYear; y <= endYear; y++) years.push(y);
    return years;
  }

  // YYYY-YYYY
  m = s.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (m) {
    const start = parseInt(m[1]);
    const end = parseInt(m[2]);
    for (let y = start; y <= end; y++) years.push(y);
    return years;
  }

  // 分號分隔
  if (s.includes(';')) {
    for (const p of s.split(';')) {
      const y = parseInt(p.trim());
      if (!isNaN(y)) years.push(y);
    }
    return years;
  }

  // 單一年份
  const single = parseInt(s);
  if (!isNaN(single)) years.push(single);
  return years;
}

// ===== 相似度計算 =====

/** 模型核心相似度：0~1
 * - 完全相同 = 1.0
 * - 一方包含另一方 = 0.7
 * - 最長共同前綴比例
 */
function modelSimilarity(a, b) {
  if (!a || !b) return 0;
  const A = a.toUpperCase();
  const B = b.toUpperCase();
  if (A === B) return 1.0;
  if (A.includes(B) || B.includes(A)) return 0.7;
  
  // 最長共同前綴
  const len = Math.min(A.length, B.length);
  for (let i = len; i > 0; i--) {
    if (A.slice(0, i) === B.slice(0, i)) {
      return i / Math.max(A.length, B.length);
    }
  }
  return 0;
}

/** 世代匹配：集合交集法
 * 將 Gen 以 / 或 , 分割成 Set，若交集非空則匹配成功
 * 回傳 1.0 (有交集) 或 0 (無交集)
 */
function genMatch(a, b) {
  if (!a || !b) return 0;
  const setA = parseGenSet(a);
  const setB = parseGenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  for (const v of setA) {
    if (setB.has(v)) return 1.0;
  }
  return 0;
}

/** 引擎匹配：精確匹配主代碼
 * 規則：
 * - 完全相同 = true
 * - 主代碼（第一個空格前）完全相同 = true
 * - 但 "EA888" 不等於 "EA888 Gen3"（Gen3 是不同變體）
 * - 只有當雙方主代碼完全相同才通過
 */
function engineMatch(a, b) {
  if (!a || !b) return false;
  const A = a.trim().toUpperCase();
  const B = b.trim().toUpperCase();
  if (A === B) return true;
  
  // 取主代碼（第一個空格前）
  const mainA = A.split(/\s+/)[0];
  const mainB = B.split(/\s+/)[0];
  
  // 主代碼必須完全相同
  // "EA888" !== "EA888 Gen3" 的主代碼比較
  // EA888 的主代碼是 "EA888"
  // EA888 Gen3 的主代碼是 "EA888" - 但 Gen3 是變體，需完整比對
  // 規則：如果一方有尾碼（空格後有內容），另一方必須也有相同尾碼
  if (mainA === mainB) {
    // 檢查是否有尾碼
    const hasSuffixA = A.length > mainA.length;
    const hasSuffixB = B.length > mainB.length;
    // 雙方都無尾碼，或雙方尾碼完全相同
    return (!hasSuffixA && !hasSuffixB) || (A === B);
  }
  return false;
}

/** 排量比對：容許 50cc 或 2% */
function dispMatch(srcDisp, tgtDisp) {
  if (srcDisp == null || tgtDisp == null) return true;
  const diff = Math.abs(srcDisp - tgtDisp);
  return diff <= Math.max(THRESHOLDS.dispAbs, srcDisp * THRESHOLDS.dispRel);
}

/** 馬力比對：容許 10hp 或 6% */
function hpMatch(srcHp, tgtHp) {
  if (srcHp == null || tgtHp == null) return true;
  const diff = Math.abs(srcHp - tgtHp);
  return diff <= Math.max(THRESHOLDS.hpAbs, srcHp * THRESHOLDS.hpRel);
}

// ===== 核心比對邏輯 =====

/** 對單一 source 對單一 target 計算匹配分數與策略
 * @returns { strategy: string, score: number, details: object, failStage?: string } | null
 */
function matchSourceToTarget(src, tgt) {
  const modelSim = modelSimilarity(src.modelCore, tgt.modelCore);
  const genMatched = genMatch(src.genNorm, tgt.genNorm);
  const engineMatched = engineMatch(src.engineNorm, tgt.engineNorm);
  const dispM = dispMatch(src.dispVal, tgt.dispVal);
  const hpM = hpMatch(src.hpVal, tgt.hpVal);

  // 追蹤失敗關卡
  let failStage = null;
  if (modelSim < THRESHOLDS.modelCore) failStage = 'model';
  else if (!genMatched) failStage = 'generation';
  else if (!engineMatched) failStage = 'engine';
  else if (!dispM || !hpM) failStage = 'spec';

  // 策略判定（按優先序）
  if (modelSim >= THRESHOLDS.modelCore && genMatched && engineMatched && dispM && hpM) {
    return { strategy: 'exact_engine_fuzzy_model_gen', score: 100 + modelSim * 10, failStage: null };
  }
  if (modelSim >= THRESHOLDS.modelCore && genMatched && engineMatched) {
    return { strategy: 'engine_model_gen', score: 90 + modelSim * 10, failStage: null };
  }
  if (modelSim >= THRESHOLDS.modelCore && genMatched) {
    return { strategy: 'model_gen', score: 80 + modelSim * 10, failStage: null };
  }
  if (modelSim >= THRESHOLDS.modelCore && engineMatched && dispM && hpM) {
    return { strategy: 'engine_disp_hp', score: 70 + modelSim * 10, failStage: null };
  }
  if (modelSim >= THRESHOLDS.modelCore && engineMatched) {
    return { strategy: 'engine_model', score: 60 + modelSim * 10, failStage: null };
  }
  if (modelSim >= THRESHOLDS.modelCore) {
    return { strategy: 'model_only', score: 50 + modelSim * 10, failStage };
  }
  if (genMatched && engineMatched && dispM && hpM) {
    return { strategy: 'gen_engine_disp_hp', score: 40, failStage };
  }
  if (genMatched && engineMatched) {
    return { strategy: 'gen_engine', score: 30, failStage };
  }
  if (engineMatched && dispM && hpM) {
    return { strategy: 'engine_disp_hp_only', score: 20, failStage };
  }
  if (engineMatched) {
    return { strategy: 'engine_only', score: 10, failStage };
  }
  return { strategy: 'no_match', score: 0, failStage };
}

/** 將來源記錄正規化為比對用物件 */
function normalizeSourceRecord(src) {
  // 支援字串或數值輸入
  const toStr = (v) => v == null ? '' : String(v);
  const toNum = (v) => v == null ? null : (typeof v === 'number' ? v : parseFloat(v));
  
  return {
    srcId: src.srcId,
    make: toStr(src.make).trim().toLowerCase(),
    model: toStr(src.model).trim(),
    generation: toStr(src.generation).trim(),
    engine: toStr(src.engine).trim(),
    displacement: toStr(src.displacement).trim(),
    horsepower: toStr(src.horsepower).trim(),
    yearRange: src.yearRange,
    pipercross: toStr(src.pipercross).trim(),
    bmc: toStr(src.bmc).trim(),
    kn: toStr(src.kn).trim(),
    // 正規化後欄位
    modelCore: normModelCore(toStr(src.model)),
    genNorm: normGen(toStr(src.generation)),
    engineNorm: normEngine(toStr(src.engine)),
    dispVal: normDisp(toStr(src.displacement)),
    hpVal: normHp(toStr(src.horsepower)),
    years: parseYearRange(src.yearRange).length ? parseYearRange(src.yearRange) : [2020],
  };
}

/** 將目標記錄正規化為比對用物件 */
function normalizeTargetRecord(tgt) {
  return {
    ...tgt,
    modelCore: normModelCore(tgt.model),
    genNorm: normGen(tgt.generation),
    engineNorm: normEngine(tgt.engine),
    dispVal: normDisp(tgt.displacement),
    hpVal: normHp(tgt.horsepower),
  };
}

// ===== 批次比對主入口 =====

/**
 * 批次比對：給一組來源記錄，找出所有目標資料庫中的匹配
 * @param {Array} sourceRecords - 來源記錄陣列（需含 make, model, generation, engine, displacement, horsepower, yearRange）
 * @param {Object} options - { maxMatchesPerSource: 10, scoreThreshold: 80 }
 * @returns { aligned: [], links: [], review: [], stats: {} }
 */
async function batchMatchAirFilters(sourceRecords, options = {}) {
  const { maxMatchesPerSource = 10, scoreThreshold = 80 } = options;
  
  // 1. 載入目標資料庫（vehicle_variants 表）
  const targetRecords = await prisma.vehicleVariant.findMany({
    where: { is_approved: true },
    select: {
      id: true, make: true, year: true, model: true, generation: true,
      engine_code: true, displacement: true, horsepower: true,
      drive_type: true, specs: true,
    },
  });

  // 2. 建立品牌索引（make -> target ids）
  const makeIndex = new Map();
  const normalizedTargets = [];
  
  for (const t of targetRecords) {
    const norm = normalizeTargetRecord({
      id: t.id,
      make: t.make,
      year: t.year,
      model: t.model,
      generation: t.generation,
      engine: t.engine_code,
      displacement: t.specs?.displacement_cc ?? t.displacement,
      horsepower: t.specs?.horsepower_ps ?? t.horsepower,
    });
    normalizedTargets.push(norm);
    
    const makeKey = t.make.toLowerCase().trim();
    if (!makeIndex.has(makeKey)) makeIndex.set(makeKey, []);
    makeIndex.get(makeKey).push(norm);
  }

  // 3. 逐筆比對
  const aligned = [];
  const links = [];
  const review = [];
  const strategyCounts = {};

  for (const src of sourceRecords) {
    const normSrc = normalizeSourceRecord(src);
    const makeKey = normSrc.make;
    
    if (!makeIndex.has(makeKey)) {
      review.push({
        sourceId: normSrc.srcId,
        matchStrategy: 'no_make_in_db',
        matchScore: 0,
        ...pick(src, ['make', 'model', 'generation', 'engine', 'displacement', 'horsepower', 'yearRange', 'pipercross', 'bmc', 'kn']),
        candidates: '',
      });
      continue;
    }

    // 候選目標：同品牌且年份符合
    const candidates = [];
    for (const year of normSrc.years) {
      for (const t of makeIndex.get(makeKey)) {
        if (t.year === year) candidates.push(t);
      }
    }
    const uniqueCandidates = Array.from(new Map(candidates.map(t => [t.id, t])).values());

    const allMatches = [];
    for (const t of uniqueCandidates) {
      const match = matchSourceToTarget(normSrc, t);
      if (match) {
        allMatches.push({ target: t, ...match });
      }
    }

    allMatches.sort((a, b) => b.score - a.score);
    const topMatches = allMatches.slice(0, maxMatchesPerSource);

    if (topMatches.length > 0) {
      const best = topMatches[0];
      const bestStrategy = best.strategy;
      const bestScore = best.score;

      // 歧義檢測：若第一名與第二名分差 < 5%，且 SKU 不同 → 標記 ambiguous
      let isAmbiguous = false;
      if (topMatches.length >= 2) {
        const diffRatio = (bestScore - topMatches[1].score) / bestScore;
        const bestSku = `${best.target.make}|${best.target.model}|${best.target.generation}|${best.target.engine}|${best.target.year}`;
        const secondSku = `${topMatches[1].target.make}|${topMatches[1].target.model}|${topMatches[1].target.generation}|${topMatches[1].target.engine}|${topMatches[1].target.year}`;
        if (diffRatio < AMBIGUITY_THRESHOLD && bestSku !== secondSku) {
          isAmbiguous = true;
        }
      }

      if (bestScore >= scoreThreshold && !isAmbiguous) {
        // 自動對齊
        strategyCounts[bestStrategy] = (strategyCounts[bestStrategy] || 0) + 1;
        
        aligned.push({
          ...pick(best.target, ['make', 'year', 'model', 'generation', 'engine', 'displacement', 'horsepower',
            'drive_type', 'specs']),
          pipercross: normSrc.pipercross,
          bmc: normSrc.bmc,
          kn: normSrc.kn,
          sourceRecordId: normSrc.srcId,
        });

        links.push({
          sourceId: normSrc.srcId,
          targetId: best.target.id,
          matchStrategy: bestStrategy,
          matchScore: Math.round(bestScore),
          sourceMake: normSrc.make,
          sourceModel: normSrc.model,
          sourceGeneration: normSrc.generation,
          sourceYearRange: normSrc.yearRange,
          targetMake: best.target.make,
          targetModel: best.target.model,
          targetGeneration: best.target.generation,
          targetYear: best.target.year,
        });

        // 替代匹配
        for (const m of topMatches.slice(1)) {
          links.push({
            sourceId: normSrc.srcId,
            targetId: m.target.id,
            matchStrategy: m.strategy + '_alt',
            matchScore: Math.round(m.score),
            sourceMake: normSrc.make,
            sourceModel: normSrc.model,
            sourceGeneration: normSrc.generation,
            sourceYearRange: normSrc.yearRange,
            targetMake: m.target.make,
            targetModel: m.target.model,
            targetGeneration: m.target.generation,
            targetYear: m.target.year,
          });
        }
      } else {
        // 待審
        strategyCounts['review_' + bestStrategy] = (strategyCounts['review_' + bestStrategy] || 0) + 1;
        review.push({
          sourceId: normSrc.srcId,
          matchStrategy: bestStrategy,
          matchScore: Math.round(bestScore),
          ...pick(normSrc, ['make', 'model', 'generation', 'engine', 'displacement', 'horsepower', 'yearRange', 'pipercross', 'bmc', 'kn']),
          candidateCount: topMatches.length,
          failStage: best.failStage,
          candidates: topMatches.map(m => `${m.target.model}|${m.target.generation}|${m.target.year}|${m.target.engine}|${m.target.displacement}|${m.target.horsepower}|score:${Math.round(m.score)}`).join('; '),
        });
      }
    } else if (isAmbiguous) {
      // 歧義案例：分數接近且 SKU 不同，送人工複核
      strategyCounts['ambiguous'] = (strategyCounts['ambiguous'] || 0) + 1;
      review.push({
        sourceId: normSrc.srcId,
        matchStrategy: 'ambiguous',
        matchScore: Math.round(bestScore),
        ...pick(normSrc, ['make', 'model', 'generation', 'engine', 'displacement', 'horsepower', 'yearRange', 'pipercross', 'bmc', 'kn']),
        candidateCount: topMatches.length,
        failStage: 'ambiguous',
        candidates: topMatches.map(m => `${m.target.model}|${m.target.generation}|${m.target.year}|${m.target.engine}|${m.target.displacement}|${m.target.horsepower}|score:${Math.round(m.score)}`).join('; '),
      });
    } else {
      strategyCounts.no_match = (strategyCounts.no_match || 0) + 1;
      review.push({
        sourceId: normSrc.srcId,
        matchStrategy: 'no_match',
        matchScore: 0,
        ...pick(normSrc, ['make', 'model', 'generation', 'engine', 'displacement', 'horsepower', 'yearRange', 'pipercross', 'bmc', 'kn']),
        candidateCount: 0,
        failStage: 'no_candidate',
        candidates: '',
      });
    }
  }

  return { aligned, links, review, stats: strategyCounts };
}

/** 即時比對：給單一零件規格，回傳相容車型 */
async function findCompatibleVehicles(sourceSpecs, options = {}) {
  const { maxResults = 50, scoreThreshold = 80 } = options;
  
  const normSrc = normalizeSourceRecord({
    srcId: 0,
    make: sourceSpecs.make,
    model: sourceSpecs.model,
    generation: sourceSpecs.generation,
    engine: sourceSpecs.engine_code,
    displacement: sourceSpecs.displacement_cc,
    horsepower: sourceSpecs.horsepower_ps,
    yearRange: sourceSpecs.year_range,
  });

  const targetRecords = await prisma.vehicleVariant.findMany({
    where: { 
      is_approved: true,
      make: { equals: sourceSpecs.make, mode: 'insensitive' },
    },
    select: {
      id: true, make: true, year_start: true, year_end: true, model: true, generation: true,
      engine_code: true,
      drive_type: true, specs: true,
    },
  });

  const normalizedTargets = targetRecords.map(t => normalizeTargetRecord({
    id: t.id,
    make: t.make,
    year: t.year_start,  // 用 year_start 作為代表年份
    model: t.model,
    generation: t.generation,
    engine: t.engine_code,
    displacement: t.specs?.displacement_cc ?? t.displacement,
    horsepower: t.specs?.horsepower_ps ?? t.horsepower,
  }));

  const results = [];
  for (const t of normalizedTargets) {
    const match = matchSourceToTarget(normSrc, t);
    if (match && match.score >= scoreThreshold) {
      results.push({
        vehicleId: t.id,
        vehicle: pick(t, ['make', 'year', 'model', 'generation', 'engine', 'displacement', 'horsepower']),
        matchStrategy: match.strategy,
        matchScore: Math.round(match.score),
        details: {
          modelSimilarity: modelSimilarity(normSrc.modelCore, t.modelCore),
          genMatched: genMatch(normSrc.genNorm, t.genNorm) === 1.0,
          engineMatched: engineMatch(normSrc.engineNorm, t.engineNorm),
          dispMatch: dispMatch(normSrc.dispVal, t.dispVal),
          hpMatch: hpMatch(normSrc.hpVal, t.hpVal),
        },
      });
    }
  }

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.slice(0, maxResults);
}

// ===== 工具函數 =====

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// ===== 匯出 =====

module.exports = {
  // 核心比對
  matchSourceToTarget,
  normalizeSourceRecord,
  normalizeTargetRecord,
  
  // 批次與即時入口
  batchMatchAirFilters,
  findCompatibleVehicles,
  
  // 底層工具（供測試或擴充使用）
  normGen,
  parseGenSet,
  normModelCore,
  normEngine,
  getEngineMainCode,
  normDisp,
  normHp,
  parseYearRange,
  modelSimilarity,
  genMatch,
  engineMatch,
  dispMatch,
  hpMatch,
  
  // 參數
  THRESHOLDS,
  STRATEGY_SCORES,
};