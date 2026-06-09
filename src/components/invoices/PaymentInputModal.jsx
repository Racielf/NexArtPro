import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { computeInvoiceDerivedFields } from '@/lib/invoiceHelpers';
import { buildTimelineEvent, appendCollectionTimelineEvent } from '@/lib/invoiceCollectionTimeline';

export default function PaymentInputModal({ open, onClose, invoice, onPaymentAdded }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [signedBy, setSignedBy] = useState(invoice?.client_name || '');
  const [authorizationAccepted, setAuthorizationAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSignedBy(invoice?.client_name || '');
    setAuthorizationAccepted(false);
  }, [open, invoice?.client_name]);

  // Derive current state from payments[] (single source of truth)
  const { balance_due } = computeInvoiceDerivedFields(invoice);
  const maxPayment = balance_due;
  const paymentAmount = parseFloat(amount);
  const isValid = paymentAmount > 0 && paymentAmount <= maxPayment && signedBy.trim() && authorizationAccepted;

  const handleSubmit = async () => {
    if (paymentAmount <= 0 || paymentAmount > maxPayment) {
      toast.error(`Payment must be between $0 and $${maxPayment.toFixed(2)}`);
      return;
    }

    if (!signedBy.trim()) {
      toast.error('Signer name is required');
      return;
    }

    if (!authorizationAccepted) {
      toast.error('Payment authorization is required');
      return;
    }

    setLoading(true);
    try {
      const user = await (window.nexartClient?.auth?.me?.() || Promise.resolve(null));
      const signedAt = new Date().toISOString();
      const newPayment = {
        id: `pay-${Date.now()}`,
        amount: paymentAmount,
        method,
        payment_date: signedAt,
        note,
        recorded_by: user?.email || user?.full_name || 'Admin',
        recorded_at: signedAt,
        signed_by: signedBy.trim(),
        signed_at: signedAt,
        payment_authorized: true,
      };

      // ONLY update payments array — let derived helpers compute everything else
      const updatedPayments = [...(invoice?.payments || []), newPayment];
      
      // Compute ALL derived fields from the updated payments array
      const temp = { ...invoice, payments: updatedPayments };
      const derived = computeInvoiceDerivedFields(temp);

      // Build timeline event for payment
      const timelineEvent = buildTimelineEvent(
        'payment_recorded',
        user?.email || user?.full_name || 'Admin',
        note || undefined,
        { amount: paymentAmount, method, signed_by: signedBy.trim() }
      );
      const timeline = appendCollectionTimelineEvent(invoice, timelineEvent);

      // Update invoice with derived fields + payments array + timeline
      const updates = {
        payments: updatedPayments,
        amount_paid: derived.amount_paid,
        balance_due: derived.balance_due,
        payment_status: derived.payment_status,
        paid_at: derived.payment_status === 'paid' ? signedAt : invoice?.paid_at || null,
        collection_timeline: timeline,
      };

      await window.nexartClient.entities.Invoice.update(invoice.id, updates);
      toast.success(`Payment of $${amount} recorded`);
      onPaymentAdded(updates);
      setAmount('');
      setMethod('cash');
      setNote('');
      setSignedBy(invoice?.client_name || '');
      setAuthorizationAccepted(false);
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

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <PenLine className="w-4 h-4 text-slate-500" />
              Client Signature
            </label>
            <Input
              value={signedBy}
              onChange={e => setSignedBy(e.target.value)}
              placeholder="Signer name"
              className="bg-white"
            />
            <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
              <input
                type="checkbox"
                checked={authorizationAccepted}
                onChange={e => setAuthorizationAccepted(e.target.checked)}
                className="mt-0.5 rounded accent-green-600"
              />
              <span>
                I authorize this payment and confirm the amount, method, and invoice balance are correct.
              </span>
            </label>
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