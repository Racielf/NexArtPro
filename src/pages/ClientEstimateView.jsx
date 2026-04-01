import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logComm } from '@/lib/commTracking';

export default function ClientEstimateView() {
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!estimateId) { setLoading(false); return; }
      const list = await base44.entities.Estimate.filter({ id: estimateId });
      if (list.length) setEstimate(list[0]);
      setLoading(false);
    };
    load();
  }, [estimateId]);

  const handleApprove = async () => {
    setActing(true);
    await base44.entities.Estimate.update(estimateId, {
      status: 'approved',
      approved_at: new Date().toISOString()
    });
    await logComm({
      event_type: 'estimate_approved',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Approved by Client`,
      status: 'delivered'
    });
    setEstimate(e => ({ ...e, status: 'approved', approved_at: new Date().toISOString() }));
    setActing(false);
    toast.success('Estimate approved! We will be in touch soon.');
  };

  const handleDecline = async () => {
    setActing(true);
    await base44.entities.Estimate.update(estimateId, { status: 'declined' });
    await logComm({
      event_type: 'estimate_declined',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Declined by Client`,
      status: 'delivered'
    });
    setEstimate(e => ({ ...e, status: 'declined' }));
    setActing(false);
    toast.success('Estimate declined. Thank you for letting us know.');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  if (!estimate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-slate-500 text-lg">Estimate not found.</p>
        <p className="text-slate-400 text-sm mt-1">This link may have expired.</p>
      </div>
    </div>
  );

  const items = estimate.line_items || [];
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isResolved = estimate.status === 'approved' || estimate.status === 'declined' || estimate.status === 'converted';

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Status Banner */}
        {estimate.status === 'approved' && (
          <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Estimate Approved</p>
              <p className="text-sm text-green-600">Thank you! We'll be in touch to schedule the work.</p>
            </div>
          </div>
        )}
        {estimate.status === 'declined' && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Estimate Declined</p>
              <p className="text-sm text-red-500">We appreciate your feedback. Please contact us if you have questions.</p>
            </div>
          </div>
        )}

        {/* Document */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="px-10 pt-8 pb-6 flex items-start justify-between border-b border-slate-100">
            <div>
              <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mb-3">
                <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                  <rect width="40" height="40" rx="8" fill="#1e293b"/>
                  <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="font-bold text-slate-900 text-lg">FSM Pro</div>
              <div className="text-slate-400 text-xs">Field Service Management</div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden text-sm" style={{ minWidth: 200 }}>
              <div className="grid grid-cols-2">
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500">ESTIMATE</div>
                <div className="px-3 py-2 text-right text-xs font-bold text-slate-900">#{estimate.estimate_number}</div>
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-t border-slate-100">DATE</div>
                <div className="px-3 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{today}</div>
                {estimate.expiration_date && (
                  <>
                    <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-t border-slate-100">EXPIRES</div>
                    <div className="px-3 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{estimate.expiration_date}</div>
                  </>
                )}
                <div className="px-3 py-2 bg-slate-800 text-xs font-bold text-white border-t border-slate-100">TOTAL</div>
                <div className="px-3 py-2 text-right text-xs font-bold text-slate-900 border-t border-slate-100">${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="px-10 py-6 grid grid-cols-2 gap-8 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</div>
              <div className="font-semibold text-slate-900">{estimate.client_name}</div>
              {estimate.client_address && <div className="text-slate-500 text-sm mt-1">{estimate.client_address}</div>}
              {estimate.client_email && <div className="text-slate-400 text-xs mt-1">{estimate.client_email}</div>}
              {estimate.client_phone && <div className="text-slate-400 text-xs mt-0.5">{estimate.client_phone}</div>}
            </div>
            {estimate.title && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Project</div>
                <div className="font-semibold text-slate-800">{estimate.title}</div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="px-10 py-6 border-b border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left pb-2 font-semibold text-slate-700 text-xs uppercase tracking-wide">Service</th>
                  <th className="text-right pb-2 font-semibold text-slate-700 text-xs uppercase tracking-wide w-16">Qty</th>
                  <th className="text-right pb-2 font-semibold text-slate-700 text-xs uppercase tracking-wide w-24">Unit Price</th>
                  <th className="text-right pb-2 font-semibold text-slate-700 text-xs uppercase tracking-wide w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-slate-100">
                    <td className="py-3">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {item.description && <div className="text-slate-400 text-xs mt-0.5">{item.description}</div>}
                    </td>
                    <td className="py-3 text-right text-slate-500">{item.quantity?.toFixed(0)}</td>
                    <td className="py-3 text-right text-slate-500">${(item.unit_price || 0).toFixed(2)}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-10 py-5 border-b border-slate-100">
            <div className="flex justify-end">
              <div className="w-56 text-sm space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>${(estimate.subtotal || 0).toFixed(2)}</span>
                </div>
                {estimate.tax_rate > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax ({estimate.tax_rate}%)</span>
                    <span>${(estimate.tax_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-base pt-1.5 border-t border-slate-200">
                  <span>Total</span>
                  <span>${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="px-10 py-5 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</div>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}

          {/* CTA */}
          {!isResolved && (
            <div className="px-10 py-8 bg-slate-50">
              <p className="text-sm text-slate-500 mb-4 text-center">Please review this estimate and let us know your decision.</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleDecline}
                  disabled={acting}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 px-8 rounded-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />Decline
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={acting}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 rounded-full"
                >
                  {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve Estimate
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-10 py-5 text-center text-xs text-slate-400 border-t border-slate-100">
            FSM Pro · Portland, OR · info@fsmpro.com
          </div>
        </div>
      </div>
    </div>
  );
}