import { base44 } from '@/api/base44Client';

function randomTokenPart() {
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSigningPackageForEstimate({ estimate, pdfUrl = '', pdfName = '', currentUser = null }) {
  if (!estimate?.id) throw new Error('Estimate is required');
  const existing = await base44.entities.SigningPackage.filter({
    document_type: 'estimate',
    document_id: estimate.id,
  }).catch(() => []);

  const reusable = (existing || []).find(p => !['signed', 'declined', 'expired', 'voided'].includes(p.status));
  if (reusable?.token) return reusable;

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
    company_id: 'rc-art',
  }).catch(() => {});

  return pkg;
}
