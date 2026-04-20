/**
 * auditLog.js — Real audit logging via AuditLog entity (Phase 2).
 *
 * Usage:
 *   import { logAuditEvent } from '@/lib/auditLog';
 *   logAuditEvent('archive', 'Customer', id, user?.email, { reason: 'Duplicate' });
 *   logAuditEvent('restore', 'Invoice', id, user?.email);
 */

import { base44 } from '@/api/base44Client';

export async function logAuditEvent(action, entityType, entityId, performedBy, meta = {}) {
  const entry = {
    action: action === 'delete' ? 'archive' : action, // normalize legacy 'delete' → 'archive'. 'purge' passes through as-is.
    entity_type: entityType,
    entity_id: entityId,
    performed_by: performedBy || 'unknown',
    performed_at: new Date().toISOString(),
    reason: meta?.reason || null,
    company_id: 'rc-art',
  };

  try {
    await base44.entities.AuditLog.create(entry);
  } catch (err) {
    // Never let audit log failure break the main operation
    console.warn('[AUDIT] Failed to write audit entry:', err?.message, entry);
  }
}