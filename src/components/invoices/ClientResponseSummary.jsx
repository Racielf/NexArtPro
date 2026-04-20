import React, { useState } from 'react';
import { Check, HelpCircle, Clock, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * ClientResponseSummary — Shows client response + promise-to-pay + billing issue status in InvoiceDetail.
 * Includes ownership assignment and resolution note for billing issues.
 */
export default function ClientResponseSummary({ invoice, onIssueResolved }) {
  const [owner, setOwner] = useState(invoice?.billing_issue_owner || '');
  const [resolutionNote, setResolutionNote] = useState('');
  const [savingOwner, setSavingOwner] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);

  if (!invoice?.client_response_at || invoice.client_response_status === 'no_response') {
    return null;
  }

  const responseConfig = {
    will_pay_soon: { label: 'Client says paying soon', icon: Check, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    has_question:  { label: 'Client has a billing question', icon: HelpCircle, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    needs_time:    { label: 'Client requested more time', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  };

  const config = responseConfig[invoice.client_response_status];
  if (!config) return null;
  const Icon = config.icon;

  // Promise-to-pay status
  let promiseStatus = null;
  if (invoice.promised_payment_date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const promised = new Date(invoice.promised_payment_date); promised.setHours(0, 0, 0, 0);
    const daysLeft = Math.floor((promised - today) / 86400000);
    const isPaid = (invoice.amount_paid || 0) >= (invoice.total || 0);
    if (isPaid) {
      promiseStatus = { label: 'Promise fulfilled ✓', cls: 'bg-green-100 text-green-700 border-green-200' };
    } else if (daysLeft > 0) {
      promiseStatus = { label: `Promised by ${invoice.promised_payment_date} (${daysLeft}d away)`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (daysLeft === 0) {
      promiseStatus = { label: 'Payment promised today', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    } else {
      promiseStatus = { label: `Promise broken — was due ${invoice.promised_payment_date} (${Math.abs(daysLeft)}d ago)`, cls: 'bg-red-50 text-red-700 border-red-200', broken: true };
    }
  }

  const hasBillingIssue = invoice.billing_issue_status === 'open' || invoice.billing_issue_status === 'resolved';
  const isIssueOpen = invoice.billing_issue_status === 'open';
  const daysOpen = isIssueOpen && invoice.billing_issue_opened_at
    ? Math.floor((Date.now() - new Date(invoice.billing_issue_opened_at).getTime()) / 86400000)
    : null;

  const handleSaveOwner = async () => {
    if (!owner.trim()) return;
    setSavingOwner(true);
    await base44.entities.Invoice.update(invoice.id, { billing_issue_owner: owner.trim() });
    toast.success('Owner assigned');
    setSavingOwner(false);
    onIssueResolved?.({ billing_issue_owner: owner.trim() });
  };

  const handleResolveIssue = async () => {
    setResolving(true);
    const now = new Date().toISOString();
    const patch = {
      billing_issue_status: 'resolved',
      billing_issue_resolved_at: now,
      ...(resolutionNote.trim() ? { billing_issue_resolution_note: resolutionNote.trim() } : {}),
      ...(owner.trim() ? { billing_issue_owner: owner.trim() } : {}),
    };
    await base44.entities.Invoice.update(invoice.id, patch);
    toast.success('Billing issue resolved');
    setResolving(false);
    setShowResolveForm(false);
    onIssueResolved?.(patch);
  };

  return (
    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${promiseStatus?.broken || isIssueOpen ? 'bg-red-50 border-red-200' : config.bg}`}>
      {promiseStatus?.broken
        ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-600" />
        : isIssueOpen
          ? <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-600" />
          : <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${config.color}`} />
      }
      <div className="flex-1 space-y-1.5">
        <p className={`font-semibold ${promiseStatus?.broken ? 'text-red-700' : isIssueOpen ? 'text-blue-700' : config.color}`}>
          {config.label}
        </p>

        {/* Billing issue block */}
        {hasBillingIssue && (
          <div className={`rounded px-2 py-2 border space-y-1.5 ${isIssueOpen ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <span className={`font-semibold text-[10px] uppercase tracking-wide ${isIssueOpen ? 'text-blue-700' : 'text-green-700'}`}>
                {isIssueOpen ? `Billing issue open${daysOpen !== null ? ` (${daysOpen}d)` : ''}` : 'Issue resolved ✓'}
              </span>
              {isIssueOpen && !showResolveForm && (
                <button
                  onClick={() => setShowResolveForm(true)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>

            {/* Client's original question */}
            {invoice.billing_issue_note && (
              <p className={`text-[11px] italic ${isIssueOpen ? 'text-blue-600' : 'text-green-600'}`}>
                "{invoice.billing_issue_note}"
              </p>
            )}

            {/* Owner assignment (open issues) */}
            {isIssueOpen && (
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-blue-400 flex-shrink-0" />
                {invoice.billing_issue_owner ? (
                  <span className="text-[11px] font-semibold text-blue-700">{invoice.billing_issue_owner}</span>
                ) : (
                  <>
                    <input
                      type="text"
                      value={owner}
                      onChange={e => setOwner(e.target.value)}
                      placeholder="Assign owner…"
                      className="flex-1 text-[11px] px-1.5 py-0.5 border border-blue-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-slate-300"
                      onKeyDown={e => e.key === 'Enter' && handleSaveOwner()}
                    />
                    <button
                      onClick={handleSaveOwner}
                      disabled={savingOwner || !owner.trim()}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-40"
                    >
                      Assign
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Resolve form */}
            {isIssueOpen && showResolveForm && (
              <div className="space-y-1.5 pt-1 border-t border-blue-200">
                {!invoice.billing_issue_owner && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={owner}
                      onChange={e => setOwner(e.target.value)}
                      placeholder="Resolved by (name)…"
                      className="flex-1 text-[11px] px-1.5 py-0.5 border border-blue-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-slate-300"
                    />
                  </div>
                )}
                <textarea
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  placeholder="Resolution note (optional)…"
                  rows={2}
                  className="w-full text-[11px] px-1.5 py-1 border border-blue-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-slate-300 resize-none"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowResolveForm(false)}
                    className="text-[10px] px-2 py-0.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolveIssue}
                    disabled={resolving}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {resolving ? 'Saving…' : 'Mark Resolved'}
                  </button>
                </div>
              </div>
            )}

            {isIssueOpen && (
              <p className="text-[10px] text-blue-500">Collections paused until resolved</p>
            )}

            {/* Resolved state details */}
            {!isIssueOpen && (
              <div className="space-y-0.5">
                {invoice.billing_issue_owner && (
                  <p className="text-[10px] text-green-600 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" /> {invoice.billing_issue_owner}
                  </p>
                )}
                {invoice.billing_issue_resolution_note && (
                  <p className="text-[11px] text-green-600 italic">"{invoice.billing_issue_resolution_note}"</p>
                )}
                {invoice.billing_issue_resolved_at && (
                  <p className="text-[10px] text-green-500">
                    Resolved {new Date(invoice.billing_issue_resolved_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Promise status */}
        {promiseStatus && (
          <div className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${promiseStatus.cls}`}>
            {promiseStatus.label}
          </div>
        )}

        {invoice.client_response_note && (
          <p className={`text-[11px] ${config.color}`}>"{invoice.client_response_note}"</p>
        )}
        <p className="text-[11px] text-slate-500">
          {new Date(invoice.client_response_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}