/**
 * salesPipeline.js — Pipeline stage configuration and helpers.
 * Used by the Sales Pipeline UI to group and display estimates.
 */

export const PIPELINE_STAGES = [
  { key: 'lead', label: 'Leads', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', icon: '🎯' },
  { key: 'presented', label: 'Presented', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '📤' },
  { key: 'engaged', label: 'Engaged', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', icon: '👁' },
  { key: 'negotiation', label: 'Negotiation', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '🤝' },
  { key: 'won', label: 'Won', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
  { key: 'lost', label: 'Lost', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '❌' },
  { key: 'converted', label: 'Converted', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', icon: '🔄' },
];

const STATUS_TO_STAGE = {
  draft: 'lead',
  scheduled: 'lead',
  on_my_way: 'lead',
  visit_completed: 'lead',
  sent: 'presented',
  viewed: 'engaged',
  changes_requested: 'negotiation',
  approved: 'won',
  signed: 'won',
  declined: 'lost',
  converted: 'converted',
};

/**
 * Derive sales stage — use persisted sales_stage if available, fallback to status mapping.
 */
export function deriveSalesStage(estimate) {
  if (estimate.status && STATUS_TO_STAGE[estimate.status]) {
    return STATUS_TO_STAGE[estimate.status];
  }
  if (estimate.sales_stage && PIPELINE_STAGES.some(s => s.key === estimate.sales_stage)) {
    return estimate.sales_stage;
  }
  return 'lead';
}

/**
 * Group estimates by pipeline stage.
 */
export function groupByStage(estimates) {
  const groups = {};
  PIPELINE_STAGES.forEach(s => { groups[s.key] = []; });
  estimates.forEach(est => {
    const stage = deriveSalesStage(est);
    if (groups[stage]) groups[stage].push(est);
    else groups.lead.push(est);
  });
  return groups;
}

/**
 * Classify follow-up urgency.
 */
export function getFollowUpCategory(estimate) {
  if (!estimate.next_follow_up_at || estimate.follow_up_status === 'completed' || estimate.follow_up_status === 'none') {
    return null;
  }
  const now = new Date();
  const followUp = new Date(estimate.next_follow_up_at);
  const diffMs = followUp - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue';
  if (diffHours < 24) return 'today';
  return 'upcoming';
}

/**
 * Compute follow-up summary counts.
 */
export function computeFollowUpSummary(estimates) {
  const summary = { overdue: [], today: [], upcoming: [] };
  estimates.forEach(est => {
    const cat = getFollowUpCategory(est);
    if (cat) summary[cat].push(est);
  });
  return summary;
}

/**
 * Pipeline filters
 */
export const PIPELINE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'needs_follow_up', label: 'Needs Follow-up' },
  { key: 'engaged', label: 'Viewed / Engaged' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

export function applyPipelineFilter(estimates, filterKey) {
  if (filterKey === 'all') return estimates;
  if (filterKey === 'needs_follow_up') {
    return estimates.filter(e => {
      const cat = getFollowUpCategory(e);
      return cat === 'overdue' || cat === 'today';
    });
  }
  return estimates.filter(e => deriveSalesStage(e) === filterKey);
}