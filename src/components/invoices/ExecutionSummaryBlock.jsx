import React from 'react';
import { CheckCircle2, FileText, Camera, AlertTriangle } from 'lucide-react';

/**
 * ExecutionSummaryBlock — Displays work execution evidence for a WorkOrder.
 * Reusable for invoice detail and client portal.
 *
 * Props:
 * - workOrder: WorkOrder object (optional)
 * - compact: boolean (default: false) — reduces spacing for sidebar context
 */
export default function ExecutionSummaryBlock({ workOrder, compact = false }) {
  if (!workOrder) return null;

  const workSummary = workOrder?.work_summary || '';
  const fieldNotes = workOrder?.field_notes || [];
  const photos = workOrder?.photos || [];
  const checklist = workOrder?.execution_checklist || [];
  
  const checklistTotal = checklist.length;
  const checklistCompleted = checklist.filter(c => c.completed).length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  const hasEvidence = workSummary || fieldNotes.length > 0 || photos.length > 0 || checklist.length > 0;

  if (!hasEvidence) return null;

  return (
    <div className={`${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'} rounded-lg border border-slate-200 bg-slate-50`}>
      <div className="flex items-start gap-2">
        <CheckCircle2 className={`${compact ? 'w-3.5 h-3.5 mt-0.5' : 'w-4 h-4 mt-1'} text-emerald-600 flex-shrink-0`} />
        <div>
          <p className={`font-semibold text-emerald-700 ${compact ? 'text-xs' : 'text-sm'}`}>
            Execution Documented
          </p>
          <p className={`text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'} mt-0.5`}>
            Work completed and verified
          </p>
        </div>
      </div>

      <div className={`space-y-2 ${compact ? 'ml-5' : 'ml-6'}`}>
        {/* Work Summary */}
        {workSummary && (
          <div>
            <p className={`text-slate-700 font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
              Work Summary
            </p>
            <p className={`text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'} mt-1 line-clamp-2`}>
              {workSummary}
            </p>
          </div>
        )}

        {/* Checklist Progress */}
        {checklistTotal > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <p className={`text-slate-700 font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
                Completion
              </p>
              <span className={`font-semibold text-emerald-700 ${compact ? 'text-xs' : 'text-sm'}`}>
                {checklistPct}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${checklistPct}%` }}
              />
            </div>
            <p className={`text-slate-500 mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {checklistCompleted} of {checklistTotal} items completed
            </p>
          </div>
        )}

        {/* Field Notes Count */}
        {fieldNotes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <FileText className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-500`} />
            <p className={`text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
              {fieldNotes.length} field {fieldNotes.length === 1 ? 'note' : 'notes'} recorded
            </p>
          </div>
        )}

        {/* Photos Count */}
        {photos.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Camera className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-500`} />
            <p className={`text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
              {photos.length} photo{photos.length === 1 ? '' : 's'} attached
            </p>
          </div>
        )}
      </div>
    </div>
  );
}