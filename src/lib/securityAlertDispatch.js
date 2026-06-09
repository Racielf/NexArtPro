/**
 * securityAlertDispatch.js
 *
 * Centralized security alert dispatch logic.
 * Decides whether to send alerts, deduplicates, formats payloads.
 * Integrates with real email channels (Resend).
 *
 * No UI/React imports — pure logic layer.
 */

import { nexartClient } from '@/api/nexartClient';
import { ALERT_POLICY, getAlertPolicy, buildAlertMetadata, getAlertThrottleKey, getAlertDestinationEmail } from '@/lib/securityAlertPolicy';

// Local throttle cache (in-memory, survives page refresh in same session)
const THROTTLE_CACHE = new Map();
const THROTTLE_WINDOW_MS = 15 * 60 * 1000; // 15 min debounce for same incident

/**
 * Check if we should send an alert for this event
 * Returns { should_alert: bool, reason: string }
 */
export async function shouldSendSecurityAlert(event, context = {}) {
  const { event_type, user_identifier = 'system' } = event;
  const policy = getAlertPolicy(event_type);

  // Event type not in policy = no alert
  if (!policy || !policy.enabled) {
    return { should_alert: false, reason: 'event_type_not_alertable' };
  }

  // Check local throttle cache (same-incident dedup)
  const throttleKey = getAlertThrottleKey(event_type, user_identifier);
  const lastAlertTime = THROTTLE_CACHE.get(throttleKey);
  const now = Date.now();

  if (lastAlertTime && now - lastAlertTime < THROTTLE_WINDOW_MS) {
    return { should_alert: false, reason: 'throttled_recent_alert' };
  }

  // Check threshold: count recent matching events
  // If threshold is 1, alert immediately
  if (policy.threshold === 1) {
    return { should_alert: true, reason: 'immediate_alert_policy' };
  }

  // Otherwise, count events in time window and check threshold
  const count = await countRecentSecurityEvents({
    event_type,
    user_identifier,
    windowMinutes: policy.windowMinutes,
  });

  if (count >= policy.threshold) {
    return { should_alert: true, reason: `threshold_${policy.threshold}_reached` };
  }

  return { should_alert: false, reason: 'threshold_not_reached' };
}

/**
 * Count recent security events matching criteria
 */
async function countRecentSecurityEvents({
  event_type,
  user_identifier,
  windowMinutes = 5,
}) {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const events = await nexartClient.entities.AuthSecurityLog.filter({
      event_type,
      user_identifier,
    });

    return events.filter(e => new Date(e.created_date) >= windowStart).length;
  } catch (err) {
    console.error('[securityAlertDispatch] countRecentSecurityEvents error:', err?.message);
    return 0;
  }
}

/**
 * Build email alert payload from a security event
 */
