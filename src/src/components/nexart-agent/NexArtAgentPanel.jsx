import React from 'react';
import { base44 } from '@/api/base44Client';
import { runSystemBrainV2 } from '@/brain/system/systemBrain';
import { executeAgentAction } from '@/brain/core/executeAgentAction';

function getBalance(invoice) {
  return Math.max((invoice?.total || 0) - (invoice?.amount_paid || 0), 0);
}

function isOlderThanDays(dateValue, days) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
}

function summarizeBusinessData({ invoices = [], estimates = [], workOrders = [] }) {
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const unpaidInvoices = invoices.filter(i => ['sent', 'viewed', 'overdue', 'partial'].includes(i.status));
  const openEstimates = estimates.filter(e => ['draft', 'scheduled', 'visit_completed', 'sent', 'viewed', 'changes_requested'].includes(e.status));
  const openWorkOrders = workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status));
  const staleEstimates = estimates.filter(e => ['sent', 'viewed'].includes(e.status) && isOlderThanDays(e.sent_at || e.updated_date || e.created_date, 7));
  const approvedUnconverted = estimates.filter(e => ['approved', 'signed'].includes(e.status));
  const unassignedWorkOrders = openWorkOrders.filter(w => !w.assigned_worker_name && !w.assigned_to && !w.worker_id);

  return {
    invoices: invoices.length,
    estimates: estimates.length,
    workOrders: workOrders.length,
    overdueInvoices: overdueInvoices.length,
    unpaidBalance: unpaidInvoices.reduce((sum, invoice) => sum + getBalance(invoice), 0),
    openEstimates: openEstimates.length,
    staleEstimates: staleEstimates.length,
    approvedUnconverted: approvedUnconverted.length,
    openWorkOrders: openWorkOrders.length,
    unassignedWorkOrders: unassignedWorkOrders.length,
  };
}

function buildDiagnostics(business = {}) {
  const diagnostics = [];

  if ((business.unpaidBalance || 0) > 0 || (business.overdueInvoices || 0) > 0) {
    diagnostics.push({
      priority: 'cash_flow',
      severity: business.overdueInvoices > 0 ? 'high' : 'medium',
      title: 'Cash flow needs attention',
      detail: `${business.overdueInvoices || 0} overdue invoice(s), $${(business.unpaidBalance || 0).toLocaleString()} unpaid balance.`,
      nextStep: 'Review invoices and collections before optimizing sales or operations.',
    });
  }

  if ((business.unassignedWorkOrders || 0) > 0) {
    diagnostics.push({
      priority: 'execution',
      severity: 'medium',
      title: 'Execution has unassigned work',
      detail: `${business.unassignedWorkOrders} open work order(s) appear unassigned.`,
      nextStep: 'Assign owners before adding more operational automation.',
    });
  }

  if ((business.approvedUnconverted || 0) > 0) {
    diagnostics.push({
      priority: 'sales',
      severity: 'medium',
      title: 'Approved estimates need conversion',
      detail: `${business.approvedUnconverted} approved/signed estimate(s) may need work order conversion.`,
      nextStep: 'Review approved estimates and convert when ready.',
    });
  }

  if ((business.staleEstimates || 0) > 0) {
    diagnostics.push({
      priority: 'sales',
      severity: 'low',
      title: 'Follow-up opportunities detected',
      detail: `${business.staleEstimates} sent/viewed estimate(s) look older than 7 days.`,
      nextStep: 'Follow up before creating new estimates.',
    });
  }

  if (!diagnostics.length) {
    diagnostics.push({
      priority: 'monitoring',
      severity: 'low',
      title: 'No immediate operational gaps detected',
      detail: 'Current read-only checks did not find urgent cash flow, sales, or execution issues.',
      nextStep: 'Continue monitoring. No action executed.',
    });
  }

  return diagnostics;
}

