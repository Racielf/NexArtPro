// Admin-only: generates and sets a team member's PIN (used for the field-agent PIN
// quick-login, see pin-login/index.ts). The PIN is always generated server-side --
// never typed by the admin -- so it can't end up as something trivial/guessable, and
// is guaranteed to contain at least one letter alongside digits for extra entropy.
// Returned once in the response so the admin can hand it to the team member; only the
// hash is stored (app_users.pin_hash).
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, requireAdminCaller } from '../_shared/authAdmin.ts';
import { hashPin } from '../_shared/pinHash.ts';

// Excludes visually ambiguous characters (0/O, 1/I/L).
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;
const PIN_LENGTH = 6;

function generatePin(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PIN_LENGTH));
  let pin = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  // Guarantee at least one letter, even on an unlucky all-digit draw.
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

    const auth = await requireAdminCaller(req, supabase);
    if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);

    const { username } = await req.json();
    const cleanUsername = String(username || '').trim().toLowerCase();
    if (!cleanUsername) {
      return jsonResponse({ ok: false, error: 'Username is required' }, 400);
    }

    const pin = generatePin();
    const pinHash = await hashPin(pin);
    const { error } = await supabase
      .from('app_users')
      .update({ pin_hash: pinHash, pin_failed_attempts: 0, pin_locked_until: null })
      .eq('username', cleanUsername);

    if (error) return jsonResponse({ ok: false, error: error.message }, 400);
    return jsonResponse({ ok: true, pin });
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
