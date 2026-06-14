/**
 * projectsApi.js — NexArtPro
 * Financial formulas and helpers for the Projects / Investor Hub module.
 * All formulas follow the FlipOS spec defined in CLAUDE.md §8 Fase 5.
 * Pure functions — no side effects, no Supabase calls here.
 * Data access goes in nexartClient.entities.Project (etc.)
 */

// ─── R8 — Balance Due (cash needed at closing) ──────────────────────────────
export function calcBalanceDue({ purchase_price = 0, closing_costs = 0, loan_amount = 0, earnest_money = 0 }) {
  return purchase_price + closing_costs - loan_amount + earnest_money;
}

// ─── R9 — Gross Profit ───────────────────────────────────────────────────────
export function calcProfitGross({ arv = 0, purchase_price = 0, closing_costs = 0, commission_pct = 0 }) {
  const commission_usd = arv * (commission_pct / 100);
  return arv - purchase_price - closing_costs - commission_usd;
}

// ─── R10 — Net Profit ────────────────────────────────────────────────────────
export function calcProfitNeto({ profit_gross = 0, actual_labor = 0, actual_materials = 0, actual_services = 0, draws_received = 0 }) {
  return profit_gross - actual_labor - actual_materials - actual_services + draws_received;
}

// ─── R11 — Investor distribution ─────────────────────────────────────────────
export function calcInvestorReturn({ profit_neto = 0, equity_pct = 0 }) {
  return profit_neto * (equity_pct / 100);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function calcTotalCapital(contributions = []) {
  return contributions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
}

export const PROJECT_STATUSES = ['planning', 'active', 'completed', 'on_hold', 'cancelled'];

export const STATUS_LABELS = {
  planning:   'Planning',
  active:     'Active',
  completed:  'Completed',
  on_hold:    'On Hold',
  cancelled:  'Cancelled',
};

export const STATUS_COLORS = {
  planning:  'bg-blue-100 text-blue-800',
  active:    'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  on_hold:   'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};
