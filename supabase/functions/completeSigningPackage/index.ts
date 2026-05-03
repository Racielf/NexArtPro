/**
 * completeSigningPackage — Edge Function (Supabase)
 * The main signing engine: handles approve (sign), decline, PDF freeze,
 * certificate generation, and automatic Estimate → WorkOrder conversion.
 * 
 * Ported from nexartsign-pro-app: replaces Base44 SDK with Supabase direct queries.
 * Optimizations applied:
 * - Batch DB writes with Promise.all where independent
 * - Clear error logging with context
 * - Modular helper functions for testability
 */
import {
  createSupabaseAdmin,
  recordTokenAttempt,
  runNexArtSignSecurityPreflight,
  writeSecurityAuditLog,
} from '../_shared/nexartsignSecurity.ts';
import {
  otpScopeFromContext,
  otpStateFromContext,
  otpVerificationStatus,
  persistOtpState,
} from '../_shared/nexartsignOtp.ts';
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { json, corsOk, resolveSigningContext, sortParticipants } from '../_shared/signingContext.ts';

const COMPANY_NAME = 'R.C Art Construction LLC';
const COMPANY_EMAIL = 'info@rcartconstruction.com';
const COMPANY_ROLE = 'authorized_representative';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sha256HexFromBytes(bytes: Uint8Array) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function freezeSignedPdf(supabaseAdmin: any, pkg: any, now: string) {
  const sourceUrl = pkg.final_pdf_url || pkg.source_pdf_url || '';
  if (!sourceUrl) throw new Error('Final PDF lock failed: source PDF is not available.');

  // If internal path, get signed URL from Supabase Storage
  let readableUrl = sourceUrl;
  if (!sourceUrl.startsWith('http')) {
    const { data } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(sourceUrl, 3600);
    readableUrl = data?.signedUrl || sourceUrl;
  }

  const fileResponse = await fetch(readableUrl);
  if (!fileResponse.ok) throw new Error(`Final PDF lock failed: could not fetch source PDF (${fileResponse.status}).`);

  const arrayBuffer = await fileResponse.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const hash = await sha256HexFromBytes(bytes);
  if (!hash) throw new Error('Final PDF lock failed: hash could not be generated.');

  // Upload frozen copy to Supabase Storage
  const baseName = pkg.final_pdf_name || pkg.source_pdf_name || `signed-document-${pkg.document_number || pkg.id}.pdf`;
  const finalName = baseName.toLowerCase().endsWith('.pdf')
    ? baseName.replace(/\.pdf$/i, `-signed-${Date.now()}.pdf`)
    : `${baseName}-signed-${Date.now()}.pdf`;

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(`signed/${finalName}`, bytes, { contentType: 'application/pdf', upsert: true });

  const frozenUrl = uploadData?.path
    ? `signed/${finalName}`
    : sourceUrl; // fallback to source if upload fails

  if (uploadError) {
    console.error('[completeSigningPackage] PDF upload warning:', uploadError.message);
  }

  return {
    final_pdf_url: frozenUrl,
    final_pdf_name: finalName,
    final_pdf_hash: hash,
    frozen: true,
    frozen_at: now,
  };
}

async function revokeSigningTokens(entities: any, pkg: any, now: string) {
  if (!pkg?.id) return;

  const participants = await entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);

  // Batch: revoke package + all participants in parallel
  await Promise.all([
    entities.SigningPackage.update(pkg.id, {
      token: '', token_hash: '', token_last_four: '', token_revoked_at: now,
    }).catch(() => {}),
    ...(participants || []).map((p: any) =>
      p?.id ? entities.SigningParticipant.update(p.id, {
        token: '', token_hash: '', token_last_four: '', token_revoked_at: now,
      }).catch(() => {}) : Promise.resolve()
    ),
  ]);
}

function buildWorkOrderNumber() { return Date.now(); }

