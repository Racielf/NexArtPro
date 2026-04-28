import { base44 } from '@/api/base44Client';
import { prepareDownstreamDocument } from '@/lib/downstreamItemMapper';
import { getNextDocumentNumber } from '@/lib/documentNumbering';

function getDueDate(days = 30) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate.toISOString().split('T')[0];
}

function buildInitialPaymentState(total = 0) {
  return {
    payments: [],
    amount_paid: 0,
    balance_due: total || 0,
    payment_status: 'unpaid',
  };
}

export async function ensureInvoiceFromWorkOrder(workOrder, options = {}) {
  if (!workOrder?.id) {
    throw new Error('Work order is required to create an invoice.');
  }

  const existing = await base44.entities.Invoice.filter({ work_order_id: workOrder.id });
  if (existing?.length > 0) {
    return {
      invoice: existing[0],
      created: false,
      duplicates: existing.length > 1 ? existing : [],
    };
  }

  const invoiceNum = await getNextDocumentNumber('invoice');
  const total = workOrder.total || 0;
  const invoice = await base44.entities.Invoice.create({
    invoice_number: invoiceNum,
    work_order_id: workOrder.id,
    ...(workOrder.estimate_id ? { estimate_id: workOrder.estimate_id } : {}),
    ...(workOrder.estimate_version != null ? { estimate_version: workOrder.estimate_version } : {}),
    ...(workOrder.source_proposal_id ? { source_proposal_id: workOrder.source_proposal_id } : {}),
    ...(workOrder.source_proposal_number ? { source_proposal_number: workOrder.source_proposal_number } : {}),
    ...(workOrder.source_close_outcome ? { source_close_outcome: workOrder.source_close_outcome } : {}),
    ...(workOrder.source_selected_pricing_option_id ? { source_selected_pricing_option_id: workOrder.source_selected_pricing_option_id } : {}),
    ...(workOrder.source_selected_pricing_option_title ? { source_selected_pricing_option_title: workOrder.source_selected_pricing_option_title } : {}),
    client_id: workOrder.client_id || '',
    client_name: workOrder.client_name,
    client_email: workOrder.client_email || '',
    client_address: workOrder.client_address || '',
    client_phone: workOrder.client_phone || '',
    title: workOrder.title || `Invoice from Work Order #${workOrder.work_order_number}`,
    status: 'draft',
    ...prepareDownstreamDocument(workOrder.groups || []),
    subtotal: workOrder.subtotal || 0,
    discount_type: workOrder.discount_type || 'percent',
    discount_value: workOrder.discount_value || 0,
    discount_amount: workOrder.discount_amount || 0,
    tax_rate: workOrder.tax_rate || 0,
    tax_amount: workOrder.tax_amount || 0,
    total,
    ...buildInitialPaymentState(total),
    due_date: options.due_date || getDueDate(options.netDays || 30),
    notes: workOrder.notes || '',
    internal_notes: [
      workOrder.internal_notes || '',
      workOrder.work_summary ? `Work summary: ${workOrder.work_summary}` : '',
      workOrder.issues_found ? `Issues found: ${workOrder.issues_found}` : '',
    ].filter(Boolean).join('\n\n'),
    payment_terms: workOrder.payment_terms || '',
    company_id: workOrder.company_id || 'rc-art',
  });

  await base44.entities.WorkOrder.update(workOrder.id, {
    status: 'invoiced',
    invoice_id: invoice.id,
    invoiced_at: new Date().toISOString(),
  });

  return {
    invoice,
    created: true,
    duplicates: [],
  };
}
