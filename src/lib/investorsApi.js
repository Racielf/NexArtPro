/**
 * investorsApi.js — NexArtPro
 * Helper logic for investor and capital contribution data.
 * Data access: nexartClient.entities.Investor / CapitalContribution / ProjectInvestor
 */

export const INVESTOR_TYPES = ['person', 'company'];

export const CONTRIBUTION_METHODS = ['wire', 'check', 'cash', 'other'];

export const CONTRIBUTION_STATUSES = ['pending', 'received', 'returned'];

export const INVESTOR_STATUSES = ['active', 'inactive'];

export const PROJECT_INVESTOR_STATUSES = ['pending', 'confirmed', 'void'];

export function getInvestorDisplayName(investor) {
  if (!investor) return '—';
  return investor.name || '—';
}

export function getTotalEquityPct(projectInvestors = []) {
  return projectInvestors.reduce((sum, pi) => sum + (parseFloat(pi.equity_pct) || 0), 0);
}

export function isEquityBalanced(projectInvestors = []) {
  return Math.abs(getTotalEquityPct(projectInvestors) - 100) < 0.01;
}
