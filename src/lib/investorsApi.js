/**
 * investorsApi.js — NexArtPro
 * Helper logic for investor and capital contribution data.
 * Data access: nexartClient.entities.Investor / CapitalContribution / ProjectInvestor
 */

export const INVESTOR_TYPES = ['person', 'company'];

// capital_contributions.method CHECK (method IN ('cash','wire','check','company_payment'))
export const CONTRIBUTION_METHODS = ['wire', 'check', 'cash', 'company_payment'];

// capital_contributions.status CHECK (status IN ('pending','confirmed','cancelled'))
export const CONTRIBUTION_STATUSES = ['pending', 'confirmed', 'cancelled'];

// capital_contributions.type CHECK (type IN ('initial','additional','closing','reimbursement'))
export const CONTRIBUTION_TYPES = ['initial', 'additional', 'closing', 'reimbursement'];

export const INVESTOR_STATUSES = ['active', 'inactive'];

export const PROJECT_INVESTOR_STATUSES = ['pending', 'confirmed', 'cancelled'];

export const PROJECT_INVESTOR_ROLES = ['equity_partner', 'lead_contractor', 'silent_partner', 'other'];

export function getInvestorDisplayName(investor) {
  if (!investor) return '—';
  return investor.name || '—';
}

/** Sum of ownership_percentage across all project investors */
export function getTotalEquityPct(projectInvestors = []) {
  return projectInvestors.reduce(
    (sum, pi) => sum + (parseFloat(pi.ownership_percentage) || 0),
    0
  );
}

/** Sum of profit_split_percentage across all project investors */
export function getTotalProfitSplitPct(projectInvestors = []) {
  return projectInvestors.reduce(
    (sum, pi) => sum + (parseFloat(pi.profit_split_percentage) || 0),
    0
  );
}

export function isEquityBalanced(projectInvestors = []) {
  return Math.abs(getTotalEquityPct(projectInvestors) - 100) < 0.01;
}

export function isProfitSplitBalanced(projectInvestors = []) {
  return Math.abs(getTotalProfitSplitPct(projectInvestors) - 100) < 0.01;
}
