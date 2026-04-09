/**
 * estimateAuditLog.js — Centralized audit logging for estimate changes
 * 
 * Logs user actions (price changes, approvals, sends) to EstimateVersionHistory
 * as an audit trail. Only logs on explicit user actions, never from useEffect.
 * 
 * Avoids duplicates by checking if old_value !== new_value before logging.
 */
import { base44 } from '@/api/base44Client';
import { normalizeUserRole } from '@/lib/utils';

/**
 * logChange — Log a single field change to audit trail
 * 
 * @param {Object} params
 *   - estimate_id: string
 *   - estimate_number: number
 *   - user: { email, full_name, role } (current user)
 *   - action: string ('price_change', 'cost_change', 'approval', 'send', 'margin_override')
 *   - field: string (e.g., 'unit_price', 'unit_cost', 'status')
 *   - old_value: any
 *   - new_value: any
 *   - metadata: optional object for extra context
 * 
 * Returns: Promise<void> — non-blocking, logs failures silently
 */
export async function logChange({
  estimate_id,
  estimate_number,
  user,
  action,
  field,
  old_value,
  new_value,
  metadata = {},
}) {
  // Skip logging if values haven't actually changed (avoid duplicates)
  if (old_value === new_value || String(old_value) === String(new_value)) {
    return;
  }

  try {
    const userName = user?.full_name || user?.email || 'Unknown';
    const userRole = normalizeUserRole(user?.role);

    // Build change note
    const changeNote = [
      `[${action.toUpperCase()}]`,
      `field: ${field}`,
      `old: ${formatValue(old_value)}`,
      `new: ${formatValue(new_value)}`,
      `user: ${userName} (${userRole})`,
      `ts: ${new Date().toISOString()}`,
      metadata.note ? `note: ${metadata.note}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    // Log to EstimateVersionHistory (audit trail)
    await base44.asServiceRole.entities.EstimateVersionHistory.create({
      estimate_id,
      estimate_number,
      version: 0, // audit-only entry, not a versioning event
      archived_reason: 'audit_log',
      changes_note: changeNote,
      archived_by: userName,
      snapshot: {
        action,
        field,
        old_value: formatValue(old_value),
        new_value: formatValue(new_value),
        user_role: userRole,
        metadata,
      },
    });
  } catch (err) {
    // Non-blocking — audit failures should never disrupt user workflows
    console.warn('[estimateAuditLog] Failed to log change:', err.message);
  }
}

/**
 * logApproval — Log manual approval (admin override)
 */
export async function logApproval({
  estimate_id,
  estimate_number,
  user,
  marginPct,
  metadata = {},
}) {
  return logChange({
    estimate_id,
    estimate_number,
    user,
    action: 'manual_approval',
    field: 'gross_margin_pct',
    old_value: marginPct,
    new_value: marginPct, // same value, but action is the approval itself
    metadata: {
      note: `Admin PIN verified. Margin override approved at ${marginPct.toFixed(1)}%`,
      ...metadata,
    },
  });
}

/**
 * logSend — Log estimate send action
 */
export async function logSend({
  estimate_id,
  estimate_number,
  user,
  client_email,
  metadata = {},
}) {
  return logChange({
    estimate_id,
    estimate_number,
    user,
    action: 'send',
    field: 'status',
    old_value: 'draft',
    new_value: 'sent',
    metadata: {
      note: `Sent to ${client_email}`,
      ...metadata,
    },
  });
}

/**
 * fetchAuditLog — Retrieve audit history for an estimate
 */
export async function fetchAuditLog(estimate_id) {
  try {
    const entries = await base44.asServiceRole.entities.EstimateVersionHistory.filter({
      estimate_id,
      archived_reason: 'audit_log',
    });
    // Sort by created_date descending (latest first)
    return entries.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  } catch (err) {
    console.warn('[estimateAuditLog] Failed to fetch audit log:', err.message);
    return [];
  }
}

// ── Helper ──
function formatValue(val) {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'number') return val.toFixed(2);
  return String(val).substring(0, 50);
}