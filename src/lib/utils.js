import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// ── Role normalization ────────────────────────────────────────────────────────
// Maps raw role values to the pricing permission role structure.
// Pricing roles: admin | manager | sales
// The User entity role field can have: admin, manager, sales, user, employee, agent
const PRICING_ROLE_MAP = {
  admin:    'admin',
  manager:  'manager',
  sales:    'sales',
  user:     'sales',      // default users → sales permissions
  employee: 'sales',      // legacy
  agent:    'sales',      // legacy
};

export function normalizeUserRole(rawRole) {
  if (!rawRole) return 'sales';
  return PRICING_ROLE_MAP[rawRole] ?? 'sales';
}