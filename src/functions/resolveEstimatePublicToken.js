/**
 * resolveEstimatePublicToken.js
 *
 * Serverless handler to resolve a public share token to an estimate record.
 * NO authentication required — token is the only security mechanism.
 *
 * Token format: {estimateId}_{sha256(estimateId + estimate.client_email)}
 * This prevents guessing tokens for other estimates while keeping them immutable.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { token } = payload;

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse token: estimateId_signature
    const parts = token.split('_');
    if (parts.length !== 2) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [estimateId, signature] = parts;

    // Fetch estimate using service role (no auth needed, token is validation)
    const list = await base44.asServiceRole.entities.Estimate.filter({ id: estimateId });
    if (!list || list.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Estimate not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const estimate = list[0];

    // Verify token signature: sha256(estimateId + clientEmail)
    const data = new TextEncoder().encode(estimateId + (estimate.client_email || ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== computedSignature) {
      return new Response(
        JSON.stringify({ error: 'Token verification failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Token valid — return estimate record (client-safe)
    return new Response(
      JSON.stringify({
        estimate: {
          id: estimate.id,
          estimate_number: estimate.estimate_number,
          document_type: estimate.document_type,
          document_language: estimate.document_language,
          client_id: estimate.client_id,
          client_name: estimate.client_name,
          client_email: estimate.client_email,
          title: estimate.title,
          status: estimate.status,
          groups: estimate.groups,
          materials: estimate.materials,
          subtotal: estimate.subtotal,
          discount_type: estimate.discount_type,
          discount_value: estimate.discount_value,
          discount_amount: estimate.discount_amount,
          tax_rate: estimate.tax_rate,
          tax_amount: estimate.tax_amount,
          total: estimate.total,
          notes: estimate.notes,
          exclusions: estimate.exclusions,
          payment_terms: estimate.payment_terms,
          warranty_terms: estimate.warranty_terms,
          attachments: (estimate.attachments || [])
            .filter(a => a.intent === 'send_to_client')
            .map(a => ({
              id: a.id,
              file_name: a.file_name,
              file_url: a.file_url,
              intent: a.intent,
              uploaded_at: a.uploaded_at,
            })),
          view_count: estimate.view_count,
          last_viewed_at: estimate.last_viewed_at,
          approved_at: estimate.approved_at,
          signed_at: estimate.signed_at,
          signer_name: estimate.signer_name,
          declined_at: estimate.declined_at,
          changes_requested_at: estimate.changes_requested_at,
          version: estimate.version,
          document_config: estimate.document_config,
          scope_summary: estimate.scope_summary,
          assumptions: estimate.assumptions,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[resolveEstimatePublicToken] Server error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};