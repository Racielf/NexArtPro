import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function findEstimateById(base44, id) {
  if (!id) return null;
  const rows = await base44.asServiceRole.entities.Estimate.filter({ id }).catch(() => []);
  return rows?.[0] || null;
}

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return json({ error: 'Invalid or missing token' }, 400);
    }

    const accessRows = await base44.asServiceRole.entities.PublicDocumentAccess
      .filter({ token })
      .catch(() => []);

    if (accessRows?.length) {
      const access = accessRows[0];

      if (access.status === 'revoked') return json({ error: 'Link revoked' }, 403);
      if (access.status === 'expired') return json({ error: 'Link expired' }, 410);
      if (access.expires_at && new Date(access.expires_at) < new Date()) {
        await base44.asServiceRole.entities.PublicDocumentAccess.update(access.id, { status: 'expired' }).catch(() => {});
        return json({ error: 'Link expired' }, 410);
      }

      const estimate = await findEstimateById(base44, access.document_id);
      if (!estimate) return json({ error: 'Estimate not found' }, 404);

      await base44.asServiceRole.entities.PublicDocumentAccess.update(access.id, {
        status: access.status === 'active' ? 'used' : access.status,
        last_used_at: new Date().toISOString(),
      }).catch(() => {});

      return buildResponse(estimate, base44, access);
    }

    const direct = await base44.asServiceRole.entities.Estimate.filter({ public_share_token: token }).catch(() => []);
    if (direct?.length) return buildResponse(direct[0], base44, null);

    const parts = token.split('_');
    const estimateId = parts[0];
    const estimate = await findEstimateById(base44, estimateId);
    if (!estimate) return json({ error: 'Estimate not found' }, 404);

    if (estimate.public_share_token && estimate.public_share_token === token) {
      return buildResponse(estimate, base44, null);
    }

    if (parts.length === 2) {
      const legacySignature = parts[1];
      const currentSig = await sha256Hex(estimateId + (estimate.client_email || ''));
      if (legacySignature === currentSig) return buildResponse(estimate, base44, null);

      const snapshots = await base44.asServiceRole.entities.EstimateSnapshot.filter({ estimate_id: estimateId }, '-created_date', 1).catch(() => []);
      if (snapshots?.length) {
        const snapEmail = snapshots[0]?.client_email || snapshots[0]?.estimate_data?.client_email || '';
        const snapSig = await sha256Hex(estimateId + snapEmail);
        if (legacySignature === snapSig) return buildResponse(estimate, base44, null);
      }
    }

    return json({ error: 'Token verification failed' }, 403);
  } catch (error) {
    return json({ error: error.message || 'Server error' }, 500);
  }
};

async function buildResponse(estimate, base44, access = null) {
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

  return json({ estimate: {
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
    materials: sourceData.materials || estimate.materials,
    labor: sourceData.labor || estimate.labor,
    services: sourceData.services || estimate.services,
    notes: sourceData.notes || estimate.notes,
    terms: sourceData.terms || estimate.terms,
    attachments: sourceData.attachments || estimate.attachments,
    document_config: snapshotData?.document_config || estimate.document_config,
    pdf_file_url: snapshotData?.pdf_file_url || estimate.pdf_file_url,
    pdf_file_name: snapshotData?.pdf_file_name || estimate.pdf_file_name,
    final_signed_pdf_url: estimate.final_signed_pdf_url,
    final_signed_pdf_name: estimate.final_signed_pdf_name,
    signed_pdf_hash: estimate.signed_pdf_hash,
    signing_package_id: signingPackage?.id || estimate.signing_package_id || '',
    signing_package_status: signingPackage?.status || estimate.signature_status || '',
    signing_package_token: signingPackage?.token || '',
    public_access_id: access?.id || '',
  }});
}
