/**
 * buildEstimateDocumentViewModel.js
 *
 * Single source of truth for document rendering data preparation.
 * All templates consume the output of this builder — no template should
 * independently recompute domain/business logic.
 *
 * DOES NOT contain visual/styling logic — that stays in templates.
 * DOES NOT modify pricing formulas — those live in estimateEngine.js.
 */
import { normalizeLineItem } from './lineItemNormalizer';
import { APP_CONFIG } from './appConfig';

// ─── Safe helpers ──────────────────────────────────────────────────────────────
const safeStr = (v, fallback = '') => (typeof v === 'string' ? v : fallback);
const safeNum = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};

// ─── Date formatting ───────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── Status styles ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  approved:  { bg: '#166534', color: '#bbf7d0' },
  declined:  { bg: '#7f1d1d', color: '#fecaca' },
  sent:      { bg: '#1e3a5f', color: '#93c5fd' },
  draft:     { bg: '#1e293b', color: '#94a3b8' },
  converted: { bg: '#14532d', color: '#bbf7d0' },
};

// ─── Template alias normalization ──────────────────────────────────────────────
const TEMPLATE_ALIASES = { professional: 'clean', detailed: 'clean', standard: 'clean', minimal: 'clean', modern: 'modern_card', executive: 'premium', compact: 'modern_card', pro: 'modern_card' };
const VALID_TEMPLATES = ['clean', 'premium', 'modern_card'];

function resolveTemplate(template) {
  if (VALID_TEMPLATES.includes(template)) return template;
  return TEMPLATE_ALIASES[template] || 'clean';
}

// ─── Column visibility by document type ────────────────────────────────────────
function getLineItemColumns(documentType, showPrices = true) {
  if (documentType === 'workorder') {
    return { description: true, quantity: true, unit: true, price: false, total: false };
  }
  return { description: true, quantity: true, unit: true, price: showPrices, total: showPrices };
}

// ─── Terms array builder ───────────────────────────────────────────────────────
const TERMS_CONFIG = [
  { key: 'exclusions', label: 'Exclusions' },
  { key: 'paymentTerms', label: 'Payment Terms' },
  { key: 'warrantyTerms', label: 'Warranty' },
  { key: 'legalTerms', label: 'Terms & Conditions' },
];

function buildTermsArray(textObj) {
  return TERMS_CONFIG
    .filter(t => textObj[t.key])
    .map(t => ({ key: t.key, label: t.label, value: textObj[t.key] }));
}

