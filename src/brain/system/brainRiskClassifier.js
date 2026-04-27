export function classifyBrainActionRisk(actionType = '') {
  const high = ['price_book_update','financial_write','delete_record','payroll_change'];
  const medium = ['status_change','schedule_update','follow_up'];

  if (high.includes(actionType)) return 'high';
  if (medium.includes(actionType)) return 'medium';
  return 'low';
}
