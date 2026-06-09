/**
 * securityMonitor.js
 *
 * Centralized security event logging and recovery access session management.
 * Logs sensitive admin operations and maintains privileged recovery sessions.
 */

import { nexartClient } from '@/api/nexartClient';
import { sendSecurityAlertIfNeeded } from '@/lib/securityAlertDispatch';

const RECOVERY_SESSION_KEY = '_recovery_privileged_session';
const RECOVERY_SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const SECURITY_EVENT_BROWSER_EVENT = 'nextruct:security-event';

function dispatchSecurityBrowserEvent(logEntry) {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SECURITY_EVENT_BROWSER_EVENT, {
      detail: {
        ...logEntry,
        emitted_at: new Date().toISOString(),
      },
    }));
  } catch (err) {
    console.warn('[securityMonitor] Failed to dispatch browser security event:', err?.message);
  }
}

/**
 * Log a security event to AuthSecurityLog
 */
export async function logSecurityEvent({
  event_type,
  success,
  user_identifier,
  user_id = null,
  origin_path = typeof window !== 'undefined' ? window.location.pathname : '',
  reason = null,
  metadata_json = null,
}) {
  const logEntry = {
    event_type,
    success,
    user_identifier,
    user_id,
    origin_path,
    reason,
    metadata_json,
  };

  try {
    const created = await nexartClient.entities.AuthSecurityLog.create(logEntry);
    const emittedEntry = { ...logEntry, id: created?.id, created_date: created?.created_date || new Date().toISOString() };

    // Instant in-app notification for same-tab/session listeners.
    dispatchSecurityBrowserEvent(emittedEntry);

    // Attempt to send alert if this is a security-relevant event
    // (async, non-blocking)
    if (event_type && user_identifier) {
      setTimeout(() => {
        sendSecurityAlertIfNeeded(emittedEntry, {
          threshold_info: metadata_json?.actual ? `${metadata_json.actual} attempts in window` : null,
        }).catch(err => {
          console.error('[securityMonitor] Alert dispatch error:', err?.message);
        });
      }, 0); // Non-blocking async
    }
  } catch (err) {
    console.error('[securityMonitor] Failed to log security event:', err?.message);
    // Do not throw — logging failure should not block the user
  }
}

/**
 * Check for suspicious repeated failed attempts within a time window
 * Returns true if threshold exceeded (3+ failures in last 5 minutes)
 */
export async function checkSuspiciousAttempts({
  event_type = 'recovery_access_attempt',
  user_identifier,
  threshold = 3,
  windowMinutes = 5,
}) {
  try {
    const now = new Date();
    const windowStart = new Date(now - windowMinutes * 60 * 1000);

    const recentAttempts = await nexartClient.entities.AuthSecurityLog.filter({
      event_type,
      success: false,
      user_identifier,
    });

    const failedInWindow = recentAttempts.filter(log => {
      const logDate = new Date(log.created_date);
      return logDate >= windowStart && logDate <= now;
    });

    if (failedInWindow.length >= threshold) {
      await logSecurityEvent({
        event_type: 'suspicious_activity_detected',
        success: false,
        user_identifier,
        reason: `${failedInWindow.length} failed recovery access attempts in ${windowMinutes}m window`,
        metadata_json: { threshold, actual: failedInWindow.length, windowMinutes },
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error('[securityMonitor] checkSuspiciousAttempts error:', err?.message);
    return false;
  }
}

/**
 * Grant a temporary privileged recovery access session
 */
export function grantRecoveryAccessSession() {
  const session = {
    grantedAt: Date.now(),
    expiresAt: Date.now() + RECOVERY_SESSION_TIMEOUT_MS,
    nonce: Math.random().toString(36).substr(2, 9),
  };
  sessionStorage.setItem(RECOVERY_SESSION_KEY, JSON.stringify(session));
}

/**
 * Check if user has a valid recovery access session
 */
export function hasValidRecoveryAccessSession() {
  try {
    const stored = sessionStorage.getItem(RECOVERY_SESSION_KEY);
    if (!stored) return false;

    const session = JSON.parse(stored);
    const now = Date.now();

    if (now > session.expiresAt) {
      sessionStorage.removeItem(RECOVERY_SESSION_KEY);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[securityMonitor] Session parsing error:', err?.message);
    return false;
  }
}

/**
 * Clear recovery access session
 */
export function clearRecoveryAccessSession() {
  sessionStorage.removeItem(RECOVERY_SESSION_KEY);
}

/**
 * Get remaining time in recovery session (ms), or -1 if invalid/expired
 */
export function getRecoverySessionTimeRemaining() {
  try {
    const stored = sessionStorage.getItem(RECOVERY_SESSION_KEY);
    if (!stored) return -1;

    const session = JSON.parse(stored);
    const remaining = session.expiresAt - Date.now();

    if (remaining <= 0) {
      sessionStorage.removeItem(RECOVERY_SESSION_KEY);
      return -1;
    }

    return remaining;
  } catch (err) {
    return -1;
  }
}

/**
 * Get recent failed attempts for a user in the last N hours
 */
export async function getFailedAttemptsInHours({
  user_identifier,
  event_type = 'recovery_access_attempt',
  hours = 24,
}) {
  try {
    const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000);

    const attempts = await nexartClient.entities.AuthSecurityLog.filter({
      event_type,
      success: false,
      user_identifier,
    });

    return attempts.filter(log => new Date(log.created_date) >= windowStart);
  } catch (err) {
    console.error('[securityMonitor] getFailedAttemptsInHours error:', err?.message);
    return [];
  }
}

/**
 * Get security events by type in the last N hours
 */
export async function getSecurityEventsByType({
  event_type,
  hours = 24,
}) {
  try {
    const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000);

    const events = await nexartClient.entities.AuthSecurityLog.filter({
      event_type,
    });

    return events.filter(log => new Date(log.created_date) >= windowStart);
  } catch (err) {
    console.error('[securityMonitor] getSecurityEventsByType error:', err?.message);
    return [];
  }
}
