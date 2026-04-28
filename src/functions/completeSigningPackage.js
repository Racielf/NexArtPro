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

function sortParticipants(rows = []) {
  return [...rows].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
}

function getActiveParticipant(participants = []) {
  const ordered = sortParticipants(participants);
  return ordered.find(p => p.status === 'active') || ordered.find(p => p.status === 'pending') || null;
}

function randomTokenPart() {
  return crypto.randomUUID().replace(/-/g, '');
}

function buildParticipantToken(pkgId, participantId) {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

async function ensureParticipantToken(base44, pkgId, participant) {
  if (!participant) return '';
  if (participant.token) return participant.token;
  const token = buildParticipantToken(pkgId, participant.id || 'participant');
  await base44.asServiceRole.entities.SigningParticipant.update(participant.id, { token }).catch(() => {});
  participant.token = token;
  return token;
}

async function resolveSigningContext(base44, token) {
  const participantRows = await base44.asServiceRole.entities.SigningParticipant.filter({ token }).catch(() => []);
  let matchedParticipant = participantRows?.[0] || null;
  let pkg = null;

  if (matchedParticipant?.signing_package_id) {
    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ id: matchedParticipant.signing_package_id }).catch(() => []);
    pkg = pkgRows?.[0] || null;
  }

  if (!pkg) {
    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ token }).catch(() => []);
    pkg = pkgRows?.[0] || null;
  }

  if (!pkg) return null;

  const participants = await base44.asServiceRole.entities.SigningParticipant
    .filter({ signing_package_id: pkg.id })
    .catch(() => []);

  const orderedParticipants = sortParticipants(participants);
  const hasParticipants = orderedParticipants.length > 0;
  let activeParticipant = hasParticipants ? getActiveParticipant(orderedParticipants) : null;

  if (activeParticipant && activeParticipant.status === 'pending') {
    await base44.asServiceRole.entities.SigningParticipant.update(activeParticipant.id, { status: 'active' }).catch(() => {});
    activeParticipant.status = 'active';
  }

  if (activeParticipant) {
    await ensureParticipantToken(base44, pkg.id, activeParticipant);
  }

  if (matchedParticipant) {
    matchedParticipant = orderedParticipants.find(p => p.id === matchedParticipant.id) || matchedParticipant;
    if (!matchedParticipant.token) {
      await ensureParticipantToken(base44, pkg.id, matchedParticipant);
    }
  }

  return {
    pkg,
    participants: orderedParticipants,
    hasParticipants,
    matchedParticipant,
    activeParticipant,
  };
}

function resolveParentEntity(base44, documentType) {
  const entityNameMap = {
    estimate: 'Estimate',
    proposal: 'Proposal',
    invoice: 'Invoice',
    work_order: 'WorkOrder',
  };
  const entityName = entityNameMap[documentType];
  return entityName ? base44.asServiceRole.entities[entityName] : null;
}

async function updateParentDocument(base44, pkg, patch) {
  const entityApi = resolveParentEntity(base44, pkg.document_type);
  if (!entityApi || !pkg.document_id) return;
  await entityApi.update(pkg.document_id, patch).catch(() => {});
}

async function getParentDocument(base44, pkg) {
  const entityApi = resolveParentEntity(base44, pkg.document_type);
  if (!entityApi || !pkg.document_id) return null;
  const rows = await entityApi.filter({ id: pkg.document_id }).catch(() => []);
  return rows?.[0] || null;
}

async function createCompletionCertificate(base44, pkg, signer, signerEmail, now, ip, ua) {
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
      document_type: pkg.document_type,
      document_title: pkg.document_title || '',
      document_number: pkg.document_number || '',
      signer_name: signer,
      signer_email: signerEmail || pkg.signer_email,
      signed_at: now,
      ip_address: ip,
      user_agent: ua,
      hash_algorithm: pkg.hash_algorithm || 'SHA-256',
      document_hash: pkg.source_pdf_hash || '',
      final_pdf_hash: pkg.source_pdf_hash || '',
      events: events || [],
      multi_signer: true,
    },
    company_id: pkg.company_id || '',
  });
  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { certificate_id: cert.id });
  return cert;
}

