import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing token' }), { status: 400 });
    }

    const direct = await base44.asServiceRole.entities.Estimate.filter({ public_share_token: token }).catch(() => []);
    if (direct?.length) return buildResponse(direct[0], base44);

    const parts = token.split('_');
    const estimateId = parts[0];

    const list = await base44.asServiceRole.entities.Estimate.filter({ id: estimateId });
    if (!list || list.length === 0) {
      return new Response(JSON.stringify({ error: 'Estimate not found' }), { status: 404 });
    }

    const estimate = list[0];

    if (estimate.public_share_token && estimate.public_share_token === token) {
      return buildResponse(estimate, base44);
    }

    if (parts.length === 2) {
      const legacySignature = parts[1];
      const currentSig = await sha256Hex(estimateId + (estimate.client_email || ''));
      if (legacySignature === currentSig) return buildResponse(estimate, base44);

      const snapshots = await base44.asServiceRole.entities.EstimateSnapshot.filter({ estimate_id: estimateId }, '-created_date', 1);
      if (snapshots?.length) {
        const snapEmail = snapshots[0]?.client_email || snapshots[0]?.estimate_data?.client_email || '';
        const snapSig = await sha256Hex(estimateId + snapEmail);
        if (legacySignature === snapSig) return buildResponse(estimate, base44);
      }
    }

    return new Response(JSON.stringify({ error: 'Token verification failed' }), { status: 403 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

async function buildResponse(estimate, base44) {
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

  return new Response(JSON.stringify({ estimate: {
    id: estimate.id,
    estimate_number: estimate.estimate_number,
    client_name: sourceData.client_name || estimate.client_name,
    client_email: sourceData.client_email || estimate.client_email,
    total: sourceData.total || estimate.total,
    status: estimate.status,
    document_type: estimate.document_type,
    attachments: sourceData.attachments || estimate.attachments,
    document_config: snapshotData?.document_config || estimate.document_config,
    signing_package_id: signingPackage?.id || estimate.signing_package_id || '',
    signing_package_status: signingPackage?.status || estimate.signature_status || '',
    signing_package_token: signingPackage?.token || '',
  }}), { status: 200 });
}
