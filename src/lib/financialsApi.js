/**
 * financialsApi.js — NexArtPro
 * Aggregation helpers for project financials.
 * Re-exports the core formulas from projectsApi for convenience.
 */

export {
  calcBalanceDue,
  calcProfitGross,
  calcProfitNeto,
  calcInvestorReturn,
  formatCurrency,
  calcTotalCapital,
} from './projectsApi';

/**
 * Build a full financial summary from a flip_analysis record + actual costs.
 * Returns all derived fields in one object.
 */
export function buildFinancialSummary(analysis = {}) {
  const {
    purchase_price = 0,
    closing_costs = 0,
    loan_amount = 0,
    earnest_money = 0,
    arv = 0,
    commission_pct = 6,
    actual_labor = 0,
    actual_materials = 0,
    actual_services = 0,
    draws_received = 0,
    renovation_budget = 0,
  } = analysis;

  const commission_usd = arv * (commission_pct / 100);
  const profit_gross   = arv - purchase_price - closing_costs - commission_usd;
  const profit_neto    = profit_gross - actual_labor - actual_materials - actual_services + draws_received;
  const balance_due    = purchase_price + closing_costs - loan_amount + earnest_money;
  const actual_total   = actual_labor + actual_materials + actual_services;
  const budget_variance = renovation_budget - actual_total;

  return {
    commission_usd,
    profit_gross,
    profit_neto,
    balance_due,
    actual_total,
    budget_variance,
  };
}
