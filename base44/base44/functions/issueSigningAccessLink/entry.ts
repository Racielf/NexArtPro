import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { buildIssuedTokenFields } from '../_shared/nexartsignSecurity.ts';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function randomTokenPart() {
  return crypto.randomUUID().replace(/-/g, '');
}

function sortParticipants(rows: any[] = []) {
  return [...rows].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
}

function buildParticipantToken(pkgId: string, participantId: string) {
  return `nsp_${pkgId}_${participantId}_${randomTokenPart()}`;
}

function buildPackageToken(documentId: string, pkgId: string) {
  return `ns_${documentId || pkgId}_${randomTokenPart()}`;
}

function buildSigningUrl(rawToken: string) {
  return `${new URL(Deno.env.get('APP_BASE_URL') || 'https://app.nexartpro.com').origin}/sign-document?token=${encodeURIComponent(rawToken)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return json({ error: 'Authentication required', code: 'unauthorized' }, 401);

    const { signing_package_id } = await req.json();
    if (!signing_package_id) return json({ error: 'signing_package_id is required', code: 'invalid_request' }, 400);

    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ id: signing_package_id }).catch(() => []);
    const pkg = pkgRows?.[0] || null;
    if (!pkg) return json({ error: 'Signing package not found', code: 'not_found' }, 404);

    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
      await base44.asServiceRole.entities.SigningPackage.update(pkg.id, { status: 'expired' }).catch(() => {});
      return json({ error: 'Signing package expired', code: 'package_expired' }, 410);
    }

    if (['signed', 'declined', 'expired', 'voided'].includes(pkg.status)) {
      return json({ error: 'Signing package is closed', code: 'package_closed' }, 409);
    }

    const participants = await base44.asServiceRole.entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
    const orderedParticipants = sortParticipants(participants);
    const activeParticipant = orderedParticipants.find((participant) => participant.status === 'active')
      || orderedParticipants.find((participant) => !['signed', 'declined', 'skipped', 'voided'].includes(participant.status));

    const now = new Date().toISOString();

    if (activeParticipant?.id) {
      const token = buildParticipantToken(pkg.id, activeParticipant.id);
      const tokenFields = await buildIssuedTokenFields(token, now);
      await base44.asServiceRole.entities.SigningParticipant.update(activeParticipant.id, {
        ...tokenFields,
        status: activeParticipant.status === 'pending' ? 'active' : activeParticipant.status,
        sent_at: activeParticipant.sent_at || pkg.sent_at || now,
      }).catch(() => {});

      return json({
        signing_url: buildSigningUrl(token),
        token_scope: 'participant',
        participant_id: activeParticipant.id,
        package_id: pkg.id,
      });
    }

    const token = buildPackageToken(pkg.document_id, pkg.id);
    const tokenFields = await buildIssuedTokenFields(token, now);
    await base44.asServiceRole.entities.SigningPackage.update(pkg.id, tokenFields).catch(() => {});

    return json({
      signing_url: buildSigningUrl(token),
      token_scope: 'package',
      participant_id: '',
      package_id: pkg.id,
    });
  } catch (error: any) {
    return json({ error: error?.message || 'Server error', code: 'server_error' }, 500);
  }
});
