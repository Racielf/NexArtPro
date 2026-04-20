import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, HelpCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ClientResponseActions — Lightweight client intent capture for invoices.
 * Appears in client portal invoice view.
 */
export default function ClientResponseActions({ invoice, onResponseSubmitted }) {
  const [open, setOpen] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [note, setNote] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const intents = [
    {
      key: 'will_pay_soon',
      label: 'I will pay soon',
      icon: Check,
      description: 'Payment coming within a few days',
      color: 'bg-emerald-50 border-emerald-200',
    },
    {
      key: 'has_question',
      label: 'I have a billing question',
      icon: HelpCircle,
      description: 'Clarification needed on invoice',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      key: 'needs_time',
      label: 'I need more time',
      icon: Clock,
      description: 'Request for payment extension',
      color: 'bg-amber-50 border-amber-200',
    },
  ];

  const handleSubmit = async () => {
    if (!selectedIntent) {
      toast.error('Please select an option');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updates = {
        client_response_status: selectedIntent,
        client_response_note: note || null,
        client_response_at: now,
      };
      if (selectedIntent === 'will_pay_soon' && promisedDate) {
        updates.promised_payment_date = promisedDate;
        updates.promised_payment_note = note || null;
      }
      await base44.entities.Invoice.update(invoice.id, updates);
      toast.success('Your response has been recorded');
      setOpen(false);
      setSelectedIntent(null);
      setNote('');
      setPromisedDate('');
      if (onResponseSubmitted) {
        onResponseSubmitted({ ...updates });
      }
    } catch (err) {
      toast.error('Failed to save response');
    } finally {
      setSubmitting(false);
    }
  };

  // Show response summary if already responded
  if (invoice.client_response_at && invoice.client_response_status !== 'no_response') {
    const intent = intents.find(i => i.key === invoice.client_response_status);
    const Icon = intent?.icon;
    return (
      <div className={`border rounded-xl p-4 space-y-2 ${intent?.color}`}>
        <div className="flex items-start gap-2">
          {Icon && <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{intent?.label}</p>
            {invoice.client_response_note && (
              <p className="text-xs text-slate-600 mt-2">{invoice.client_response_note}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Submitted {new Date(invoice.client_response_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tell us about your payment plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {intents.map(intent => {
              const Icon = intent.icon;
              return (
                <button
                  key={intent.key}
                  onClick={() => setSelectedIntent(intent.key)}
                  className={`w-full border-2 rounded-lg p-3 text-left transition-all ${
                    selectedIntent === intent.key
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-slate-600" />
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{intent.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{intent.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            {selectedIntent === 'will_pay_soon' && (
              <div className="pt-2">
                <label className="text-sm font-semibold text-slate-700 mb-1 block">
                  Expected payment date (optional)
                </label>
                <Input
                  type="date"
                  value={promisedDate}
                  onChange={e => setPromisedDate(e.target.value)}
                  className="text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            {selectedIntent && (
              <div className="pt-1">
                <label className="text-sm font-semibold text-slate-700 mb-1 block">
                  Additional note (optional)
                </label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Payment arriving Friday, account number is 12345, etc."
                  className="h-20 text-sm resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={!selectedIntent || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Your input helps us</p>
            <p className="text-xs text-slate-600 mt-1">
              Let us know about your payment timeline so we can follow up appropriately.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="w-full bg-primary hover:bg-primary/90 text-white"
        >
          Share your payment plan
        </Button>
      </div>
    </>
  );
}