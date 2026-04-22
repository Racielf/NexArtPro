import priceBookBrain from '@/brain/modules/priceBookBrain';

function normalizeName(name = '') {
  return String(name).toLowerCase().replace(/\s+/g, ' ').trim();
}

export default async function estimateCatalogPricingBrain({ groups = [], priceBookEntries = [], services = [] } = {}) {
  const catalogResult = await priceBookBrain({
    entity: { entries: priceBookEntries },
    related: { services },
    context: { page: 'EstimateEditor' },
  });

  const estimateItems = (groups || []).flatMap(g => g.items || []);
  const weakSuggestions = catalogResult?.suggestionQueue || [];

  const matched = [];

  for (const item of estimateItems) {
    const itemName = normalizeName(item.service_name);
    const found = weakSuggestions.find(s => normalizeName(s.displayName) === itemName);
    if (found) {
      matched.push({
        itemId: item.id,
        serviceName: item.service_name,
        currentEstimatePrice: Number(item.unit_price || 0),
        suggestedCatalogPrice: found.suggestedPrice,
        deltaPercent: found.deltaPercent,
        reason: found.reason,
      });
    }
  }

  return {
    score: matched.length === 0 ? 100 : Math.max(40, 100 - matched.length * 12),
    level: matched.length === 0 ? 'healthy' : matched.length <= 2 ? 'warning' : 'critical',
    summary: matched.length === 0
      ? 'Estimate pricing looks aligned with current catalog intelligence.'
      : `${matched.length} estimate item(s) appear weak against current Price Book intelligence.`,
    nextAction: matched.length === 0
      ? 'No immediate pricing action needed.'
      : 'Review the flagged estimate items before sending.',
    flaggedItems: matched,
  };
}
