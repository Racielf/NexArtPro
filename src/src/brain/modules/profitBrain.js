import {
  BrainLevel,
  CheckSeverity,
  CheckStatus,
  CheckType,
  createBrainResult,
  createCheck,
  createDecision,
  DecisionPriority,
} from '@/brain/core/brainTypes';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function profitBrain({ entity = {}, related = {}, context = {} } = {}) {
  const financials = entity.financials || related.financials || null;
  const workOrder = entity.workOrder || related.workOrder || null;

  if (!financials) {
    return createBrainResult({
      module: 'profit',
      page: context.page || 'WorkOrderDetail',
      entityId: workOrder?.id || '',
      score: 0,
      level: BrainLevel.UNKNOWN,
      checks: [createCheck({
        id: 'financials_missing',
        label: 'Financial data unavailable',
        type: CheckType.DEPENDENCY,
        status: CheckStatus.INFO,
        severity: CheckSeverity.MEDIUM,
        message: 'Profit Brain could not load job financials.',
        action: 'Open the job financial panel and verify linked invoices, expenses, and time entries.',
        source: 'profitBrain',
      })],
      decision: createDecision({
        priority: DecisionPriority.MEDIUM,
        nextAction: 'Verify job financial data before making decisions.',
        summary: 'Profit Brain unavailable.',
      }),
    });
  }

  const revenue = Number(financials.revenue || 0);
  const actualCost = Number(financials.actual_cost || 0);
  const profit = Number(financials.profit || 0);
  const margin = Number(financials.margin || 0);
  const collected = Number(financials.collected || 0);
  const invoiceCount = Number(financials.invoice_count || 0);
  const laborMissing = financials.labor_rate_status !== 'resolved';
  const noRevenue = revenue <= 0;

  let score = 100;
  const checks = [];

  if (noRevenue) score -= 35;
  if (actualCost > revenue && revenue > 0) score -= 60;
  else if (margin < 0.15 && revenue > 0) score -= 35;
  else if (margin < 0.25 && revenue > 0) score -= 20;
  if (laborMissing) score -= 15;
  if (revenue > 0 && collected < revenue * 0.25 && ['completed', 'invoiced'].includes(workOrder?.status)) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  checks.push(createCheck({
    id: 'job_revenue_linked',
    label: 'Revenue linked',
    type: CheckType.DEPENDENCY,
    status: noRevenue ? CheckStatus.WARN : CheckStatus.PASS,
    severity: noRevenue ? CheckSeverity.HIGH : CheckSeverity.INFO,
    message: noRevenue
      ? 'No linked invoice revenue found for this work order.'
      : `${invoiceCount} linked invoice(s), revenue ${money(revenue)}.`,
    action: noRevenue ? 'Create or link an invoice to evaluate real job profit.' : '',
    source: 'profitBrain',
    meta: { revenue, invoiceCount },
  }));

  checks.push(createCheck({
    id: 'job_profit_margin',
    label: 'Profit margin',
    type: CheckType.INTELLIGENCE,
    status: profit < 0 ? CheckStatus.FAIL : margin < 0.25 ? CheckStatus.WARN : CheckStatus.PASS,
    severity: profit < 0 ? CheckSeverity.CRITICAL : margin < 0.15 ? CheckSeverity.HIGH : margin < 0.25 ? CheckSeverity.MEDIUM : CheckSeverity.INFO,
    message: revenue > 0
      ? `Profit ${money(profit)} · margin ${(margin * 100).toFixed(1)}%.`
      : `Actual cost is ${money(actualCost)} with no linked revenue.`,
    action: profit < 0
      ? 'Review job scope, expenses, labor, and invoice amount immediately.'
      : margin < 0.25 && revenue > 0
        ? 'Review costs before closing the job or issuing final invoice.'
        : '',
    source: 'profitBrain',
    meta: { revenue, actualCost, profit, margin },
  }));

  checks.push(createCheck({
    id: 'labor_rate_resolved',
    label: 'Labor rate resolved',
    type: CheckType.INTEGRITY,
    status: laborMissing ? CheckStatus.WARN : CheckStatus.PASS,
    severity: laborMissing ? CheckSeverity.MEDIUM : CheckSeverity.INFO,
    message: laborMissing
      ? `Labor rate status is ${financials.labor_rate_status || 'missing'}, so profit may be understated or inaccurate.`
      : 'Labor cost is using resolved worker rates.',
    action: laborMissing ? 'Add missing worker hourly rates or verify time entries.' : '',
    source: 'profitBrain',
    meta: {
      labor_rate_status: financials.labor_rate_status,
      labor_cost: financials.breakdown?.labor || 0,
      labor_meta: financials.labor_meta || {},
    },
  }));

  checks.push(createCheck({
    id: 'collection_status',
    label: 'Collection status',
    type: CheckType.HEALTH,
    status: revenue > 0 && collected < revenue ? CheckStatus.INFO : CheckStatus.PASS,
    severity: CheckSeverity.LOW,
    message: revenue > 0
      ? `Collected ${money(collected)} of ${money(revenue)}.`
      : 'No revenue linked yet.',
    action: revenue > 0 && collected < revenue ? 'Follow up on remaining balance if job is completed.' : '',
    source: 'profitBrain',
    meta: { collected, revenue },
  }));

  let level = BrainLevel.HEALTHY;
  let priority = DecisionPriority.LOW;
  let nextAction = 'Job profit looks healthy.';
  let summary = `Profit ${money(profit)} · margin ${(margin * 100).toFixed(1)}%.`;

  if (noRevenue) {
    level = BrainLevel.WARNING;
    priority = DecisionPriority.MEDIUM;
    nextAction = 'Link or create an invoice to evaluate job profitability.';
    summary = 'Profit cannot be trusted yet because no revenue is linked.';
  }

  if (profit < 0 && revenue > 0) {
    level = BrainLevel.CRITICAL;
    priority = DecisionPriority.CRITICAL;
    nextAction = 'Stop and review job financials before closing or invoicing additional work.';
    summary = `This job is losing money: ${money(profit)}.`;
  } else if (revenue > 0 && margin < 0.15) {
    level = BrainLevel.CRITICAL;
    priority = DecisionPriority.HIGH;
    nextAction = 'Review expenses, labor, and possible change order before closing.';
    summary = `Job margin is critically low at ${(margin * 100).toFixed(1)}%.`;
  } else if (revenue > 0 && margin < 0.25) {
    level = BrainLevel.WARNING;
    priority = DecisionPriority.MEDIUM;
    nextAction = 'Review cost creep before final closeout.';
    summary = `Job margin is below target at ${(margin * 100).toFixed(1)}%.`;
  }

  const warnings = checks.filter(c => c.status === CheckStatus.WARN).map(c => c.message);
  const blockers = checks.filter(c => c.status === CheckStatus.FAIL).map(c => c.message);
  const risks = checks.filter(c => c.status !== CheckStatus.PASS);

  return createBrainResult({
    module: 'profit',
    page: context.page || 'WorkOrderDetail',
    entityId: workOrder?.id || '',
    score,
    level,
    checks,
    risks,
    blockers,
    warnings,
    decision: createDecision({
      priority,
      nextAction,
      summary,
      blockers,
      warnings,
      suggestedActions: checks.map(c => c.action).filter(Boolean),
    }),
    meta: {
      workOrderId: workOrder?.id,
      workOrderNumber: workOrder?.work_order_number,
      analyzedAt: new Date().toISOString(),
      revenue,
      actualCost,
      profit,
      margin,
    },
  });
}