function buildGenericSignatureCertificate({ pkg, cert, document, signer, signerEmail, signedAt, finalPdfUrl, finalPdfName, finalPdfHash, ip, ua, events }) {
  return {
    certificate_type: 'electronic_signature_certificate',
    generated_at: cert?.generated_at || signedAt,
    provider: 'nexartsign',
    signing_package_id: pkg.id,
    signing_certificate_id: cert?.id || '',
    document_id: pkg.document_id || document?.id || '',
    document_type: pkg.document_type || '',
    document_number: pkg.document_number || '',
    document_title: pkg.document_title || document?.title || '',
    signer_name: signer,
    signer_email: signerEmail || pkg.signer_email || '',
    signed_at: signedAt,
    terms_accepted: true,
    final_signed_pdf_url: finalPdfUrl,
    final_signed_pdf_name: finalPdfName,
    document_hash_algorithm: pkg.hash_algorithm || document?.document_hash_algorithm || 'SHA-256',
    document_hash: pkg.source_pdf_hash || document?.document_hash || finalPdfHash || '',
    signed_pdf_hash_algorithm: pkg.hash_algorithm || document?.signed_pdf_hash_algorithm || 'SHA-256',
    signed_pdf_hash: finalPdfHash || pkg.final_pdf_hash || pkg.source_pdf_hash || '',
    audit: {
      certificate_id: cert?.id || '',
      certificate_number: cert?.certificate_number || '',
      ip_address: ip,
      user_agent: ua,
      audit_trail: events || [],
    },
    integrity_statement: 'This signing package was finalized by the NexArtSign backend. The signed copy and audit trail are locked to this completion event.',
  };
}

async function finalizeGenericSignedState(base44, pkg, cert, signer, signerEmail, now, ip, ua) {
  const document = await getParentDocument(base44, pkg);
  if (!document) return null;

  const events = await base44.asServiceRole.entities.SigningEvent.filter({ signing_package_id: pkg.id }, 'created_at').catch(() => []);
  const finalPdfUrl = pkg.final_pdf_url || pkg.source_pdf_url || document.final_signed_pdf_url || '';
  const finalPdfName = pkg.final_pdf_name || pkg.source_pdf_name || document.final_signed_pdf_name || '';
  const finalPdfHash = pkg.final_pdf_hash || pkg.source_pdf_hash || document.signed_pdf_hash || document.document_hash || '';

  const signatureCertificate = buildGenericSignatureCertificate({
    pkg,
    cert,
    document,
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
      certificate_json: {
        ...(cert.certificate_json || {}),
        document_type: pkg.document_type,
        document_title: pkg.document_title || document.title || '',
        document_number: pkg.document_number || '',
        final_pdf_url: finalPdfUrl,
        final_pdf_name: finalPdfName,
        final_pdf_hash: finalPdfHash,
        finalized_in_backend: true,
      },
    }).catch(() => {});
  }

  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
    audit_summary: {
      ...(pkg.audit_summary || {}),
      certificate_id: cert?.id || '',
      certificate_number: cert?.certificate_number || '',
      final_pdf_hash: finalPdfHash,
      finalized_at: now,
      finalized_in_backend: true,
    },
  }).catch(() => {});

  const commonPatch = {
    signing_package_id: pkg.id,
    signature_status: 'signed',
    signature_provider: 'internal',
    signed_at: now,
    accepted_by: signer,
    signature_name: signer,
    terms_accepted: true,
    locked_after_signature: true,
    legal_package_locked: true,
    final_signed_at: now,
    final_signed_pdf_url: finalPdfUrl,
    final_signed_pdf_name: finalPdfName,
    signed_pdf_hash: finalPdfHash,
    signed_pdf_hash_algorithm: pkg.hash_algorithm || document.signed_pdf_hash_algorithm || 'SHA-256',
    signature_certificate: signatureCertificate,
    certificate_generated_at: cert?.generated_at || now,
    legal_audit: {
      ...(document.legal_audit || {}),
      signing_package_id: pkg.id,
      certificate_id: cert?.id || '',
      certificate_number: cert?.certificate_number || '',
      last_signed_at: now,
      ip_address: ip,
      user_agent: ua,
      backend_finalized: true,
      events_recorded: Array.isArray(events) ? events.length : 0,
    },
  };

  if (pkg.document_type === 'proposal') {
    await base44.asServiceRole.entities.Proposal.update(pkg.document_id, {
      ...commonPatch,
      status: ['converted_to_invoice', 'converted_to_work_order'].includes(document.status) ? document.status : 'accepted',
      accepted_at: document.accepted_at || now,
      accepted_ip: ip,
      accepted_user_agent: ua,
      accepted_by_name: signer,
      signature_on_file: true,
      acceptance_proof: {
        ...(document.acceptance_proof || {}),
        signing_package_id: pkg.id,
        certificate_id: cert?.id || '',
        certificate_number: cert?.certificate_number || '',
        signer_name: signer,
        signer_email: signerEmail || pkg.signer_email || '',
        signed_at: now,
        ip_address: ip,
        user_agent: ua,
        final_pdf_hash: finalPdfHash,
      },
    }).catch(() => {});
    return;
  }

  const entityApi = resolveParentEntity(base44, pkg.document_type);
  if (!entityApi || !pkg.document_id) return;
  await entityApi.update(pkg.document_id, commonPatch).catch(() => {});
}