// ─── Groups resolution (groups[] or legacy line_items[] fallback) ──────────────
function resolveGroups(estimate) {
  if (estimate?.groups?.length) {
    return estimate.groups.map(g => {
      const items = (g.items || []).map(normalizeLineItem);
      const subtotal = items.reduce((s, i) => s + (i.line_total || 0), 0);
      return { id: g.id, name: g.name || null, collapsed: !!g.collapsed, items, subtotal };
    });
  }
  if (estimate?.line_items?.length) {
    const items = estimate.line_items.map(normalizeLineItem);
    const subtotal = items.reduce((s, i) => s + (i.line_total || 0), 0);
    return [{ id: 'legacy', name: null, items, subtotal }];
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a fully prepared, rendering-safe document view model.
 *
 * @param {Object} params
 * @param {Object} params.estimate       — Estimate (or estimate-shaped) record
 * @param {Object} [params.companyConfig] — From useCompanyConfig() hook
 * @param {string} [params.documentType]  — 'estimate' | 'invoice' | 'workorder'
 * @param {string} [params.template]      — Template key (may be alias)
 * @param {Object} [params.options]       — Visibility overrides
 * @returns {Object} Fully resolved view model
 */
export function buildEstimateDocumentViewModel({
  estimate,
  companyConfig = {},
  documentType = 'estimate',
  template = 'standard',
  options = {},
} = {}) {
  if (!estimate) return null;

  const cc = companyConfig;

  // ─── Meta ────────────────────────────────────────────────────────────────
  const resolvedTemplate = resolveTemplate(template);
  const today = todayFormatted();
  const expirationDate = formatDate(estimate.expiration_date);
  const statusStyle = STATUS_COLORS[estimate.status] || STATUS_COLORS.draft;

  const isWorkOrder = documentType === 'workorder';
  const isInvoice = documentType === 'invoice';
  const isEstimate = documentType === 'estimate';

  const docTypeLabel = isWorkOrder ? 'WORK ORDER' : isInvoice ? 'INVOICE' : 'ESTIMATE';

  // Resolve best document number for display
  const documentNumber = estimate.estimate_number || estimate.invoice_number || estimate.work_order_number || null;

  const meta = {
    documentType,
    documentTypeLabel: docTypeLabel,
    template: resolvedTemplate,
    today,
    expirationDate,
    status: estimate.status || 'draft',
    statusLabel: (estimate.status || 'draft').replace(/_/g, ' ').toUpperCase(),
    statusStyle,
    documentNumber,
    estimateNumber: estimate.estimate_number || null,
    invoiceNumber: estimate.invoice_number || null,
    workOrderNumber: estimate.work_order_number || null,
  };

  // ─── Company ─────────────────────────────────────────────────────────────
  const company = {
    name: cc.name || APP_CONFIG.company.name,
    address: cc.address || APP_CONFIG.company.address,
    email: cc.email || APP_CONFIG.company.email,
    phone: cc.phone || APP_CONFIG.company.phone,
    logoUrl: cc.logo_url || APP_CONFIG.company.logo_url || '',
    license: cc.license || APP_CONFIG.company.license || '',
    tagline: cc.tagline || APP_CONFIG.company.tagline || '',
    city: cc.city || APP_CONFIG.company.city || '',
    paymentMethods: cc.payment_methods || '',
  };

  // ─── Client ──────────────────────────────────────────────────────────────
  const client = {
    name: safeStr(estimate.client_name),
    email: safeStr(estimate.client_email),
    phone: safeStr(estimate.client_phone),
    address: safeStr(estimate.client_address),
  };

  // ─── Project ─────────────────────────────────────────────────────────────
  const startDate = formatDate(estimate.project_start_date);
  const endDate = formatDate(estimate.project_end_date);

  const project = {
    title: safeStr(estimate.title),
    startDate,
    endDate,
    hasProjectDates: !!(startDate || endDate),
    assignedTo: safeStr(estimate.assigned_to),
    jobNumber: safeStr(estimate.job_number),
    planReference: safeStr(estimate.plan_reference),
  };

  // ─── Visibility ──────────────────────────────────────────────────────────
  const showPrices = isWorkOrder ? false : (options.showPrices !== false);

  // Date visibility — explicit per-flag with fallback rules
  const showDocumentDate = options.showDocumentDate !== false;
  const showProjectStartDate = options.showProjectStartDate !== false;
  const showProjectEndDate = options.showProjectEndDate !== false;
  // Legacy compat: if old showProjectDates is explicitly false, disable both project dates
  if (options.showProjectDates === false && options.showProjectStartDate === undefined && options.showProjectEndDate === undefined) {
    // handled below
  }
  const effectiveShowStartDate = options.showProjectDates === false && options.showProjectStartDate === undefined ? false : showProjectStartDate;
  const effectiveShowEndDate = options.showProjectDates === false && options.showProjectEndDate === undefined ? false : showProjectEndDate;

  const visibility = {
    isEstimate,
    isInvoice,
    isWorkOrder,
    showPrices,
    showBreakdown: options.showBreakdown !== false,
    showTerms: options.showTerms !== false,
    showSignatures: options.showSignatures !== false,
    showProjectDates: effectiveShowStartDate || effectiveShowEndDate,
    showDocumentDate,
    showProjectStartDate: effectiveShowStartDate,
    showProjectEndDate: effectiveShowEndDate,
    showDeposit: options.showDeposit !== false,
    hideInternalNotes: options.hideInternalNotes !== false,
    // Granular visibility flags
    showBusinessLogo: options.showBusinessLogo !== false,
    showBusinessName: options.showBusinessName !== false,
    showBusinessAddress: options.showBusinessAddress !== false,
    showEstimateNumber: options.showEstimateNumber !== false,
    showEstimateName: options.showEstimateName !== false,
    showNotes: options.showNotes !== false,
    showMaterials: options.showMaterials !== false,
    showCustomerName: options.showCustomerName !== false,
    showExpirationDate: options.showExpirationDate !== false,
    showTechnicianName: options.showTechnicianName !== false,
  };

  // ─── Groups ──────────────────────────────────────────────────────────────
  const groups = resolveGroups(estimate);

  // ─── Totals ──────────────────────────────────────────────────────────────
  const total = safeNum(estimate.total);
  const depositPct = safeNum(estimate.deposit_percent);
  const depositAmount = safeNum(estimate.deposit_amount) || (total * depositPct / 100);
  const remaining = total - depositAmount;

  const totals = {
    subtotal: safeNum(estimate.subtotal),
    discountType: safeStr(estimate.discount_type, 'percent'),
    discountValue: safeNum(estimate.discount_value),
    discountAmount: safeNum(estimate.discount_amount),
    taxRate: safeNum(estimate.tax_rate),
    taxAmount: safeNum(estimate.tax_amount),
    total,
    depositPercent: depositPct,
    depositAmount,
    remaining,
    totalCost: safeNum(estimate.total_cost),
    grossMargin: safeNum(estimate.gross_margin),
    grossMarginPct: safeNum(estimate.gross_margin_pct),
  };

  // ─── Text ────────────────────────────────────────────────────────────────
  const text = {
    notes: safeStr(estimate.notes),
    internalNotes: safeStr(estimate.internal_notes),
    exclusions: safeStr(estimate.exclusions),
    paymentTerms: safeStr(estimate.payment_terms),
    warrantyTerms: safeStr(estimate.warranty_terms),
    legalTerms: safeStr(estimate.legal_terms),
  };

  // ─── Materials ────────────────────────────────────────────────────────────
  const materialsRaw = Array.isArray(estimate.materials) ? estimate.materials : [];
  const materialsItems = materialsRaw.map(m => ({
    id: m.id || '',
    name: safeStr(m.name),
    description: safeStr(m.description),
    quantity: safeNum(m.quantity),
    unit: safeStr(m.unit, 'ea'),
    unit_price: safeNum(m.unit_price),
    line_total: safeNum(m.line_total),
  }));
  const materialsSubtotal = materialsItems.reduce((s, m) => s + m.line_total, 0);

  // ─── Columns ─────────────────────────────────────────────────────────────
  const columns = getLineItemColumns(documentType, showPrices);

  // ─── Pre-built terms array for templates ─────────────────────────────────
  const termsArray = buildTermsArray(text);

  return {
    meta,
    company,
    client,
    project,
    visibility,
    groups,
    materials: materialsItems,
    materialsSubtotal,
    totals,
    text,
    columns,
    termsArray,
  };
}