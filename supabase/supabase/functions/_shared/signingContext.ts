/**
 * NexArtSign — Shared signing context resolver
 * Used by multiple Edge Functions to find package/participant from token hash.
 * Replaces the duplicated resolveSigningContext from each Base44 function.
 */

export function sortParticipants(rows: any[] = []) {
  return [...rows].sort((a, b) => (a.signing_order || 1) - (b.signing_order || 1));
}

export function getActiveParticipant(participants: any[] = []) {
  const ordered = sortParticipants(participants);
  return ordered.find((p) => p.status === 'active')
    || ordered.find((p) => p.status === 'pending')
    || null;
}

/**
 * Resolve signing context from a token hash.
 * @param entities - supabaseEntities() proxy
 * @param tokenHash - SHA-256 hash of the raw token
 */
export async function resolveSigningContext(entities: any, tokenHash: string | null) {
  if (!tokenHash) return null;

  const participantRows = await entities.SigningParticipant.filter({ token_hash: tokenHash }).catch(() => []);
  let matchedParticipant = participantRows?.[0] || null;
  let pkg = null;

  if (matchedParticipant?.signing_package_id) {
    const pkgRows = await entities.SigningPackage.filter({ id: matchedParticipant.signing_package_id }).catch(() => []);
    pkg = pkgRows?.[0] || null;
  }

  if (!pkg) {
    const pkgRows = await entities.SigningPackage.filter({ token_hash: tokenHash }).catch(() => []);
    pkg = pkgRows?.[0] || null;
  }

  if (!pkg) return null;

  const participants = await entities.SigningParticipant.filter({ signing_package_id: pkg.id }).catch(() => []);
  const orderedParticipants = sortParticipants(participants);
  const hasParticipants = orderedParticipants.length > 0;
  const activeParticipant = hasParticipants ? getActiveParticipant(orderedParticipants) : null;

  if (matchedParticipant) {
    matchedParticipant = orderedParticipants.find((p: any) => p.id === matchedParticipant.id) || matchedParticipant;
  }

  return {
    pkg,
    participants: orderedParticipants,
    hasParticipants,
    matchedParticipant,
    activeParticipant,
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export { CORS_HEADERS };

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** Handle CORS preflight. Return this early for OPTIONS requests. */
export function corsOk() {
  return new Response('ok', { headers: CORS_HEADERS });
}
