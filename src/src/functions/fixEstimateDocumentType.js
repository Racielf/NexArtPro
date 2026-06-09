/**
 * fixEstimateDocumentType.js
 *
 * One-time admin function to fix all Estimate records that have
 * document_type='PROPOSAL' (data contamination) and set them to 'ESTIMATE'.
 *
 * Usage: Call this function ONCE to clean up all affected records.
 * After fixing, it can be safely deleted.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only protection
    if (!user || user.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all Estimates with document_type='PROPOSAL'
    const contaminated = await base44.asServiceRole.entities.Estimate.filter({
      document_type: 'PROPOSAL',
    });

    if (contaminated.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No contaminated Estimates found', fixed_count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fix each record
    let fixedCount = 0;
    for (const estimate of contaminated) {
      try {
        await base44.asServiceRole.entities.Estimate.update(estimate.id, {
          document_type: 'ESTIMATE',
        });
        fixedCount++;
      } catch (err) {
        console.error(`[fixEstimateDocumentType] Failed to fix estimate ${estimate.id}:`, err.message);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Fixed ${fixedCount} contaminated Estimates`,
        fixed_count: fixedCount,
        total_affected: contaminated.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fixEstimateDocumentType] Server error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};