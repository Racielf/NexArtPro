/**
 * EstimateToDocumentMapper — Mapeo puro estimate → DocumentData
 * Sin lógica visual, sin condicionales de visibilidad.
 * Sanitiza datos internos (internal_notes).
 */

export function EstimateToDocumentMapper(estimate) {
  if (!estimate) {
    throw new Error('Estimate is required');
  }

  // Mapear grupos o fallback a legacy line_items
  const groups = estimate.groups?.length
    ? estimate.groups.map(g => ({
        id: g.id,
        name: g.name,
        items: (g.items || []).map(item => ({
          id: item.id,
          service_name: item.service_name || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'ea',
          unit_price: item.unit_price || 0,
          line_total: item.line_total || 0,
          taxable: item.taxable !== false,
        })),
        subtotal: (g.items || []).reduce((s, i) => s + (i.line_total || 0), 0),
      }))
    : estimate.line_items?.length
    ? [{
        id: 'legacy',
        name: 'Services',
        items: estimate.line_items.map((li, idx) => ({
          id: li.id || `item-${idx}`,
          service_name: li.name || li.service_name || '',
          description: li.description || '',
          quantity: li.quantity || 1,
          unit: li.unit || 'ea',
          unit_price: li.unit_price || 0,
          line_total: li.line_total || li.total_price || 0,
          taxable: li.taxable !== false,
        })),
        subtotal: estimate.line_items.reduce((s, li) => s + (li.line_total || li.total_price || 0), 0),
      }]
    : [];

  return {
    // Metadata
    estimate_number: estimate.estimate_number || 0,
    client_name: estimate.client_name || '',
    client_email: estimate.client_email || '',
    client_address: estimate.client_address || '',
    client_phone: estimate.client_phone || '',
    title: estimate.title || '',
    expiration_date: estimate.expiration_date || null,
    project_start_date: estimate.project_start_date || null,
    project_end_date: estimate.project_end_date || null,

    // Document structure
    groups,

    // Financials
    subtotal: estimate.subtotal || 0,
    discount_amount: estimate.discount_amount || 0,
    discount_type: estimate.discount_type || 'percent',
    discount_value: estimate.discount_value || 0,
    tax_rate: estimate.tax_rate || 0,
    tax_amount: estimate.tax_amount || 0,
    total: estimate.total || 0,
    deposit_percent: estimate.deposit_percent || 0,
    deposit_amount: estimate.deposit_amount || 0,

    // Content (NO internal_notes)
    notes: estimate.notes || '',
    exclusions: estimate.exclusions || '',
    warranty_terms: estimate.warranty_terms || '',
    payment_terms: estimate.payment_terms || '',
    legal_terms: estimate.legal_terms || '',

    // Status & timestamps
    status: estimate.status || 'draft',
    sent_at: estimate.sent_at || null,
    viewed_at: estimate.viewed_at || null,
    approved_at: estimate.approved_at || null,
    signed_at: estimate.signed_at || null,

    // Signature
    signer_name: estimate.signer_name || undefined,
    signature_image_base64: estimate.signature_image_base64 || undefined,
  };
}