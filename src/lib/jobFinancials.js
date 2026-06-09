/**
 * jobFinancials.js — Derived real profit tracking per Work Order
 *
 * Labor cost resolution — priority order:
 *   PRIMARY:  WorkOrderTimeEntry records (multi-worker, multi-session)
 *   FALLBACK: WorkOrder.arrival_time + WorkOrder.departure_time + assigned_worker_id
 *
 * Revenue: sum of ALL invoices linked via invoice.work_order_id
 * Collected: sum of amount_paid across all linked invoices
 */

/** Parse HH:MM → decimal hours. Returns null if invalid or non-positive. */
function parseHHMM(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h + m / 60;
}

/** Hours between two HH:MM strings. Returns null if invalid or non-positive. */
function hoursFromRange(start, end) {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (s === null || e === null) return null;
  const diff = e - s;
  return diff > 0 ? diff : null;
}

/**
 * Compute labor data from WorkOrderTimeEntry records.
 * Returns { cost, total_hours, worker_ids, resolved, partial, missing } counts per entry.
 */
async function computeLaborFromEntries(timeEntries, nexartClient) {
  if (!timeEntries?.length) return null;

  // Collect unique worker_ids to batch-fetch rates
  const workerIds = [...new Set(timeEntries.map(e => e.worker_id).filter(Boolean))];
  const workerMap = {};

  if (workerIds.length) {
    // Fetch all workers in parallel
    const results = await Promise.all(
      workerIds.map(id => nexartClient.entities.Worker.filter({ id }))
    );
    results.forEach((list, i) => {
      if (list?.[0]) workerMap[workerIds[i]] = list[0];
    });
  }

  let totalCost = 0;
  let totalHours = 0;
  let resolved = 0;
  let partial = 0;
  let missing = 0;
  const uniqueWorkerIdsWithData = new Set();

  for (const entry of timeEntries) {
    // Hours: prefer stored duration_hours, else derive from start/end
    const hrs = entry.duration_hours > 0
      ? entry.duration_hours
      : hoursFromRange(entry.start_time, entry.end_time);

    if (hrs === null) { missing++; continue; }

    totalHours += hrs;

    const worker = workerMap[entry.worker_id] || null;
    if (worker?.hourly_rate) {
      totalCost += hrs * worker.hourly_rate;
      resolved++;
      uniqueWorkerIdsWithData.add(entry.worker_id);
    } else {
      // Hours known but no rate
      partial++;
      if (entry.worker_id) uniqueWorkerIdsWithData.add(entry.worker_id);
    }
  }

  return {
    cost: totalCost,
    total_hours: totalHours,
    worker_count: uniqueWorkerIdsWithData.size,
    resolved,
    partial,
    missing,
  };
}

/**
 * Fetch all data needed for job financials.
 * All independent reads are done in parallel.
 */
export async function getJobFinancials(workOrderId, nexartClient) {
  if (!workOrderId || !nexartClient) return null;

  const [woList, expenses, invoices, timeEntries] = await Promise.all([
    nexartClient.entities.WorkOrder.filter({ id: workOrderId }),
    nexartClient.entities.WorkOrderExpense.filter({ work_order_id: workOrderId }),
    nexartClient.entities.Invoice.filter({ work_order_id: workOrderId }),
    nexartClient.entities.WorkOrderTimeEntry.filter({ work_order_id: workOrderId }),
  ]);

  const workOrder = woList?.[0] || null;

  // --- Material cost
  const actual_material_cost = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // --- Labor cost
  let actual_labor_cost = 0;
  let labor_rate_status = 'missing';
  let total_labor_hours = 0;
  let labor_worker_count = 0;
  let using_legacy_time = false;

  const entryData = timeEntries?.length
    ? await computeLaborFromEntries(timeEntries, nexartClient)
    : null;

  if (entryData) {
    // PRIMARY: time entries exist
    actual_labor_cost = entryData.cost;
    total_labor_hours = entryData.total_hours;
    labor_worker_count = entryData.worker_count;

    if (entryData.resolved > 0 && entryData.partial === 0 && entryData.missing === 0) {
      labor_rate_status = 'resolved';
    } else if (entryData.resolved > 0) {
      labor_rate_status = 'partial';
    } else {
      labor_rate_status = 'missing';
    }
  } else {
    // FALLBACK: legacy arrival/departure on WorkOrder itself
    using_legacy_time = true;
    const hours = workOrder ? hoursFromRange(workOrder.arrival_time, workOrder.departure_time) : null;

    if (hours !== null && workOrder?.assigned_worker_id) {
      const workerList = await nexartClient.entities.Worker.filter({ id: workOrder.assigned_worker_id });
      const worker = workerList?.[0] || null;
      if (worker?.hourly_rate) {
        actual_labor_cost = hours * worker.hourly_rate;
        labor_rate_status = 'resolved';
        total_labor_hours = hours;
        labor_worker_count = 1;
      } else if (hours > 0) {
        labor_rate_status = 'partial';
        total_labor_hours = hours;
        labor_worker_count = workOrder.assigned_worker_id ? 1 : 0;
      }
    }
  }

  const actual_cost = actual_material_cost + actual_labor_cost;

  // --- Revenue: sum ALL linked invoices
  const linkedInvoices = invoices || [];
  const invoice_count = linkedInvoices.length;

  const revenue = linkedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const collected = linkedInvoices.reduce((sum, inv) => {
    if (inv.amount_paid != null) return sum + (inv.amount_paid || 0);
    return sum + (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  }, 0);

  // --- Profit / margin
  const profit = revenue - actual_cost;
  const margin = revenue > 0 ? profit / revenue : 0;

  const risk = classifyJobRisk({ actual_cost, revenue });
  const linkedInvoice = linkedInvoices.length === 1 ? linkedInvoices[0] : null;

  return {
    revenue,
    collected,
    actual_cost,
    profit,
    margin,
    invoice_count,
    is_losing_money: actual_cost > revenue && revenue > 0,
    risk,
    no_revenue_linked: revenue === 0,
    labor_rate_status,
    labor_rate_missing: labor_rate_status !== 'resolved', // backward compat
    using_legacy_time,
    breakdown: {
      material: actual_material_cost,
      labor: actual_labor_cost,
    },
    labor_meta: {
      total_hours: total_labor_hours,
      worker_count: labor_worker_count,
    },
    // backward compat
    linked_invoice_id: linkedInvoice?.id || null,
    linked_invoice_number: linkedInvoice?.invoice_number || null,
  };
}

/**
 * Classify job financial risk from derived data.
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