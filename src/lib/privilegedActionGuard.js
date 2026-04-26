/**
 * privilegedActionGuard.js
 *
 * Central abstraction for protecting sensitive admin actions.
 * Manages privileged session state, validation, expiry, and lightweight
 * Security Brain advisories before destructive/recovery operations.
 */

import { base44 } from '@/api/base44Client';
import { logSecurityEvent } from '@/lib/securityMonitor';
import securityBrain from '@/brain/modules/securityBrain';

const PRIVILEGED_SESSION_KEY = 'recovery_privileged_session';
const PRIVILEGED_SESSION_EXPIRY_KEY = 'recovery_privileged_session_expiry';

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
    brain_advisory: true,
  },
  PURGE_RECORD: {
    id: 'purge_record',
    label: 'Permanently Delete Record',
    severity: 'critical',
    expiry_minutes: 5,
    requires_confirmation: true,
    confirmation_text: 'I understand the risks',
    brain_advisory: true,
  },
};

export function isPrivilegedSessionValid() {
  try {
    const sessionData = sessionStorage.getItem(PRIVILEGED_SESSION_KEY);
    const expiryStr = sessionStorage.getItem(PRIVILEGED_SESSION_EXPIRY_KEY);
    if (!sessionData || !expiryStr) return false;
    return new Date() < new Date(expiryStr);
  } catch (err) {
    console.error('[privilegedActionGuard] Error checking session validity:', err?.message);
    return false;
  }
}

export function getPrivilegedSessionTimeRemaining() {
  try {
    const expiryStr = sessionStorage.getItem(PRIVILEGED_SESSION_EXPIRY_KEY);
    if (!expiryStr) return 0;
    return Math.max(0, Math.floor((new Date(expiryStr) - new Date()) / 1000));
  } catch (err) {
    return 0;
  }
}

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

export function revokePrivilegedSession(reason = 'manual_revocation') {
  try {
    sessionStorage.removeItem(PRIVILEGED_SESSION_KEY);
    sessionStorage.removeItem(PRIVILEGED_SESSION_EXPIRY_KEY);
    console.log('[privilegedActionGuard] Privileged session revoked:', reason);
  } catch (err) {
    console.error('[privilegedActionGuard] Error revoking session:', err?.message);
  }
}

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

async function runSecurityBrainAdvisory(actionId, userIdentifier = 'unknown') {
  const action = PRIVILEGED_ACTIONS[actionId];
  if (!action?.brain_advisory) return { allowed: true, warning: null };

  try {
    const [securityLogs, auditLogs] = await Promise.all([
      base44.entities.AuthSecurityLog.list('-created_date', 500).catch(() => []),
      base44.entities.AuditLog.list('-performed_at', 500).catch(() => []),
    ]);

    const result = await securityBrain({
      entity: { securityLogs },
      related: { auditLogs },
      context: { page: 'PrivilegedActionGuard', actionId },
    });

    const shouldWarn = result?.level === 'critical' || (actionId === 'PURGE_RECORD' && result?.level === 'warning');
    if (!shouldWarn) return { allowed: true, warning: null, brain: result };

    const message = [
      `Security Brain warning before: ${action.label}`,
      '',
      `Current level: ${result.level}`,
      `Score: ${result.score}`,
      `Recommendation: ${result.decision?.nextAction || 'Review security activity before continuing.'}`,
      '',
      'Continue anyway?',
    ].join('\n');

    const confirmed = typeof window === 'undefined' ? true : window.confirm(message);

    await logSecurityEvent({
      event_type: confirmed ? 'privileged_action_granted' : 'privileged_action_denied',
      success: confirmed,
      user_identifier: userIdentifier,
      reason: confirmed
        ? `Security Brain warning acknowledged for ${action.label}`
        : `Security Brain warning cancelled ${action.label}`,
      metadata_json: {
        action_id: actionId,
        brain_level: result.level,
        brain_score: result.score,
        brain_next_action: result.decision?.nextAction || null,
      },
    });

    return {
      allowed: confirmed,
      warning: result.decision?.nextAction || null,
      brain: result,
      reason: confirmed ? null : 'Cancelled after Security Brain warning',
    };
  } catch (err) {
    console.warn('[privilegedActionGuard] Security Brain advisory unavailable:', err?.message || err);
    return { allowed: true, warning: null, brain: null };
  }
}

export async function requestPrivilegedActionConfirmation(actionId, userIdentifier = 'unknown', additionalContext = {}) {
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

export async function confirmPrivilegedAction(actionId, confirmationInput, userIdentifier = 'unknown', additionalContext = {}) {
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

  if (action.requires_confirmation && confirmationInput?.trim() !== action.confirmation_text) {
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
    return { success: false, message: 'Confirmation text incorrect' };
  }

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

export async function logPrivilegedActionDenied(actionId, reason, userIdentifier = 'unknown', additionalContext = {}) {
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

export async function validatePrivilegedActionExecution(actionId, userIdentifier = 'unknown') {
  const check = canPerformPrivilegedAction(actionId);

  if (!check.allowed) {
    await logPrivilegedActionDenied(actionId, check.reason, userIdentifier, { action_type: 'execution_check' });
    return { allowed: false, reason: check.reason };
  }

  const advisory = await runSecurityBrainAdvisory(actionId, userIdentifier);
  if (!advisory.allowed) {
    return {
      allowed: false,
      reason: advisory.reason || 'Security Brain advisory cancelled this action',
      brain_warning: advisory.warning || null,
    };
  }

  return {
    allowed: true,
    reason: null,
    brain_warning: advisory.warning || null,
  };
}

/**
 * FUTURE: Extension point for real password reauth / OTP.
 * Keep this file as the central privileged-action policy surface.
 */
