/**
 * softDeleteFields.js
 * 
 * Centralized soft-delete field definitions for all recoverable entities.
 * These fields must be present on each entity schema to support the recovery system.
 * 
 * This is a reference document — use it to verify all entities have these fields defined.
 */

export const SOFT_DELETE_FIELD_SCHEMA = {
  deleted_at: {
    type: 'string',
    format: 'date-time',
    description: 'ISO timestamp when record was soft deleted',
  },
  deleted_by: {
    type: 'string',
    description: 'User email/ID who deleted the record',
  },
  delete_reason: {
    type: 'string',
    description: 'Reason provided for deletion (optional)',
  },
  restored_at: {
    type: 'string',
    format: 'date-time',
    description: 'ISO timestamp when record was restored (if any)',
  },
  restored_by: {
    type: 'string',
    description: 'User email/ID who restored the record (if any)',
  },
};

/**
 * Entities that MUST have these fields in their schema:
 * - Customer
 * - Client
 * - Lead
 * - Estimate
 * - Proposal
 * - WorkOrder
 * - Invoice
 */