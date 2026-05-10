/**
 * issueSigningAccessLink — Edge Function (Supabase)
 * Generates a unique signing URL for the active participant of a signing package.
 * Ported from nexartsign-pro-app: replaces Base44 SDK with Supabase direct queries.
 */
import { createSupabaseAdmin, buildIssuedTokenFields } from '../_shared/nexartsignSecurity.ts';
import { createAdminClient, supabaseEntities } from '../_shared/supabaseEntities.ts';
import { json, corsOk, sortParticipants } from '../_shared/signingContext.ts';

function randomTokenPart() {
  return crypto.randomUUID().replace(/-/g, '');
}

function buildParticipantToken(pkgId: string, participantId: string) {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

function buildPackageToken(documentId: string, pkgId: string) {
  return `ns_${documentId || pkgId}_${randomTokenPart()}`;
}

function buildSigningUrl(rawToken: string, appBaseUrl?: string) {
  const baseUrl = (appBaseUrl || Deno.env.get('APP_BASE_URL') || 'https://racielf.github.io/NexArtPro')
    .replace(/\/$/, '');

  return `${baseUrl}/sign-document?token=${encodeURIComponent(rawToken)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsOk();
  try {
    const supabaseAdmin = createAdminClient();
    const entities = supabaseEntities(supabaseAdmin);

    // Auth check — require authenticated admin user
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Authentication required', code: 'unauthorized' }, 401);

    const { signing_package_id, app_base_url } = await req.json();
    if (!signing_package_id) return json({ error: 'signing_package_id is required', code: 'invalid_request' }, 400);

    const pkgRows = await entities.SigningPackage.filter({ id: signing_package_id }).catch(() => []);
    const pkg = pkgRows?.[0] || null;
    if (!pkg) return json({ error: 'Signing package not found', code: 'not_found' }, 404);

    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      await entities.SigningPackage.update(pkg.id, { status: 'expired' }).catch(() => {});
      return json({ error: 'Signing package expired', code: 'package_expired' }, 410);
    }

    if (['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      return json({ error: 'Signing package is closed', code: 'package_closed' }, 409);
    }

    const participants = await entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
    const orderedParticipants = sortParticipants(participants);
    const activeParticipant = orderedParticipants.find((p: any) => p.status === 'active')
      || orderedParticipants.find((p: any) => !['signed', 'declined', 'skipped', 'voided'].includes(p.status));

    const now = new Date().toISOString();

    if (activeParticipant?.id) {
      const rawToken = buildParticipantToken(pkg.id, activeParticipant.id);
      const tokenFields = await buildIssuedTokenFields(rawToken, now);

      // token persistence is critical — do NOT silence with .catch
      try {
        await entities.SigningParticipant.update(activeParticipant.id, {
          ...tokenFields,
          status: activeParticipant.status === 'pending' ? 'active' : activeParticipant.status,
          sent_at: activeParticipant.sent_at || pkg.sent_at || now,
        });
      } catch (updateErr: any) {
        return json({ error: `Token persistence failed for participant: ${updateErr?.message}`, code: 'token_persistence_failed' }, 500);
      }

      // Post-write verification: confirm token_hash was actually saved
      const verifyRows = await entities.SigningParticipant.filter({ id: activeParticipant.id }).catch(() => []);
      const verified = verifyRows?.[0];
      if (!verified?.token_hash) {
        return json({ error: 'Token hash not persisted after update — signing URL will not be returned', code: 'token_persistence_failed' }, 500);
      }

      return json({
        signing_url: buildSigningUrl(rawToken, app_base_url),
        token_scope: 'participant',
        participant_id: activeParticipant.id,
        package_id: pkg.id,
      });
    }

    const rawToken = buildPackageToken(pkg.document_id, pkg.id);
    const tokenFields = await buildIssuedTokenFields(rawToken, now);

    // token persistence is critical — do NOT silence with .catch
    try {
      await entities.SigningPackage.update(pkg.id, tokenFields);
    } catch (updateErr: any) {
      return json({ error: `Token persistence failed for package: ${updateErr?.message}`, code: 'token_persistence_failed' }, 500);
    }

    // Post-write verification
    const verifyPkgRows = await entities.SigningPackage.filter({ id: pkg.id }).catch(() => []);
    const verifiedPkg = verifyPkgRows?.[0];
    if (!verifiedPkg?.token_hash) {
      return json({ error: 'Package token hash not persisted — signing URL will not be returned', code: 'token_persistence_failed' }, 500);
    }

    return json({
      signing_url: buildSigningUrl(rawToken, app_base_url),
      token_scope: 'package',
      participant_id: '',
      package_id: pkg.id,
    });
  } catch (error: any) {
    return json({ error: error?.message || 'Server error', code: 'server_error' }, 500);
  }
});
