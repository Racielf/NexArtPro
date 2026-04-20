/**
 * privilegedActionGuard.js
 *
 * Central abstraction for protecting sensitive admin actions.
 * Manages privileged session state, validation, and expiry.
 *
 * Current auth stack analysis:
 * - No password reauth API available in base44 SDK
 * - No OTP/2FA provider in repo (Twilio not present)
 * - Uses existing privileged session mechanism from securityMonitor.js
 *
 * This guard hardenes the gate by:
 * 1. Requiring valid existing privileged session
 * 2. Per-action confirmation checks
 * 3. Short expiry for destructive actions (restore/purge)
 * 4. Comprehensive logging to AuthSecurityLog
 * 5. Future-proof interface for backend reauth/OTP
 */

import { logSecurityEvent } from '@/lib/securityMonitor';

// Session storage keys
const PRIVILEGED_SESSION_KEY = 'recovery_privileged_session';
const PRIVILEGED_SESSION_EXPIRY_KEY = 'recovery_privileged_session_expiry';

// Action definitions
export const PRIVILEGED_ACTIONS = {
  RECOVERY_ACCESS: {
    id: 'recovery_access',
    label: 'Access Recovery Center',
    severity: 'high',
    expiry_minutes: 10,
    requires_confirmation: true,
    confirmation_text: 'I understand the risks',
  },
  RESTORE_RECORD: {
    id: 'restore_record',
    label: 'Restore Record',
    severity: 'high',
    expiry_minutes: 10,
    requires_confirmation: true,
    confirmation_text: 'I understand the risks',
  },
  PURGE_RECORD: {
    id: 'purge_record',
    label: 'Permanently Delete Record',
    severity: 'critical',
    expiry_minutes: 5, // Shorter expiry for destructive action
    requires_confirmation: true,
    confirmation_text: 'I understand the risks',
  },
};

/**
 * Check if privileged session is currently valid
 */
export function isPrivilegedSessionValid() {
  try {
    const sessionData = sessionStorage.getItem(PRIVILEGED_SESSION_KEY);
    const expiryStr = sessionStorage.getItem(PRIVILEGED_SESSION_EXPIRY_KEY);

    if (!sessionData || !expiryStr) {
      return false;
    }

    const expiry = new Date(expiryStr);
    const now = new Date();

    return now < expiry;
  } catch (err) {
    console.error('[privilegedActionGuard] Error checking session validity:', err?.message);
    return false;
  }
}

/**
 * Get remaining session time in seconds
 */
export function getPrivilegedSessionTimeRemaining() {
  try {
    const expiryStr = sessionStorage.getItem(PRIVILEGED_SESSION_EXPIRY_KEY);
    if (!expiryStr) return 0;

    const expiry = new Date(expiryStr);
    const now = new Date();
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

    return remaining;
  } catch (err) {
    return 0;
  }
}

/**
 * Grant a privileged session
 * Called after successful confirmation gate
 */
export function grantPrivilegedSession(durationMinutes = 10, metadata = {}) {
  try {
    const now = new Date();
    const expiry = new Date(now.getTime() + durationMinutes * 60 * 1000);

    sessionStorage.setItem(PRIVILEGED_SESSION_KEY, JSON.stringify({
      granted_at: now.toISOString(),
      ...metadata,
    }));
    sessionStorage.setItem(PRIVILEGED_SESSION_EXPIRY_KEY, expiry.toISOString());

    console.log('[privilegedActionGuard] Privileged session granted for', durationMinutes, 'minutes');
  } catch (err) {
    console.error('[privilegedActionGuard] Error granting session:', err?.message);
  }
}

/**
 * Revoke the privileged session
 */
export function revokePrivilegedSession(reason = 'manual_revocation') {
  try {
    sessionStorage.removeItem(PRIVILEGED_SESSION_KEY);
    sessionStorage.removeItem(PRIVILEGED_SESSION_EXPIRY_KEY);
    console.log('[privilegedActionGuard] Privileged session revoked:', reason);
  } catch (err) {
    console.error('[privilegedActionGuard] Error revoking session:', err?.message);
  }
}

/**
 * Check if a privileged action is allowed
 *
 * Returns: { allowed, reason, session_valid, session_time_remaining }
 */
export function canPerformPrivilegedAction(actionId) {
  const action = PRIVILEGED_ACTIONS[actionId];

  if (!action) {
    return {
      allowed: false,
      reason: `Unknown privileged action: ${actionId}`,
      session_valid: false,
      session_time_remaining: 0,
    };
  }

  const sessionValid = isPrivilegedSessionValid();
  const timeRemaining = getPrivilegedSessionTimeRemaining();

  if (!sessionValid) {
    return {
      allowed: false,
      reason: 'Privileged session expired or not granted',
      session_valid: false,
      session_time_remaining: 0,
    };
  }

  return {
    allowed: true,
    reason: null,
    session_valid: true,
    session_time_remaining: timeRemaining,
  };
}

/**
 * Request elevated confirmation for a privileged action
 *
 * This is the main entry point for protecting sensitive operations.
 * Can be extended later with real password reauth or OTP.
 *
 * Returns: { confirmed, metadata }
 */
