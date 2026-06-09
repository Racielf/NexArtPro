import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseToken(token: string) {
  const parts = String(token || '').split('_').filter(Boolean);

  if (parts.length === 2) {
    const [estimateId, signature] = parts;
    return { estimateId, signature, nonce: '', format: 'legacy' as const };
  }

  if (parts.length >= 3) {
    const [estimateId, nonce, ...rest] = parts;
    return { estimateId, nonce, signature: rest.join('_'), format: 'v2' as const };
  }

  return null;
}

function sortParticipants(rows: any[] = []) {
  return [...rows].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
}

function getActiveParticipant(participants: any[] = []) {
  const ordered = sortParticipants(participants);
  return ordered.find(p => p.status === 'active') || ordered.find(p => p.status === 'pending') || null;
}

function randomTokenPart() {
  return crypto.randomUUID().replace(/-/g, '');
}

function buildParticipantToken(pkgId: string, participantId: string) {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

async function ensureParticipantToken(base44: any, pkgId: string, participant: any) {
  if (!participant) return '';
  if (participant.token) return participant.token;
  const token = buildParticipantToken(pkgId, participant.id || 'participant');
  await base44.asServiceRole.entities.SigningParticipant.update(participant.id, { token }).catch(() => {});
  participant.token = token;
  return token;
}

async function findEstimateByToken(base44: any, token: string) {
  const directRows = await base44.asServiceRole.entities.Estimate.filter({ public_share_token: token }).catch(() => []);
  if (directRows?.[0]) {
    return directRows[0];
  }

  const parsed = parseToken(token);
  if (!parsed?.estimateId || !parsed?.signature) {
    return null;
  }

  const rows = await base44.asServiceRole.entities.Estimate.filter({ id: parsed.estimateId }).catch(() => []);
  const estimate = rows?.[0] || null;
  if (!estimate) {
    return null;
  }

  const legacySignature = await sha256Hex(`${parsed.estimateId}${estimate.client_email || ''}`);
  const currentSignature = parsed.nonce
    ? await sha256Hex(`${parsed.estimateId}:${parsed.nonce}:${estimate.client_email || ''}`)
    : '';

  if (parsed.signature === legacySignature || parsed.signature === currentSignature) {
    return estimate;
  }

  return null;
}

async function resolveClientSigningToken(base44: any, estimate: any, signingPackage: any) {
  if (!signingPackage || ['declined', 'expired', 'voided', 'signed'].includes(signingPackage.status)) {
    return '';
  }

  const participants = await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: signingPackage.id }).catch(() => []);
  if (!Array.isArray(participants) || participants.length === 0) {
    return signingPackage.token || '';
  }

  const activeParticipant = getActiveParticipant(participants);
  if (!activeParticipant) return '';

  const isClientParticipant = activeParticipant.role === 'client'
    || String(activeParticipant.email || '').toLowerCase() === String(estimate.client_email || '').toLowerCase();

  if (!isClientParticipant) {
    return '';
  }

  return ensureParticipantToken(base44, signingPackage.id, activeParticipant);
}

async function buildResponse(estimate: any, base44: any) {
  let snapshotData = null;
  let signingPackage = null;

  try {
    const snapshots = await base44.asServiceRole.entities.EstimateSnapshot.filter({ estimate_id: estimate.id }, '-created_date', 1);
    if (snapshots?.length) snapshotData = snapshots[0];
  } catch {}

  try {
    const packages = await base44.asServiceRole.entities.SigningPackage.filter({ document_type: 'estimate', document_id: estimate.id }, '-created_date', 1);
    if (packages?.length && !['declined', 'expired', 'voided'].includes(packages[0].status)) {
      signingPackage = packages[0];
    }
  } catch {}

  const sourceData = snapshotData?.estimate_data || estimate;
  const signingToken = signingPackage ? await resolveClientSigningToken(base44, estimate, signingPackage) : '';

  return json({
    estimate: {
      id: estimate.id,
      estimate_number: estimate.estimate_number,
      client_name: sourceData.client_name || estimate.client_name,
      client_email: sourceData.client_email || estimate.client_email,
      client_id: sourceData.client_id || estimate.client_id,
      total: sourceData.total || estimate.total,
      status: estimate.status,
      title: sourceData.title || estimate.title,
      document_type: estimate.document_type,
      document_language: sourceData.document_language || estimate.document_language,
      line_items: sourceData.line_items || estimate.line_items,
      attachments: sourceData.attachments || estimate.attachments,
      document_config: snapshotData?.document_config || estimate.document_config,
      pdf_file_url: snapshotData?.pdf_file_url || estimate.pdf_file_url,
      signing_package_id: signingPackage?.id || estimate.signing_package_id || '',
      signing_package_status: signingPackage?.status || estimate.signature_status || '',
      signing_package_token: signingToken,
      signature_name: estimate.signature_name || '',
      signed_at: estimate.signed_at || '',
      final_signed_at: estimate.final_signed_at || '',
      final_signed_pdf_url: estimate.final_signed_pdf_url || '',
      final_signed_pdf_name: estimate.final_signed_pdf_name || '',
      signed_pdf_hash: estimate.signed_pdf_hash || '',
      legal_package_locked: estimate.legal_package_locked === true,
      converted_work_order_id: estimate.converted_work_order_id || '',
      terms_accepted: estimate.terms_accepted === true,
      signature_brand_logo_url: signingPackage?.signature_brand_logo_url || '',
    },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return json({ error: 'Invalid or missing token' }, 400);
    }

    const estimate = await findEstimateByToken(base44, token);
    if (!estimate) {
      return json({ error: 'Estimate not found' }, 404);
    }

    return buildResponse(estimate, base44);
  } catch (error: any) {
    return json({ error: error.message || 'Server error' }, 500);
  }
});