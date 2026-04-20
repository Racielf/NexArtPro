/**
 * recoveryTimeline.js
 *
 * Chronological grouping and date filtering helpers for Recovery Center.
 * Classifies deleted records by time period and formats timeline labels.
 */

/**
 * Classify a deleted_at timestamp into a timeline group.
 * Groups: Today, Yesterday, Earlier this week, Earlier this month, Older
 */
export function classifyTimelineGroup(deletedAt) {
  if (!deletedAt) return 'Unknown';
  
  const deleted = new Date(deletedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deletedDay = new Date(deleted.getFullYear(), deleted.getMonth(), deleted.getDate());
  
  const diffTime = today.getTime() - deletedDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Earlier this week';
  if (diffDays <= 30) return 'Earlier this month';
  return 'Older';
}

/**
 * Group records by timeline period, sorted descending.
 * Returns { groupLabel: [records] }
 */
export function groupByTimeline(records) {
  const groups = {
    'Today': [],
    'Yesterday': [],
    'Earlier this week': [],
    'Earlier this month': [],
    'Older': [],
  };
  
  records.forEach(r => {
    const group = classifyTimelineGroup(r.deleted_at);
    if (groups[group]) {
      groups[group].push(r);
    }
  });
  
  // Sort each group by deleted_at descending
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));
  });
  
  // Return ordered groups (only non-empty)
  return ['Today', 'Yesterday', 'Earlier this week', 'Earlier this month', 'Older']
    .reduce((acc, key) => {
      if (groups[key].length > 0) {
        acc[key] = groups[key];
      }
      return acc;
    }, {});
}

/**
 * Filter records by date range.
 * dateFilter: 'all' | 'today' | '7days' | '30days' | 'custom'
 * customStart/customEnd: ISO strings (for 'custom' mode)
 */
export function filterByDateRange(records, dateFilter, customStart = null, customEnd = null) {
  if (dateFilter === 'all') return records;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate;
  
  switch (dateFilter) {
    case 'today':
      startDate = today;
      break;
    case '7days':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      if (!customStart) return records;
      startDate = new Date(customStart);
      break;
    default:
      return records;
  }
  
  // End date is end of today (unless custom)
  const endDate = customEnd ? new Date(customEnd) : today;
  endDate.setHours(23, 59, 59, 999);
  
  return records.filter(r => {
    if (!r.deleted_at) return false;
    const deleted = new Date(r.deleted_at);
    return deleted >= startDate && deleted <= endDate;
  });
}

/**
 * Format a deleted_at timestamp as a readable date (e.g., "Mar 15, 2026 at 2:30 PM")
 */
export function formatDeletedAt(deletedAt) {
  if (!deletedAt) return '—';
  return new Date(deletedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}