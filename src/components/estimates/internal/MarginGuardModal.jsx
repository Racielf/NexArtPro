/**
 * MarginGuardModal — INTERNAL USE ONLY
 *
 * Intercepts "Review & Send" when gross_margin_pct < 25%.
 * - Non-admin: blocked, must request admin approval
 * - Admin: must enter PIN — validated SERVER-SIDE via approveMargin function
 * - On approval: server logs audit event (manual_approval) with user, margin, timestamp
 *
 * PIN is never stored or checked on the client.
 * Never affects PDF, preview, or any client-facing document.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, ShieldAlert, Lock, CheckCircle2, KeyRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MarginGuardModal({ open, onClose, onContinue, marginPct, isAdmin, currentUser, estimate }) {
  const [pin, setPin]         = useState('');
  const [pinError, setPinError] = useState('');
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const marginDisplay = marginPct !== null && marginPct !== undefined
    ? `${parseFloat(marginPct).toFixed(1)}%`
    : '—';

  const handleClose = () => {
    setPin('');
    setPinError('');
    setApproved(false);
    onClose();
  };

  const handlePinSubmit = async () => {
    if (!isAdmin) {
      setPinError('Admin approval required');
      return;
    }
    if (!pin) {
      setPinError('Enter your PIN');
      return;
    }

    setSubmitting(true);
    setPinError('');

    try {
      const result = await base44.functions.invoke('approveMargin', {
        pin,
        estimate_id: estimate?.id,
        estimate_number: estimate?.estimate_number,
        margin_pct: marginPct,
      });

      if (result?.approved) {
        setApproved(true);
        // Brief confirmation flash, then proceed
        setTimeout(() => {
          handleClose();
          onContinue();
        }, 700);
      } else {
        setPinError(result?.error || 'Approval denied');
        setPin('');
      }
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Approval failed';
      setPinError(msg);
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
            Approval Required
          </DialogTitle>
        </DialogHeader>

        {/* Margin badge */}
        <div className="flex items-center justify-center my-1">
          <div className="flex flex-col items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-8 py-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Gross Margin</span>
            <span className="text-4xl font-extrabold text-red-600 tabular-nums">{marginDisplay}</span>
            <span className="text-[10px] text-red-400 font-medium">Minimum required: 25%</span>
          </div>
        </div>

        {/* Risk message */}
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-snug">
            This estimate is <strong>below the 25% minimum safe margin</strong>. Sending it may result in a financial loss. Admin approval is required to proceed.
          </p>
        </div>

        {/* Non-admin: blocked */}
        {!isAdmin && (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">⛔ Admin approval required</p>
              <p className="text-[11px] text-red-600 mt-0.5 leading-snug">
                Employees cannot approve estimates below 25% margin. Contact an administrator.
              </p>
            </div>
          </div>
        )}

        {/* Admin: PIN entry */}
        {isAdmin && !approved && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Enter admin PIN to approve</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                className="h-9 text-center text-lg tracking-widest font-bold border-slate-300 focus:border-red-400"
                maxLength={8}
                autoFocus
              />
              <Button
                onClick={handlePinSubmit}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 h-9 flex-shrink-0"
              >
                {submitting ? 'Verifying…' : 'Approve & Send'}
              </Button>
            </div>
            {pinError && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <span>✗</span> {pinError}
              </p>
            )}
          </div>
        )}

        {/* Approved flash */}
        {isAdmin && approved && (
          <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">Approved — proceeding…</span>
          </div>
        )}

        {/* Cancel */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}