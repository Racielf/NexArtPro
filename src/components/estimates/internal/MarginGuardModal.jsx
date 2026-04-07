/**
 * MarginGuardModal — INTERNAL USE ONLY
 *
 * Intercepts the "Review & Send" flow when gross margin < 15%.
 * - Admin: can override and continue
 * - Non-admin: sees a blocked state requiring admin approval
 *
 * Never affects PDF, preview, or any client-facing document.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert, Lock } from 'lucide-react';

export default function MarginGuardModal({ open, onClose, onContinue, marginPct, isAdmin }) {
  const marginDisplay = marginPct !== null && marginPct !== undefined
    ? `${parseFloat(marginPct).toFixed(1)}%`
    : '—';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
            Critical Margin Warning
          </DialogTitle>
        </DialogHeader>

        {/* Margin badge */}
        <div className="flex items-center justify-center my-2">
          <div className="flex flex-col items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-6 py-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Gross Margin</span>
            <span className="text-3xl font-extrabold text-red-600 tabular-nums">{marginDisplay}</span>
            <span className="text-[10px] text-red-400 font-medium">Minimum safe margin: 15%</span>
          </div>
        </div>

        {/* Warning message */}
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-snug">
            This estimate is <strong>below the minimum safe margin (15%)</strong>. Sending it may result in a financial loss.
          </p>
        </div>

        {/* Role-based gate */}
        {!isAdmin && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 mt-1">
            <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-snug">
              <strong className="text-slate-600">Admin approval required</strong> to send estimates below the margin threshold.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className={`flex-1 ${isAdmin ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            onClick={isAdmin ? onContinue : undefined}
            disabled={!isAdmin}
            title={!isAdmin ? 'Admin approval required' : 'Override and send anyway'}
          >
            {isAdmin ? 'Override & Continue' : 'Admin Only'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}