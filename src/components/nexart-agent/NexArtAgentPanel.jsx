import React from 'react';
import { base44 } from '@/api/base44Client';
import { runSystemBrainV2 } from '@/brain/system/systemBrain';

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

function severityClasses(severity) {
  if (severity === 'high') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function NexArtAgentPanel() {
  const [state, setState] = React.useState({ loading: true, data: null, business: null, diagnostics: [], error: '' });

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

        if (mounted) setState({ loading: false, data: agentData, business, diagnostics, error: '' });
      } catch (err) {
        if (mounted) setState({ loading: false, data: null, business: null, diagnostics: [], error: err?.message || 'Agent unavailable' });
      }
    }

    loadAgent();
    return () => { mounted = false; };
  }, []);

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
    </div>
  );
}
