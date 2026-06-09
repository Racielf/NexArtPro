const MIN_SUMMARY_LENGTH = 10;

function normalizePhotos(photos) {
  return Array.isArray(photos) ? photos : [];
}

function getChecklist(workOrder) {
  return Array.isArray(workOrder?.execution_checklist) ? workOrder.execution_checklist : [];
}

export function getWorkOrderCompletionStatus({ workOrder, photos = [], summary = '', signed = false } = {}) {
  const photoList = normalizePhotos(photos);
  const beforePhotos = photoList.filter(photo => photo?.phase === 'before');
  const afterPhotos = photoList.filter(photo => photo?.phase === 'after');
  const checklist = getChecklist(workOrder);
  const completedChecklistCount = checklist.filter(item => item?.completed).length;
  const summaryText = String(summary || workOrder?.work_summary || '').trim();

  return {
    hasCheckIn: Boolean(workOrder?.checked_in_at),
    hasBeforePhoto: beforePhotos.length > 0,
    hasAfterPhoto: afterPhotos.length > 0,
    hasChecklist: checklist.length > 0,
    isChecklistComplete: checklist.length > 0 && completedChecklistCount === checklist.length,
    completedChecklistCount,
    checklistTotal: checklist.length,
    hasSummary: summaryText.length >= MIN_SUMMARY_LENGTH,
    hasSignature: Boolean(signed || workOrder?.closure_signature),
    beforePhotoCount: beforePhotos.length,
    afterPhotoCount: afterPhotos.length,
    summaryLength: summaryText.length,
  };
}

export function validateWorkOrderCompletion(input = {}) {
  const status = getWorkOrderCompletionStatus(input);
  const errors = [];

  if (!status.hasCheckIn) errors.push('Check-in is required before completing the job.');
  if (!status.hasBeforePhoto) errors.push('At least one BEFORE photo is required.');
  if (!status.hasAfterPhoto) errors.push('At least one AFTER photo is required.');
  if (!status.hasChecklist) errors.push('Completion checklist is required.');
  if (status.hasChecklist && !status.isChecklistComplete) errors.push('Completion checklist must be fully completed.');
  if (!status.hasSummary) errors.push(`Work summary must be at least ${MIN_SUMMARY_LENGTH} characters.`);
  if (!status.hasSignature) errors.push('Customer or field signature is required.');

  return {
    valid: errors.length === 0,
    errors,
    status,
  };
}
