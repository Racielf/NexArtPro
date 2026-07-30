/**
 * approveMargin — Edge Function (Supabase)
 * PIN-gated approval for pricing overrides (estimates saved below the margin threshold).
 *
 * Ported from base44/functions/approveMargin/entry.ts, which had a critical flaw: it checked
 * the PIN against a single shared `ADMIN_APPROVAL_PIN` env var, falling back to a hardcoded
 * '1234' if that var was never set. Never actually deployed to Supabase, so never exploited in
 * production, but must not be carried over.
 *
 * Reuses the per-admin PIN system built for TAREA H (pin-login/set-pin): each admin verifies
 * their OWN pin_hash, no shared secret, no insecure fallback. Same rate-limit pattern as
 * pin-login (5 attempts, 15 min lockout).
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, requireAdminCaller } from '../_shared/authAdmin.ts';
import { verifyPin } from '../_shared/pinHash.ts';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createAdminClient();
    const auth = await requireAdminCaller(req, supabase);
    if (!auth.ok) {
      return jsonResponse({ error: auth.error }, auth.status);
    }

    const { pin, estimate_id, estimate_number, margin_pct } = await req.json();

    if (!pin || typeof pin !== 'string') {
      return jsonResponse({ error: 'PIN is required' }, 400);
    }
    if (!estimate_id) {
      return jsonResponse({ error: 'estimate_id is required' }, 400);
    }

    const { data: user, error: lookupErr } = await supabase
      .from('app_users')
      .select('id, pin_hash, pin_failed_attempts, pin_locked_until')
      .eq('id', auth.appUser.id)
      .maybeSingle();

    if (lookupErr || !user || !user.pin_hash) {
      return jsonResponse({ error: 'No PIN set for this account. Set one in Settings first.' }, 400);
    }

    if (user.pin_locked_until && new Date(user.pin_locked_until).getTime() > Date.now()) {
      return jsonResponse({ error: 'Too many attempts. Try again later.' }, 429);
    }

    const cleanPin = String(pin).trim().toUpperCase();
    const valid = await verifyPin(cleanPin, user.pin_hash);

    if (!valid) {
      const attempts = (user.pin_failed_attempts || 0) + 1;
      const patch: Record<string, unknown> = { pin_failed_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        patch.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
      }
      await supabase.from('app_users').update(patch).eq('id', user.id);
      return jsonResponse({ error: 'Incorrect PIN' }, 403);
    }

    await supabase
      .from('app_users')
      .update({ pin_failed_attempts: 0, pin_locked_until: null })
      .eq('id', user.id);

    try {
      await supabase.from('estimate_version_histories').insert({
        estimate_id: String(estimate_id),
        estimate_number: estimate_number != null ? Number(estimate_number) : null,
        action: 'margin_override_approved',
        actor: auth.appUser.id,
        changes: { margin_pct: Number(margin_pct) || null },
        changes_note: `Margin override approved via PIN by admin ${auth.appUser.id} at ${new Date().toISOString()}`,
      });
    } catch (logErr) {
      console.error('[approveMargin] Audit log failed (non-blocking):', logErr);
    }

    return jsonResponse({ approved: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
