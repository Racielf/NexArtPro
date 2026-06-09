import React from 'react';
import { CheckCircle2, MessageSquare, Camera, AlertCircle } from 'lucide-react';

/**
 * WOCompletionEvidence — Visual summary of field execution documentation.
 * Shows at completion to verify job has proper evidence of execution.
 */
export default function WOCompletionEvidence({ workOrder }) {
  if (!workOrder) return null;

  // Calculate evidence completeness
  const hasWorkSummary = !!workOrder.work_summary?.trim();
  const hasFieldNotes = (workOrder.field_notes?.length || 0) > 0;
  const hasPhotos = !!workOrder.photos_count || 0;
  const checklistProgress = workOrder.execution_checklist 
    ? Math.round((workOrder.execution_checklist.filter(c => c.completed).length / workOrder.execution_checklist.length) * 100)
    : 0;

  const evidenceItems = [
    {
      label: 'Work Summary',
      icon: <CheckCircle2 className="w-4 h-4" />,
      completed: hasWorkSummary,
      detail: hasWorkSummary ? `${workOrder.work_summary.substring(0, 40)}…` : 'Not documented',
    },
    {
      label: 'Field Notes',
      icon: <MessageSquare className="w-4 h-4" />,
      completed: hasFieldNotes,
      detail: hasFieldNotes ? `${workOrder.field_notes.length} note(s)` : 'No notes',
    },
    {
      label: 'Photos/Proof',
      icon: <Camera className="w-4 h-4" />,
      completed: hasPhotos > 0,
      detail: hasPhotos > 0 ? `${hasPhotos} photo(s)` : 'No photos',
    },
    {
      label: 'Checklist',
      icon: <CheckCircle2 className="w-4 h-4" />,
      completed: checklistProgress === 100,
      detail: `${checklistProgress}% complete`,
    },
  ];

  const completedCount = evidenceItems.filter(e => e.completed).length;
  const allComplete = completedCount === evidenceItems.length;

  return (
    <div className={`rounded-xl border shadow-sm p-5 ${
      allComplete
        ? 'bg-green-50 border-green-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        {allComplete ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${allComplete ? 'text-green-800' : 'text-amber-800'}`}>
            {allComplete ? 'Execution Evidence Complete' : 'Execution Evidence Incomplete'}
          </p>
          <p className={`text-xs mt-1 ${allComplete ? 'text-green-700' : 'text-amber-700'}`}>
            {completedCount}/{evidenceItems.length} documentation items
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {evidenceItems.map((item, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded border ${
                  item.completed
                    ? 'bg-white border-green-100 text-slate-700'
                    : 'bg-white border-amber-100 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={item.completed ? 'text-green-600' : 'text-amber-600'}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </div>
                <p className="text-[11px] text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}