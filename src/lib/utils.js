import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// ── Role normalization ────────────────────────────────────────────────────────
// Maps legacy stored role values to the current role structure.
// Roles: admin | user
const LEGACY_ROLE_MAP = { employee: 'user', agent: 'user' };

export function normalizeUserRole(rawRole) {
  if (!rawRole) return 'user';
  return LEGACY_ROLE_MAP[rawRole] ?? rawRole;
}
