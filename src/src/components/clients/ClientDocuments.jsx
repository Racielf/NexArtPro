import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, Receipt, Wrench, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { createEstimateFromContext } from '@/lib/createEstimateFromContext';

export default function ClientDocuments({ client }) {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    load();
  }, [client?.id]);

  const load = async () => {
    setLoading(true);
    const [ests, wos, invs] = await Promise.all([
      base44.entities.Estimate.filter({ client_id: client.id }, '-created_date', 5),
      base44.entities.WorkOrder.filter({ client_id: client.id }, '-created_date', 5),
      base44.entities.Invoice.filter({ client_id: client.id }, '-created_date', 5),
    ]);
    setEstimates(ests);
    setWorkOrders(wos);
    setInvoices(invs);
    setLoading(false);
  };

  const handleCreateEstimate = async () => {
    setCreating(true);
    await createEstimateFromContext({ client, navigate });
    setCreating(false);
  };

  if (loading) return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1">
      <Loader2 className="w-3 h-3 animate-spin" />Loading documents...
    </div>
  );

  const STATUS_COLORS = {
    draft: 'text-slate-500 bg-slate-100',
    sent: 'text-blue-600 bg-blue-50',
    approved: 'text-green-600 bg-green-50',
    signed: 'text-emerald-600 bg-emerald-50',
    converted: 'text-purple-600 bg-purple-50',
    declined: 'text-red-500 bg-red-50',
    completed: 'text-green-600 bg-green-50',
    invoiced: 'text-purple-600 bg-purple-50',
    paid: 'text-green-600 bg-green-50',
    overdue: 'text-red-600 bg-red-50',
  };

  const badge = (status) => (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-500'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );

  return (
    <div className="mt-2 space-y-2">

      {/* ESTIMATES */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <FileText className="w-3 h-3" />Estimates
          </span>
          {/* Only show "New Estimate" alongside list when estimates already exist */}
          {estimates.length > 0 && (
            <button
              onClick={handleCreateEstimate}
              disabled={creating}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              New Estimate
            </button>
          )}
        </div>
        {estimates.length === 0 ? (
          /* No estimates: show a prominent Create CTA */
          <button
            onClick={handleCreateEstimate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-md py-2 hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {creating ? 'Creating...' : 'Create Estimate'}
          </button>
        ) : (
          <div className="space-y-1">
            {estimates.map(e => (
              <button key={e.id}
                onClick={() => navigate(`/estimate-editor?id=${e.id}`)}
                className="w-full flex items-center justify-between text-xs rounded-md hover:bg-slate-100 px-2 py-1.5 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary" />
                  <span className="text-slate-700 font-medium">Est #{e.estimate_number}</span>
                  {e.title && <span className="text-slate-400 truncate max-w-[100px]">· {e.title}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {e.total > 0 && <span className="text-slate-600 font-semibold">${e.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>}
                  {badge(e.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* WORK ORDERS */}
      {workOrders.length > 0 && (
        <div>
          <div className="mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Wrench className="w-3 h-3" />Work Orders
            </span>
          </div>
          <div className="space-y-1">
            {workOrders.map(w => (
              <button key={w.id}
                onClick={() => navigate(`/work-order-detail?id=${w.id}`)}
                className="w-full flex items-center justify-between text-xs rounded-md hover:bg-slate-100 px-2 py-1.5 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary" />
                  <span className="text-slate-700 font-medium">WO #{w.work_order_number}</span>
                  {w.title && <span className="text-slate-400 truncate max-w-[100px]">· {w.title}</span>}
                </div>
                {badge(w.status)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INVOICES */}
      {invoices.length > 0 && (
        <div>
          <div className="mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Receipt className="w-3 h-3" />Invoices
            </span>
          </div>
          <div className="space-y-1">
            {invoices.map(i => (
              <button key={i.id}
                onClick={() => navigate(`/invoice-detail?id=${i.id}`)}
                className="w-full flex items-center justify-between text-xs rounded-md hover:bg-slate-100 px-2 py-1.5 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary" />
                  <span className="text-slate-700 font-medium">Inv #{i.invoice_number}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {i.total > 0 && <span className="text-slate-600 font-semibold">${i.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>}
                  {badge(i.status)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}