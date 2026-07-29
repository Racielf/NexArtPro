// PIN quick-login for field agents. Verifies a short PIN server-side, then rotates
// that account's real Supabase Auth password to a fresh random value and hands it
// back for one-time use -- the client immediately calls the normal
// supabase.auth.signInWithPassword() with it. This reuses Supabase's own tested
// sign-in path instead of minting custom session tokens, and still ends in a real
// session (auth.uid() populated), unlike the old sessionStorage-only local scheme.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/authAdmin.ts';
import { verifyPin } from '../_shared/pinHash.ts';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createAdminClient();
    const { username, pin } = await req.json();

    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPin = String(pin || '').trim().toUpperCase();
    if (!cleanUsername || !cleanPin) {
      return jsonResponse({ ok: false, error: 'Username and PIN are required' }, 400);
    }

    const { data: user, error: lookupErr } = await supabase
      .from('app_users')
      .select('id, username, email, auth_user_id, active, pin_hash, pin_failed_attempts, pin_locked_until')
      .eq('username', cleanUsername)
      .maybeSingle();

    // Same generic error for "no such user" and "wrong PIN" -- don't leak which one.
    const genericError = { ok: false, error: 'Invalid username or PIN' };

    if (lookupErr || !user || !user.active || !user.pin_hash || !user.auth_user_id) {
      return jsonResponse(genericError, 401);
    }

    if (user.pin_locked_until && new Date(user.pin_locked_until).getTime() > Date.now()) {
      return jsonResponse({ ok: false, error: 'Too many attempts. Try again later.' }, 429);
    }

    const valid = await verifyPin(cleanPin, user.pin_hash);

    if (!valid) {
      const attempts = (user.pin_failed_attempts || 0) + 1;
      const patch: Record<string, unknown> = { pin_failed_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        patch.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
      }
      await supabase.from('app_users').update(patch).eq('id', user.id);
      return jsonResponse(genericError, 401);
    }

    await supabase
      .from('app_users')
      .update({ pin_failed_attempts: 0, pin_locked_until: null })
      .eq('id', user.id);

    const oneTimePassword = crypto.randomUUID() + crypto.randomUUID();
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.auth_user_id, {
      password: oneTimePassword,
    });
    if (updateErr) {
      return jsonResponse({ ok: false, error: 'Could not complete sign-in' }, 500);
    }

    return jsonResponse({ ok: true, email: user.email, password: oneTimePassword });
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
