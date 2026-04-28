import { base44 } from '@/api/base44Client';
import { APP_CONFIG } from '@/lib/appConfig';
import { loadCompanySettings } from '@/lib/companySettings';

function randomTokenPart() {
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function resolveSigningBranding(currentUser = null) {
  let settings = {};

  try {
    settings = await loadCompanySettings() || {};
  } catch (err) {
    console.warn('[nexArtSign] company settings branding lookup failed, using fallback:', err?.message);
    settings = {};
  }

  const companySettings = currentUser?.company_settings && typeof currentUser.company_settings === 'object'
    ? currentUser.company_settings
    : {};

  const companyLogoUrl = settings?.logo_url
    || companySettings?.logo_url
    || APP_CONFIG?.company?.logo_url
    || '';

  const signatureBrandLogoUrl = settings?.nexartsign_logo_url
    || companySettings?.nexartsign_logo_url
    || settings?.app_logo_url
    || companySettings?.app_logo_url
    || APP_CONFIG?.app?.logo_url
    || '';

  const companyName = settings?.name
    || companySettings?.name
    || APP_CONFIG?.company?.name
    || 'R.C Art Construction LLC';

  return {
    companyLogoUrl,
    signatureBrandLogoUrl,
    companyName,
  };
}

export async function createSigningPackageForEstimate({ estimate, pdfUrl = '', pdfName = '', pdfHash = '', currentUser = null }) {
  if (!estimate?.id) throw new Error('Estimate is required');

  const signingBranding = await resolveSigningBranding(currentUser);

  const existing = await base44.entities.SigningPackage.filter({
    document_type: 'estimate',
    document_id: estimate.id,
  }).catch(() => []);

  const reusable = (existing || []).find(p => !['signed', 'declined', 'expired', 'voided'].includes(p.status));
  if (reusable?.token) {
    const patch = {};
    if (pdfUrl && !reusable.source_pdf_url) patch.source_pdf_url = pdfUrl;
    if (pdfName && !reusable.source_pdf_name) patch.source_pdf_name = pdfName;
    if (pdfHash && !reusable.source_pdf_hash) patch.source_pdf_hash = pdfHash;
    if (signingBranding.signatureBrandLogoUrl && reusable.signature_brand_logo_url !== signingBranding.signatureBrandLogoUrl) {
      patch.signature_brand_logo_url = signingBranding.signatureBrandLogoUrl;
    }
    const nextAuditSummary = {
      ...(reusable.audit_summary || {}),
      company_logo_url: signingBranding.companyLogoUrl,
      company_name: signingBranding.companyName,
    };
    if (JSON.stringify(nextAuditSummary) !== JSON.stringify(reusable.audit_summary || {})) {
      patch.audit_summary = nextAuditSummary;
    }
    if (Object.keys(patch).length > 0) {
      await base44.entities.SigningPackage.update(reusable.id, patch).catch(() => {});
      return { ...reusable, ...patch };
    }
    return reusable;
  }

  const token = `ns_${estimate.id}_${randomTokenPart()}`;
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  const pkg = await base44.entities.SigningPackage.create({
    package_number: Date.now(),
    document_type: 'estimate',
    document_id: estimate.id,
    document_number: String(estimate.estimate_number || ''),
    document_title: estimate.title || `Estimate #${estimate.estimate_number || ''}`,
    status: 'sent',
    signing_mode: 'internal',
    provider: 'nexartsign',
    signer_name: estimate.client_name || '',
    signer_email: estimate.client_email || '',
    signer_phone: estimate.client_phone || '',
    client_id: estimate.client_id || '',
    client_name: estimate.client_name || '',
    token,
    token_created_at: now,
    expires_at: expires,
    sent_at: now,
    source_pdf_url: pdfUrl || '',
    source_pdf_name: pdfName || '',
    source_pdf_hash: pdfHash || '',
    hash_algorithm: 'SHA-256',
    signature_brand_logo_url: signingBranding.signatureBrandLogoUrl,
    audit_summary: {
      company_logo_url: signingBranding.companyLogoUrl,
      company_name: signingBranding.companyName,
    },
    created_by: currentUser?.email || 'system',
    company_id: 'rc-art',
  });

  await base44.entities.SigningEvent.create({
    signing_package_id: pkg.id,
    document_type: 'estimate',
    document_id: estimate.id,
    event_type: 'sent',
    actor_name: currentUser?.full_name || currentUser?.email || 'system',
    actor_email: currentUser?.email || '',
    created_at: now,
    metadata: { source_pdf_hash: pdfHash || '' },
    company_id: 'rc-art',
  }).catch(() => {});

  return pkg;
}
