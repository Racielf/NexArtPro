import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getIp(req) {
  const xf = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || xf.split(',')[0].trim() || '';
}

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, action, signer_name } = await req.json();

    if (!token || !action) return response({ error: 'Missing token or action' }, 400);

    const rows = await base44.asServiceRole.entities.SigningPackage.filter({ token });
    if (!rows?.length) return response({ error: 'Not found' }, 404);

    const pkg = rows[0];
    const now = new Date().toISOString();
    const ip = getIp(req);
    const ua = req.headers.get('user-agent') || '';

    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { status: 'expired' });
      return response({ error: 'Expired' }, 410);
    }

    if (['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      return response({ error: 'Package already closed' }, 409);
    }

    if (action === 'approve') {
      const signer = signer_name || pkg.signer_name || pkg.client_name || '';
      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
        status: 'signed',
        signed_at: now,
        signer_name: signer,
        final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
        final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
        final_pdf_hash: pkg.source_pdf_hash || pkg.final_pdf_hash || '',
      });

      await base44.asServiceRole.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'signed',
        actor_name: signer,
        actor_email: pkg.signer_email,
        ip_address: ip,
        user_agent: ua,
        created_at: now,
      });

      const events = await base44.asServiceRole.entities.SigningEvent.filter({ signing_package_id: pkg.id }, 'created_at').catch(() => []);
      const cert = await base44.asServiceRole.entities.SigningCertificate.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        certificate_number: `NS-${Date.now()}`,
        generated_at: now,
        signer_name: signer,
        signer_email: pkg.signer_email,
        signed_at: now,
        ip_address: ip,
        user_agent: ua,
        document_hash: pkg.source_pdf_hash || '',
        final_pdf_hash: pkg.source_pdf_hash || '',
        audit_trail: events || [],
        certificate_json: {
          provider: 'nexartsign',
          package_id: pkg.id,
          document_id: pkg.document_id,
          signer_name: signer,
          signer_email: pkg.signer_email,
          signed_at: now,
          ip_address: ip,
        },
        company_id: pkg.company_id || 'rc-art',
      });

      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { certificate_id: cert.id });

      if (pkg.document_type === 'estimate' && pkg.document_id) {
        await base44.asServiceRole.entities.Estimate.update(pkg.document_id, {
          signature_status: 'signed',
          signed_at: now,
          accepted_by: signer,
          signature_name: signer,
          signing_package_id: pkg.id,
        }).catch(() => {});
      }

      return response({ success: true, status: 'signed', certificate_id: cert.id });
    }

    if (action === 'decline') {
      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
        status: 'declined',
        declined_at: now,
      });

      await base44.asServiceRole.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'declined',
        actor_email: pkg.signer_email,
        ip_address: ip,
        user_agent: ua,
        created_at: now,
      });

      if (pkg.document_type === 'estimate' && pkg.document_id) {
        await base44.asServiceRole.entities.Estimate.update(pkg.document_id, {
          signature_status: 'declined',
        }).catch(() => {});
      }

      return response({ success: true, status: 'declined' });
    }

    return response({ error: 'Invalid action' }, 400);
  } catch (err) {
    return response({ error: err.message || 'Server error' }, 500);
  }
};
