/**
 * recoverySnapshot.js
 *
 * Normalizes snapshot metadata from a business record before soft delete.
 * Uses the RECOVERY_REGISTRY to derive labels, numbers and module keys.
 *
 * Separation of concerns:
 *   AuditLog    → event log (action, actor, timestamp)
 *   RecoveryVault → full record snapshot store (queryable, previewable)
 */

import { base44 } from '@/api/base44Client';
import { RECOVERY_REGISTRY } from '@/lib/recoveryRegistry';

/**
 * Build normalized snapshot metadata for a record.
 * @param {string} entityName — entity class name (e.g. 'Invoice')
 * @param {object} record     — full record object
 * @param {string} deletedBy  — actor email
 * @param {string} reason     — optional reason
 * @returns {object} RecoveryVault payload ready to create
 */
export function buildSnapshotPayload(entityName, record, deletedBy, reason = '') {
  const entry = RECOVERY_REGISTRY.find(e => e.entityName === entityName);

  const recordLabel = entry ? (entry.labelField(record) || '—') : (record.full_name || record.display_name || record.name || record.client_name || record.title || '—');
  const referenceNumber = entry?.numField ? (entry.numField(record) || null) : null;
  const module = entry?.key || entityName.toLowerCase();

  // Origin path map
  const ORIGIN_PATHS = {
    Customer: '/customers',
    Client: '/clients',
    Lead: '/leads',
    Estimate: '/estimates',
    Proposal: '/proposals',
    WorkOrder: '/work-orders',
    Invoice: '/invoices',
  };

  // Build denormalized search text for Recovery Center search
  const searchParts = [
    recordLabel,
    referenceNumber,
    record.email || record.client_email || '',
    record.phone || record.client_phone || '',
    reason || '',
    record.title || '',
  ].filter(Boolean).map(s => s.toLowerCase());
  const searchText = [...new Set(searchParts)].join(' ');

  // Safe snapshot — strip internal soft delete fields to keep snapshot clean
  const { deleted_at, deleted_by, delete_reason, restored_at, restored_by, ...cleanSnapshot } = record;

  return {
    entity_type: entityName,
    entity_id: record.id,
    module,
    record_label: recordLabel,
    reference_number: referenceNumber,
    snapshot_json: cleanSnapshot,
    search_text: searchText,
    deleted_by: deletedBy || 'admin',
    deleted_at: new Date().toISOString(),
    delete_reason: reason || null,
    origin_path: ORIGIN_PATHS[entityName] || null,
    is_restored: false,
    is_purged: false,
    company_id: 'rc-art',
  };
}

/**
 * Write a RecoveryVault snapshot entry.
 * Called by the archiveWithSnapshot flow.
 * Silently swallows errors so vault write never breaks the main delete.
 */
export async function writeVaultSnapshot(entityName, record, deletedBy, reason = '') {
  try {
    const payload = buildSnapshotPayload(entityName, record, deletedBy, reason);
    await base44.entities.RecoveryVault.create(payload);
  } catch (err) {
    console.warn('[RecoveryVault] Failed to write snapshot:', err?.message);
  }
}

/**
 * Mark a vault entry as restored.
 * Finds the vault entry by entity_type + entity_id (most recent).
 */
export async function markVaultRestored(entityId, restoredBy) {
  try {
    const vaultEntries = await base44.entities.RecoveryVault.filter({ entity_id: entityId });
    if (!vaultEntries.length) return;
    // Mark the most recent un-restored entry
    const target = vaultEntries
      .filter(e => !e.is_restored && !e.is_purged)
      .sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0))[0];
    if (!target) return;
    await base44.entities.RecoveryVault.update(target.id, {
      is_restored: true,
      restored_at: new Date().toISOString(),
      restored_by: restoredBy || 'admin',
    });
  } catch (err) {
    console.warn('[RecoveryVault] Failed to mark restored:', err?.message);
  }
}

/**
 * Mark a vault entry as purged (original record hard deleted).
 * Vault entry is KEPT as historical evidence — only flagged.
 */
export async function markVaultPurged(entityId, purgedBy) {
  try {
    const vaultEntries = await base44.entities.RecoveryVault.filter({ entity_id: entityId });
    if (!vaultEntries.length) return;
    const target = vaultEntries
      .filter(e => !e.is_purged)
      .sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0))[0];
    if (!target) return;
    await base44.entities.RecoveryVault.update(target.id, {
      is_purged: true,
      purged_at: new Date().toISOString(),
      purged_by: purgedBy || 'admin',
    });
  } catch (err) {
    console.warn('[RecoveryVault] Failed to mark purged:', err?.message);
  }
}