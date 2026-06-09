import React from 'react';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

/**
 * ClientPaymentSummary — Prominent payment status display for client invoice view.
 * Shows: total, paid, due, status, and overdue alert if applicable.
 */
export default function ClientPaymentSummary({ invoice }) {
  if (!invoice) return null;

  const derived = computeInvoiceDerivedFields(invoice);
  const overdue = isInvoiceOverdue(invoice);

  // Determine payment state messaging
  const getPaymentState = () => {
    if (derived.payment_status === 'paid') {
      return {
        label: 'Paid in Full',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        icon: CheckCircle2,
      };
    }
    if (derived.payment_status === 'partial') {
      return {
        label: 'Partial Payment Received',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        icon: Clock,
      };
    }
    if (overdue) {
      return {
        label: 'Payment Overdue',
        color: 'text-red-700',
        bg: 'bg-red-50',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Payment Due',
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      icon: Clock,
    };
  };

  const state = getPaymentState();
  const Icon = state.icon;

  return (
    <div className={`${state.bg} border border-slate-200 rounded-xl p-6 space-y-4`}>
      {/* State Badge */}
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${state.color}`} />
        <span className={`font-semibold text-sm ${state.color}`}>
          {state.label}
        </span>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Total Invoice</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ${(invoice.total || 0).toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Amount Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ${derived.amount_paid.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Balance Due</p>
          <p className={`text-2xl font-bold mt-1 ${derived.balance_due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ${derived.balance_due.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Due Date */}
      {invoice.due_date && (
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Due Date</p>
          <p className={`text-sm font-medium mt-1 ${overdue ? 'text-red-700 font-bold' : 'text-slate-900'}`}>
            {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {overdue && ' — OVERDUE'}
          </p>
        </div>
      )}

      {/* Overdue Alert */}
      {overdue && (
        <div className="border-t border-red-200 pt-4 mt-4">
          <p className="text-sm text-red-700 font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>This invoice is past due. Please arrange payment as soon as possible.</span>
          </p>
        </div>
      )}
    </div>
  );
}