export function buildSecurityAlertEmailPayload(event, context = {}) {
  const policy = getAlertPolicy(event.event_type);
  const destEmail = getAlertDestinationEmail();

  const subject = `[ALERT] ${policy?.severity || 'INFO'}: ${policy?.description || event.event_type}`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="background: ${getSeverityColor(policy?.severity)}; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: white; margin: 0; font-size: 18px;">Security Alert: ${policy?.description || event.event_type}</h2>
      </div>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 12px 0; color: #6b7280;"><strong>Event Type:</strong> ${event.event_type}</p>
        <p style="margin: 0 0 12px 0; color: #6b7280;"><strong>Severity:</strong> <span style="color: ${getSeverityTextColor(policy?.severity)}; font-weight: bold;">${policy?.severity || 'UNKNOWN'}</span></p>
        <p style="margin: 0 0 12px 0; color: #6b7280;"><strong>Time:</strong> ${new Date(event.created_date || Date.now()).toLocaleString()}</p>
        ${event.user_identifier ? `<p style="margin: 0 0 12px 0; color: #6b7280;"><strong>User:</strong> ${event.user_identifier}</p>` : ''}
        ${event.origin_path ? `<p style="margin: 0 0 12px 0; color: #6b7280;"><strong>Path:</strong> ${event.origin_path}</p>` : ''}
        ${event.reason ? `<p style="margin: 0 0 0 0; color: #6b7280;"><strong>Reason:</strong> ${event.reason}</p>` : ''}
      </div>

      ${context.threshold_info ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <p style="margin: 0; color: #991b1b; font-size: 13px;"><strong>⚠️ Threshold Alert:</strong> ${context.threshold_info}</p>
      </div>
      ` : ''}

      <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 12px; margin-bottom: 20px;">
        <p style="margin: 0; color: #0c4a6e; font-size: 13px;">
          <strong>Action:</strong> Review the Recovery Center or Security Log in your admin Settings for full incident history.
        </p>
      </div>

      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This is an automated security alert from your ProEstimate system.
      </p>
    </div>
  `;

  return {
    to: destEmail,
    subject,
    html,
    from_name: 'ProEstimate Security',
    event_type: event.event_type,
    severity: policy?.severity,
    user_identifier: event.user_identifier,
  };
}

/**
 * Send security alert via email
 * Uses Base44 functions to invoke backend email service
 */
export async function sendSecurityAlertEmail(payload) {
  try {
    // Use Core.SendEmail integration or invoke backend function
    // For now, use the built-in Core.SendEmail
    const result = await nexartClient.integrations.Core.SendEmail({
      to: payload.to,
      subject: payload.subject,
      body: payload.html,
      from_name: payload.from_name || 'ProEstimate Security',
    });

    // Log successful alert
    console.log('[securityAlertDispatch] Alert sent to', payload.to);
    return { success: true, message_id: result?.id };
  } catch (err) {
    console.error('[securityAlertDispatch] Failed to send alert email:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Main dispatch function — decide, format, and send alerts
 *
 * Usage:
 *   await sendSecurityAlertIfNeeded(event, context)
 */
export async function sendSecurityAlertIfNeeded(event, context = {}) {
  const { should_alert, reason } = await shouldSendSecurityAlert(event, context);

  if (!should_alert) {
    console.log('[securityAlertDispatch] No alert needed:', reason, event.event_type);
    return { sent: false, reason };
  }

  // Update throttle cache
  const throttleKey = getAlertThrottleKey(event.event_type, event.user_identifier);
  THROTTLE_CACHE.set(throttleKey, Date.now());

  // Build payload
  const emailPayload = buildSecurityAlertEmailPayload(event, context);

  // Send email
  const result = await sendSecurityAlertEmail(emailPayload);

  // Update original AuthSecurityLog entry with alert metadata (non-blocking)
  if (event.id) {
    setTimeout(() => {
      updateSecurityEventWithAlertMetadata(event.id, result).catch(err => {
        console.error('[securityAlertDispatch] Failed to update alert metadata:', err?.message);
      });
    }, 0);
  }

  // Log attempt (if needed for audit)
  if (result.success) {
    console.log('[securityAlertDispatch] Alert sent successfully:', event.event_type);
    return { sent: true, channel: 'email', message_id: result.message_id };
  } else {
    console.error('[securityAlertDispatch] Alert send failed:', result.error);
    return { sent: false, error: result.error };
  }
}

/**
 * Update AuthSecurityLog entry with alert delivery metadata
 */
async function updateSecurityEventWithAlertMetadata(eventId, dispatchResult) {
  try {
    const metadata = {
      alert_sent: dispatchResult.success === true,
      alert_channel: 'email',
      alert_timestamp: new Date().toISOString(),
      alert_message_id: dispatchResult.message_id,
      alert_error: dispatchResult.error,
    };

    await nexartClient.entities.AuthSecurityLog.update(eventId, {
      metadata_json: metadata,
    });
  } catch (err) {
    console.error('[securityAlertDispatch] Failed to update metadata:', err?.message);
    // Silent fail — don't block alert flow
  }
}

/**
 * Get color for severity badge
 */
function getSeverityColor(severity) {
  switch (severity) {
    case 'CRITICAL':
      return '#dc2626'; // red
    case 'HIGH':
      return '#ea580c'; // orange
    case 'MEDIUM':
      return '#d97706'; // amber
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Get text color for severity
 */
function getSeverityTextColor(severity) {
  switch (severity) {
    case 'CRITICAL':
      return '#991b1b';
    case 'HIGH':
      return '#92400e';
    case 'MEDIUM':
      return '#78350f';
    default:
      return '#374151';
  }
}