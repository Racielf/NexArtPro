/**
 * LossPreventionModal — Unified pricing warning.
 *
 * All pricing issues (loss, zero-profit, missing cost) are confirmation-based.
 * The user is warned clearly but can always proceed intentionally.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

export default function LossPreventionModal({ open, onClose, onProceed, lossItems = [], zeroProfitItems = [], materialsWithoutCost = [] }) {
  const hasLoss = lossItems.length > 0;
  const hasMissingCost = materialsWithoutCost.length > 0;
  const totalLoss = lossItems.reduce((sum, i) => sum + (i.loss_per_unit * i.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasLoss
              ? <><AlertTriangle className="w-5 h-5 text-red-500" /> Below-Cost Pricing Warning</>
              : <><AlertCircle className="w-5 h-5 text-slate-500" /> Confirm Zero-Profit Items</>
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Loss items — warning + confirmation */}
          {hasLoss && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  {lossItems.length} item{lossItems.length > 1 ? 's' : ''} priced below cost
                </p>
                <p className="text-xs text-red-600">
                  Total estimated loss: <strong>${totalLoss.toFixed(2)}</strong>. This loss is real and will reduce your profit. You can still proceed if this is intentional.
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
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  {zeroProfitItems.length} item{zeroProfitItems.length > 1 ? 's' : ''} priced at cost
                </p>
                <p className="text-xs text-slate-500">
                  These items have unit price equal to unit cost, resulting in no profit margin. Please confirm you'd like to continue.
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {zeroProfitItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50/50 rounded-lg border border-slate-100 text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{item.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-slate-500 font-semibold">${item.unit_price.toFixed(2)} = cost</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Materials without internal cost — warning / confirm */}
          {hasMissingCost && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {materialsWithoutCost.length} material{materialsWithoutCost.length > 1 ? 's' : ''} missing internal cost
                </p>
                <p className="text-xs text-amber-600">
                  These materials have no internal cost recorded. Profit analysis, materials cost, and total cost calculations will be inaccurate.
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {materialsWithoutCost.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-amber-50/50 rounded-lg border border-amber-100 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">{item.name}</span>
                      <span className="text-slate-400 flex-shrink-0">{item.quantity} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.unit_price > 0 && (
                        <span className="text-slate-500">sells ${item.unit_price.toFixed(2)}</span>
                      )}
                      <span className="text-amber-600 font-semibold">no cost</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {hasLoss ? 'Review Pricing' : 'Review Items'}
          </Button>
          {onProceed && (
            <Button
              className={`flex-1 text-white ${hasLoss ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
              onClick={onProceed}
            >
              {hasLoss ? 'Send Anyway' : 'Confirm & Continue'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}