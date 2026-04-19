/**
 * estimatePipeline.js
 *
 * Sales pipeline query helpers.
 * Supports grouping estimates by sales stage for pipeline dashboards.
 */

import { base44 } from '@/api/base44Client';

/**
 * Get all estimates grouped by status/stage.
 * Returns: { draft: [], sent: [], viewed: [], approved: [], declined: [], changes_requested: [] }
 */
export async function getEstimatesByStage() {
  const allEstimates = await base44.entities.Estimate.list();
  
  const grouped = {
    draft: [],
    sent: [],
    viewed: [],
    approved: [],
    declined: [],
    changes_requested: [],
  };
  
  allEstimates.forEach(est => {
    if (grouped.hasOwnProperty(est.status)) {
      grouped[est.status].push(est);
    }
  });
  
  return grouped;
}

/**
 * Get open deals (sent, viewed, or changes_requested).
 * Sorted by most recent sent_at or viewed_at.
 */
export async function getOpenDeals() {
  const estimates = await base44.entities.Estimate.list();
  return estimates
    .filter(e => ['sent', 'viewed', 'changes_requested'].includes(e.status))
    .sort((a, b) => {
      const aDate = new Date(a.last_viewed_at || a.sent_at || 0);
      const bDate = new Date(b.last_viewed_at || b.sent_at || 0);
      return bDate - aDate;
    });
}

/**
 * Get won deals (approved or signed).
 * Sorted by approval/sign date (most recent first).
 */
export async function getWonDeals() {
  const estimates = await base44.entities.Estimate.list();
  return estimates
    .filter(e => ['approved', 'signed'].includes(e.status))
    .sort((a, b) => {
      const aDate = new Date(a.approved_at || a.signed_at || 0);
      const bDate = new Date(b.approved_at || b.signed_at || 0);
      return bDate - aDate;
    });
}

/**
 * Get lost deals (declined).
 * Sorted by decline date (most recent first).
 */
export async function getLostDeals() {
  const estimates = await base44.entities.Estimate.list();
  return estimates
    .filter(e => e.status === 'declined')
    .sort((a, b) => new Date(b.declined_at || 0) - new Date(a.declined_at || 0));
}

/**
 * Get pipeline summary: counts by stage and basic metrics.
 * Returns: { draft, sent, viewed, approved, declined, changes_requested, totals: { open, won, lost } }
 */
export async function getPipelineSummary() {
  const allEstimates = await base44.entities.Estimate.list();
  
  const summary = {
    draft: 0,
    sent: 0,
    viewed: 0,
    approved: 0,
    signed: 0,
    declined: 0,
    changes_requested: 0,
    totals: {
      open: 0,    // sent + viewed + changes_requested
      won: 0,     // approved + signed
      lost: 0,    // declined
    },
  };
  
  allEstimates.forEach(e => {
    if (summary.hasOwnProperty(e.status)) {
      summary[e.status]++;
    }
    
    if (['sent', 'viewed', 'changes_requested'].includes(e.status)) {
      summary.totals.open++;
    }
    if (['approved', 'signed'].includes(e.status)) {
      summary.totals.won++;
    }
    if (e.status === 'declined') {
      summary.totals.lost++;
    }
  });
  
  return summary;
}

/**
 * Get estimates due for follow-up.
 * Filters: follow_up_status === 'pending' or 'action_required', and next_follow_up_at <= now
 */
export async function getEstimatesDueForFollowUp() {
  const estimates = await base44.entities.Estimate.list();
  const now = new Date();
  
  return estimates
    .filter(e => {
      const needsFollowUp = ['pending', 'action_required'].includes(e.follow_up_status);
      const isDue = e.next_follow_up_at && new Date(e.next_follow_up_at) <= now;
      return needsFollowUp && isDue;
    })
    .sort((a, b) => new Date(a.next_follow_up_at || 0) - new Date(b.next_follow_up_at || 0));
}

/**
 * Get win rate: (won deals / (won + lost deals)) * 100
 */
export async function getWinRate() {
  const won = await getWonDeals();
  const lost = await getLostDeals();
  const total = won.length + lost.length;
  
  if (total === 0) return 0;
  return Math.round((won.length / total) * 100);
}

/**
 * Get average follow-ups per deal.
 */
export async function getAverageFollowUpsPerDeal() {
  const estimates = await base44.entities.Estimate.list();
  const withFollowUps = estimates.filter(e => e.follow_up_count && e.follow_up_count > 0);
  
  if (withFollowUps.length === 0) return 0;
  
  const total = withFollowUps.reduce((sum, e) => sum + (e.follow_up_count || 0), 0);
  return (total / withFollowUps.length).toFixed(1);
}