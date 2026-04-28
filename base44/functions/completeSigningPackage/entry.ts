import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COMPANY_NAME = 'R.C Art Construction LLC';
const COMPANY_EMAIL = 'info@rcartconstruction.com';
const COMPANY_ROLE = 'authorized_representative';

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

function buildEstimateSignatureCertificate({
  estimate,
  pkg,
  cert,
  signer,
  signerEmail,
  signedAt,
  finalPdfUrl,
  finalPdfName,
  finalPdfHash,
  ip,
  ua,
  events,
}: any) {
  return {
    certificate_type: 'electronic_signature_certificate',
    generated_at: cert?.generated_at || signedAt,
    provider: 'nexartsign',
    signing_package_id: pkg.id,
    signing_certificate_id: cert?.id || '',
    document_id: estimate.id,
    document_type: estimate.document_type || 'ESTIMATE',
    estimate_number: estimate.estimate_number,
    signer_name: signer,
    signer_email: signerEmail || pkg.signer_email || estimate.client_email || '',
    signer_client_name: estimate.client_name || '',
    company_signature_name: estimate.company_signature_name || COMPANY_NAME,
    company_signature_email: estimate.company_signature_email || COMPANY_EMAIL,
    company_signed_at: estimate.company_signed_at || pkg.sent_at || estimate.sent_at || signedAt,
    company_signature_role: estimate.company_signature_role || COMPANY_ROLE,
    signed_at: signedAt,
    signature_method: estimate.signature_method || 'typed_name',
    terms_accepted: true,
    document_total: estimate.total || 0,
    final_signed_pdf_url: finalPdfUrl,
    final_signed_pdf_name: finalPdfName,
    document_hash_algorithm: pkg.hash_algorithm || estimate.document_hash_algorithm || 'SHA-256',
    document_hash: estimate.document_hash || pkg.source_pdf_hash || finalPdfHash || '',
    signed_pdf_hash_algorithm: pkg.hash_algorithm || estimate.signed_pdf_hash_algorithm || 'SHA-256',
    signed_pdf_hash: finalPdfHash || pkg.final_pdf_hash || pkg.source_pdf_hash || '',
    audit: {
      certificate_id: cert?.id || '',
      certificate_number: cert?.certificate_number || '',
      ip_address: ip,
      user_agent: ua,
      audit_trail: events || [],
    },
    integrity_statement: 'This signing package was finalized by the NexArtSign backend. The estimate is legally locked from the signing event onward.',
  };
}

