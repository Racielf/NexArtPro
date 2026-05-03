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

    return json({
      certificate: {
        id: cert.id,
        certificate_number: cert.certificate_number,
        signing_package_id: cert.signing_package_id,
        document_type: cert.document_type,
        document_id: cert.document_id,
        generated_at: cert.generated_at,
        signer_name: cert.signer_name,
        signer_email: cert.signer_email,
        signed_at: cert.signed_at,
        ip_address: cert.ip_address,
        document_hash: cert.document_hash,
        final_pdf_hash: cert.final_pdf_hash,
        hash_algorithm: cert.hash_algorithm || 'SHA-256',
        audit_trail: cert.audit_trail || [],
      },
      package: pkg ? {
        id: pkg.id,
        status: pkg.status,
        document_title: pkg.document_title,
        document_number: pkg.document_number,
        provider: pkg.provider,
        source_pdf_hash: pkg.source_pdf_hash,
        final_pdf_hash: pkg.final_pdf_hash,
        final_pdf_url: pkg.final_pdf_url,
        source_pdf_url: pkg.source_pdf_url,
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