function buildSuggestedActions(business = {}) {
  const actions = [];

  if ((business.overdueInvoices || 0) > 0) {
    actions.push({
      priority: 'cash_flow',
      label: 'Review overdue invoices',
      reason: `${business.overdueInvoices} invoice(s) are overdue.`,
      target: '/invoices',
      actionType: 'follow_up',
      payload: { count: business.overdueInvoices, target: '/invoices' },
      riskLevel: 'medium',
      requiresConfirmation: true,
      safeMode: 'suggest_only',
    });
  } else if ((business.unpaidBalance || 0) > 0) {
    actions.push({
      priority: 'cash_flow',
      label: 'Review unpaid balances',
      reason: `$${business.unpaidBalance.toLocaleString()} is unpaid.`,
      target: '/invoices',
      actionType: 'navigate_review',
      payload: { amount: business.unpaidBalance, target: '/invoices' },
      riskLevel: 'low',
      requiresConfirmation: false,
      safeMode: 'navigate_only',
    });
  }

  if ((business.unassignedWorkOrders || 0) > 0) {
    actions.push({
      priority: 'execution',
      label: 'Review unassigned work orders',
      reason: `${business.unassignedWorkOrders} open work order(s) appear unassigned.`,
      target: '/work-orders',
      actionType: 'operational_follow_up',
      payload: { count: business.unassignedWorkOrders, target: '/work-orders' },
      riskLevel: 'medium',
      requiresConfirmation: false,
      safeMode: 'navigate_only',
    });
  }

  if ((business.approvedUnconverted || 0) > 0) {
    actions.push({
      priority: 'sales',
      label: 'Review approved estimates for conversion',
      reason: `${business.approvedUnconverted} approved/signed estimate(s) may need work order conversion.`,
      target: '/estimates',
      actionType: 'status_change',
      payload: { count: business.approvedUnconverted, target: '/estimates' },
      riskLevel: 'medium',
      requiresConfirmation: true,
      safeMode: 'suggest_only',
    });
  }

  if ((business.staleEstimates || 0) > 0) {
    actions.push({
      priority: 'sales',
      label: 'Review stale estimate follow-ups',
      reason: `${business.staleEstimates} sent/viewed estimate(s) are older than 7 days.`,
      target: '/estimates',
      actionType: 'follow_up',
      payload: { count: business.staleEstimates, target: '/estimates' },
      riskLevel: 'medium',
      requiresConfirmation: false,
      safeMode: 'navigate_only',
    });
  }

  if (!actions.length) {
    actions.push({
      priority: 'monitoring',
      label: 'Continue monitoring',
      reason: 'No immediate action is recommended by the read-only checks.',
      target: null,
      actionType: 'suggest_only',
      payload: {},
      riskLevel: 'low',
      requiresConfirmation: false,
      safeMode: 'read_only',
    });
  }

  return actions;
}

function severityClasses(severity) {
  if (severity === 'high') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function priorityClasses(priority) {
  if (priority === 'cash_flow') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'execution') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (priority === 'sales') return 'border-violet-200 bg-violet-50 text-violet-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

const RISK_BADGE = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-slate-100 text-slate-500 border-slate-200',
};

function ActionButton({ action, onRequestExecute }) {
  const decision = React.useMemo(() => executeAgentAction(action), [action]);

  if (decision.blocked) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-300 cursor-not-allowed">
          Blocked
        </button>
        <span className="text-[10px] text-slate-400 max-w-[160px] text-right leading-tight">{decision.reason}</span>
      </div>
    );
  }

  if (decision.requiresConfirmation) {
    return (
      <button
        onClick={() => onRequestExecute(action, decision)}
        className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
      >
        Confirm &amp; Execute
      </button>
    );
  }

  return (
    <button
      onClick={() => onRequestExecute(action, decision)}
      className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
    >
      Execute
    </button>
  );
}

