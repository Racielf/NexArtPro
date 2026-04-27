/**
 * estimateSalesLifecycle.js
 *
 * Phase 2+3 lifecycle: draft to sent to viewed to approved/declined.
 */

import { base44 } from '@/api/base44Client';

function now() {
  return new Date().toISOString();
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomTokenPart() {
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createPublicAccessRecord(estimate, token) {
  if (!estimate?.id || !token) return;
  const existing = await base44.entities.PublicDocumentAccess.filter({ token }).catch(() => []);
  if (existing?.length) return existing[0];

  const ts = now();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  return base44.entities.PublicDocumentAccess.create({
    token,
    document_type: 'estimate',
    document_id: estimate.id,
    document_number: String(estimate.estimate_number || ''),
    client_email: estimate.client_email || '',
    status: 'active',
    created_at: ts,
    expires_at: expiresAt,
    metadata: { source: 'estimate_send' },
    company_id: 'rc-art',
  });
}

export async function generatePublicShareToken(estimate) {
  if (!estimate?.id) throw new Error('Estimate is required to generate public token');

  if (estimate.public_share_token) {
    await createPublicAccessRecord(estimate, estimate.public_share_token).catch(err => console.warn('[PublicDocumentAccess] existing token sync failed:', err?.message));
    return estimate.public_share_token;
  }

  const estimateId = estimate.id;
  const nonce = randomTokenPart();
  const signature = await sha256Hex(`${estimateId}:${nonce}:${estimate.client_email || ''}`);
  const token = `${estimateId}_${nonce}_${signature}`;
  const tokenCreatedAt = now();

  await createPublicAccessRecord({ ...estimate, id: estimateId }, token);

  await base44.entities.Estimate.update(estimateId, {
    public_share_token: token,
    public_share_token_created_at: tokenCreatedAt,
  });

  return token;
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
  const publicShareToken = estimate?.public_share_token || await generatePublicShareToken({ ...estimate, id: estimateId });
  await createPublicAccessRecord({ ...estimate, id: estimateId }, publicShareToken).catch(err => console.warn('[markEstimateSent] public access sync failed:', err?.message));

  const payload = {
    status: 'sent',
    sent_at: ts,
    last_contacted_at: ts,
    follow_up_count: currentCount + 1,
    document_config: resolvedDocumentConfig,
    public_share_token: publicShareToken,
    public_share_token_created_at: estimate?.public_share_token_created_at || ts,
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
      public_share_token: publicShareToken,
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
  const payload = { viewed_at: ts };
  if (currentEstimate.status === 'sent') payload.status = 'viewed';
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

export async function approveEstimate(estimateId, { approvedBy, estimate, signatureName, signatureImage, termsAccepted = false, legalAudit = {} } = {}) {
  const ts = now();
  const signer = (signatureName || approvedBy || estimate?.client_name || '').trim();
  const hasDrawnSignature = typeof signatureImage === 'string' && signatureImage.startsWith('data:image/');
  const audit = {
    signed_at: ts,
    signed_by: signer,
    client_name: estimate?.client_name || '',
    client_email: estimate?.client_email || '',
    estimate_id: estimateId,
    estimate_number: estimate?.estimate_number || '',
    document_type: estimate?.document_type || 'ESTIMATE',
    signature_method: hasDrawnSignature ? 'drawn_signature' : 'typed_name',
    terms_accepted: termsAccepted === true,
    user_agent: legalAudit.user_agent || '',
    language: legalAudit.language || '',
    timezone: legalAudit.timezone || '',
    screen: legalAudit.screen || '',
    page_url: legalAudit.page_url || '',
    ip_address: legalAudit.ip_address || '',
    ip_captured_from: legalAudit.ip_captured_from || '',
    ip_capture_headers: legalAudit.ip_capture_headers || {},
    server_user_agent: legalAudit.server_user_agent || '',
    server_accept_language: legalAudit.server_accept_language || '',
    captured_at: legalAudit.captured_at || '',
    token_verified: legalAudit.token_verified === true,
    audit_version: legalAudit.audit_version || 'phase6',
  };
  const payload = {
    status: 'approved',
    approved_at: ts,
    signed_at: ts,
    accepted_by: signer,
    signature_name: signer,
    signature_image: hasDrawnSignature ? signatureImage : '',
    signature_method: audit.signature_method,
    terms_accepted: termsAccepted === true,
    legal_audit: audit,
    locked_after_signature: true,
  };
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}

export async function declineEstimate(estimateId, { declinedReason } = {}) {
  const ts = now();
  const payload = { status: 'declined', declined_at: ts, declined_reason: declinedReason || '' };
  await base44.entities.Estimate.update(estimateId, payload);
  return payload;
}
