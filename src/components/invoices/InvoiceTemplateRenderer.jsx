import React from 'react';
import InvoiceCleanTemplate from './templates/InvoiceCleanTemplate';
import InvoiceModernTemplate from './templates/InvoiceModernTemplate';
import InvoicePremiumTemplate from './templates/InvoicePremiumTemplate';

/**
 * InvoiceTemplateRenderer — Dispatches invoice data to the selected template.
 *
 * Props:
 *   invoice   — invoice object (required)
 *   company   — resolved company object (from snapshot or live config)
 *   derived   — { amount_paid, balance_due, payment_status }
 *   template  — 'clean' | 'modern' | 'premium' (default: 'clean')
 */

const TEMPLATE_MAP = {
  clean:   'clean',
  modern:  'modern',
  premium: 'premium',
  // Aliases
  default: 'clean',
  card:    'modern',
  executive: 'premium',
};

function resolveTemplate(key) {
  return TEMPLATE_MAP[key] || 'clean';
}

export const INVOICE_TEMPLATES = [
  { key: 'clean',   label: 'Clean',   desc: 'Modern professional — dark header, clean table' },
  { key: 'modern',  label: 'Modern',  desc: 'Card-based SaaS style — shadowed cards, blue accent' },
  { key: 'premium', label: 'Premium', desc: 'Executive grade — gradient header, gold accent' },
];

export default function InvoiceTemplateRenderer({ invoice, company, derived, template = 'clean' }) {
  if (!invoice) return null;

  const resolved = resolveTemplate(template);
  const props = { invoice, company, derived };

  switch (resolved) {
    case 'modern':
      return <InvoiceModernTemplate {...props} />;
    case 'premium':
      return <InvoicePremiumTemplate {...props} />;
    case 'clean':
    default:
      return <InvoiceCleanTemplate {...props} />;
  }
}
