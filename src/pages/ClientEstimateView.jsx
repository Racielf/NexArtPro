import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, Loader2, Printer, Download,
  PenLine, MessageSquare, Clock, Eye, AlertTriangle, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { logComm } from '@/lib/commTracking';
import ClientSignaturePad from '@/components/estimates/ClientSignaturePad';
import ClientChangesRequest from '@/components/estimates/ClientChangesRequest';

export default function ClientEstimateView() {
  const urlParams = new URLSearchParams(window.location.search);
  const estimateId = urlParams.get('id');

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!estimateId) { setLoading(false); return; }
      const list = await base44.entities.Estimate.filter({ id: estimateId });
      if (list.length) {
        const est = list[0];
        setEstimate(est);
        // Mark as viewed if sent
        if (est.status === 'sent') {
          await base44.entities.Estimate.update(estimateId, {
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          });
          setEstimate(e => ({ ...e, status: 'viewed', viewed_at: new Date().toISOString() }));
        }
      }
      setLoading(false);
    };
    load();
  }, [estimateId]);

  const handleApprove = async () => {
    setActing(true);
    await base44.entities.Estimate.update(estimateId, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: estimate.client_name,
    });
    await logComm({
      event_type: 'estimate_approved',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Approved by Client`,
      status: 'delivered',
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
      status: 'delivered',
    });
    setEstimate(e => ({ ...e, status: 'declined' }));
    setActing(false);
    toast.success('Estimate declined. Thank you for letting us know.');
  };

  const handleSign = async ({ base64, signerName, signerEmail }) => {
    setShowSignPad(false);
    setActing(true);
    await base44.entities.Estimate.update(estimateId, {
      status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name: signerName,
      signer_email: signerEmail,
      signature_image_base64: base64,
    });
    await logComm({
      event_type: 'estimate_approved',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: signerEmail || estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Estimate #${estimate.estimate_number} Signed by ${signerName}`,
      status: 'delivered',
    });
    setEstimate(e => ({ ...e, status: 'signed', signed_at: new Date().toISOString(), signer_name: signerName }));
    setActing(false);
    toast.success('Estimate signed successfully!');
  };

  const handleChangesRequest = async (note) => {
    setShowChanges(false);
    setActing(true);
    // Archive current version
    await base44.entities.EstimateVersionHistory.create({
      estimate_id: estimate.id,
      estimate_number: estimate.estimate_number,
      version: estimate.version || 1,
      client_name: estimate.client_name,
      status_at_archive: estimate.status,
      archived_reason: 'changes_requested',
      changes_note: note,
      snapshot: estimate,
      total_at_archive: estimate.total || 0,
    });
    await base44.entities.Estimate.update(estimateId, {
      status: 'changes_requested',
      changes_requested_at: new Date().toISOString(),
      changes_requested_note: note,
      version: (estimate.version || 1) + 1,
    });
    await logComm({
      event_type: 'estimate_declined',
      client_id: estimate.client_id || '',
      client_name: estimate.client_name,
      client_email: estimate.client_email || '',
      estimate_id: estimate.id,
      subject: `Changes requested for Estimate #${estimate.estimate_number}`,
      status: 'delivered',
      preview: note.substring(0, 80),
    });
    setEstimate(e => ({ ...e, status: 'changes_requested', changes_requested_note: note }));
    setActing(false);
    toast.success('Change request sent! We\'ll review and send a revised estimate.');
  };

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    // Simple print-to-PDF trigger
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  if (!estimate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-slate-700 font-semibold text-lg">Estimate not found</p>
        <p className="text-slate-400 text-sm mt-1">This link may have expired or is invalid.</p>
      </div>
    </div>
  );

  const groups = estimate.groups?.length
    ? estimate.groups
    : estimate.line_items?.length
      ? [{ id: 'legacy', name: null, items: estimate.line_items.map(li => ({
          id: li.id, service_name: li.name || '', description: li.description,
          quantity: li.quantity || 1, unit_price: li.unit_price || 0,
          line_total: li.total_price || li.line_total || 0,
        })) }]
      : [];

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isFinal = ['approved', 'signed', 'declined', 'converted'].includes(estimate.status);
  const canAct = !isFinal && estimate.status !== 'changes_requested';

  const statusBanner = {
    approved: { bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-5 h-5 text-green-600" />, title: 'Estimate Approved', body: "Thank you! We'll be in touch soon to schedule the work." },
    signed: { bg: 'bg-green-50 border-green-200', icon: <PenLine className="w-5 h-5 text-green-600" />, title: `Signed by ${estimate.signer_name || 'you'}`, body: `Signed on ${estimate.signed_at ? new Date(estimate.signed_at).toLocaleString() : ''}` },
    declined: { bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" />, title: 'Estimate Declined', body: 'We appreciate your feedback. Contact us if you change your mind.' },
    changes_requested: { bg: 'bg-amber-50 border-amber-200', icon: <MessageSquare className="w-5 h-5 text-amber-500" />, title: 'Changes Requested', body: "We received your request and will send a revised estimate soon." },
    viewed: { bg: 'bg-blue-50 border-blue-200', icon: <Eye className="w-5 h-5 text-blue-500" />, title: 'Estimate Viewed', body: 'Please review below and take action when ready.' },
  }[estimate.status];

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0">

      {/* Print/Download bar */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-4 h-4" fill="none">
              <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-700">FSM Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />Download PDF
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Status Banner */}
        {statusBanner && (
          <div className={`flex items-start gap-3 border rounded-xl px-5 py-4 print:hidden ${statusBanner.bg}`}>
            <div className="flex-shrink-0 mt-0.5">{statusBanner.icon}</div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{statusBanner.title}</p>
              <p className="text-sm text-slate-600 mt-0.5">{statusBanner.body}</p>
            </div>
          </div>
        )}

        {/* Version indicator */}
        {(estimate.version || 1) > 1 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 print:hidden">
            <Clock className="w-3.5 h-3.5" />
            <span>This is version <strong>{estimate.version}</strong> of this estimate.</span>
          </div>
        )}

        {/* Main document card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-7 pb-6 flex items-start justify-between border-b border-slate-100">
            <div>
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-3">
                <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                  <rect width="40" height="40" rx="8" fill="#1e293b"/>
                  <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="font-bold text-slate-900 text-lg">FSM Pro</div>
              <div className="text-slate-400 text-xs">Field Service Management</div>
              <div className="text-slate-400 text-xs mt-1">Portland, OR · info@fsmpro.com</div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
              <div className="grid grid-cols-2">
                <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500">ESTIMATE</div>
                <div className="px-4 py-2 text-right text-xs font-bold text-slate-900">#{estimate.estimate_number}</div>
                <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-t border-slate-100">DATE</div>
                <div className="px-4 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{today}</div>
                {estimate.expiration_date && <>
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-t border-slate-100">EXPIRES</div>
                  <div className="px-4 py-2 text-right text-xs text-slate-600 border-t border-slate-100">{estimate.expiration_date}</div>
                </>}
                {(estimate.version || 1) > 1 && <>
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-t border-slate-100">VERSION</div>
                  <div className="px-4 py-2 text-right text-xs text-slate-600 border-t border-slate-100">v{estimate.version}</div>
                </>}
                <div className="px-4 py-2 bg-slate-800 text-xs font-bold text-white border-t border-slate-100">TOTAL</div>
                <div className="px-4 py-2 text-right text-xs font-bold text-slate-900 border-t border-slate-100">${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Client + Project */}
          <div className="px-8 py-5 grid grid-cols-2 gap-8 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</div>
              <div className="font-semibold text-slate-900">{estimate.client_name}</div>
              {estimate.client_address && <div className="text-slate-500 text-sm mt-1">{estimate.client_address}</div>}
              {estimate.client_email && <div className="text-slate-400 text-xs mt-1">{estimate.client_email}</div>}
              {estimate.client_phone && <div className="text-slate-400 text-xs mt-0.5">{estimate.client_phone}</div>}
            </div>
            {(estimate.title || estimate.project_start_date) && (
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Project</div>
                {estimate.title && <div className="font-semibold text-slate-800">{estimate.title}</div>}
                {estimate.project_start_date && (
                  <div className="text-slate-400 text-xs mt-1">
                    {estimate.project_start_date}{estimate.project_end_date && ` – ${estimate.project_end_date}`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer Notes */}
          {estimate.notes && (
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</div>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}

          {/* Line Items — grouped */}
          <div className="px-8 py-5 border-b border-slate-100">
            {groups.map((group, gi) => {
              const groupTotal = (group.items || []).reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0);
              const showHeader = group.name && groups.length > 1;
              return (
                <div key={group.id || gi} className={gi > 0 ? 'mt-6' : ''}>
                  {showHeader && (
                    <div className="flex items-center justify-between bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-t-lg">
                      <span className="uppercase tracking-wide">{group.name}</span>
                      <span className="text-white/70">${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <table className={`w-full text-sm ${showHeader ? 'border border-t-0 border-slate-200 rounded-b-lg overflow-hidden' : ''}`}>
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide px-1">Service</th>
                        <th className="text-right pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide w-14 px-1">Qty</th>
                        <th className="text-right pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide w-24 px-1">Unit Price</th>
                        <th className="text-right pb-2 pt-2 font-semibold text-slate-600 text-xs uppercase tracking-wide w-24 px-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(group.items || []).map((item, idx) => (
                        <tr key={item.id || idx} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 px-1">
                            <div className="font-medium text-slate-900">{item.service_name || item.name}</div>
                            {item.description && <div className="text-slate-400 text-xs mt-0.5">{item.description}</div>}
                          </td>
                          <td className="py-3 text-right text-slate-500 px-1">{item.quantity ?? '—'}</td>
                          <td className="py-3 text-right text-slate-500 px-1">${(item.unit_price || 0).toFixed(2)}</td>
                          <td className="py-3 text-right font-semibold text-slate-900 px-1">${(item.line_total || item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="px-8 py-5 border-b border-slate-100">
            <div className="flex justify-end">
              <div className="w-60 text-sm space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span>${(estimate.subtotal || 0).toFixed(2)}</span>
                </div>
                {estimate.discount_amount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount</span><span>-${(estimate.discount_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                {estimate.tax_rate > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax ({estimate.tax_rate}%)</span><span>${(estimate.tax_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
                  <span>Total</span><span>${(estimate.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {estimate.deposit_amount > 0 && (
                  <div className="flex justify-between text-blue-700 text-xs font-semibold pt-1">
                    <span>Deposit Due ({estimate.deposit_percent}%)</span>
                    <span>${(estimate.deposit_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Extra terms */}
          {[
            { key: 'payment_terms', label: 'Payment Terms' },
            { key: 'exclusions', label: 'Exclusions' },
            { key: 'warranty_terms', label: 'Warranty' },
          ].filter(s => estimate[s.key]).map(s => (
            <div key={s.key} className="px-8 py-4 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{estimate[s.key]}</p>
            </div>
          ))}

          {/* Signed block */}
          {estimate.status === 'signed' && estimate.signer_name && (
            <div className="px-8 py-5 bg-green-50 border-t border-green-100 print:block">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />Digitally Signed
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{estimate.signer_name}</p>
                  {estimate.signer_email && <p className="text-xs text-slate-500">{estimate.signer_email}</p>}
                  <p className="text-xs text-slate-400 mt-1">{estimate.signed_at ? new Date(estimate.signed_at).toLocaleString() : ''}</p>
                </div>
                {estimate.signature_image_base64 && (
                  <div className="border border-green-200 rounded-lg p-2 bg-white">
                    <img src={estimate.signature_image_base64} alt="Signature" className="h-14 max-w-[160px] object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          {canAct && (
            <div className="px-8 py-7 bg-slate-50 print:hidden">
              <p className="text-sm text-slate-500 mb-5 text-center">Please review this estimate and choose an action below.</p>
              <div className="flex flex-col gap-3">
                {/* Primary: Sign */}
                <Button
                  onClick={() => setShowSignPad(true)}
                  disabled={acting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 gap-2 text-sm font-semibold"
                >
                  <PenLine className="w-4 h-4" />Sign &amp; Accept Estimate
                </Button>

                {/* Secondary: approve without sig */}
                <Button
                  onClick={handleApprove}
                  disabled={acting}
                  variant="outline"
                  className="w-full border-green-300 text-green-700 hover:bg-green-50 rounded-xl h-10 gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />Approve without Signature
                </Button>

                {/* Request changes */}
                <Button
                  onClick={() => setShowChanges(true)}
                  disabled={acting}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl h-10 gap-2 text-sm"
                >
                  <MessageSquare className="w-4 h-4" />Request Changes
                </Button>

                {/* Decline */}
                <Button
                  onClick={handleDecline}
                  disabled={acting}
                  variant="ghost"
                  className="w-full text-red-500 hover:bg-red-50 rounded-xl h-9 gap-2 text-sm"
                >
                  <XCircle className="w-4 h-4" />Decline
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-4 text-center text-xs text-slate-400 border-t border-slate-100">
            FSM Pro · Portland, OR · info@fsmpro.com · (503) 555-0100
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 pb-6 print:hidden">
          This estimate was issued by FSM Pro. Questions? Contact us at info@fsmpro.com
        </p>
      </div>

      {/* Modals */}
      {showSignPad && (
        <ClientSignaturePad
          onSign={handleSign}
          onCancel={() => setShowSignPad(false)}
        />
      )}
      {showChanges && (
        <ClientChangesRequest
          onSubmit={handleChangesRequest}
          onCancel={() => setShowChanges(false)}
        />
      )}
    </div>
  );
}