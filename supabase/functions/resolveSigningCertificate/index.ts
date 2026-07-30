/**
 * resolveSigningCertificate — Edge Function (Supabase)
 * Public endpoint to verify a signing certificate by ID or certificate_number.
 * Ported from nexartsign-pro-app: replaces Base44 SDK with Supabase direct queries.
 */
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { json } from '../_shared/signingContext.ts';

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);
    const { certificate } = await req.json();

    if (!certificate || typeof certificate !== 'string') {
      return json({ error: 'Missing certificate' }, 400);
    }

    const byId = await entities.SigningCertificate.filter({ id: certificate }).catch(() => []);
    const rows = byId?.length
      ? byId
      : await entities.SigningCertificate.filter({ certificate_number: certificate }).catch(() => []);

    if (!rows?.length) return json({ error: 'Certificate not found' }, 404);

    const cert = rows[0];
    let pkg = null;
    if (cert.signing_package_id) {
      const packages = await entities.SigningPackage.filter({ id: cert.signing_package_id }).catch(() => []);
      pkg = packages?.[0] || null;
    }

    const documentHash = cert.final_pdf_hash || cert.document_hash || pkg?.final_pdf_hash || pkg?.source_pdf_hash || '';
    const hashMatches = Boolean(documentHash) && (
      !pkg || !pkg.source_pdf_hash || documentHash === pkg.source_pdf_hash || documentHash === pkg.final_pdf_hash
    );

    // Public, unauthenticated endpoint (service-role client, no RLS) -- only return the minimal
    // fields a signer/third-party needs to verify a document. Do not add signer PII, IP, audit
    // trail, or PDF URLs back into this payload; those are available to admins via the
    // authenticated NexArtSign panel, which reads the tables directly.
    return json({
      certificate: {
        certificate_number: cert.certificate_number,
        status: cert.status || (hashMatches ? 'valid' : 'unknown'),
        signed_at: cert.signed_at,
      },
      package: pkg ? {
        status: pkg.status,
        provider: pkg.provider,
      } : null,
      verification: {
        status: hashMatches ? 'valid' : 'unknown',
        expected_hash: documentHash,
        hash_matches_package: hashMatches,
      },
    });
  } catch (error: any) {
    return json({ error: error.message || 'Server error' }, 500);
  }
});
