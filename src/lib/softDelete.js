/**
 * softDelete.js — Centralized soft delete / restore helpers
 * Uses entity .update() to set deleted_at instead of .delete()
 * Compatible with Base44 entity SDK.
 */

/**
 * Soft delete a record.
 * Sets deleted_at, deleted_by, delete_reason on the record.
 */
export async function softDeleteEntity(entityApi, id, currentUser, reason = '') {
  const now = new Date().toISOString();
  await entityApi.update(id, {
    deleted_at: now,
    deleted_by: currentUser || 'admin',
    delete_reason: reason || null,
    // Clear any restore state if re-deleting
    restored_at: null,
    restored_by: null,
  });
}

/**
 * Soft delete multiple records in parallel.
 */
export async function softDeleteMany(entityApi, ids, currentUser, reason = '') {
  await Promise.all(ids.map(id => softDeleteEntity(entityApi, id, currentUser, reason)));
}

/**
 * Restore a soft-deleted record.
 * Clears deleted_at/by/reason and sets restored_at/by.
 */
export async function restoreEntity(entityApi, id, currentUser) {
  const now = new Date().toISOString();
  await entityApi.update(id, {
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
    restored_at: now,
    restored_by: currentUser || 'admin',
  });
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