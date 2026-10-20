// VehicleModification has no trusted catalogue-part link. Never infer verified
// caliper fitment from a model name, piston count or user-entered specJson.
function needsInstalledCaliperReview(vehicle, part) {
  const structured = Array.isArray(vehicle.modifications_detail) ? vehicle.modifications_detail : [];
  // Legacy sync stores { [category]: { [partType]: installedProduct } }.
  // Category names vary (brakes/brake/煞車); partType is the stable key.
  const legacy = Object.values(vehicle.modifications || {});
  const hasCaliper = structured.some(mod => mod?.partType === 'caliper')
    || legacy.some(category => Boolean(category?.caliper));
  if (!hasCaliper) return false;

  const labels = [
    part.name, part.category, part.subcategory?.name, part.subcategory?.category?.name,
    ...(part.parts_on_categories || []).map(link => link.category?.name),
  ];
  // Broad brake-category review is intentional: stock mappings do not verify
  // consumables for an installed caliper. Axle/shape hints cannot clear review.
  return labels.some(label => typeof label === 'string'
    && /煞車|剎車|刹车|來令片|来令片|碟盤|碟盘|制動|制动|\bbrakes?\b/i.test(label));
}

module.exports = { needsInstalledCaliperReview };
