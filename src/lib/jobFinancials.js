/**
 * jobFinancials.js — Derived real profit tracking per Work Order
 *
 * Uses ONLY existing data:
 *   - WOExpenses.amount        → material/misc actual cost
 *   - WOTimeTracking (not used — no hourly_rate field exists in current schema)
 *   - Invoice linked via invoice.work_order_id → revenue
 *
 * MISSING DATA NOTE:
 *   WOTimeTracking records track arrival/departure time but do NOT store
 *   a hourly_rate field. Labor cost is therefore reported as 0 with a
 *   clear `labor_rate_missing: true` flag in the returned object.
 *   To enable real labor cost: add hourly_rate to Worker or WOTimeTracking schema.
 */

/**
 * Fetch all data needed for job financials.
 * All reads in parallel for performance.
 */
export async function getJobFinancials(workOrderId, base44) {
  if (!workOrderId || !base44) return null;

  const [expenses, invoices] = await Promise.all([
    base44.entities.WorkOrderExpense.filter({ work_order_id: workOrderId }),
    base44.entities.Invoice.filter({ work_order_id: workOrderId }),
  ]);

  // --- Material cost: sum all WOExpense amounts
  const actual_material_cost = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // --- Labor cost: NOT computable — no hourly_rate in current schema
  const actual_labor_cost = 0;
  const labor_rate_missing = true; // honest flag — do not hide this

  const actual_cost = actual_material_cost + actual_labor_cost;

  // --- Revenue: use linked invoice total (collected or expected)
  // Prefer the invoice linked directly via work_order_id
  const linkedInvoice = invoices?.[0] || null;

  // Revenue = invoice.total (expected billing), not amount_paid
  // amount_paid is cash received; total is the job's revenue value
  const revenue = linkedInvoice?.total || 0;

  // --- Profit / margin
  const profit = revenue - actual_cost;
  const margin = revenue > 0 ? profit / revenue : 0;

  return {
    revenue,
    actual_cost,
    profit,
    margin,
    is_losing_money: actual_cost > revenue && revenue > 0,
    no_revenue_linked: revenue === 0,
    labor_rate_missing,
    breakdown: {
      material: actual_material_cost,
      labor: actual_labor_cost,
    },
    linked_invoice_id: linkedInvoice?.id || null,
    linked_invoice_number: linkedInvoice?.invoice_number || null,
  };
}