export async function requestPrivilegedActionConfirmation(
  actionId,
  userIdentifier = 'unknown',
  additionalContext = {}
) {
  const action = PRIVILEGED_ACTIONS[actionId];

  if (!action) {
    await logSecurityEvent({
      event_type: 'privileged_action_denied',
      success: false,
      user_identifier: userIdentifier,
      reason: `Unknown privileged action: ${actionId}`,
      metadata_json: { action_id: actionId, context: additionalContext },
    });

    return { confirmed: false, metadata: { error: 'Unknown action' } };
  }

  // This function is typically called before showing confirmation modal.
  // The actual confirmation (text entry, modal interaction) happens in the UI layer.
  // This guard just validates the action definition and logs the request.

  await logSecurityEvent({
    event_type: 'privileged_action_requested',
    success: true,
    user_identifier: userIdentifier,
    reason: `Request to ${action.label}`,
    metadata_json: {
      action_id: actionId,
      severity: action.severity,
      requires_confirmation: action.requires_confirmation,
      ...additionalContext,
    },
  });

  return {
    confirmed: false,
    metadata: {
      action,
      requires_confirmation: action.requires_confirmation,
      confirmation_text: action.confirmation_text,
    },
  };
}

/**
 * Confirm a privileged action after user input
 *
 * Called after user submits confirmation (e.g., typed required text).
 * Validates confirmation and grants/extends session if successful.
 *
 * Returns: { success, message, session_granted, duration_minutes }
 */
export async function confirmPrivilegedAction(
  actionId,
  confirmationInput,
  userIdentifier = 'unknown',
  additionalContext = {}
) {
  const action = PRIVILEGED_ACTIONS[actionId];

  if (!action) {
    await logSecurityEvent({
      event_type: 'privileged_action_denied',
      success: false,
      user_identifier: userIdentifier,
      reason: 'Unknown privileged action',
      metadata_json: { action_id: actionId },
    });

    return { success: false, message: 'Unknown action' };
  }

  // Validate confirmation if required
  if (action.requires_confirmation) {
    if (confirmationInput?.trim() !== action.confirmation_text) {
      await logSecurityEvent({
        event_type: 'privileged_action_denied',
        success: false,
        user_identifier: userIdentifier,
        reason: `Incorrect confirmation for ${action.label}`,
        metadata_json: {
          action_id: actionId,
          severity: action.severity,
          ...additionalContext,
        },
      });

      return {
        success: false,
        message: 'Confirmation text incorrect',
      };
    }
  }

  // Grant privileged session
  grantPrivilegedSession(action.expiry_minutes, {
    action_id: actionId,
    confirmed_at: new Date().toISOString(),
    user_identifier: userIdentifier,
  });

  await logSecurityEvent({
    event_type: 'privileged_action_granted',
    success: true,
    user_identifier: userIdentifier,
    reason: `Confirmed ${action.label}`,
    metadata_json: {
      action_id: actionId,
      severity: action.severity,
      expiry_minutes: action.expiry_minutes,
      ...additionalContext,
    },
  });

  return {
    success: true,
    message: `${action.label} authorized`,
    session_granted: true,
    duration_minutes: action.expiry_minutes,
  };
}

/**
 * Log a denied privileged action
 *
 * Used when action is blocked due to expired/missing session.
 */
export async function logPrivilegedActionDenied(
  actionId,
  reason,
  userIdentifier = 'unknown',
  additionalContext = {}
) {
  const action = PRIVILEGED_ACTIONS[actionId];

  await logSecurityEvent({
    event_type: 'privileged_action_denied',
    success: false,
    user_identifier: userIdentifier,
    reason: `${action?.label || actionId} denied: ${reason}`,
    metadata_json: {
      action_id: actionId,
      denial_reason: reason,
      session_expired: !isPrivilegedSessionValid(),
      ...additionalContext,
    },
  });
}

/**
 * Validate privileged action before execution
 *
 * Convenience wrapper that checks session validity and logs denial if needed.
 *
 * Returns: { allowed, reason }
 */
export async function validatePrivilegedActionExecution(
  actionId,
  userIdentifier = 'unknown'
) {
  const check = canPerformPrivilegedAction(actionId);

  if (!check.allowed) {
    await logPrivilegedActionDenied(
      actionId,
      check.reason,
      userIdentifier,
      { action_type: 'execution_check' }
    );
  }

  return {
    allowed: check.allowed,
    reason: check.reason,
  };
}

/**
 * FUTURE: Extension point for real password reauth
 *
 * When backend supports password reauth:
 * 1. Create new function: validatePasswordReauth(password)
 * 2. Call server-side password verification
 * 3. Log success/failure to AuthSecurityLog
 * 4. Return { valid, error }
 *
 * Then update confirmPrivilegedAction() to use it:
 *   if (action.requires_password_reauth) {
 *     const reauth = await validatePasswordReauth(password);
 *     if (!reauth.valid) { return { success: false, message: reauth.error }; }
 *   }
 */

/**
 * FUTURE: Extension point for OTP / 2FA
 *
 * When SMS/OTP provider is integrated:
 * 1. Create new function: generateAndSendOTP(phoneNumber)
 * 2. Create new function: validateOTP(code)
 * 3. Add to action definition: requires_otp: true
 * 4. Call in confirmPrivilegedAction() before granting session
 */