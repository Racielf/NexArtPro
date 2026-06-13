/**
 * estimateSendGuard.js
 *
 * Hotfix: estimate-editor-send-lock-guards
 *
 * SINGLE source of truth for send-eligibility validation.
 * Used by BOTH entry points that open the send modal:
 *   1. EstimateEditor header "Review & Send" button
 *   2. EstimateActionsPanel sidebar "Review & Send" button
 *
 * This ensures both paths go through the identical pricing / RBAC /
 * doc-type gate, eliminating the bypass that existed on the header button.
 *
 * ─── Return shape ──────────────────────────────────────────────────────────
 * {
 *   allowed:           boolean  — if false, block the modal entirely
 *   requiresOverride:  boolean  — show PricingOverrideModal (admin/manager PIN)
 *   requiresConfirm:   boolean  — show LossPreventionModal (standard confirm)
 *   blockedReason:     string|null — toast message when allowed === false
 *   pricingValidation: object|null — validateEstimatePricing() output
 * }
 * ───────────────────────────────────────────────────────────────────────────
 */

import { validateEstimatePricing } from '@/lib/pricingValidation';
import { canSendDocument } from '@/lib/pricingPermissions';
import { validateDocTypeFields } from '@/lib/documentTypeConfig';
import { normalizeUserRole } from '@/lib/utils';

/**
 * Evaluate whether the current user can open the send modal for an estimate.
 *
 * @param {Object|null} estimate  — the estimate object from state
 * @param {Object|null} currentUser — from base44.auth.me() or local session
 * @returns {{
 *   allowed: boolean,
 *   requiresOverride: boolean,
 *   requiresConfirm: boolean,
 *   blockedReason: string|null,
 *   pricingValidation: object|null,
 * }}
 */
export function evaluateSendGuard(estimate, currentUser) {
  // ── 1. Client email presence ─────────────────────────────────────────────
  if (!estimate?.client_email) {
    return {
      allowed: false,
      requiresOverride: false,
      requiresConfirm: false,
      blockedReason: 'Client email is required to send',
      pricingValidation: null,
    };
  }

  // ── 2. Document type required fields ─────────────────────────────────────
  const dtv = validateDocTypeFields(estimate);
  if (!dtv.valid) {
    return {
      allowed: false,
      requiresOverride: false,
      requiresConfirm: false,
      // Join all doc-type errors into one readable message for the toast caller
      blockedReason: dtv.errors?.join(' · ') || 'Document fields are incomplete',
      pricingValidation: null,
    };
  }

  // ── 3. Pricing validation + RBAC gate ────────────────────────────────────
  const pv = validateEstimatePricing(estimate);
  const role = normalizeUserRole(currentUser?.role);

  const hasIssues = (pv.lossItems?.length > 0) || (pv.zeroProfitItems?.length > 0);

  if (hasIssues) {
    const gate = canSendDocument(role, pv);

    if (!gate.allowed) {
      return {
        allowed: false,
        requiresOverride: false,
        requiresConfirm: false,
        blockedReason: gate.blockedReason,
        pricingValidation: pv,
      };
    }

    if (gate.requiresOverride) {
      return {
        allowed: true,
        requiresOverride: true,
        requiresConfirm: false,
        blockedReason: null,
        pricingValidation: pv,
      };
    }

    if (gate.requiresConfirm) {
      return {
        allowed: true,
        requiresOverride: false,
        requiresConfirm: true,
        blockedReason: null,
        pricingValidation: pv,
      };
    }
  }

  // ── 4. All clear ─────────────────────────────────────────────────────────
  return {
    allowed: true,
    requiresOverride: false,
    requiresConfirm: false,
    blockedReason: null,
    pricingValidation: pv,
  };
}
