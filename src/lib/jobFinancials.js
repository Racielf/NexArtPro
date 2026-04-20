/**
 * jobFinancials.js — Derived real profit tracking per Work Order
 *
 * Labor cost resolution chain (in priority order):
 *   1. WorkOrder.arrival_time + WorkOrder.departure_time + Worker.hourly_rate
 *      → Worker is fetched via WorkOrder.assigned_worker_id
 *   2. If Worker has no hourly_rate → labor cost = 0, labor_rate_status = 'missing'
 *
 * Revenue: sum of ALL invoices linked via invoice.work_order_id
 * Collected: sum of amount_paid across all linked invoices
 */

/**
 * Parse HH:MM time strings from WorkOrder arrival/departure into decimal hours.
 * Returns null if unparseable or duration <= 0.
 */
function parseHoursOnSite(arrival, departure) {
  if (!arrival || !departure) return null;
  const [ah, am] = arrival.split(':').map(Number);
  const [dh, dm] = departure.split(':').map(Number);
  if (isNaN(ah) || isNaN(am) || isNaN(dh) || isNaN(dm)) return null;
  const totalMinutes = (dh * 60 + dm) - (ah * 60 + am);
  return totalMinutes > 0 ? totalMinutes / 60 : null;
}

/**
 * Fetch all data needed for job financials.
 * All reads in parallel for performance.
 */
export async function getJobFinancials(workOrderId, base44) {
  if (!workOrderId || !base44) return null;

  // Load WorkOrder itself (needed for arrival/departure + assigned_worker_id)
  const [woList, expenses, invoices] = await Promise.all([
    base44.entities.WorkOrder.filter({ id: workOrderId }),
    base44.entities.WorkOrderExpense.filter({ work_order_id: workOrderId }),
    base44.entities.Invoice.filter({ work_order_id: workOrderId }),
  ]);

  const workOrder = woList?.[0] || null;

  // --- Material cost: sum all WOExpense amounts
  const actual_material_cost = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // --- Labor cost: resolve from WorkOrder time + Worker.hourly_rate
  let actual_labor_cost = 0;
  let labor_rate_status = 'missing';

  const hours = workOrder ? parseHoursOnSite(workOrder.arrival_time, workOrder.departure_time) : null;

  if (hours !== null && workOrder?.assigned_worker_id) {
    // Fetch the assigned worker to get their hourly_rate
    const workerList = await base44.entities.Worker.filter({ id: workOrder.assigned_worker_id });
    const worker = workerList?.[0] || null;
    if (worker?.hourly_rate) {
      actual_labor_cost = hours * worker.hourly_rate;
      labor_rate_status = 'resolved';
    } else if (hours > 0) {
      // Time recorded but no rate on worker
      labor_rate_status = 'partial';
    }
  } else if (hours === null && workOrder?.assigned_worker_id) {
    // Worker exists but no time logged yet
    labor_rate_status = 'missing';
  }

  const actual_cost = actual_material_cost + actual_labor_cost;

  // --- Revenue: sum ALL linked invoices (not just the first one)
  const linkedInvoices = invoices || [];
  const invoice_count = linkedInvoices.length;

  const revenue = linkedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Collected: prefer amount_paid field; fall back to summing payments[] array
  const collected = linkedInvoices.reduce((sum, inv) => {
    if (inv.amount_paid != null) return sum + (inv.amount_paid || 0);
    const paid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    return sum + paid;
  }, 0);

  // --- Profit / margin
  const profit = revenue - actual_cost;
  const margin = revenue > 0 ? profit / revenue : 0;

  const is_losing_money = actual_cost > revenue && revenue > 0;
  const risk = classifyJobRisk({ actual_cost, revenue });

  // For backward compat — expose first invoice info if only one
  const linkedInvoice = linkedInvoices.length === 1 ? linkedInvoices[0] : null;

  return {
    revenue,
    collected,
    actual_cost,
    profit,
    margin,
    invoice_count,
    is_losing_money,
    risk,
    no_revenue_linked: revenue === 0,
    labor_rate_status,
    // keep legacy field for any code that checks it
    labor_rate_missing: labor_rate_status !== 'resolved',
    breakdown: {
      material: actual_material_cost,
      labor: actual_labor_cost,
    },
    // backward compat
    linked_invoice_id: linkedInvoice?.id || null,
    linked_invoice_number: linkedInvoice?.invoice_number || null,
  };
}

/**
 * Classify job financial risk from derived data.
 * Returns: { level: 'healthy' | 'warning' | 'losing' | 'unknown', label, description }
 * No DB persistence — purely derived.
 */
export function classifyJobRisk({ actual_cost, revenue }) {
  if (!revenue || revenue === 0) {
    return { level: 'unknown', label: 'No Revenue', description: 'No linked invoice to compare against' };
  }
  if (actual_cost > revenue) {
    return { level: 'losing', label: 'Losing Money', description: 'Actual cost exceeds revenue on this job' };
  }
  if (actual_cost >= revenue * 0.85) {
    return { level: 'warning', label: 'At Risk', description: 'Cost is approaching revenue (≥85%)' };
  }
  return { level: 'healthy', label: 'Healthy', description: 'Cost is well within revenue' };
}