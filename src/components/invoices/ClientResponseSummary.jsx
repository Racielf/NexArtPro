import React from 'react';
import { Check, HelpCircle, Clock, AlertTriangle } from 'lucide-react';

/**
 * ClientResponseSummary — Shows client response + promise-to-pay status in InvoiceDetail.
 */
export default function ClientResponseSummary({ invoice }) {
  if (!invoice?.client_response_at || invoice.client_response_status === 'no_response') {
    return null;
  }

  const responseConfig = {
    will_pay_soon: {
      label: 'Client says paying soon',
      icon: Check,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    has_question: {
      label: 'Client has a question',
      icon: HelpCircle,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    needs_time: {
      label: 'Client requested more time',
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
  };

  const config = responseConfig[invoice.client_response_status];
  if (!config) return null;

  const Icon = config.icon;

  // Promise-to-pay status
  let promiseStatus = null;
  if (invoice.promised_payment_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promised = new Date(invoice.promised_payment_date);
    promised.setHours(0, 0, 0, 0);
    const daysLeft = Math.floor((promised - today) / 86400000);
    const amountPaid = invoice.amount_paid || 0;
    const isPaid = amountPaid >= (invoice.total || 0);

    if (isPaid) {
      promiseStatus = { label: 'Promise fulfilled ✓', cls: 'bg-green-100 text-green-700 border-green-200' };
    } else if (daysLeft > 0) {
      promiseStatus = { label: `Promised by ${invoice.promised_payment_date} (${daysLeft}d away)`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (daysLeft === 0) {
      promiseStatus = { label: `Payment promised today`, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    } else {
      promiseStatus = { label: `Promise broken — was due ${invoice.promised_payment_date} (${Math.abs(daysLeft)}d ago)`, cls: 'bg-red-50 text-red-700 border-red-200', broken: true };
    }
  }

  return (
    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${config.bg}`}>
      {promiseStatus?.broken
        ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-600" />
        : <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${config.color}`} />
      }
      <div className="flex-1 space-y-1">
        <p className={`font-semibold ${promiseStatus?.broken ? 'text-red-700' : config.color}`}>
          {config.label}
        </p>
        {promiseStatus && (
          <div className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${promiseStatus.cls}`}>
            {promiseStatus.label}
          </div>
        )}
        {invoice.client_response_note && (
          <p className={`text-[11px] ${config.color}`}>
            "{invoice.client_response_note}"
          </p>
        )}
        <p className="text-[11px] text-slate-500">
          {new Date(invoice.client_response_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}