import React from 'react';
import { Check, HelpCircle, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * ClientResponseSummary — Shows client response + promise-to-pay + billing issue status in InvoiceDetail.
 */
export default function ClientResponseSummary({ invoice, onIssueResolved }) {
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

  // Billing issue state
  const hasBillingIssue = invoice.billing_issue_status === 'open' || invoice.billing_issue_status === 'resolved';
  const isIssueOpen = invoice.billing_issue_status === 'open';
  const daysOpen = isIssueOpen && invoice.billing_issue_opened_at
    ? Math.floor((Date.now() - new Date(invoice.billing_issue_opened_at).getTime()) / 86400000)
    : null;

  const handleResolveIssue = async () => {
    const now = new Date().toISOString();
    await base44.entities.Invoice.update(invoice.id, {
      billing_issue_status: 'resolved',
      billing_issue_resolved_at: now,
    });
    toast.success('Billing issue marked as resolved');
    onIssueResolved?.({ billing_issue_status: 'resolved', billing_issue_resolved_at: now });
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
          <div className={`rounded px-2 py-1.5 border space-y-1 ${isIssueOpen ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`font-semibold text-[10px] uppercase tracking-wide ${isIssueOpen ? 'text-blue-700' : 'text-green-700'}`}>
                {isIssueOpen ? `Billing issue open${daysOpen !== null ? ` (${daysOpen}d)` : ''}` : 'Issue resolved ✓'}
              </span>
              {isIssueOpen && (
                <button
                  onClick={handleResolveIssue}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Mark resolved
                </button>
              )}
            </div>
            {invoice.billing_issue_note && (
              <p className={`text-[11px] ${isIssueOpen ? 'text-blue-600' : 'text-green-600'}`}>
                "{invoice.billing_issue_note}"
              </p>
            )}
            {isIssueOpen && (
              <p className="text-[10px] text-blue-500">Collections paused until resolved</p>
            )}
            {invoice.billing_issue_resolved_at && (
              <p className="text-[10px] text-green-500">
                Resolved {new Date(invoice.billing_issue_resolved_at).toLocaleDateString()}
              </p>
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