async function finalizeEstimateLegalState(base44: any, pkg: any, cert: any, signer: string, signerEmail: string, now: string, ip: string, ua: string) {
  if (!pkg.document_id) return null;

  const estimateRows = await base44.asServiceRole.entities.Estimate.filter({ id: pkg.document_id }).catch(() => []);
  const estimate = estimateRows?.[0] || null;
  if (!estimate) return null;

  const events = await base44.asServiceRole.entities.SigningEvent.filter({ signing_package_id: pkg.id }, 'created_at').catch(() => []);
  const finalPdfUrl = pkg.final_pdf_url || pkg.source_pdf_url || estimate.final_signed_pdf_url || '';
  const finalPdfName = pkg.final_pdf_name || pkg.source_pdf_name || estimate.final_signed_pdf_name || '';
  const finalPdfHash = pkg.final_pdf_hash || pkg.source_pdf_hash || estimate.signed_pdf_hash || estimate.document_hash || '';

  const signatureCertificate = buildEstimateSignatureCertificate({
    estimate,
    pkg,
    cert,
    signer,
    signerEmail,
    signedAt: now,
    finalPdfUrl,
    finalPdfName,
    finalPdfHash,
    ip,
    ua,
    events,
  });

  if (cert?.id) {
    await base44.asServiceRole.entities.SigningCertificate.update(cert.id, {
      final_pdf_hash: finalPdfHash,
      certificate_pdf_url: finalPdfUrl || cert.certificate_pdf_url || '',
      audit_trail: events || cert.audit_trail || [],
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
    audit_summary: {
      certificate_id: cert?.id || '',
      certificate_number: cert?.certificate_number || '',
      final_pdf_hash: finalPdfHash,
      finalized_at: now,
      finalized_in_backend: true,
    },
  }).catch(() => {});

  await base44.asServiceRole.entities.Estimate.update(estimate.id, {
    status: estimate.converted_work_order_id ? 'converted' : 'signed',
    signature_status: 'signed',
    signed_at: now,
    approved_at: estimate.approved_at || now,
    accepted_by: signer,
    signature_name: signer,
    signature_provider: 'internal',
    signing_package_id: pkg.id,
    terms_accepted: true,
    locked_after_signature: true,
    legal_package_locked: true,
    final_signed_at: now,
    final_signed_pdf_url: finalPdfUrl,
    final_signed_pdf_name: finalPdfName,
    signed_pdf_hash: finalPdfHash,
    signed_pdf_hash_algorithm: pkg.hash_algorithm || estimate.signed_pdf_hash_algorithm || 'SHA-256',
    document_hash: estimate.document_hash || pkg.source_pdf_hash || finalPdfHash || '',
    document_hash_algorithm: estimate.document_hash_algorithm || pkg.hash_algorithm || 'SHA-256',
    company_signature_name: estimate.company_signature_name || COMPANY_NAME,
    company_signature_email: estimate.company_signature_email || COMPANY_EMAIL,
    company_signature_role: estimate.company_signature_role || COMPANY_ROLE,
    company_signed_at: estimate.company_signed_at || pkg.sent_at || estimate.sent_at || now,
    certificate_generated_at: cert?.generated_at || now,
    signature_certificate: signatureCertificate,
    legal_audit: {
      ...(estimate.legal_audit || {}),
      signing_package_id: pkg.id,
      certificate_id: cert?.id || '',
      certificate_number: cert?.certificate_number || '',
      last_signed_at: now,
      ip_address: ip,
      user_agent: ua,
      backend_finalized: true,
      events_recorded: Array.isArray(events) ? events.length : 0,
    },
  }).catch(() => {});

  return signatureCertificate;
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
    final_pdf_hash: pkg.final_pdf_hash || pkg.source_pdf_hash || '',
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
      finalized_in_backend: true,
    },
    company_id: pkg.company_id || 'rc-art',
  });
  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { certificate_id: cert.id });
  return cert;
}

async function closePackageAsSigned(base44: any, pkg: any, signer: string, signerEmail: string, now: string, ip: string, ua: string) {
  const finalizedPackage = {
    ...pkg,
    status: 'signed',
    signed_at: now,
    signer_name: signer,
    final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
    final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
    final_pdf_hash: pkg.source_pdf_hash || pkg.final_pdf_hash || '',
  };

  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
    status: finalizedPackage.status,
    signed_at: finalizedPackage.signed_at,
    signer_name: finalizedPackage.signer_name,
    final_pdf_url: finalizedPackage.final_pdf_url,
    final_pdf_name: finalizedPackage.final_pdf_name,
    final_pdf_hash: finalizedPackage.final_pdf_hash,
  });

  const cert = await createCompletionCertificate(base44, finalizedPackage, signer, signerEmail, now, ip, ua);

  if (finalizedPackage.document_type === 'estimate' && finalizedPackage.document_id) {
    await finalizeEstimateLegalState(base44, finalizedPackage, cert, signer, signerEmail, now, ip, ua).catch(() => null);
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
        return response({
          success: true,
          status: 'pending_next_signer',
          next_participant_id: next.id,
          next_participant_name: next.name || '',
          next_participant_email: next.email || '',
          document_type: pkg.document_type,
          document_id: pkg.document_id,
          signing_package_id: pkg.id,
        });
      }

      const cert = await closePackageAsSigned(base44, pkg, signer, activeParticipant.email, now, ip, ua);
      return response({
        success: true,
        status: 'signed',
        certificate_id: cert.id,
        certificate_number: cert.certificate_number || '',
        final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
        final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        signing_package_id: pkg.id,
      });
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
    return response({
      success: true,
      status: 'signed',
      certificate_id: cert.id,
      certificate_number: cert.certificate_number || '',
      final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
      final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      signing_package_id: pkg.id,
    });
  } catch (err: any) {
    return response({ error: err.message || 'Server error' }, 500);
  }
});