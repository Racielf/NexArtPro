import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return json({ error: 'Invalid or missing token' }, 400);
    }

    const rows = await base44.asServiceRole.entities.SigningPackage.filter({ token });
    if (!rows || rows.length === 0) {
      return json({ error: 'Signing package not found' }, 404);
    }

    const pkg = rows[0];

    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { status: 'expired' });
      return json({ error: 'Signing package expired' }, 410);
    }

    let resolvedStatus = pkg.status;
    let resolvedViewedAt = pkg.viewed_at;

    if (!['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      const viewedAt = new Date().toISOString();
      resolvedStatus = pkg.status === 'draft' || pkg.status === 'sent' ? 'viewed' : pkg.status;
      resolvedViewedAt = pkg.viewed_at || viewedAt;

      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
        status: resolvedStatus,
        viewed_at: resolvedViewedAt,
      });
      await base44.asServiceRole.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'viewed',
        actor_name: pkg.signer_name || pkg.client_name || '',
        actor_email: pkg.signer_email || '',
        user_agent: req.headers.get('user-agent') || '',
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim(),
        created_at: viewedAt,
      });
    }

    return json({
      package: {
        id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        document_number: pkg.document_number,
        document_title: pkg.document_title,
        status: resolvedStatus,
        signer_name: pkg.signer_name,
        signer_email: pkg.signer_email,
        client_name: pkg.client_name,
        source_pdf_url: pkg.source_pdf_url,
        source_pdf_name: pkg.source_pdf_name,
        final_pdf_url: pkg.final_pdf_url,
        final_pdf_name: pkg.final_pdf_name,
        certificate_id: pkg.certificate_id || '',
        provider: pkg.provider,
        signing_mode: pkg.signing_mode,
        expires_at: pkg.expires_at || '',
        viewed_at: resolvedViewedAt || '',
      },
    });
  } catch (error: any) {
    return json({ error: error.message || 'Server error' }, 500);
  }
});
