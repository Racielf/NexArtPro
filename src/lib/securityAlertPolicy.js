/**
 * securityAlertPolicy.js
 *
 * Simple alert policy thresholds for security events.
 * Defines when and how security events trigger email/SMS notifications.
 */

export const ALERT_POLICY = {
  // Recovery access denied threshold
  // Alert if 3+ denials in 5 min window
  recovery_access_denied: {
    enabled: true,
    threshold: 3,
    windowMinutes: 5,
    severity: 'CRITICAL',
    channels: ['email'],
    description: 'Multiple recovery center access denials',
  },

  // Suspicious activity always alerts
  suspicious_activity_detected: {
    enabled: true,
    threshold: 1,
    windowMinutes: 0, // Alert immediately
    severity: 'CRITICAL',
    channels: ['email'],
    description: 'Suspicious activity pattern detected',
  },

  // Recovery session expired - alert if 5+ in 30 min
  recovery_session_expired: {
    enabled: true,
    threshold: 5,
    windowMinutes: 30,
    severity: 'HIGH',
    channels: ['email'],
    description: 'Multiple recovery sessions expired',
  },

  // Recovery restore denied - alert if 3+ in 10 min
  recovery_restore_attempt_failed: {
    enabled: true,
    threshold: 3,
    windowMinutes: 10,
    severity: 'HIGH',
    channels: ['email'],
    description: 'Multiple failed restore attempts',
  },

  // Recovery purge denied - alert if 2+ in 10 min
  recovery_purge_attempt_failed: {
    enabled: true,
    threshold: 2,
    windowMinutes: 10,
    severity: 'CRITICAL',
    channels: ['email'],
    description: 'Multiple failed purge attempts',
  },
};

/**
 * Get alert policy for a given event type
 */
export function getAlertPolicy(event_type) {
  return ALERT_POLICY[event_type] || null;
}

/**
 * Check if an event type should ever trigger alerts
 */
export function isAlertableEventType(event_type) {
  const policy = getAlertPolicy(event_type);
  return policy?.enabled === true;
}

/**
 * Build alert metadata for a given event type + context
 */
export function buildAlertMetadata(event_type, context = {}) {
  const policy = getAlertPolicy(event_type);
  if (!policy) return null;

  return {
    event_type,
    policy_name: event_type,
    severity: policy.severity,
    channels: policy.channels,
    threshold: policy.threshold,
    window_minutes: policy.windowMinutes,
    description: policy.description,
    triggered_at: new Date().toISOString(),
    context, // Additional context from the triggering code
  };
}

/**
 * Alert throttle key - used to prevent spam for same incident
 * Groups alerts by (event_type, user_identifier) in a time window
 */
export function getAlertThrottleKey(event_type, user_identifier = 'system') {
  return `alert:${event_type}:${user_identifier}`;
}

/**
 * Default admin/owner email for alerts
 * Currently uses app config, but can be extended to look up user/settings
 */
export function getAlertDestinationEmail() {
  // TODO: In production, look up from Settings/AppConfig entity
  // For now, use company email from appConfig
  return 'admin@rcartconstruction.com';
}