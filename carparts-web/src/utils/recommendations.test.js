// 推薦引擎規則測試
import { buildRecommendations, flattenInstalledModifications, activeSpecificCategories } from './recommendations';

describe('推薦引擎排序規則', () => {
  const base = { currentMileage: 42500, manufactureYear: 2023, modelCode: 'GR Yaris' };

  test('42,500 km / 3年：專用件優先、通用件最後', () => {
    const recs = buildRecommendations(base);
    const specific = recs.filter(r => r.type === 'specific');
    const universal = recs.filter(r => r.type === 'universal');
    expect(specific.length).toBeGreaterThan(0);
    // 專用件全部在通用件之前
    expect(recs.indexOf(specific[specific.length - 1])).toBeLessThan(recs.indexOf(universal[0]));
    // 通用件 rank >= 99
    universal.forEach(u => expect(u.rank).toBeGreaterThanOrEqual(99));
    // 排序範例：避震器（35-55k 視窗中心 45k，距離 2500）應排第一
    expect(specific[0].id).toBe('coilover');
    expect(specific[1].id).toBe('intercooler');
  });

  test('已安裝 KW V3 避震器 → 自動排空、順延下一項專用件', () => {
    const mods = flattenInstalledModifications({
      suspension: { coilover: { brand: 'KW', model: 'V3' } },
    });
    const recs = buildRecommendations({ ...base, installedModifications: mods });
    const specific = recs.filter(r => r.type === 'specific');
    expect(specific.find(r => r.id === 'coilover')).toBeUndefined();
    // 順延：中冷器升為 Rank 1
    expect(specific[0].id).toBe('intercooler');
  });

  test('已安裝 EBC 煞車皮 → 煞車皮推薦排空', () => {
    const mods = flattenInstalledModifications({
      brakes: { pad: { brand: 'EBC Brakes', model: '' } },
    });
    const recs = buildRecommendations({ ...base, installedModifications: mods });
    expect(recs.find(r => r.id === 'brake_pads')).toBeUndefined();
  });

  test('里程未達門檻（5,000 km / 新車）→ 僅通用件', () => {
    const recs = buildRecommendations({ currentMileage: 5000, manufactureYear: 2026 });
    expect(recs.filter(r => r.type === 'specific').length).toBe(0);
    expect(recs.filter(r => r.type === 'universal').length).toBeGreaterThan(0);
  });

  test('車齡達門檻但里程低（1年車 8,000 km）→ 進氣套件依車齡推薦', () => {
    const recs = buildRecommendations({ currentMileage: 8000, manufactureYear: 2025 });
    const ids = recs.filter(r => r.type === 'specific').map(r => r.id);
    expect(ids).toContain('intake_kit'); // minAgeYears=1，車齡 1 年
  });

  test('activeSpecificCategories 回傳專用件分類集合', () => {
    const cats = activeSpecificCategories(base);
    expect(cats.has('底盤')).toBe(true);
    expect(cats.has('冷卻')).toBe(true);
    expect(cats.has('煞車')).toBe(true);
  });
});
