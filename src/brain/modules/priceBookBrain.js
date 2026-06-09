import { createCheck, CheckSeverity, CheckStatus, CheckType } from '@/brain/core/brainTypes';
import { aggregateBrainResults } from '@/brain/core/brainAggregator';

function normalizeName(name = '') {
  return String(name).toLowerCase().replace(/\s+/g, ' ').trim();
}

function groupKey(entry) {
  return [entry.type || '', entry.category || '', entry.unit || ''].join('::');
}

function median(values = []) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default async function priceBookBrain({ entity, related = {}, context = {} } = {}) {
  const entries = Array.isArray(entity?.entries) ? entity.entries : [];
  const services = Array.isArray(related?.services) ? related.services : [];

  const checks = [];
  const suggestionQueue = [];
  const serviceIds = new Set(services.map(s => s.id).filter(Boolean));
  const seenNames = new Map();
  const groups = new Map();

  let zeroPriceCount = 0;
  let reviewCount = 0;
  let missingServiceLinkCount = 0;
  let duplicateNameCount = 0;
  let inactiveCount = 0;
  let weakPricingCount = 0;

  for (const entry of entries) {
    const price = Number(entry.unit_price ?? entry.book_price ?? 0);
    const nameKey = normalizeName(entry.display_name);

    if (!price || price <= 0) zeroPriceCount += 1;
    if (entry.needs_review) reviewCount += 1;
    if (entry.is_active === false) inactiveCount += 1;
    if (!entry.service_id || !serviceIds.has(entry.service_id)) missingServiceLinkCount += 1;

    if (nameKey) seenNames.set(nameKey, (seenNames.get(nameKey) || 0) + 1);

    const gk = groupKey(entry);
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(entry);
  }

  duplicateNameCount = [...seenNames.values()].filter(v => v > 1).length;

  for (const [key, items] of groups.entries()) {
    const priced = items
      .map(i => Number(i.unit_price ?? i.book_price ?? 0))
      .filter(v => v > 0);

    if (priced.length < 3) continue;

    const mid = median(priced);
    for (const item of items) {
      const currentPrice = Number(item.unit_price ?? item.book_price ?? 0);
      if (currentPrice <= 0) continue;

      if (currentPrice < mid * 0.7) {
        weakPricingCount += 1;
        const suggestedPrice = Number((mid * 0.9).toFixed(2));
        suggestionQueue.push({
          id: `weak-price-${item.id}`,
          kind: 'price_adjustment',
          entryId: item.id,
          displayName: item.display_name,
          currentPrice,
          suggestedPrice,
          deltaPercent: Number((((suggestedPrice - currentPrice) / currentPrice) * 100).toFixed(1)),
          reason: `This item looks weak versus similar ${key.replaceAll('::', ' / ')} items. Median is ${mid.toFixed(2)}.`,
          status: 'awaiting_review',
        });
      }
    }
  }

  checks.push(createCheck({
    id: 'pricebook_has_entries',
    label: 'Price Book has entries',
    type: CheckType.HEALTH,
    status: entries.length > 0 ? CheckStatus.PASS : CheckStatus.FAIL,
    severity: CheckSeverity.CRITICAL,
    message: entries.length > 0 ? 'Price Book contains entries.' : 'Price Book is empty.',
    action: entries.length > 0 ? '' : 'Seed or import Price Book entries',
    source: 'priceBook',
  }));

  checks.push(createCheck({
    id: 'pricebook_unpriced_items',
    label: 'Entries have prices',
    type: CheckType.INTEGRITY,
    status: zeroPriceCount === 0 ? CheckStatus.PASS : CheckStatus.WARN,
    severity: CheckSeverity.HIGH,
    message: zeroPriceCount === 0 ? 'All visible entries are priced.' : `${zeroPriceCount} entries have zero or missing price.`,
    action: zeroPriceCount === 0 ? '' : 'Review unpriced services or materials',
    source: 'priceBook',
  }));

  checks.push(createCheck({
    id: 'pricebook_review_backlog',
    label: 'Needs review backlog',
    type: CheckType.INTELLIGENCE,
    status: reviewCount === 0 ? CheckStatus.PASS : CheckStatus.WARN,
    severity: CheckSeverity.MEDIUM,
    message: reviewCount === 0 ? 'No backlog marked for review.' : `${reviewCount} entries are flagged as needs review.`,
    action: reviewCount === 0 ? '' : 'Review flagged catalog entries',
    source: 'priceBook',
  }));

  checks.push(createCheck({
    id: 'pricebook_service_links',
    label: 'Entries linked to services',
    type: CheckType.DEPENDENCY,
    status: missingServiceLinkCount === 0 ? CheckStatus.PASS : CheckStatus.WARN,
    severity: CheckSeverity.HIGH,
    message: missingServiceLinkCount === 0 ? 'All entries are linked to valid services.' : `${missingServiceLinkCount} entries are missing a valid service link.`,
    action: missingServiceLinkCount === 0 ? '' : 'Review service linking for price book entries',
    source: 'priceBook',
  }));

  checks.push(createCheck({
    id: 'pricebook_duplicate_names',
    label: 'Duplicate display names',
    type: CheckType.INTEGRITY,
    status: duplicateNameCount === 0 ? CheckStatus.PASS : CheckStatus.WARN,
    severity: CheckSeverity.MEDIUM,
    message: duplicateNameCount === 0 ? 'No duplicate display names detected.' : `${duplicateNameCount} duplicate display-name clusters detected.`,
    action: duplicateNameCount === 0 ? '' : 'Review duplicate service naming or merge duplicates',
    source: 'priceBook',
  }));

  checks.push(createCheck({
    id: 'pricebook_weak_pricing',
    label: 'Weak pricing against similar items',
    type: CheckType.INTELLIGENCE,
    status: weakPricingCount === 0 ? CheckStatus.PASS : CheckStatus.WARN,
    severity: CheckSeverity.HIGH,
    message: weakPricingCount === 0 ? 'No weak pricing detected against similar items.' : `${weakPricingCount} entries appear weak versus similar priced items.`,
    action: weakPricingCount === 0 ? '' : 'Review pricing suggestions generated by the Brain',
    source: 'priceBook',
  }));

  checks.push(createCheck({
    id: 'pricebook_inactive_entries',
    label: 'Inactive catalog items',
    type: CheckType.INTELLIGENCE,
    status: inactiveCount === 0 ? CheckStatus.PASS : CheckStatus.INFO,
    severity: CheckSeverity.LOW,
    message: inactiveCount === 0 ? 'No inactive entries detected.' : `${inactiveCount} entries are inactive.`,
    action: inactiveCount === 0 ? '' : 'Review inactive entries for cleanup or reactivation',
    source: 'priceBook',
  }));

  const result = aggregateBrainResults([{ checks }], {
    module: 'priceBook',
    page: context.page || 'PriceBookSection',
    entityId: 'pricebook',
    dependencies: {
      services: {
        ready: services.length > 0,
        reason: services.length > 0 ? '' : 'Service catalog is empty or unavailable.',
        checks: { count: services.length },
      },
    },
    meta: {
      entryCount: entries.length,
      serviceCount: services.length,
      analyzedAt: new Date().toISOString(),
    },
  });

  const suggestions = [];
  if (zeroPriceCount > 0) suggestions.push(`Review ${zeroPriceCount} unpriced item(s) first.`);
  if (missingServiceLinkCount > 0) suggestions.push(`Reconnect ${missingServiceLinkCount} item(s) to Services.`);
  if (duplicateNameCount > 0) suggestions.push(`Review ${duplicateNameCount} duplicate name cluster(s) for rename/merge.`);
  if (reviewCount > 0) suggestions.push(`Process ${reviewCount} item(s) marked as needs review.`);
  if (weakPricingCount > 0) suggestions.push(`Review ${weakPricingCount} weak pricing suggestion(s) against similar items.`);

  return {
    ...result,
    decision: {
      ...result.decision,
      suggestedActions: [...(result.decision?.suggestedActions || []), ...suggestions],
    },
    suggestions,
    suggestionQueue,
  };
}
