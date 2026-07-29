// Self-service PIN reset. Unlike set-pin (admin-only, resets anyone's PIN), this lets
// an already-authenticated caller regenerate their OWN PIN -- used when a team member
// forgets it and no admin is around. They reach an authenticated session the same way
// "forgot password" works (Supabase's resetPasswordForEmail email link), which already
// proves they own that email; this just lets that session act on its own app_users row.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/authAdmin.ts';
import { hashPin } from '../_shared/pinHash.ts';

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;
const PIN_LENGTH = 6;

function generatePin(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PIN_LENGTH));
  let pin = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  if (!/[A-Z]/.test(pin)) {
    const pos = bytes[0] % PIN_LENGTH;
    const letter = LETTERS[bytes[1] % LETTERS.length];
    pin = pin.slice(0, pos) + letter + pin.slice(pos + 1);
  }
  return pin;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createAdminClient();

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return jsonResponse({ ok: false, error: 'Missing Authorization header' }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonResponse({ ok: false, error: 'Invalid or expired session' }, 401);
    }

    const { data: appUser, error: lookupErr } = await supabase
      .from('app_users')
      .select('id, username, active')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle();

    if (lookupErr || !appUser || appUser.active === false) {
      return jsonResponse({ ok: false, error: 'Account not found or inactive' }, 403);
    }

    const pin = generatePin();
    const pinHash = await hashPin(pin);
    const { error: updateErr } = await supabase
      .from('app_users')
      .update({ pin_hash: pinHash, pin_failed_attempts: 0, pin_locked_until: null })
      .eq('id', appUser.id);

    if (updateErr) return jsonResponse({ ok: false, error: updateErr.message }, 400);
    return jsonResponse({ ok: true, pin });
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
