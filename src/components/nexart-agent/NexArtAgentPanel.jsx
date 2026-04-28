import React from 'react';
import { base44 } from '@/api/base44Client';
import { runSystemBrainV2 } from '@/brain/system/systemBrain';

function getBalance(invoice) {
  return Math.max((invoice?.total || 0) - (invoice?.amount_paid || 0), 0);
}

function summarizeBusinessData({ invoices = [], estimates = [], workOrders = [] }) {
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const unpaidInvoices = invoices.filter(i => ['sent', 'viewed', 'overdue', 'partial'].includes(i.status));
  const openEstimates = estimates.filter(e => ['draft', 'scheduled', 'visit_completed', 'sent', 'viewed', 'changes_requested'].includes(e.status));
  const openWorkOrders = workOrders.filter(w => !['completed', 'invoiced', 'cancelled'].includes(w.status));

  return {
    invoices: invoices.length,
    estimates: estimates.length,
    workOrders: workOrders.length,
    overdueInvoices: overdueInvoices.length,
    unpaidBalance: unpaidInvoices.reduce((sum, invoice) => sum + getBalance(invoice), 0),
    openEstimates: openEstimates.length,
    openWorkOrders: openWorkOrders.length,
  };
}

export default function NexArtAgentPanel() {
  const [state, setState] = React.useState({ loading: true, data: null, business: null, error: '' });

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

        if (mounted) setState({ loading: false, data: agentData, business, error: '' });
      } catch (err) {
        if (mounted) setState({ loading: false, data: null, business: null, error: err?.message || 'Agent unavailable' });
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
        </div>

        <div className="p-4 border rounded-xl bg-white">
          <h3 className="font-semibold mb-2">Execution</h3>
          <p>Work Orders: {business.workOrders || 0}</p>
          <p>Open Work Orders: {business.openWorkOrders || 0}</p>
        </div>
      </div>
    </div>
  );
}