function ConfirmExecuteModal({ action, decision, onClose, onConfirm }) {
  if (!action || !decision) return null;

  const riskCls = RISK_BADGE[decision.riskLevel] || RISK_BADGE.low;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phase 3.5 — Controlled Execution</p>
            <h2 className="text-base font-bold text-slate-900">{action.label}</h2>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide flex-shrink-0 ${riskCls}`}>
            {decision.riskLevel} risk
          </span>
        </div>

        <p className="text-sm text-slate-600">{action.reason}</p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution Plan (Simulation)</p>
          <p className="text-sm font-medium text-slate-700">{decision.executionPlan.description}</p>
          {decision.executionPlan.details.map((d, i) => (
            <p key={i} className="text-xs text-slate-500">· {d}</p>
          ))}
          <p className="text-[10px] text-amber-600 font-semibold mt-2">⚠ {decision.executionPlan.note}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <span className="font-semibold">Mode:</span> {decision.executionMode}
          <span className="mx-1">·</span>
          <span className="font-semibold">Reason:</span> {decision.reason}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(action, decision); onClose(); }}
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-black transition-colors"
          >
            Confirm (Simulation)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NexArtAgentPanel() {
  const [state, setState] = React.useState({ loading: true, data: null, business: null, diagnostics: [], actions: [], error: '' });
  const [confirmModal, setConfirmModal] = React.useState({ open: false, action: null, decision: null });
  const [executionLog, setExecutionLog] = React.useState([]);

  React.useEffect(() => {
    let mounted = true;

    async function loadAgent() {
      try {
        const [agentData, invoices, estimates, workOrders] = await Promise.all([
          runSystemBrainV2({ modules: [], context: {} }),
          base44.entities.Invoice.list(),
          base44.entities.Estimate.list(),
          base44.entities.WorkOrder.list(),
        ]);

        const business = summarizeBusinessData({ invoices, estimates, workOrders });
        const diagnostics = buildDiagnostics(business);
        const actions = buildSuggestedActions(business);

        if (mounted) setState({ loading: false, data: agentData, business, diagnostics, actions, error: '' });
      } catch (err) {
        if (mounted) setState({ loading: false, data: null, business: null, diagnostics: [], actions: [], error: err?.message || 'Agent unavailable' });
      }
    }

    loadAgent();
    return () => { mounted = false; };
  }, []);

  const handleRequestExecute = (action, decision) => {
    if (decision.requiresConfirmation) {
      setConfirmModal({ open: true, action, decision });
    } else {
      handleConfirmExecution(action, decision);
    }
  };

  const handleConfirmExecution = (action, decision) => {
    const entry = {
      id: Date.now(),
      label: action.label,
      actionType: action.actionType,
      riskLevel: decision.riskLevel,
      executionMode: decision.executionMode,
      plan: decision.executionPlan.description,
      simulatedAt: new Date().toLocaleTimeString(),
    };
    setExecutionLog(prev => [entry, ...prev].slice(0, 10));
  };

  if (state.loading) return <div className="p-4 border rounded-xl bg-white">Loading NexArt Agent...</div>;
  if (state.error) return <div className="p-4 border rounded-xl bg-white text-red-600">{state.error}</div>;

  const { modeSummary, approvalSummary, prioritySummary } = state.data || {};
  const business = state.business || {};

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-2">Agent Mode</h3>
          <p>Analyze: {String(modeSummary?.canAnalyze)}</p>
          <p>Suggest: {String(modeSummary?.canSuggest)}</p>
          <p>Execute: {String(modeSummary?.canExecute)}</p>
        </div>

        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-2">Approval</h3>
          <p>{approvalSummary?.reason || 'No actions pending'}</p>
        </div>

        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-2">Priority</h3>
          <p>{prioritySummary?.currentPriority || 'monitoring'}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-2">Cash Flow</h3>
          <p>Invoices: {business.invoices || 0}</p>
          <p>Overdue: {business.overdueInvoices || 0}</p>
          <p>Unpaid Balance: ${(business.unpaidBalance || 0).toLocaleString()}</p>
        </div>

        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-2">Sales</h3>
          <p>Estimates: {business.estimates || 0}</p>
          <p>Open Estimates: {business.openEstimates || 0}</p>
          <p>Stale Follow-ups: {business.staleEstimates || 0}</p>
          <p>Approved Not Converted: {business.approvedUnconverted || 0}</p>
        </div>

        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-2">Execution</h3>
          <p>Work Orders: {business.workOrders || 0}</p>
          <p>Open Work Orders: {business.openWorkOrders || 0}</p>
          <p>Unassigned: {business.unassignedWorkOrders || 0}</p>
        </div>
      </div>

      <div className="p-4 border rounded-xl bg-white">
        <h3 className="font-semibold mb-3">Read-Only Diagnostics</h3>
        <div className="space-y-2">
          {state.diagnostics.map((item, index) => (
            <div key={`${item.priority}-${index}`} className={`rounded-lg border p-3 ${severityClasses(item.severity)}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{item.title}</p>
                <span className="text-xs uppercase tracking-wide">{item.priority}</span>
              </div>
              <p className="mt-1 text-sm">{item.detail}</p>
              <p className="mt-1 text-xs font-medium">Next step: {item.nextStep}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Read-only mode: no records were changed by NexArt Agent.</p>
      </div>

      <div className="p-4 border rounded-xl bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Suggested Actions</h3>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wide">Phase 3.5 — Simulation</span>
        </div>
        <div className="space-y-2">
          {state.actions.map((action, index) => {
            const riskCls = RISK_BADGE[action.riskLevel] || RISK_BADGE.low;
            return (
              <div key={`${action.priority}-${index}`} className={`rounded-lg border p-3 ${priorityClasses(action.priority)}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold">{action.label}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide ${riskCls}`}>{action.riskLevel}</span>
                    </div>
                    <p className="text-sm">{action.reason}</p>
                    <p className="mt-1 text-xs font-medium opacity-70">Type: {action.actionType} · Mode: {action.safeMode}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {action.target && (
                      <a className="rounded-lg border border-current px-3 py-1 text-xs font-semibold hover:bg-white/70 transition-colors" href={action.target}>
                        Open
                      </a>
                    )}
                    <ActionButton action={action} onRequestExecute={handleRequestExecute} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">Phase 3.5 — Simulation only. No data mutations occur. All actions run through riskClassifier → approvalPolicy → actionGuards.</p>
      </div>

      {executionLog.length > 0 && (
        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-3 text-slate-700">Execution Log (Simulation)</h3>
          <div className="space-y-1.5">
            {executionLog.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide flex-shrink-0 mt-0.5 ${RISK_BADGE[entry.riskLevel] || RISK_BADGE.low}`}>{entry.riskLevel}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{entry.label}</p>
                  <p className="text-xs text-slate-500">{entry.plan}</p>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0">{entry.simulatedAt}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">These are simulated executions — no actual changes were made to your data.</p>
        </div>
      )}

      {confirmModal.open && (
        <ConfirmExecuteModal
          action={confirmModal.action}
          decision={confirmModal.decision}
          onClose={() => setConfirmModal({ open: false, action: null, decision: null })}
          onConfirm={handleConfirmExecution}
        />
      )}
    </div>
  );
}