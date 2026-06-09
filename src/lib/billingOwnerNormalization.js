/**
 * billingOwnerNormalization.js
 * Normalize billing_issue_owner to prevent fragmentation (casing, spacing, email lowercasing)
 * Simple practical rules without fuzzy matching
 */

/**
 * Normalize owner value for storage
 * Rules:
 * - trim whitespace
 * - collapse repeated spaces
 * - lowercase emails (text@domain)
 * - preserve case for names (will be title-cased at display)
 */
export function normalizeBillingOwner(rawValue) {
  if (!rawValue) return null;
  
  // Trim and collapse spaces
  let normalized = String(rawValue).trim().replace(/\s+/g, ' ');
  
  // If looks like email, lowercase it
  if (isLikelyEmail(normalized)) {
    normalized = normalized.toLowerCase();
  } else {
    // For names: title case for consistency
    normalized = normalized.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return normalized || null;
}

/**
 * Check if value looks like an email
 */
export function isLikelyEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

/**
 * Format owner value for display
 * If email, show lowercased; if name, show title-cased
 */
export function formatBillingOwnerDisplay(value) {
  if (!value) return '—';
  
  const normalized = normalizeBillingOwner(value);
  if (!normalized) return '—';
  
  // Email stays lowercase
  if (isLikelyEmail(normalized)) {
    return normalized;
  }
  
  // Names already title-cased by normalizeBillingOwner
  return normalized;
}

/**
 * Extract recent unique normalized owners from invoices
 * Used to populate suggestions in UI
 */
export function getRecentOwners(invoices, limit = 10) {
  const owners = new Set();
  
  invoices.forEach(inv => {
    if (inv.billing_issue_owner) {
      const normalized = normalizeBillingOwner(inv.billing_issue_owner);
      if (normalized) {
        owners.add(normalized);
      }
    }
  });
  
  return Array.from(owners).slice(0, limit);
}

/**
 * Detect likely duplicate owners (same normalized value, different raw values)
 * Returns map of normalized → [raw variants]
 * Useful for detecting historical data fragmentation
 */
export function detectDuplicateOwners(invoices) {
  const duplicates = {};
  
  invoices.forEach(inv => {
    if (inv.billing_issue_owner) {
      const normalized = normalizeBillingOwner(inv.billing_issue_owner);
      const raw = String(inv.billing_issue_owner).trim();
      
      if (normalized && raw !== normalized) {
        if (!duplicates[normalized]) {
          duplicates[normalized] = new Set();
        }
        duplicates[normalized].add(raw);
      }
    }
  });
  
  // Convert Sets to arrays for easier inspection
  const result = {};
  Object.keys(duplicates).forEach(key => {
    if (duplicates[key].size > 1) {
      result[key] = Array.from(duplicates[key]);
    }
  });
  
  return result;
}