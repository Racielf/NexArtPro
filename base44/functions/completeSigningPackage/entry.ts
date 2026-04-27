import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getIp(req: Request) {
  const xf = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || xf.split(',')[0].trim() || '';
}

function sortParticipants(rows: any[] = []) {
  return [...rows].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
}

function getActiveParticipant(participants: any[] = []) {
  const ordered = sortParticipants(participants);
  return ordered.find(p => p.status === 'active') || ordered.find(p => p.status === 'pending') || null;
}

async function createCompletionCertificate(base44: any, pkg: any, signer: string, signerEmail: string, now: string, ip: string, ua: string) {
  const events = await base44.asServiceRole.entities.SigningEvent.filter({ signing_package_id: pkg.id }, 'created_at').catch(() => []);
  const cert = await base44.asServiceRole.entities.SigningCertificate.create({
    signing_package_id: pkg.id,
    document_type: pkg.document_type,
    document_id: pkg.document_id,
    certificate_number: `NS-${Date.now()}`,
    generated_at: now,
    signer_name: signer,
    signer_email: signerEmail || pkg.signer_email,
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
      signer_email: signerEmail || pkg.signer_email,
      signed_at: now,
      ip_address: ip,
      multi_signer: true,
    },
    company_id: pkg.company_id || 'rc-art',
  });
  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { certificate_id: cert.id });
  return cert;
}

async function closePackageAsSigned(base44: any, pkg: any, signer: string, signerEmail: string, now: string, ip: string, ua: string) {
  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
    status: 'signed',
    signed_at: now,
    signer_name: signer,
    final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
    final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
    final_pdf_hash: pkg.source_pdf_hash || pkg.final_pdf_hash || '',
  });

  const cert = await createCompletionCertificate(base44, pkg, signer, signerEmail, now, ip, ua);

  if (pkg.document_type === 'estimate' && pkg.document_id) {
    await base44.asServiceRole.entities.Estimate.update(pkg.document_id, {
      status: 'signed',
      signature_status: 'signed',
      signed_at: now,
      approved_at: now,
      accepted_by: signer,
      signature_name: signer,
      signature_provider: 'internal',
      signing_package_id: pkg.id,
      terms_accepted: true,
      locked_after_signature: true,
    }).catch(() => {});
  }

  return cert;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, action, signer_name, declined_reason } = await req.json();

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

    const participants = await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
    const hasParticipants = Array.isArray(participants) && participants.length > 0;
    const activeParticipant = hasParticipants ? getActiveParticipant(participants) : null;

    if (action === 'decline') {
      if (hasParticipants && activeParticipant) {
        await base44.asServiceRole.entities.SigningParticipant.update(activeParticipant.id, {
          status: 'declined',
          declined_at: now,
          ip_address: ip,
          user_agent: ua,
        });
      }

      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
        status: 'declined',
        declined_at: now,
        declined_reason: declined_reason || '',
      });

      await base44.asServiceRole.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'declined',
        actor_name: signer_name || activeParticipant?.name || pkg.signer_name || '',
        actor_email: activeParticipant?.email || pkg.signer_email,
        ip_address: ip,
        user_agent: ua,
        metadata: hasParticipants ? { participant_id: activeParticipant?.id, role: activeParticipant?.role } : {},
        created_at: now,
      });

      if (pkg.document_type === 'estimate' && pkg.document_id) {
        await base44.asServiceRole.entities.Estimate.update(pkg.document_id, {
          status: 'declined',
          signature_status: 'declined',
          signing_package_id: pkg.id,
          declined_at: now,
          declined_reason: declined_reason || '',
        }).catch(() => {});
      }

      return response({ success: true, status: 'declined', document_type: pkg.document_type, document_id: pkg.document_id, signing_package_id: pkg.id });
    }

    if (action !== 'approve') return response({ error: 'Invalid action' }, 400);

    if (hasParticipants) {
      if (!activeParticipant) return response({ error: 'No active participant found' }, 409);

      const signer = signer_name || activeParticipant.name || pkg.signer_name || pkg.client_name || '';
      await base44.asServiceRole.entities.SigningParticipant.update(activeParticipant.id, {
        status: 'signed',
        signed_at: now,
        name: signer,
        ip_address: ip,
        user_agent: ua,
      });

      await base44.asServiceRole.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'signed',
        actor_name: signer,
        actor_email: activeParticipant.email,
        ip_address: ip,
        user_agent: ua,
        metadata: { participant_id: activeParticipant.id, role: activeParticipant.role, signing_order: activeParticipant.signing_order || 1 },
        created_at: now,
      });

      const refreshed = await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
      const remaining = sortParticipants(refreshed).filter(p => !['signed', 'declined', 'skipped', 'voided'].includes(p.status));
      const next = remaining[0] || null;

      if (next) {
        await base44.asServiceRole.entities.SigningParticipant.update(next.id, { status: 'active' });
        await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { status: 'viewed' });
        await base44.asServiceRole.entities.SigningEvent.create({
          signing_package_id: pkg.id,
          document_type: pkg.document_type,
          document_id: pkg.document_id,
          event_type: 'participant_activated',
          actor_name: next.name || '',
          actor_email: next.email || '',
          metadata: { participant_id: next.id, role: next.role, signing_order: next.signing_order || 1 },
          created_at: now,
        }).catch(() => {});
        return response({ success: true, status: 'pending_next_signer', next_participant_id: next.id, document_type: pkg.document_type, document_id: pkg.document_id, signing_package_id: pkg.id });
      }

      const cert = await closePackageAsSigned(base44, pkg, signer, activeParticipant.email, now, ip, ua);
      return response({ success: true, status: 'signed', certificate_id: cert.id, document_type: pkg.document_type, document_id: pkg.document_id, signing_package_id: pkg.id });
    }

    const signer = signer_name || pkg.signer_name || pkg.client_name || '';
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

    const cert = await closePackageAsSigned(base44, pkg, signer, pkg.signer_email, now, ip, ua);
    return response({ success: true, status: 'signed', certificate_id: cert.id, document_type: pkg.document_type, document_id: pkg.document_id, signing_package_id: pkg.id });
  } catch (err: any) {
    return response({ error: err.message || 'Server error' }, 500);
  }
});
