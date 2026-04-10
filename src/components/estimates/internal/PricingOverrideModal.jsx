/**
 * PricingOverrideModal — Manager/Admin override flow for pricing violations
 *
 * Used when canSendDocument or canApproveDocument returns { requiresOverride: true }.
 * Requires:
 *   1. Explicit acknowledgement of the pricing issue
 *   2. Written reason/justification
 *   3. PIN verification (via approveMargin backend function)
 *
 * On success, calls onApproved() and the parent can proceed with the action.
 * Captures audit data for logging.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildPricingAuditRecord } from '@/lib/pricingPermissions';
import { logLossOverride } from '@/lib/pricingAuditService';

export default function PricingOverrideModal({
  open,
  onClose,
  onApproved,
  action = 'send',         // 'send' | 'approve'
  role = 'manager',
  currentUser,
  document,                // estimate or proposal
  documentType = 'estimate', // 'estimate' | 'proposal'
  pricingResult,           // from validateEstimatePricing
  lossItems = [],
  zeroProfitItems = [],
}) {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approved, setApproved] = useState(false);

  const hasLoss = lossItems.length > 0;
  const totalLoss = lossItems.reduce((sum, i) => sum + (i.loss_per_unit * i.quantity), 0);

  const handleClose = () => {
    setReason('');
    setPin('');
    setPinError('');
    setApproved(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setPinError('A reason is required for pricing overrides');
      return;
    }
    if (!pin) {
      setPinError('Enter your PIN to authorize');
      return;
    }

    setSubmitting(true);
    setPinError('');

    try {
      const docNumber = document?.estimate_number || document?.proposal_number;
      const result = await base44.functions.invoke('approveMargin', {
        pin,
        estimate_id: document?.id,
        estimate_number: docNumber,
        margin_pct: document?.gross_margin_pct,
      });

      if (result?.data?.approved || result?.approved) {
        // Build audit record for caller
        const audit = buildPricingAuditRecord({
          userEmail: currentUser?.email,
          userRole: role,
          action: `override_loss_${action}`,
          reason: reason.trim(),
          documentId: document?.id,
          documentType,
          documentNumber: docNumber,
          pricingResult,
          grossMarginPct: document?.gross_margin_pct,
          total: document?.total || document?.total_amount,
        });

        // Persist loss override to audit trail
        logLossOverride({
          documentId: document?.id,
          documentKind: documentType,
          documentNumber: docNumber,
          eventType: `override_loss_${action}`,
          reason: reason.trim(),
          userEmail: currentUser?.email,
          userRole: role,
          marginAtEvent: parseFloat(document?.gross_margin_pct) || null,
          totalAtEvent: parseFloat(document?.total || document?.total_amount) || null,
          metadata: {
            lossItems: pricingResult?.lossItems || [],
          },
        });

        setApproved(true);
        setTimeout(() => {
          handleClose();
          onApproved(audit);
        }, 700);
      } else {
        setPinError(result?.data?.error || result?.error || 'Authorization denied');
        setPin('');
      }
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Authorization failed';
      setPinError(msg);
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const actionLabel = action === 'approve' ? 'Approve' : 'Send';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
            Pricing Override Required
          </DialogTitle>
        </DialogHeader>

        {/* Issue summary */}
        {hasLoss && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-red-800 mb-1">
              {lossItems.length} item{lossItems.length > 1 ? 's' : ''} priced below cost
            </p>
            <p className="text-xs text-red-600">
              Estimated loss: <strong>${totalLoss.toFixed(2)}</strong>
            </p>
            <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
              {lossItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-2 py-1 bg-white/60 rounded">
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">{item.name}</span>
                  <span className="text-red-600 font-semibold">${item.unit_price.toFixed(2)} &lt; ${item.unit_cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zero-profit items should never reach this modal — they use LossPreventionModal.
             This block is kept as a safety net but should not normally render. */}
        {!hasLoss && zeroProfitItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              {zeroProfitItems.length} item{zeroProfitItems.length > 1 ? 's' : ''} at zero profit
            </p>
            <p className="text-xs text-amber-600">No margin on these items.</p>
          </div>
        )}

        {/* Role badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold uppercase tracking-wide text-[10px]">
            {role}
          </span>
          <span className="text-slate-500">{currentUser?.email}</span>
        </div>

        {!approved && (
          <>
            {/* Reason field */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Reason for override <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why this pricing exception is justified..."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* PIN entry */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Enter PIN to authorize</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="PIN"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="h-9 text-center text-lg tracking-widest font-bold border-slate-300"
                  maxLength={8}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 h-9 flex-shrink-0"
                >
                  {submitting ? 'Verifying…' : `Override & ${actionLabel}`}
                </Button>
              </div>
              {pinError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <span>✗</span> {pinError}
                </p>
              )}
            </div>
          </>
        )}

        {/* Approved flash */}
        {approved && (
          <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">Override approved — proceeding…</span>
          </div>
        )}

        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-snug">
            This override will be logged with your identity, reason, and timestamp for audit purposes.
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={handleClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}