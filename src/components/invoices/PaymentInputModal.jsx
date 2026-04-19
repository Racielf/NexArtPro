import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentInputModal({ open, onClose, invoice, onPaymentAdded }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const maxPayment = (invoice?.balance_due || invoice?.total) - (invoice?.amount_paid || 0);
  const isValid = parseFloat(amount) > 0 && parseFloat(amount) <= maxPayment;

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error(`Payment must be between $0 and $${maxPayment.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const user = await (window.base44?.auth?.me?.() || Promise.resolve(null));
      const newPayment = {
        id: `pay-${Date.now()}`,
        amount: parseFloat(amount),
        method,
        payment_date: new Date().toISOString(),
        note,
        recorded_by: user?.email || user?.full_name || 'Admin',
        recorded_at: new Date().toISOString(),
      };

      const updatedPayments = [...(invoice?.payments || []), newPayment];
      const updatedAmountPaid = (invoice?.amount_paid || 0) + parseFloat(amount);
      const updatedBalanceDue = (invoice?.total || 0) - updatedAmountPaid;
      const paymentStatus = updatedBalanceDue <= 0 ? 'paid' : updatedAmountPaid > 0 ? 'partial' : 'unpaid';

      const updates = {
        payments: updatedPayments,
        amount_paid: updatedAmountPaid,
        balance_due: Math.max(0, updatedBalanceDue),
        payment_status: paymentStatus,
        status: paymentStatus === 'paid' ? 'paid' : invoice?.status || 'sent',
        paid_at: paymentStatus === 'paid' ? new Date().toISOString() : invoice?.paid_at || null,
      };

      await window.base44.entities.Invoice.update(invoice.id, updates);
      toast.success(`Payment of $${amount} recorded`);
      onPaymentAdded(updates);
      setAmount('');
      setMethod('cash');
      setNote('');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Record Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-6"
                max={maxPayment}
                min="0.01"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Max: ${maxPayment.toFixed(2)} (Balance Due)
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="h-9 w-full mt-1 border border-slate-200 rounded-md px-3 text-sm bg-white"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="check">Check</option>
              <option value="transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Note (Optional)</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Check #123, Invoice confirmation..."
              className="h-16 text-sm resize-none mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={!isValid || loading}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}