function buildTasksFromEstimate(estimate: any) {
  const groups = Array.isArray(estimate?.groups) ? estimate.groups : [];
  const tasks: any[] = [];
  groups.forEach((group: any, gi: number) => {
    const items = Array.isArray(group?.items) ? group.items : [];
    items.forEach((item: any, ii: number) => {
      tasks.push({
        id: item?.id || `${gi}-${ii}`,
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

async function convertSignedEstimateToWorkOrder(entities: any, estimate: any, actor: string, signedAt: string) {
  if (!estimate?.id) return null;
  if (!['approved', 'signed', 'converted'].includes(estimate?.status)) return null;
  if (estimate?.converted_work_order_id) return estimate.converted_work_order_id;

  const version = estimate.version_number || 1;
  const existing = await entities.WorkOrder.filter({ estimate_id: estimate.id, estimate_version: version }).catch(() => []);
  if (existing?.[0]?.id) {
    if (!estimate.converted_work_order_id) {
      await entities.Estimate.update(estimate.id, {
        status: 'converted', sales_stage: 'converted',
        converted_to_work_order_at: signedAt,
        converted_work_order_id: existing[0].id,
      }).catch(() => {});
    }
    return existing[0].id;
  }

  const workOrder = await entities.WorkOrder.create({
    work_order_number: buildWorkOrderNumber(),
    estimate_id: estimate.id,
    estimate_version: version,
    source_estimate_id: estimate.id,
    source_estimate_number: estimate.estimate_number,
    client_id: estimate.client_id || '',
    client_name: estimate.client_name || '',
    client_email: estimate.client_email || '',
    client_phone: estimate.client_phone || '',
    client_address: estimate.client_address || '',
    title: estimate.title || `Work Order from Estimate #${estimate.estimate_number || ''}`.trim(),
    description: estimate.notes || estimate.title || '',
    status: 'draft',
    groups: estimate.groups || [],
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
    notes: estimate.notes || '',
    internal_notes: `Created from approved estimate #${estimate.estimate_number || ''}. Converted by: ${actor}. At: ${signedAt}.`,
    tasks: buildTasksFromEstimate(estimate),
    execution_checklist: buildExecutionChecklist(),
    company_id: estimate.company_id || 'rc-art',
  });

  if (!workOrder?.id) throw new Error('WorkOrder.create returned no id.');

  await entities.Estimate.update(estimate.id, {
    status: 'converted', sales_stage: 'converted',
    converted_to_work_order_at: signedAt,
    converted_work_order_id: workOrder.id,
  }).catch(() => {});

  return workOrder.id;
}

async function createCompletionCertificate(entities: any, pkg: any, signer: string, signerEmail: string, now: string, ip: string, ua: string) {
  if (!pkg?.final_pdf_url || !pkg?.final_pdf_hash) {
    throw new Error('Certificate generation blocked: final PDF hash evidence is missing.');
  }

  const events = await entities.SigningEvent.filter({ signing_package_id: pkg.id }).catch(() => []);

  const cert = await entities.SigningCertificate.create({
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
    final_pdf_hash: pkg.final_pdf_hash,
    audit_trail: events || [],
    certificate_json: {
      provider: 'nexartsign', package_id: pkg.id,
      signer_name: signer, signed_at: now,
      final_pdf_hash: pkg.final_pdf_hash,
    },
    company_id: pkg.company_id || 'rc-art',
  });

  await entities.SigningPackage.update(pkg.id, { certificate_id: cert.id });
  return cert;
}

async function closePackageAsSigned(entities: any, supabaseAdmin: any, pkg: any, signer: string, signerEmail: string, now: string, ip: string, ua: string) {
  const frozenPdf = await freezeSignedPdf(supabaseAdmin, pkg, now);
  if (!frozenPdf.final_pdf_url || !frozenPdf.final_pdf_hash) {
    throw new Error('Final PDF lock failed: finalized PDF evidence is incomplete.');
  }

  const finalizedPackage = {
    ...pkg,
    status: 'signed', signed_at: now, signer_name: signer,
    final_pdf_url: frozenPdf.final_pdf_url,
    final_pdf_name: frozenPdf.final_pdf_name,
    final_pdf_hash: frozenPdf.final_pdf_hash,
  };

  await entities.SigningPackage.update(pkg.id, {
    status: 'signed', signed_at: now, signer_name: signer,
    final_pdf_url: frozenPdf.final_pdf_url,
    final_pdf_name: frozenPdf.final_pdf_name,
    final_pdf_hash: frozenPdf.final_pdf_hash,
    token: '', token_hash: '', token_last_four: '', token_revoked_at: now,
    audit_summary: {
      ...(pkg.audit_summary || {}),
      final_pdf_hash: frozenPdf.final_pdf_hash,
      final_pdf_frozen: true,
      final_pdf_frozen_at: now,
      token_revoked_at: now,
    },
  });

  await revokeSigningTokens(entities, pkg, now);
  const cert = await createCompletionCertificate(entities, finalizedPackage, signer, signerEmail, now, ip, ua);

  // Finalize estimate if applicable
  if (finalizedPackage.document_type === 'estimate' && finalizedPackage.document_id) {
    const estimateRows = await entities.Estimate.filter({ id: finalizedPackage.document_id }).catch(() => []);
    const estimate = estimateRows?.[0];

    if (estimate) {
      let convertedWorkOrderId: string | null = null;
      try {
        convertedWorkOrderId = await convertSignedEstimateToWorkOrder(
          entities, { ...estimate, status: 'signed' }, 'nexartsign-backend', now
        );
      } catch (woErr: any) {
        console.error('[completeSigningPackage] WorkOrder conversion failed (non-fatal):', woErr?.message);
      }

      await entities.Estimate.update(estimate.id, {
        status: convertedWorkOrderId ? 'converted' : 'signed',
        signature_status: 'signed',
        signed_at: now, approved_at: estimate.approved_at || now,
        accepted_by: signer, signature_name: signer,
        signature_provider: 'internal',
        signing_package_id: pkg.id,
        terms_accepted: true,
        locked_after_signature: true,
        final_signed_at: now,
        final_signed_pdf_url: frozenPdf.final_pdf_url,
        final_signed_pdf_name: frozenPdf.final_pdf_name,
        signed_pdf_hash: frozenPdf.final_pdf_hash,
        certificate_generated_at: now,
        converted_to_work_order_at: convertedWorkOrderId ? now : '',
        converted_work_order_id: convertedWorkOrderId || '',
        sales_stage: convertedWorkOrderId ? 'converted' : estimate.sales_stage,
      });
    }
  }

  return { cert, finalizedPackage };
}

async function deny(supabase: any, preflight: any, opts: any) {
  await Promise.all([
    recordTokenAttempt(supabase, {
      tokenHash: preflight?.tokenHash || null,
      packageId: opts.packageId,
      ipAddress: preflight?.ipAddress || null,
      fingerprint: preflight?.fingerprint || null,
      userAgent: preflight?.userAgent || '',
      success: false,
      reason: opts.reason,
    }),
    writeSecurityAuditLog(supabase, {
      action: 'nexartsign.access_denied',
      resourceType: 'nexartsign_signing_package',
      resourceId: opts.packageId,
      severity: opts.severity || 'warning',
      metadata: { stage: 'complete', reason: opts.reason, code: opts.code, ...(opts.metadata || {}) },
      ipAddress: preflight?.ipAddress || null,
      userAgent: preflight?.userAgent || '',
      fingerprint: preflight?.fingerprint || null,
    }),
  ]);

  return json({ error: opts.message, code: opts.code }, opts.status);
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOk();
  try {
    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);
    const supabase = createSupabaseAdmin();
    const { token, action, signer_name, declined_reason, fingerprint } = await req.json();

    if (!token || !action) {
      return json({ error: 'Missing token or action', code: 'invalid_request' }, 400);
    }

    const preflight = await runNexArtSignSecurityPreflight(supabase, {
      req, token, fingerprint, stage: 'complete',
    });

    if (!preflight.ok) {
      return json({ error: preflight.message, code: preflight.code }, preflight.status);
    }

    const context = await resolveSigningContext(entities, preflight.tokenHash);
    if (!context?.pkg) {
      return await deny(supabase, preflight, {
        status: 404, code: 'invalid_token', message: 'Not found', reason: 'invalid_token',
      });
    }

    const { pkg, hasParticipants, matchedParticipant, activeParticipant } = context;
    const otpState = otpStateFromContext(context);
    const now = new Date().toISOString();
    const ip = preflight.ipAddress || '';
    const ua = preflight.userAgent || '';

    // Expired check
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      await entities.SigningPackage.update(pkg.id, {
        status: 'expired', token: '', token_hash: '', token_last_four: '', token_revoked_at: now,
      });
      await revokeSigningTokens(entities, pkg, now);
      return await deny(supabase, preflight, {
        status: 410, code: 'package_expired', message: 'Expired',
        packageId: pkg.id, reason: 'package_expired',
      });
    }

    // Already closed
    if (['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      return await deny(supabase, preflight, {
        status: 409, code: 'package_closed', message: 'Package already closed',
        packageId: pkg.id, reason: 'package_closed_replay',
        metadata: { package_status: pkg.status },
      });
    }

    // Participant validation
    if (hasParticipants) {
      if (!matchedParticipant) {
        return await deny(supabase, preflight, {
          status: 409, code: 'participant_token_required',
          message: 'Participant signing token required',
          packageId: pkg.id, reason: 'participant_token_required',
        });
      }
      if (!activeParticipant || matchedParticipant.id !== activeParticipant.id ||
          (matchedParticipant.status !== 'active' && matchedParticipant.status !== 'pending')) {
        return await deny(supabase, preflight, {
          status: 409, code: 'participant_not_active',
          message: 'This signing link is not active for the current signer',
          packageId: pkg.id, reason: 'participant_not_active',
        });
      }
    }

    // ── DECLINE ──────────────────────────────────────────────────────────
    if (action === 'decline') {
      if (otpState) await persistOtpState(supabaseAdmin, context, null);

      const updates: Promise<any>[] = [];

      if (hasParticipants && matchedParticipant) {
        updates.push(entities.SigningParticipant.update(matchedParticipant.id, {
          status: 'declined', declined_at: now,
          declined_reason: declined_reason || '',
          token: '', token_hash: '', token_last_four: '', token_revoked_at: now,
        }));
      }

      updates.push(entities.SigningPackage.update(pkg.id, {
        status: 'declined', declined_at: now,
        declined_reason: declined_reason || '',
        token: '', token_hash: '', token_last_four: '', token_revoked_at: now,
      }));

      await Promise.all(updates);
      await revokeSigningTokens(entities, pkg, now);

      // Batch: event + estimate update + audit
      await Promise.all([
        entities.SigningEvent.create({
          signing_package_id: pkg.id, document_type: pkg.document_type,
          document_id: pkg.document_id, event_type: 'declined',
          actor_name: signer_name || matchedParticipant?.name || pkg.signer_name || '',
          actor_email: matchedParticipant?.email || pkg.signer_email,
          ip_address: ip, user_agent: ua, created_at: now,
          metadata: { token_revoked_at: now },
        }),
        pkg.document_type === 'estimate' && pkg.document_id
          ? entities.Estimate.update(pkg.document_id, {
              status: 'declined', signature_status: 'declined',
              signing_package_id: pkg.id, declined_at: now,
            }).catch(() => {})
          : Promise.resolve(),
        recordTokenAttempt(supabase, {
          tokenHash: preflight.tokenHash, packageId: pkg.id,
          ipAddress: preflight.ipAddress || null, success: true, reason: 'declined',
        }),
        writeSecurityAuditLog(supabase, {
          action: 'nexartsign.declined', resourceType: 'nexartsign_signing_package',
          resourceId: pkg.id, severity: 'warning',
          metadata: { stage: 'complete', document_type: pkg.document_type },
          ipAddress: preflight.ipAddress || null, userAgent: ua,
          fingerprint: preflight.fingerprint || null,
        }),
      ]);

      return json({
        success: true, status: 'declined',
        document_type: pkg.document_type, signing_package_id: pkg.id,
      });
    }

    if (action !== 'approve') {
      return json({ error: 'Invalid action', code: 'invalid_action' }, 400);
    }

    // ── APPROVE — OTP required first ────────────────────────────────────
    if (!otpVerificationStatus(otpState, preflight.tokenHash, preflight.fingerprint)) {
      return json({ error: 'Verification code required before signing', code: 'otp_required' }, 409);
    }

    // Activate pending participant after OTP verification
    if (hasParticipants && matchedParticipant && matchedParticipant.status === 'pending') {
      await entities.SigningParticipant.update(matchedParticipant.id, { status: 'active' }).catch(() => {});
      matchedParticipant.status = 'active';
    }

    // ── Multi-signer flow ───────────────────────────────────────────────
    if (hasParticipants && matchedParticipant) {
      const signer = signer_name || matchedParticipant.name || pkg.signer_name || '';

      await entities.SigningParticipant.update(matchedParticipant.id, {
        status: 'signed', signed_at: now, name: signer,
        ip_address: ip, user_agent: ua,
        token: '', token_hash: '', token_last_four: '', token_revoked_at: now,
      });

      await entities.SigningEvent.create({
        signing_package_id: pkg.id, document_type: pkg.document_type,
        document_id: pkg.document_id, event_type: 'signed',
        actor_name: signer, actor_email: matchedParticipant.email,
        ip_address: ip, user_agent: ua, created_at: now,
        metadata: {
          participant_id: matchedParticipant.id,
          role: matchedParticipant.role,
          signing_order: matchedParticipant.signing_order || 1,
        },
      });

      const refreshed = await entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
      const remaining = sortParticipants(refreshed).filter(
        (p: any) => !['signed', 'declined', 'skipped', 'voided'].includes(p.status)
      );
      const next = remaining[0] || null;

      await recordTokenAttempt(supabase, {
        tokenHash: preflight.tokenHash, packageId: pkg.id,
        ipAddress: preflight.ipAddress || null, success: true,
        reason: next ? 'participant_signed_next_pending' : 'package_signed',
      });

      // More signers pending
      if (next) {
        await Promise.all([
          entities.SigningParticipant.update(next.id, { status: 'active', sent_at: next.sent_at || now }),
          entities.SigningPackage.update(pkg.id, { status: 'viewed' }),
          entities.SigningEvent.create({
            signing_package_id: pkg.id, document_type: pkg.document_type,
            document_id: pkg.document_id, event_type: 'participant_activated',
            actor_name: next.name || '', actor_email: next.email || '',
            metadata: { participant_id: next.id, role: next.role, signing_order: next.signing_order || 1 },
            created_at: now,
          }).catch(() => {}),
        ]);

        return json({
          success: true, status: 'pending_next_signer',
          next_participant_id: next.id,
          signing_package_id: pkg.id,
        });
      }

      // All signed — close the package
      await persistOtpState(supabaseAdmin, context, null);
      const { cert, finalizedPackage } = await closePackageAsSigned(
        entities, supabaseAdmin, pkg, signer, matchedParticipant.email, now, ip, ua
      );

      await writeSecurityAuditLog(supabase, {
        action: 'nexartsign.signed', resourceType: 'nexartsign_signing_package',
        resourceId: pkg.id, severity: 'info',
        metadata: {
          stage: 'complete', certificate_id: cert.id,
          certificate_number: cert.certificate_number || '',
          participant_id: matchedParticipant.id,
        },
        ipAddress: preflight.ipAddress || null, userAgent: ua,
        fingerprint: preflight.fingerprint || null,
      });

      return json({
        success: true, status: 'signed',
        certificate_id: cert.id,
        certificate_number: cert.certificate_number || '',
        final_pdf_url: finalizedPackage.final_pdf_url || '',
        signing_package_id: pkg.id,
      });
    }

    // ── Single signer flow ──────────────────────────────────────────────
    const signer = signer_name || pkg.signer_name || pkg.client_name || '';

    await entities.SigningEvent.create({
      signing_package_id: pkg.id, document_type: pkg.document_type,
      document_id: pkg.document_id, event_type: 'signed',
      actor_name: signer, actor_email: pkg.signer_email,
      ip_address: ip, user_agent: ua, created_at: now,
    });

    await recordTokenAttempt(supabase, {
      tokenHash: preflight.tokenHash, packageId: pkg.id,
      ipAddress: preflight.ipAddress || null, success: true, reason: 'package_signed',
    });

    await persistOtpState(supabaseAdmin, context, null);
    const { cert, finalizedPackage } = await closePackageAsSigned(
      entities, supabaseAdmin, pkg, signer, pkg.signer_email, now, ip, ua
    );

    await writeSecurityAuditLog(supabase, {
      action: 'nexartsign.signed', resourceType: 'nexartsign_signing_package',
      resourceId: pkg.id, severity: 'info',
      metadata: { stage: 'complete', certificate_id: cert.id },
      ipAddress: preflight.ipAddress || null, userAgent: ua,
      fingerprint: preflight.fingerprint || null,
    });

    return json({
      success: true, status: 'signed',
      certificate_id: cert.id,
      certificate_number: cert.certificate_number || '',
      final_pdf_url: finalizedPackage.final_pdf_url || '',
      signing_package_id: pkg.id,
    });

  } catch (err: any) {
    console.error('[completeSigningPackage] Unhandled error:', {
      message: err?.message,
      stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
    });
    return json({ error: err?.message || 'Server error', code: err?.code || 'server_error' }, 500);
  }
});
