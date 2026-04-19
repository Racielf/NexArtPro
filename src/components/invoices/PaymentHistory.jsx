import React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const methodIcons = {
  cash: '💵',
  card: '💳',
  check: '📋',
  transfer: '🏦',
  other: '📌',
};

export default function PaymentHistory({ invoice, onPaymentRemoved }) {
  const payments = invoice?.payments || [];

  const handleRemovePayment = async (paymentId) => {
    if (!confirm('Remove this payment?')) return;

    try {
      const updatedPayments = payments.filter(p => p.id !== paymentId);
      const removedPayment = payments.find(p => p.id === paymentId);
      const updatedAmountPaid = (invoice?.amount_paid || 0) - (removedPayment?.amount || 0);
      const updatedBalanceDue = (invoice?.total || 0) - updatedAmountPaid;
      const paymentStatus = updatedBalanceDue > 0 ? (updatedAmountPaid > 0 ? 'partial' : 'unpaid') : 'paid';

      const updates = {
        payments: updatedPayments,
        amount_paid: Math.max(0, updatedAmountPaid),
        balance_due: Math.max(0, updatedBalanceDue),
        payment_status: paymentStatus,
        status: paymentStatus === 'paid' ? 'paid' : 'sent',
        paid_at: paymentStatus === 'paid' ? invoice?.paid_at : null,
      };

      await window.base44.entities.Invoice.update(invoice.id, updates);
      toast.success('Payment removed');
      onPaymentRemoved(updates);
    } catch (err) {
      toast.error('Failed to remove payment');
    }
  };

  if (payments.length === 0) {
    return <div className="text-sm text-slate-400 py-4 text-center">No payments recorded yet</div>;
  }

  return (
    <div className="space-y-2">
      {payments.map(pay => (
        <div
          key={pay.id}
          className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3 group hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-lg">{methodIcons[pay.method] || '📌'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">${pay.amount.toFixed(2)}</p>
              <p className="text-xs text-slate-500">
                {pay.method.charAt(0).toUpperCase() + pay.method.slice(1)} •{' '}
                {format(new Date(pay.payment_date), 'MMM d, yyyy')}
              </p>
              {pay.note && <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{pay.note}</p>}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => handleRemovePayment(pay.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}