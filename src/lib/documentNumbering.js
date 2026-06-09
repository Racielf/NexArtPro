import { base44 } from '@/api/base44Client';

/**
 * documentNumbering.js — Deterministic consecutive document numbering.
 *
 * Strategy: Query ALL records for the entity, find the absolute max number,
 * return max + 1. Uses a floor so numbers start at professional-looking values.
 *
 * Floor values:
 *   Estimate:   1001
 *   Proposal:   2001
 *   WorkOrder:  3001
 *   Invoice:    4001
 */

const FLOORS = {
  estimate:   1001,
  proposal:   2001,
  work_order: 3001,
  invoice:    4001,
};

const ENTITY_CONFIG = {
  estimate:   { entity: 'Estimate',  field: 'estimate_number' },
  proposal:   { entity: 'Proposal',  field: 'proposal_number' },
  work_order: { entity: 'WorkOrder', field: 'work_order_number' },
  invoice:    { entity: 'Invoice',   field: 'invoice_number' },
};

/**
 * Get the next consecutive document number for a given document type.
 * @param {'estimate'|'proposal'|'work_order'|'invoice'} docType
 * @returns {Promise<number>}
 */
export async function getNextDocumentNumber(docType) {
  const config = ENTITY_CONFIG[docType];
  if (!config) throw new Error(`Unknown document type: ${docType}`);

  const floor = FLOORS[docType];
  const field = config.field;

  // Fetch all records sorted by the number field descending, limit 1
  // This gives us the highest existing number efficiently
  const records = await base44.entities[config.entity].list(`-${field}`, 1);

  if (!records || records.length === 0) {
    return floor;
  }

  const maxNumber = records[0][field] || 0;
  return Math.max(maxNumber + 1, floor);
}