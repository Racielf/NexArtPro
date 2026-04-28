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
  } catch {
    settings = {};
  }

  const companyLogoUrl = settings?.logo_url || '';

  const signatureBrandLogoUrl = settings?.nexartsign_logo_url
    || settings?.app_logo_url
    || companyLogoUrl
    || APP_CONFIG?.app?.logo_url
    || '';

  const companyName = settings?.name || APP_CONFIG?.company?.name || '';

  return {
    companyLogoUrl,
    signatureBrandLogoUrl,
    companyName,
  };
}

export async function createSigningPackageForEstimate({ estimate, pdfUrl = '', pdfName = '', pdfHash = '', currentUser = null }) {
  if (!estimate?.id) throw new Error('Estimate is required');

  const signingBranding = await resolveSigningBranding(currentUser);

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
    provider: 'nexartsign',
    signer_name: estimate.client_name || '',
    signer_email: estimate.client_email || '',
    token,
    token_created_at: now,
    expires_at: expires,
    sent_at: now,
    source_pdf_url: pdfUrl || '',
    signature_brand_logo_url: signingBranding.signatureBrandLogoUrl,
    audit_summary: {
      company_logo_url: signingBranding.companyLogoUrl,
      company_name: signingBranding.companyName,
    },
  });

  return pkg;
}
