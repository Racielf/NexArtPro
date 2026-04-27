import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function findEstimateByToken(base44, token) {
  const rows = await base44.asServiceRole.entities.Estimate.filter({ public_share_token: token }).catch(() => []);
  return rows?.[0] || null;
}

export default async (req) => {
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
  } catch (error) {
    return json({ error: error.message || 'Server error' }, 500);
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
      signing_package_token: signingPackage?.token || '',
      signature_name: estimate.signature_name || '',
      signed_at: estimate.signed_at || '',
      final_signed_at: estimate.final_signed_at || '',
      final_signed_pdf_url: estimate.final_signed_pdf_url || '',
      final_signed_pdf_name: estimate.final_signed_pdf_name || '',
      signed_pdf_hash: estimate.signed_pdf_hash || '',
      legal_package_locked: estimate.legal_package_locked === true,
      converted_work_order_id: estimate.converted_work_order_id || '',
      terms_accepted: estimate.terms_accepted === true,
    },
  });
}
