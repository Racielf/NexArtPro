/**
 * estimateSalesLifecycle.js
 * 
 * Phase 2+3 lifecycle: draft to sent to viewed to approved/declined
 */

import { base44 } from '@/api/base44Client';

function now() {
  return new Date().toISOString();
}

/**
 * Generate public share token for estimate.
 */
export async function generatePublicShareToken(estimate) {
  const estimateId = estimate.id;
  const clientEmail = estimate.client_email || '';
  
  const data = new TextEncoder().encode(estimateId + clientEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${estimateId}_${signature}`;
}

function resolveClientAttachmentsForSnapshot(estimate, documentConfig) {
  const attachments = Array.isArray(estimate?.attachments) ? estimate.attachments : [];
  const includedIds = Array.isArray(documentConfig?.included_attachment_ids)
    ? documentConfig.included_attachment_ids
    : attachments.filter(a => a.intent === 'send_to_client').map(a => a.id);

  return attachments
    .filter(a => a.intent === 'send_to_client')
    .filter(a => includedIds.includes(a.id))
    .map(a => ({
      id: a.id,
      file_name: a.file_name,
      file_url: a.file_url,
      intent: a.intent,
    }));
}

export async function markEstimateSent(estimateId, { documentConfig, estimate, currentUser } = {}) {
  const ts = now();
  const currentCount = estimate?.follow_up_count || 0;
  const resolvedDocumentConfig = documentConfig || estimate?.document_config;
  
  const payload = {
    status: 'sent',
    sent_at: ts,
    last_contacted_at: ts,
    follow_up_count: currentCount + 1,
    document_config: resolvedDocumentConfig,
  };
  
  try {
    await base44.entities.EstimateSnapshot.create({
      estimate_id: estimateId,
      estimate_number: estimate?.estimate_number,
      version: estimate?.version_number || 1,
      sent_at: ts,
      sent_by: currentUser?.email || '',
      client_name: estimate?.client_name,
      client_email: estimate?.client_email,
      client_id: estimate?.client_id,
      document_type: estimate?.document_type,
      document_language: estimate?.document_language,
      title: estimate?.title,
      estimate_data: estimate,
      document_config: resolvedDocumentConfig,
      total: estimate?.total,
      client_attachments: resolveClientAttachmentsForSnapshot(estimate, resolvedDocumentConfig),
    });
  } catch (err) {
    console.warn('[markEstimateSent] snapshot creation failed:', err?.message);
  }
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

export async function markEstimateViewed(estimateId, currentEstimate) {
  const ts = now();
  
  const payload = {
    viewed_at: ts,
  };
  
  if (currentEstimate.status === 'sent') {
    payload.status = 'viewed';
  }
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

export async function approveEstimate(estimateId, {
  approvedBy,
  estimate,
  signatureName,
  signatureImage,
  termsAccepted = false,
} = {}) {
  const ts = now();
  const signer = (signatureName || approvedBy || estimate?.client_name || '').trim();
  const hasDrawnSignature = typeof signatureImage === 'string' && signatureImage.startsWith('data:image/');
  
  const payload = {
    status: 'approved',
    approved_at: ts,
    signed_at: ts,
    accepted_by: signer,
    signature_name: signer,
    signature_image: hasDrawnSignature ? signatureImage : '',
    signature_method: hasDrawnSignature ? 'drawn_signature' : 'typed_name',
    terms_accepted: termsAccepted === true,
  };
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

export async function declineEstimate(estimateId, { declinedReason } = {}) {
  const ts = now();
  
  const payload = {
    status: 'declined',
    declined_at: ts,
    declined_reason: declinedReason || '',
  };
  
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}
