import { createCheck, CheckSeverity, CheckStatus, CheckType } from '@/brain/core/brainTypes';
import { aggregateBrainResults } from '@/brain/core/brainAggregator';

const CRITICAL_EVENT_TYPES = new Set([
  'recovery_purge_attempt',
  'suspicious_activity_detected',
]);

const WARNING_EVENT_TYPES = new Set([
  'recovery_access_denied',
  'privileged_action_denied',
  'invalid_login_attempt',
  'recovery_restore_attempt',
]);

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function countBy(rows = [], keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

function inWindow(rows = [], dateField, since) {
  return rows.filter(row => {
    const raw = row?.[dateField];
    if (!raw) return false;
    const date = new Date(raw);
    return !Number.isNaN(date.getTime()) && date >= since;
  });
}

export default async function securityBrain({ entity = {}, related = {}, context = {} } = {}) {
  const securityLogs = Array.isArray(entity.securityLogs) ? entity.securityLogs : [];
  const auditLogs = Array.isArray(related.auditLogs) ? related.auditLogs : [];

  const last24h = inWindow(securityLogs, 'created_date', hoursAgo(24));
  const last7d = inWindow(securityLogs, 'created_date', hoursAgo(24 * 7));
  const audit24h = inWindow(auditLogs, 'performed_at', hoursAgo(24));
  const audit7d = inWindow(auditLogs, 'performed_at', hoursAgo(24 * 7));

  const failed24h = last24h.filter(e => e.success === false);
  const critical24h = last24h.filter(e => CRITICAL_EVENT_TYPES.has(e.event_type));
  const warning24h = last24h.filter(e => WARNING_EVENT_TYPES.has(e.event_type));
  const purge24h = audit24h.filter(e => e.action === 'purge');
  const restore24h = audit24h.filter(e => e.action === 'restore');
  const purge7d = audit7d.filter(e => e.action === 'purge');

  const checks = [];

  checks.push(createCheck({
    id: 'security_logs_available',
    label: 'Security logs available',
    type: CheckType.HEALTH,
    status: securityLogs.length > 0 ? CheckStatus.PASS : CheckStatus.INFO,
    severity: CheckSeverity.LOW,
    message: securityLogs.length > 0
      ? `${securityLogs.length} security event(s) available for analysis.`
      : 'No security events available yet.',
    action: securityLogs.length > 0 ? '' : 'Security brain will become more useful after events are logged.',
    source: 'securityBrain',
    meta: { count: securityLogs.length },
  }));

  checks.push(createCheck({
    id: 'critical_events_24h',
    label: 'Critical events in last 24h',
    type: CheckType.INTELLIGENCE,
    status: critical24h.length === 0 ? CheckStatus.PASS : CheckStatus.FAIL,
    severity: CheckSeverity.CRITICAL,
    message: critical24h.length === 0
      ? 'No critical security events detected in the last 24 hours.'
      : `${critical24h.length} critical security event(s) detected in the last 24 hours.`,
    action: critical24h.length === 0 ? '' : 'Review critical event details and confirm whether they were expected admin actions.',
    source: 'securityBrain',
    meta: { count: critical24h.length },
  }));

  checks.push(createCheck({
    id: 'failed_events_24h',
    label: 'Failed security events in last 24h',
    type: CheckType.INTELLIGENCE,
    status: failed24h.length >= 5 ? CheckStatus.FAIL : failed24h.length >= 2 ? CheckStatus.WARN : CheckStatus.PASS,
    severity: failed24h.length >= 5 ? CheckSeverity.HIGH : CheckSeverity.MEDIUM,
    message: failed24h.length === 0
      ? 'No failed security events detected in the last 24 hours.'
      : `${failed24h.length} failed security event(s) detected in the last 24 hours.`,
    action: failed24h.length >= 2 ? 'Review denied/failed attempts and confirm they came from expected users.' : '',
    source: 'securityBrain',
    meta: { count: failed24h.length },
  }));

  const failuresByUser = countBy(failed24h, e => e.user_identifier || e.user_id || 'unknown');
  const topFailedUser = topEntry(failuresByUser);
  checks.push(createCheck({
    id: 'repeated_failed_user_24h',
    label: 'Repeated failed attempts by user',
    type: CheckType.INTELLIGENCE,
    status: topFailedUser && topFailedUser[1] >= 3 ? CheckStatus.WARN : CheckStatus.PASS,
    severity: CheckSeverity.HIGH,
    message: topFailedUser && topFailedUser[1] >= 3
      ? `${topFailedUser[0]} has ${topFailedUser[1]} failed security event(s) in the last 24 hours.`
      : 'No repeated failed-attempt pattern detected by user.',
    action: topFailedUser && topFailedUser[1] >= 3 ? 'Contact the user or review access history before granting sensitive access.' : '',
    source: 'securityBrain',
    meta: topFailedUser ? { user: topFailedUser[0], count: topFailedUser[1] } : {},
  }));

  checks.push(createCheck({
    id: 'purge_activity_24h',
    label: 'Permanent delete activity',
    type: CheckType.GUARD,
    status: purge24h.length > 0 ? CheckStatus.WARN : CheckStatus.PASS,
    severity: purge24h.length >= 2 ? CheckSeverity.CRITICAL : CheckSeverity.HIGH,
    message: purge24h.length === 0
      ? 'No permanent delete activity detected in the last 24 hours.'
      : `${purge24h.length} permanent delete action(s) detected in the last 24 hours.`,
    action: purge24h.length > 0 ? 'Verify each purge was intentional and has a valid audit reason.' : '',
    source: 'securityBrain',
    meta: { purge24h: purge24h.length, purge7d: purge7d.length },
  }));

  checks.push(createCheck({
    id: 'restore_activity_24h',
    label: 'Restore activity',
    type: CheckType.INTELLIGENCE,
    status: restore24h.length >= 5 ? CheckStatus.WARN : CheckStatus.PASS,
    severity: CheckSeverity.MEDIUM,
    message: restore24h.length === 0
      ? 'No restore spike detected in the last 24 hours.'
      : `${restore24h.length} restore action(s) detected in the last 24 hours.`,
    action: restore24h.length >= 5 ? 'Review whether restores are part of a cleanup/recovery operation.' : '',
    source: 'securityBrain',
    meta: { count: restore24h.length },
  }));

  checks.push(createCheck({
    id: 'warning_events_24h',
    label: 'Warning events in last 24h',
    type: CheckType.INTELLIGENCE,
    status: warning24h.length >= 5 ? CheckStatus.WARN : CheckStatus.PASS,
    severity: CheckSeverity.MEDIUM,
    message: warning24h.length === 0
      ? 'No warning-level security pattern detected in the last 24 hours.'
      : `${warning24h.length} warning-level event(s) detected in the last 24 hours.`,
    action: warning24h.length >= 5 ? 'Review event types and users for access friction or abuse patterns.' : '',
    source: 'securityBrain',
    meta: { count: warning24h.length },
  }));

  const result = aggregateBrainResults([{ checks }], {
    module: 'security',
    page: context.page || 'SecurityDashboard',
    entityId: 'security-dashboard',
    dependencies: {
      authSecurityLog: {
        ready: securityLogs.length > 0,
        reason: securityLogs.length > 0 ? '' : 'No AuthSecurityLog entries loaded.',
        checks: { count: securityLogs.length },
      },
      auditLog: {
        ready: auditLogs.length > 0,
        reason: auditLogs.length > 0 ? '' : 'No AuditLog entries loaded.',
        checks: { count: auditLogs.length },
      },
    },
    meta: {
      analyzedAt: new Date().toISOString(),
      securityLogCount: securityLogs.length,
      auditLogCount: auditLogs.length,
      last24hCount: last24h.length,
      last7dCount: last7d.length,
    },
  });

  const suggestions = [];
  if (critical24h.length > 0) suggestions.push('Review critical security events before performing more recovery operations.');
  if (failed24h.length >= 2) suggestions.push('Investigate repeated failed access attempts.');
  if (purge24h.length > 0) suggestions.push('Confirm permanent deletes have valid audit reasons.');
  if (topFailedUser && topFailedUser[1] >= 3) suggestions.push(`Review access activity for ${topFailedUser[0]}.`);

  return {
    ...result,
    suggestions,
    decision: {
      ...result.decision,
      suggestedActions: [...(result.decision?.suggestedActions || []), ...suggestions],
    },
  };
}
