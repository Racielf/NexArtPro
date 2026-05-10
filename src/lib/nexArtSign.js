import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { APP_CONFIG } from '@/lib/appConfig';
import { loadCompanySettings } from '@/lib/companySettings';

const CLOSED_PACKAGE_STATUSES = new Set(['signed', 'declined', 'expired', 'voided']);
const CLOSED_PARTICIPANT_STATUSES = new Set(['signed', 'declined', 'skipped', 'voided']);

function randomTokenPart() {
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value = '') {
  const bytes = new TextEncoder().encode(String(value || ''));
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildParticipantToken(pkgId, participantId) {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

function buildPackageToken(documentId) {
  return `ns_${documentId}_${randomTokenPart()}`;
}

function buildSigningUrl(rawToken) {
  if (!rawToken) return '';

  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${window.location.origin}${base}/sign-document?token=${encodeURIComponent(rawToken)}`;
}

async function buildTokenFields(rawToken, issuedAt = new Date().toISOString()) {
  return {
    token: '',
    token_hash: await sha256Hex(rawToken),
    token_last_four: rawToken.slice(-4),
    token_created_at: issuedAt,
  };
}

async function backfillLegacyToken(entityApi, record) {
  if (!record?.id || !record?.token || record?.token_hash) return record;
  const fields = await buildTokenFields(record.token, record.token_created_at || new Date().toISOString());
  await entityApi.update(record.id, fields).catch(() => {});
  return { ...record, ...fields };
}

function normalizeParticipantRole(role, fallback = 'other') {
  const allowed = new Set(['client', 'owner', 'office', 'technician', 'witness', 'other']);
  const normalized = String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function resolveCompanyId({ settings = {}, currentUser = null, estimate = null, pkg = null } = {}) {
  const userCompanySettings = currentUser?.company_settings && typeof currentUser.company_settings === 'object'
    ? currentUser.company_settings
    : {};

  return String(
    pkg?.company_id
      || estimate?.company_id
      || settings?.company_id
      || settings?.id
      || userCompanySettings?.company_id
      || userCompanySettings?.id
      || currentUser?.company_id
      || currentUser?.company?.id
      || APP_CONFIG?.company?.id
      || 'default-company'
  ).trim();
}

function buildEstimateSigningParticipants({ estimate, currentUser }) {
  const configuredParticipants = Array.isArray(estimate?.document_config?.signing_participants)
    ? estimate.document_config.signing_participants
    : [];

  const participants = [];
  const seenKeys = new Set();

  const pushParticipant = (participant) => {
    const name = String(participant?.name || '').trim();
    const email = normalizeEmail(participant?.email);
    if (!email) return;

    const role = normalizeParticipantRole(participant?.role, participant?.fallbackRole || 'other');
    const signingOrder = Number(participant?.signing_order);
    const metadata = participant?.metadata && typeof participant.metadata === 'object' ? participant.metadata : undefined;
    const key = `${email}::${role}::${Number.isFinite(signingOrder) ? signingOrder : participants.length + 1}`;

    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    participants.push({
      role,
      name,
      email,
      phone: String(participant?.phone || '').trim(),
      signing_order: Number.isFinite(signingOrder) && signingOrder > 0 ? signingOrder : participants.length + 1,
      metadata,
    });
  };

  pushParticipant({
    role: 'client',
    name: estimate?.client_name || '',
    email: estimate?.client_email || '',
    phone: estimate?.client_phone || '',
    signing_order: 1,
    metadata: { source: 'estimate_client' },
  });

  configuredParticipants.forEach((participant, index) => {
    pushParticipant({
      ...participant,
      signing_order: Number.isFinite(Number(participant?.signing_order))
        ? Number(participant.signing_order)
        : index + 2,
      metadata: {
        ...(participant?.metadata && typeof participant.metadata === 'object' ? participant.metadata : {}),
        source: participant?.metadata?.source || 'document_config',
      },
    });
  });

  if (participants.length === 0 && currentUser?.email) {
    pushParticipant({
      role: 'owner',
      name: currentUser?.full_name || currentUser?.email,
      email: currentUser?.email,
      signing_order: 1,
      metadata: { source: 'fallback_owner' },
    });
  }

  return participants
    .sort((a, b) => a.signing_order - b.signing_order)
    .map((participant, index) => ({
      ...participant,
      signing_order: index + 1,
      status: index === 0 ? 'active' : 'pending',
    }));
}

async function issueSigningAccessForPackage({ pkg }) {
  if (!pkg?.id) return { token: '', signing_url: '', scope: 'package' };

  try {
    // Call Edge Function — token generation and hashing happen server-side for security
    const { data, error } = await supabase.functions.invoke('issueSigningAccessLink', {
      body: { signing_package_id: pkg.id, app_base_url: `${window.location.origin}${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}` },
    });

    if (error) throw error;
    if (data?.signing_url) {
      return {
        token: '',   // raw token stays server-side
        signing_url: data.signing_url,
        scope: data.token_scope || 'package',
        participant_id: data.participant_id || '',
      };
    }
  } catch (err) {
    console.warn('[nexArtSign] issueSigningAccessLink Edge Function failed, falling back to client-side token:', err?.message);
  }

  // Fallback: client-side token (used in dev/local when Edge Functions are not deployed)
  const now = new Date().toISOString();
  const ordered = [];
  const existing = await base44.entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
  const sorted = [...(existing || [])].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
  const activeParticipant = sorted.find((p) => p.status === 'active')
    || sorted.find((p) => !CLOSED_PARTICIPANT_STATUSES.has(p.status));

  if (activeParticipant?.id) {
    const token = buildParticipantToken(pkg.id, activeParticipant.id);
    const fields = await buildTokenFields(token, now);
    await base44.entities.SigningParticipant.update(activeParticipant.id, {
      ...fields,
      status: activeParticipant.status === 'pending' ? 'active' : activeParticipant.status,
      sent_at: activeParticipant.sent_at || pkg.sent_at || now,
    }).catch(() => {});
    return { token, signing_url: buildSigningUrl(token), scope: 'participant', participant_id: activeParticipant.id };
  }

  const token = buildPackageToken(pkg.document_id || pkg.id);
  const fields = await buildTokenFields(token, now);
  await base44.entities.SigningPackage.update(pkg.id, fields).catch(() => {});
  return { token, signing_url: buildSigningUrl(token), scope: 'package', participant_id: '' };
}

async function syncSigningParticipants({ pkg, estimate, currentUser }) {
  if (!pkg?.id) return [];

  const companyId = resolveCompanyId({ currentUser, estimate, pkg });
  const desiredParticipants = buildEstimateSigningParticipants({ estimate, currentUser });
  if (desiredParticipants.length === 0) return [];

  const existingParticipants = await base44.entities.SigningParticipant
    .filter({ signing_package_id: pkg.id })
    .catch(() => []);

  const existingByEmail = new Map(
    (existingParticipants || []).map((participant) => [normalizeEmail(participant.email), participant])
  );

  const touchedParticipantIds = [];
  const newlyCreated = [];

  for (const participant of desiredParticipants) {
    const existing = existingByEmail.get(participant.email);
    const patch = {
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      role: participant.role,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      signing_order: participant.signing_order,
      metadata: participant.metadata || {},
      company_id: companyId,
    };

    if (existing?.id) {
      const legacyFields = existing.token && !existing.token_hash
        ? await buildTokenFields(existing.token, existing.token_created_at || pkg.sent_at || new Date().toISOString())
        : (existing.token ? { token: '' } : {});
      const nextStatus = CLOSED_PARTICIPANT_STATUSES.has(existing.status)
        ? existing.status
        : participant.status;
      await base44.entities.SigningParticipant.update(existing.id, {
        ...patch,
        ...legacyFields,
        status: nextStatus,
      }).catch(() => {});
      touchedParticipantIds.push(existing.id);
      continue;
    }

    const created = await base44.entities.SigningParticipant.create({
      signing_package_id: pkg.id,
      ...patch,
      status: participant.status,
      sent_at: pkg.sent_at || new Date().toISOString(),
      token: '',
      token_hash: '',
      token_last_four: '',
    });

    if (created?.id) {
      touchedParticipantIds.push(created.id);
      newlyCreated.push(created);
    }
  }

  const staleParticipants = (existingParticipants || []).filter(
    (participant) => participant?.id && !touchedParticipantIds.includes(participant.id)
  );

  for (const participant of staleParticipants) {
    if (['signed', 'declined', 'voided'].includes(participant.status)) continue;
    await base44.entities.SigningParticipant.update(participant.id, {
      status: 'voided',
      token: '',
      token_hash: '',
      token_last_four: '',
      metadata: {
        ...(participant.metadata || {}),
        voided_reason: 'removed_from_current_signing_configuration',
      },
    }).catch(() => {});
  }

  const refreshedParticipants = await base44.entities.SigningParticipant
    .filter({ signing_package_id: pkg.id })
    .catch(() => []);

  const orderedParticipants = [...(refreshedParticipants || [])]
    .sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));

  const activeParticipant = orderedParticipants.find((participant) => participant.status === 'active');
  const nextPendingParticipant = orderedParticipants.find((participant) => !CLOSED_PARTICIPANT_STATUSES.has(participant.status));

  if (!activeParticipant && nextPendingParticipant?.id) {
    await base44.entities.SigningParticipant.update(nextPendingParticipant.id, {
      status: 'active',
      sent_at: nextPendingParticipant.sent_at || pkg.sent_at || new Date().toISOString(),
    }).catch(() => {});
  }

  const normalizedParticipants = (await base44.entities.SigningParticipant
    .filter({ signing_package_id: pkg.id })
    .catch(() => []))
    .sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));

  const activeAfterSync = normalizedParticipants.find((participant) => participant.status === 'active')
    || normalizedParticipants.find((participant) => !CLOSED_PARTICIPANT_STATUSES.has(participant.status))
    || null;

  const packageStatus = activeAfterSync ? (pkg.status === 'draft' ? 'sent' : pkg.status || 'sent') : 'signed';
  const packageSignerName = activeAfterSync?.name || pkg.signer_name || estimate?.client_name || '';
  const packageSignerEmail = activeAfterSync?.email || pkg.signer_email || estimate?.client_email || '';

  await base44.entities.SigningPackage.update(pkg.id, {
    status: packageStatus,
    company_id: companyId,
    signer_name: packageSignerName,
    signer_email: packageSignerEmail,
    signer_phone: activeAfterSync?.phone || pkg.signer_phone || estimate?.client_phone || '',
    audit_summary: {
      ...(pkg.audit_summary || {}),
      company_id: companyId,
      participants_count: normalizedParticipants.length,
      active_participant_id: activeAfterSync?.id || '',
      active_participant_role: activeAfterSync?.role || '',
      signing_sequence_enabled: normalizedParticipants.length > 1,
    },
  }).catch(() => {});

  if (newlyCreated.length > 0) {
    await base44.entities.SigningEvent.create({
      signing_package_id: pkg.id,
      document_type: pkg.document_type,
      document_id: pkg.document_id,
      event_type: 'participants_created',
      actor_name: currentUser?.full_name || currentUser?.email || 'system',
      actor_email: currentUser?.email || '',
      created_at: new Date().toISOString(),
      metadata: {
        participants_count: normalizedParticipants.length,
        created_count: newlyCreated.length,
        signing_orders: normalizedParticipants.map((participant) => ({
          id: participant.id,
          email: participant.email,
          role: participant.role,
          signing_order: participant.signing_order,
          status: participant.status,
        })),
      },
      company_id: companyId,
    }).catch(() => {});
  }

  if (activeAfterSync?.id) {
    const alreadyActivated = await base44.entities.SigningEvent
      .filter({ signing_package_id: pkg.id, event_type: 'participant_activated' })
      .catch(() => []);

    const activeAlreadyLogged = (alreadyActivated || []).some((event) => {
      const participantId = event?.metadata?.participant_id || event?.metadata?.participantId;
      return participantId === activeAfterSync.id;
    });

    if (!activeAlreadyLogged) {
      await base44.entities.SigningEvent.create({
        signing_package_id: pkg.id,
        document_type: pkg.document_type,
        document_id: pkg.document_id,
        event_type: 'participant_activated',
        actor_name: activeAfterSync.name || '',
        actor_email: activeAfterSync.email || '',
        created_at: new Date().toISOString(),
        metadata: {
          participant_id: activeAfterSync.id,
          role: activeAfterSync.role,
          signing_order: activeAfterSync.signing_order || 1,
        },
        company_id: companyId,
      }).catch(() => {});
    }
  }

  return normalizedParticipants;
}

async function resolveSigningBranding(currentUser = null, estimate = null) {
  let settings = {};

  try {
    settings = await loadCompanySettings() || {};
  } catch (err) {
    console.warn('[nexArtSign] company settings branding lookup failed, using fallback:', err?.message);
    settings = {};
  }

  const companySettings = currentUser?.company_settings && typeof currentUser.company_settings === 'object'
    ? currentUser.company_settings
    : {};

  const companyLogoUrl = settings?.logo_url
    || companySettings?.logo_url
    || APP_CONFIG?.company?.logo_url
    || '';

  const signatureBrandLogoUrl = settings?.nexartsign_logo_url
    || companySettings?.nexartsign_logo_url
    || settings?.app_logo_url
    || companySettings?.app_logo_url
    || APP_CONFIG?.app?.logo_url
    || '';

  const companyName = settings?.name
    || companySettings?.name
    || APP_CONFIG?.company?.name
    || 'R.C Art Construction LLC';

  const companyId = resolveCompanyId({ settings, currentUser, estimate });

  return {
    companyId,
    companyLogoUrl,
    signatureBrandLogoUrl,
    companyName,
  };
}

export async function createSigningPackageForEstimate({ estimate, pdfUrl = '', pdfName = '', pdfHash = '', currentUser = null }) {
  if (!estimate?.id) throw new Error('Estimate is required');

  const signingBranding = await resolveSigningBranding(currentUser, estimate);

  const existing = await base44.entities.SigningPackage.filter({
    document_type: 'estimate',
    document_id: estimate.id,
  }).catch(() => []);

  const reusable = (existing || []).find((pkg) => !CLOSED_PACKAGE_STATUSES.has(pkg.status));
  if (reusable?.id) {
    const normalizedReusable = await backfillLegacyToken(base44.entities.SigningPackage, reusable);
    const patch = {
      token: '',
      company_id: signingBranding.companyId,
    };
    if (pdfUrl && !normalizedReusable.source_pdf_url) patch.source_pdf_url = pdfUrl;
    if (pdfName && !normalizedReusable.source_pdf_name) patch.source_pdf_name = pdfName;
    if (pdfHash && !normalizedReusable.source_pdf_hash) patch.source_pdf_hash = pdfHash;
    if (signingBranding.signatureBrandLogoUrl && normalizedReusable.signature_brand_logo_url !== signingBranding.signatureBrandLogoUrl) {
      patch.signature_brand_logo_url = signingBranding.signatureBrandLogoUrl;
    }
    const nextAuditSummary = {
      ...(normalizedReusable.audit_summary || {}),
      company_id: signingBranding.companyId,
      company_logo_url: signingBranding.companyLogoUrl,
      company_name: signingBranding.companyName,
    };
    if (JSON.stringify(nextAuditSummary) !== JSON.stringify(normalizedReusable.audit_summary || {})) {
      patch.audit_summary = nextAuditSummary;
    }
    if (Object.keys(patch).length > 0) {
      await base44.entities.SigningPackage.update(normalizedReusable.id, patch).catch(() => {});
    }

    const refreshedReusable = Object.keys(patch).length > 0 ? { ...normalizedReusable, ...patch } : normalizedReusable;
    const participants = await syncSigningParticipants({ pkg: refreshedReusable, estimate, currentUser });
    const issuedAccess = await issueSigningAccessForPackage({ pkg: refreshedReusable, participants });

    return {
      ...refreshedReusable,
      token: issuedAccess.token,
      signing_url: issuedAccess.signing_url,
      access_scope: issuedAccess.scope,
      access_participant_id: issuedAccess.participant_id || '',
    };
  }

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
    token: '',
    token_hash: '',
    token_last_four: '',
    token_created_at: now,
    expires_at: expires,
    sent_at: now,
    source_pdf_url: pdfUrl || '',
    source_pdf_name: pdfName || '',
    source_pdf_hash: pdfHash || '',
    hash_algorithm: 'SHA-256',
    signature_brand_logo_url: signingBranding.signatureBrandLogoUrl,
    audit_summary: {
      company_id: signingBranding.companyId,
      company_logo_url: signingBranding.companyLogoUrl,
      company_name: signingBranding.companyName,
    },
    created_by: currentUser?.email || 'system',
    company_id: signingBranding.companyId,
  });

  await base44.entities.SigningEvent.create({
    signing_package_id: pkg.id,
    document_type: 'estimate',
    document_id: estimate.id,
    event_type: 'sent',
    actor_name: currentUser?.full_name || currentUser?.email || 'system',
    actor_email: currentUser?.email || '',
    created_at: now,
    metadata: { source_pdf_hash: pdfHash || '' },
    company_id: signingBranding.companyId,
  }).catch(() => {});

  const participants = await syncSigningParticipants({ pkg, estimate, currentUser });
  const issuedAccess = await issueSigningAccessForPackage({ pkg, participants });

  return {
    ...pkg,
    token: issuedAccess.token,
    signing_url: issuedAccess.signing_url,
    access_scope: issuedAccess.scope,
    access_participant_id: issuedAccess.participant_id || '',
  };
}
