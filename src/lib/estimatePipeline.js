/**
 * estimatePipeline.js
 * 
 * Phase 2+3 pipeline helpers.
 * ONLY statuses: draft, sent, viewed, approved, declined
 */

import { nexartClient } from '@/api/nexartClient';

/**
 * Get open estimates: sent + viewed
 */
export async function getOpenEstimates() {
  const estimates = await nexartClient.entities.Estimate.list();
  return estimates
    .filter(e => ['sent', 'viewed'].includes(e.status))
    .sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
}

/**
 * Get won estimates: approved
 */
export async function getWonEstimates() {
  const estimates = await nexartClient.entities.Estimate.list();
  return estimates
    .filter(e => e.status === 'approved')
    .sort((a, b) => new Date(b.approved_at || 0) - new Date(a.approved_at || 0));
}

/**
 * Get lost estimates: declined
 */
export async function getLostEstimates() {
  const estimates = await nexartClient.entities.Estimate.list();
  return estimates
    .filter(e => e.status === 'declined')
    .sort((a, b) => new Date(b.declined_at || 0) - new Date(a.declined_at || 0));
}

/**
 * Group estimates by status: draft, sent, viewed, approved, declined
 */
export async function groupEstimatesByStatus() {
  const estimates = await nexartClient.entities.Estimate.list();
  
  const grouped = {
    draft: [],
    sent: [],
    viewed: [],
    approved: [],
    declined: [],
  };
  
  estimates.forEach(e => {
    if (grouped.hasOwnProperty(e.status)) {
      grouped[e.status].push(e);
    }
  });
  
  return grouped;
}