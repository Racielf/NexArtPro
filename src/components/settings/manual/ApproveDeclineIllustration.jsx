import React from 'react';
import { ThumbsUp, X, XCircle, CheckCircle } from 'lucide-react';

/**
 * Static illustration that mimics the real Approve/Decline modal.
 * Replace with a screenshot or SVG later if preferred.
 */
export default function ApproveDeclineIllustration() {
  return (
    <div className="w-full max-w-sm mx-auto my-4 select-none pointer-events-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-green-500" />
            <span className="text-base font-bold text-slate-900">Approve or Decline</span>
          </div>
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300">
            <X className="w-4 h-4" />
          </div>
        </div>

        {/* Estimate info */}
        <div className="px-5 pb-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 font-medium">Estimate #1</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">Rodolfo Fernandez Romero</p>
            <p className="text-xs text-slate-500 mt-1">Total: $0.00</p>
          </div>
        </div>

        {/* Note field */}
        <div className="px-5 pb-4">
          <label className="text-xs text-slate-500 mb-1 block font-medium">Note (required to decline)</label>
          <div className="w-full h-16 rounded-md border-2 border-blue-300 bg-white px-3 py-2">
            <span className="text-sm text-slate-300">Optional for approval, required to decline...</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-5 pb-5">
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-300 bg-white">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-sm font-semibold text-red-600">Decline</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-sm font-semibold text-white">Approve</span>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-[10px] text-slate-400 text-center mt-2 italic">
        Ilustración del modal Approve / Decline
      </p>
    </div>
  );
}