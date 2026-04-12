/**
 * serviceReconciler.js — Robust service name reconciliation.
 *
 * Provides fuzzy matching between arbitrary service names (from line items,
 * Price Book entries, etc.) and the canonical Services catalog from Settings.
 *
 * Matching priority:
 *   1. Exact normalized name
 *   2. Alias match (Service.aliases)
 *   3. Token-overlap scoring (Jaccard-like with prefix bonus)
 *
 * RULES:
 *   - Never returns a match below the confidence threshold (0.55)
 *   - Prefers exact/alias matches over fuzzy
 *   - Only returns fuzzy match if it's unambiguous (top score > second by 0.15)
 *   - Never mutates input data
 */

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Split into meaningful tokens (words ≥ 2 chars) */
const tokenize = (s) => norm(s).split(' ').filter(w => w.length >= 2);

/**
 * Score how well two service names match using token overlap.
 * Returns 0–1 where 1 = perfect match.
 */
function tokenScore(a, b) {
  const tokA = tokenize(a);
  const tokB = tokenize(b);
  if (tokA.length === 0 || tokB.length === 0) return 0;

  let matches = 0;
  let prefixMatches = 0;

  for (const ta of tokA) {
    for (const tb of tokB) {
      if (ta === tb) {
        matches++;
        break;
      }
      // Prefix match: "concr" matches "concrete", "install" matches "installation"
      if (ta.length >= 3 && tb.length >= 3) {
        if (ta.startsWith(tb) || tb.startsWith(ta)) {
          prefixMatches++;
          break;
        }
      }
    }
  }

  const totalMatches = matches + (prefixMatches * 0.8);
  const maxLen = Math.max(tokA.length, tokB.length);
  const minLen = Math.min(tokA.length, tokB.length);

  // Weighted: full overlap on the shorter name matters more
  return (totalMatches / maxLen) * 0.6 + (totalMatches / minLen) * 0.4;
}

/**
 * Build lookup indexes from a services array.
 * @param {Array} services — Service records with .id, .name, .aliases
 * @returns {{ nameMap: Map, aliasMap: Map, services: Array }}
 */
export function buildServiceIndex(services = []) {
  const nameMap = new Map();   // norm(name) → service
  const aliasMap = new Map();  // norm(alias) → service

  for (const svc of services) {
    const key = norm(svc.name);
    if (key && !nameMap.has(key)) {
      nameMap.set(key, svc);
    }
    // Index aliases
    for (const alias of (svc.aliases || [])) {
      const aKey = norm(alias);
      if (aKey && !aliasMap.has(aKey)) {
        aliasMap.set(aKey, svc);
      }
    }
  }

  return { nameMap, aliasMap, services };
}

/**
 * Find the best canonical Service match for a given name.
 *
 * @param {string} name — The name to reconcile (e.g. line item service_name)
 * @param {{ nameMap: Map, aliasMap: Map, services: Array }} index — From buildServiceIndex
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.55] — Minimum score for fuzzy match
 * @param {number} [opts.ambiguityGap=0.15] — Min gap between top two fuzzy matches
 * @returns {{ service: object, confidence: 'exact'|'alias'|'fuzzy', score: number } | null}
 */
export function findBestMatch(name, index, opts = {}) {
  const threshold = opts.threshold ?? 0.55;
  const ambiguityGap = opts.ambiguityGap ?? 0.15;
  const q = norm(name);
  if (!q) return null;

  // 1. Exact name match
  const exact = index.nameMap.get(q);
  if (exact) return { service: exact, confidence: 'exact', score: 1.0 };

  // 2. Alias match
  const alias = index.aliasMap.get(q);
  if (alias) return { service: alias, confidence: 'alias', score: 0.95 };

  // 3. Token-overlap fuzzy match
  let best = null;
  let secondBest = 0;

  for (const svc of index.services) {
    // Score against canonical name
    let score = tokenScore(name, svc.name);

    // Also score against aliases, take the best
    for (const a of (svc.aliases || [])) {
      const aScore = tokenScore(name, a);
      if (aScore > score) score = aScore;
    }

    if (score >= threshold) {
      if (!best || score > best.score) {
        secondBest = best ? best.score : 0;
        best = { service: svc, confidence: 'fuzzy', score };
      } else if (score > secondBest) {
        secondBest = score;
      }
    }
  }

  // Only return fuzzy match if unambiguous
  if (best && (best.score - secondBest) >= ambiguityGap) {
    return best;
  }

  return null;
}

/**
 * Reconcile a line-item service_name against the canonical Services catalog.
 * Returns the matched service_id or null.
 *
 * @param {string} serviceName
 * @param {Array} services — Canonical services array
 * @returns {{ service_id: string, canonical_name: string, confidence: string } | null}
 */
export function reconcileServiceName(serviceName, services) {
  if (!serviceName || !services?.length) return null;

  const index = buildServiceIndex(services);
  const match = findBestMatch(serviceName, index);

  if (match) {
    return {
      service_id: match.service.id,
      canonical_name: match.service.name,
      confidence: match.confidence,
    };
  }

  return null;
}