export function evaluateWorkOrderEvidence(workOrder, options = {}) {
  const photoCount = Number.isFinite(options.photoCount)
    ? options.photoCount
    : Number(workOrder?.photos_count || 0);

  const workSummary = workOrder?.work_summary?.trim() || '';
  const fieldNotes = Array.isArray(workOrder?.field_notes) ? workOrder.field_notes : [];
  const checklist = Array.isArray(workOrder?.execution_checklist) ? workOrder.execution_checklist : [];

  const checklistCompletedCount = checklist.filter(item => item?.completed).length;
  const checklistProgress = checklist.length > 0
    ? Math.round((checklistCompletedCount / checklist.length) * 100)
    : 0;

  const requirements = {
    hasWorkSummary: workSummary.length > 0,
    hasFieldNotes: fieldNotes.length > 0,
    hasRequiredPhotos: photoCount >= 1,
    isChecklistComplete: checklist.length > 0 && checklistProgress === 100,
  };

  const missingItems = [];
  if (!requirements.hasWorkSummary) missingItems.push('work summary');
  if (!requirements.hasFieldNotes) missingItems.push('field note');
  if (!requirements.hasRequiredPhotos) missingItems.push('proof photo');
  if (!requirements.isChecklistComplete) missingItems.push('completion checklist');

  return {
    photoCount,
    checklistProgress,
    checklistCompletedCount,
    requirements,
    missingItems,
    isComplete: missingItems.length === 0,
  };
}
