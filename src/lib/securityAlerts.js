/**
 * securityAlerts.js
 *
 * Helpers for displaying security alerts and warnings in admin panels.
 */

import { nexartClient } from '@/api/nexartClient';

/**
 * Check if there are recent suspicious security events
 * Returns { hasSuspicious, lastEvent, count }
 */
export async function getRecentSuspiciousActivity({
  hours = 24,
} = {}) {
  try {
    const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000);

    const suspicious = await nexartClient.entities.AuthSecurityLog.filter({
      event_type: 'suspicious_activity_detected',
    });

    const recentSuspicious = suspicious.filter(
      e => new Date(e.created_date) >= windowStart
    ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return {
      hasSuspicious: recentSuspicious.length > 0,
      lastEvent: recentSuspicious[0] || null,
      count: recentSuspicious.length,
      events: recentSuspicious,
    };
  } catch (err) {
    console.error('[securityAlerts] getRecentSuspiciousActivity error:', err?.message);
    return { hasSuspicious: false, lastEvent: null, count: 0, events: [] };
  }
}

/**
 * Check for critical alerts:
 * - Multiple failed recovery access attempts
 * - Repeated denied access within short window
 * - Suspicious activity flags
 */
export async function getCriticalSecurityAlerts() {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    // Get all events in last 24h
    const allRecent = await nexartClient.entities.AuthSecurityLog.list('-created_date');
    const recent = allRecent.filter(e => new Date(e.created_date) >= last24h);

    const alerts = [];

    // Check for multiple failed recovery attempts
    const recoveryDenied = recent.filter(
      e => e.event_type === 'recovery_access_denied'
    );
    if (recoveryDenied.length >= 2) {
      alerts.push({
        severity: 'high',
        type: 'recovery_access_threshold',
        message: `${recoveryDenied.length} recovery access attempts denied in last 24h`,
        count: recoveryDenied.length,
      });
    }

    // Check for suspicious activity
    const suspicious = recent.filter(
      e => e.event_type === 'suspicious_activity_detected'
    );
    if (suspicious.length > 0) {
      alerts.push({
        severity: 'critical',
        type: 'suspicious_activity',
        message: `${suspicious.length} suspicious activity event(s) detected`,
        count: suspicious.length,
        lastEvent: suspicious[0],
      });
    }

    // Check for session expirations (high volume = sign of possible breach attempts)
    const sessionExpired = recent.filter(
      e => e.event_type === 'recovery_session_expired'
    );
    if (sessionExpired.length >= 3) {
      alerts.push({
        severity: 'medium',
        type: 'session_expiration_spike',
        message: `${sessionExpired.length} privileged sessions expired (possible timeout spikes)`,
        count: sessionExpired.length,
      });
    }

    return alerts;
  } catch (err) {
    console.error('[securityAlerts] getCriticalSecurityAlerts error:', err?.message);
    return [];
  }
}