async function finalizeGenericDeclineState(base44, pkg, now, ip, ua, declinedReason) {
  const document = await getParentDocument(base44, pkg);
  if (!document) return null;

  const commonPatch = {
    signing_package_id: pkg.id,
    signature_status: 'declined',
    declined_at: now,
    declined_reason: declinedReason || '',
    legal_audit: {
      ...(document.legal_audit || {}),
      signing_package_id: pkg.id,
      declined_at: now,
      declined_reason: declinedReason || '',
      ip_address: ip,
      user_agent: ua,
      backend_finalized: true,
    },
  };

  if (pkg.document_type === 'proposal') {
    await base44.asServiceRole.entities.Proposal.update(pkg.document_id, {
      ...commonPatch,
      status: 'rejected',
      rejected_at: now,
      rejected_reason: declinedReason || '',
    }).catch(() => {});
    return;
  }

  const entityApi = resolveParentEntity(base44, pkg.document_type);
  if (!entityApi || !pkg.document_id) return;
  await entityApi.update(pkg.document_id, commonPatch).catch(() => {});
}

async function closePackageAsSigned(base44, pkg, signer, signerEmail, now, ip, ua) {
  await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
    status: 'signed',
    signed_at: now,
    signer_name: signer,
    final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
    final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
    final_pdf_hash: pkg.source_pdf_hash || pkg.final_pdf_hash || '',
  });

  const cert = await createCompletionCertificate(base44, pkg, signer, signerEmail, now, ip, ua);

  const commonSignedPatch = {
    signing_package_id: pkg.id,
    signed_at: now,
    signature_status: 'signed',
    signature_provider: 'internal',
    accepted_by: signer,
    signature_name: signer,
    terms_accepted: true,
    locked_after_signature: true,
  };

  if (pkg.document_type === 'estimate') {
    await updateParentDocument(base44, pkg, {
      status: 'signed',
      approved_at: now,
      ...commonSignedPatch,
    });
  } else if (pkg.document_type === 'proposal') {
    await updateParentDocument(base44, pkg, {
      status: 'accepted',
      accepted_at: now,
      accepted_by_name: signer,
      signature_on_file: true,
      ...commonSignedPatch,
    });
    await finalizeGenericSignedState(base44, {
      ...pkg,
      final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
      final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
      final_pdf_hash: pkg.source_pdf_hash || pkg.final_pdf_hash || '',
    }, cert, signer, signerEmail, now, ip, ua).catch(() => {});
  } else {
    await updateParentDocument(base44, pkg, commonSignedPatch);
    await finalizeGenericSignedState(base44, {
      ...pkg,
      final_pdf_url: pkg.source_pdf_url || pkg.final_pdf_url || '',
      final_pdf_name: pkg.source_pdf_name || pkg.final_pdf_name || '',
      final_pdf_hash: pkg.source_pdf_hash || pkg.final_pdf_hash || '',
    }, cert, signer, signerEmail, now, ip, ua).catch(() => {});
  }

  return cert;
}

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, action, signer_name, declined_reason } = await req.json();

    if (!token || !action) return response({ error: 'Missing token or action' }, 400);

    const context = await resolveSigningContext(base44, token);
    if (!context?.pkg) return response({ error: 'Not found' }, 404);

    const { pkg, hasParticipants, matchedParticipant, activeParticipant } = context;
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

    if (hasParticipants) {
      if (!matchedParticipant) {
        return response({ error: 'Participant signing token required', code: 'participant_token_required' }, 409);
      }

      if (!activeParticipant || matchedParticipant.id !== activeParticipant.id || matchedParticipant.status !== 'active') {
        return response({ error: 'This signing link is not active for the current signer', code: 'participant_not_active' }, 409);
      }
    }

    if (action === 'decline') {
      if (hasParticipants && matchedParticipant) {
        await base44.asServiceRole.entities.SigningParticipant.update(matchedParticipant.id, {
          status: 'declined',
          declined_at: now,
          declined_reason: declined_reason || '',
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
        actor_name: signer_name || matchedParticipant?.name || pkg.signer_name || '',
        actor_email: matchedParticipant?.email || pkg.signer_email,
        ip_address: ip,
        user_agent: ua,
        metadata: hasParticipants ? { participant_id: matchedParticipant?.id, role: matchedParticipant?.role } : {},
        created_at: now,
      });

      if (pkg.document_type === 'estimate') {
        await updateParentDocument(base44, pkg, {
          status: 'declined',
          signature_status: 'declined',
          signing_package_id: pkg.id,
          declined_at: now,
          declined_reason: declined_reason || '',
        });
      } else if (pkg.document_type === 'proposal') {
        await finalizeGenericDeclineState(base44, pkg, now, ip, ua, declined_reason || pkg.declined_reason || '').catch(() => {});
      } else {
        await finalizeGenericDeclineState(base44, pkg, now, ip, ua, declined_reason || '').catch(() => {});
      }

      return response({ success: true, status: 'declined', document_type: pkg.document_type, document_id: pkg.document_id, signing_package_id: pkg.id });
    }

    if (action !== 'approve') return response({ error: 'Invalid action' }, 400);

    if (hasParticipants) {
      const signer = signer_name || matchedParticipant.name || pkg.signer_name || pkg.client_name || '';
      await base44.asServiceRole.entities.SigningParticipant.update(matchedParticipant.id, {
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
        actor_email: matchedParticipant.email,
        ip_address: ip,
        user_agent: ua,
        metadata: { participant_id: matchedParticipant.id, role: matchedParticipant.role, signing_order: matchedParticipant.signing_order || 1 },
        created_at: now,
      });

      const refreshed = await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
      const remaining = sortParticipants(refreshed).filter(p => !['signed', 'declined', 'skipped', 'voided'].includes(p.status));
      const next = remaining[0] || null;

      if (next) {
        const nextToken = await ensureParticipantToken(base44, pkg.id, next);
        await base44.asServiceRole.entities.SigningParticipant.update(next.id, {
          status: 'active',
          sent_at: next.sent_at || now,
        }).catch(() => {});
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
          next_participant_token: nextToken || '',
          document_type: pkg.document_type,
          document_id: pkg.document_id,
          signing_package_id: pkg.id,
        });
      }

      const cert = await closePackageAsSigned(base44, pkg, signer, matchedParticipant.email, now, ip, ua);
      return response({
        success: true,
        status: 'signed',
        certificate_id: cert.id,
        certificate_number: cert.certificate_number || '',
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
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      signing_package_id: pkg.id,
    });
  } catch (err) {
    return response({ error: err.message || 'Server error' }, 500);
  }
};