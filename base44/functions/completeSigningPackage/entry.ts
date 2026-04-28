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

function randomTokenPart() {
  return crypto.randomUUID().replace(/-/g, '');
}

function buildParticipantToken(pkgId: string, participantId: string) {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

function buildWorkOrderNumber() {
  return Date.now();
}

function buildTasksFromEstimate(estimate: any) {
  const groups = Array.isArray(estimate?.groups) ? estimate.groups : [];
  const tasks: any[] = [];

  groups.forEach((group: any, groupIndex: number) => {
    const items = Array.isArray(group?.items) ? group.items : [];
    items.forEach((item: any, itemIndex: number) => {
      tasks.push({
        id: item?.id || `${groupIndex}-${itemIndex}`,
        title: item?.name || item?.description || `Task ${tasks.length + 1}`,
        description: item?.description || group?.name || '',
        status: 'pending',
        assigned_to: '',
        order: tasks.length + 1,
      });
    });
  });

  return tasks;
}

function buildExecutionChecklist() {
  return [
    { id: 'materials_ready', item: 'Materials ready / verified', completed: false },
    { id: 'site_prepared', item: 'Job site prepared', completed: false },
    { id: 'work_completed', item: 'Work completed according to approved estimate', completed: false },
    { id: 'photos_uploaded', item: 'Completion photos uploaded', completed: false },
    { id: 'client_reviewed', item: 'Client reviewed completed work', completed: false },
  ];
}

function buildEstimateSnapshot(estimate: any) {
  return {
    estimate_number: estimate?.estimate_number,
    version: estimate?.version_number,
    total: estimate?.total,
    subtotal: estimate?.subtotal,
    materials_subtotal: estimate?.materials_subtotal,
    materials_cost: estimate?.materials_cost,
    other_costs_total: estimate?.other_costs_total,
    total_cost: estimate?.total_cost,
    gross_margin: estimate?.gross_margin,
    gross_margin_pct: estimate?.gross_margin_pct,
    payment_terms: estimate?.payment_terms,
    warranty_terms: estimate?.warranty_terms,
    exclusions: estimate?.exclusions,
    scope_summary: estimate?.scope_summary,
    assumptions: estimate?.assumptions,
    signed_at: estimate?.signed_at,
    signature_name: estimate?.signature_name,
    final_signed_pdf_url: estimate?.final_signed_pdf_url,
  };
}

async function ensureParticipantToken(base44: any, pkgId: string, participant: any) {
  if (!participant) return '';
  if (participant.token) return participant.token;
  const token = buildParticipantToken(pkgId, participant.id || 'participant');
  await base44.asServiceRole.entities.SigningParticipant.update(participant.id, { token }).catch(() => {});
  participant.token = token;
  return token;
}

async function resolveSigningContext(base44: any, token: string) {
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

  const participants = await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
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

async function convertSignedEstimateToWorkOrder(base44: any, estimate: any, actor: string, signedAt: string) {
  if (!estimate?.id) return null;
  if (!['approved', 'signed', 'converted'].includes(estimate?.status)) return null;
  if (estimate?.converted_work_order_id) return estimate.converted_work_order_id;

  const version = estimate.version_number || 1;
  const existing = await base44.asServiceRole.entities.WorkOrder.filter({
    estimate_id: estimate.id,
    estimate_version: version,
  }).catch(() => []);

  if (existing?.[0]?.id) {
    if (!estimate.converted_work_order_id) {
      await base44.asServiceRole.entities.Estimate.update(estimate.id, {
        status: 'converted',
        sales_stage: 'converted',
        converted_to_work_order_at: signedAt,
        converted_work_order_id: existing[0].id,
      }).catch(() => {});
    }
    return existing[0].id;
  }

  const workOrder = await base44.asServiceRole.entities.WorkOrder.create({
    work_order_number: buildWorkOrderNumber(),
    estimate_id: estimate.id,
    estimate_version: version,
    source_estimate_id: estimate.id,
    source_estimate_number: estimate.estimate_number,
    source_estimate_version: version,
    source_document_type: estimate.document_type,
    source_estimate_status: estimate.status,
    source_estimate_total: estimate.total || 0,
    source_estimate_signed_at: estimate.signed_at || signedAt,
    source_estimate_signed_by: estimate.signature_name || estimate.accepted_by || '',
    source_estimate_final_pdf_url: estimate.final_signed_pdf_url || '',
    source_estimate_snapshot: buildEstimateSnapshot(estimate),
    client_id: estimate.client_id || '',
    client_name: estimate.client_name || '',
    client_email: estimate.client_email || '',
    client_phone: estimate.client_phone || '',
    client_address: estimate.client_address || '',
    title: estimate.title || `Work Order from Estimate #${estimate.estimate_number || ''}`.trim(),
    description: estimate.notes || estimate.title || '',
    status: 'draft',
    groups: estimate.groups || [],
    line_items: estimate.line_items || [],
    materials: estimate.materials || [],
    other_costs: estimate.other_costs || [],
    subtotal: estimate.subtotal || 0,
    total: estimate.total || 0,
    materials_subtotal: estimate.materials_subtotal || 0,
    materials_cost: estimate.materials_cost || 0,
    other_costs_total: estimate.other_costs_total || 0,
    total_cost: estimate.total_cost || 0,
    gross_margin: estimate.gross_margin || 0,
    gross_margin_pct: estimate.gross_margin_pct || 0,
    payment_terms: estimate.payment_terms || '',
    warranty_terms: estimate.warranty_terms || '',
    exclusions: estimate.exclusions || '',
    scope_summary: estimate.scope_summary || '',
    assumptions: estimate.assumptions || '',
    notes: estimate.notes || '',
    internal_notes: [
      `Created automatically from approved estimate #${estimate.estimate_number || ''}.`,
      `Converted by: ${actor}.`,
      `Assignment source: none.`,
      `Converted at: ${signedAt}.`,
    ].filter(Boolean).join('\n'),
    tasks: buildTasksFromEstimate(estimate),
    execution_checklist: buildExecutionChecklist(),
    field_notes: [],
    assignment_source: 'none',
    company_id: estimate.company_id || 'rc-art',
  }).catch(() => null);

  if (!workOrder?.id) return null;

  await base44.asServiceRole.entities.Estimate.update(estimate.id, {
    status: 'converted',
    sales_stage: 'converted',
    converted_to_work_order_at: signedAt,
    converted_work_order_id: workOrder.id,
  }).catch(() => {});

  return workOrder.id;
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

  const convertedWorkOrderId = await convertSignedEstimateToWorkOrder(base44, {
    ...estimate,
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
  }, 'nexartsign-backend', now).catch(() => null);

  await base44.asServiceRole.entities.Estimate.update(estimate.id, {
    status: convertedWorkOrderId ? 'converted' : 'signed',
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
    converted_to_work_order_at: convertedWorkOrderId ? now : estimate.converted_to_work_order_at || '',
    converted_work_order_id: convertedWorkOrderId || estimate.converted_work_order_id || '',
    sales_stage: convertedWorkOrderId ? 'converted' : estimate.sales_stage,
    legal_audit: {
      ...(estimate.legal_audit || {}),
      signing_package_id: pkg.id,
      certificate_id: cert?.id || '',
      certificate_number: cert?.certificate_number || '',
      last_signed_at: now,
      ip_address: ip,
      user_agent: ua,
      backend_finalized: true,
      backend_work_order_conversion: Boolean(convertedWorkOrderId),
      events_recorded: Array.isArray(events) ? events.length : 0,
    },
  }).catch(() => {});

  return {
    signatureCertificate,
    convertedWorkOrderId,
  };
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

    if (hasParticipants && matchedParticipant) {
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