/**
 * auditLog.js — Minimal audit logging abstraction for Phase 1.
 *
 * NOTE: Base44 does not currently have a dedicated AuditLog entity in this repo.
 * This module provides a lightweight in-memory/console log as a placeholder.
 * In Phase 2, wire this to a real AuditLog entity (base44.entities.AuditLog.create(...))
 * once that entity is created.
 *
 * Usage:
 *   import { logAuditEvent } from '@/lib/auditLog';
 *   logAuditEvent('delete', 'Customer', id, user, { reason: 'Duplicate entry' });
 *   logAuditEvent('restore', 'Invoice', id, user);
 */

const AUDIT_LOG_ENTITY_AVAILABLE = false; // Set to true once AuditLog entity is created

export async function logAuditEvent(action, entityType, entityId, performedBy, meta = {}) {
  const entry = {
    action,          // 'delete' | 'restore'
    entity_type: entityType,
    entity_id: entityId,
    performed_by: performedBy || 'unknown',
    performed_at: new Date().toISOString(),
    ...meta,
  };

  if (AUDIT_LOG_ENTITY_AVAILABLE) {
    // Phase 2: uncomment and wire to real entity
    // await base44.entities.AuditLog.create(entry);
  }

  // Fallback: console log for now (visible in browser devtools)
  console.info('[AUDIT]', entry);
}