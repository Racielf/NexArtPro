/**
 * softDelete.js — Centralized soft delete / restore helpers
 * Uses entity .update() to set deleted_at instead of .delete()
 * Compatible with NexArt entity SDK.
 */

import { nexartClient } from '@/api/nexartClient';
import { writeVaultSnapshot, markVaultRestored } from '@/lib/recoverySnapshot';
import { logAuditEvent } from '@/lib/auditLog';

async function assertSoftDeletePersisted(entityApi, id) {
  try {
    const records = await entityApi.filter({ id });
    const record = records?.[0] || null;

    if (!record?.deleted_at) {
      throw new Error(
        'Soft delete was not persisted. Verify this entity schema includes deleted_at, deleted_by, delete_reason, restored_at, and restored_by.'
      );
    }
  } catch (err) {
    console.error('[softDelete] Persistence validation failed:', err?.message || err);
    throw err;
  }
}

/**
 * archiveWithSnapshot — PREFERRED archive flow for all supported business entities.
 *
 * Full flow:
 *   1. Read current record from DB
 *   2. Write RecoveryVault snapshot (full JSON + metadata)
 *   3. Log AuditLog archive event
 *   4. Soft-delete the original record (deleted_at, deleted_by, delete_reason)
 *   5. Verify deleted_at actually persisted before callers remove it from UI
 *
 * @param {object} entityApi   — nexartClient.entities.SomeEntity
 * @param {string} entityName  — entity class name matching registry (e.g. 'Invoice')
 * @param {string} id          — record ID
 * @param {string} currentUser — actor email
 * @param {string} reason      — optional delete reason
 */
export async function archiveWithSnapshot(entityApi, entityName, id, currentUser, reason = '') {
  const now = new Date().toISOString();
  const actor = currentUser || 'admin';

  // 1. Read current record
  let record = null;
  try {
    const list = await entityApi.filter({ id });
    record = list?.[0] || null;
  } catch (err) {
    console.warn('[archiveWithSnapshot] Could not read record for snapshot:', err?.message);
  }

  // 2. Write vault snapshot (silently fails if record not found)
  if (record) {
    await writeVaultSnapshot(entityName, record, actor, reason);
  }

  // 3. Log AuditLog event
  await logAuditEvent('archive', entityName, id, actor, { reason });

  // 4. Soft delete
  await entityApi.update(id, {
    deleted_at: now,
    deleted_by: actor,
    delete_reason: reason || null,
    restored_at: null,
    restored_by: null,
  });

  // 5. Guard against silent schema/update failures before UI removes the row
  await assertSoftDeletePersisted(entityApi, id);
}

/**
 * archiveManyWithSnapshot — Bulk version of archiveWithSnapshot.
 * Runs all in parallel.
 */
export async function archiveManyWithSnapshot(entityApi, entityName, ids, currentUser, reason = '') {
  await Promise.all(ids.map(id => archiveWithSnapshot(entityApi, entityName, id, currentUser, reason)));
}

/**
 * softDeleteEntity — Legacy: soft delete without snapshot.
 * Kept for backward compatibility. Prefer archiveWithSnapshot in new code.
 */
export async function softDeleteEntity(entityApi, id, currentUser, reason = '') {
  const now = new Date().toISOString();
  await entityApi.update(id, {
    deleted_at: now,
    deleted_by: currentUser || 'admin',
    delete_reason: reason || null,
    restored_at: null,
    restored_by: null,
  });

  await assertSoftDeletePersisted(entityApi, id);
}

/**
 * softDeleteMany — Legacy bulk soft delete without snapshot.
 */
export async function softDeleteMany(entityApi, ids, currentUser, reason = '') {
  await Promise.all(ids.map(id => softDeleteEntity(entityApi, id, currentUser, reason)));
}

/**
 * restoreEntity — Restore a soft-deleted record.
 * Also marks the RecoveryVault entry as restored.
 */
export async function restoreEntity(entityApi, id, currentUser) {
  const now = new Date().toISOString();
  const actor = currentUser || 'admin';
  await entityApi.update(id, {
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
    restored_at: now,
    restored_by: actor,
  });
  // Mark vault entry as restored (silent)
  await markVaultRestored(id, actor);
}

/**
 * Returns true if a record has been soft deleted.
 */
export function isDeleted(record) {
  return !!record?.deleted_at;
}

/**
 * Filter out soft-deleted records from a list.
 */
export function filterActiveRecords(records) {
  return (records || []).filter(r => !r.deleted_at);
}

/**
 * Return only soft-deleted records from a list.
 */
export function filterDeletedRecords(records) {
  return (records || []).filter(r => !!r.deleted_at);
}
