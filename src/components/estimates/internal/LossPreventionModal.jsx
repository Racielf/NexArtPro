/**
 * LossPreventionModal — Blocks or warns before send/export/print
 *
 * Two modes:
 *   1. BLOCK (hasLoss=true): Shows loss items, no proceed button — must fix first.
 *   2. CONFIRM (hasLoss=false, hasZeroProfit=true): Shows zero-profit items,
 *      user can acknowledge and proceed.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

export default function LossPreventionModal({ open, onClose, onProceed, lossItems = [], zeroProfitItems = [] }) {
  const hasLoss = lossItems.length > 0;
  const totalLoss = lossItems.reduce((sum, i) => sum + (i.loss_per_unit * i.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasLoss
              ? <><XCircle className="w-5 h-5 text-red-500" /> Pricing Error — Cannot Send</>
              : <><AlertTriangle className="w-5 h-5 text-amber-500" /> Zero Profit Warning</>
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Loss items — hard block */}
          {hasLoss && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  {lossItems.length} item{lossItems.length > 1 ? 's' : ''} priced below cost
                </p>
                <p className="text-xs text-red-600">
                  Total estimated loss: <strong>${totalLoss.toFixed(2)}</strong>. Fix pricing before sending.
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {lossItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-red-50/50 rounded-lg border border-red-100 text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{item.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-red-600 font-semibold">${item.unit_price.toFixed(2)}</span>
                      <span className="text-slate-400">&lt;</span>
                      <span className="text-slate-600">${item.unit_cost.toFixed(2)} cost</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Zero profit items — confirm to proceed */}
          {!hasLoss && zeroProfitItems.length > 0 && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {zeroProfitItems.length} item{zeroProfitItems.length > 1 ? 's' : ''} at zero profit
                </p>
                <p className="text-xs text-amber-600">
                  These items have price equal to cost — you won't make any profit on them.
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {zeroProfitItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-amber-50/50 rounded-lg border border-amber-100 text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{item.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-700 font-semibold">${item.unit_price.toFixed(2)} = cost</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {hasLoss ? 'Go Back & Fix' : 'Cancel'}
          </Button>
          {!hasLoss && onProceed && (
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={onProceed}
            >
              I Understand — Proceed
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}