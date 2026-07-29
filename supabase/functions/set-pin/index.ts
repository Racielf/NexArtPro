// Admin-only: sets or resets a team member's PIN (used for the field-agent PIN
// quick-login, see pin-login/index.ts). Hashes server-side -- the plaintext PIN
// never touches app_users.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, requireAdminCaller } from '../_shared/authAdmin.ts';
import { hashPin } from '../_shared/pinHash.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createAdminClient();

    const auth = await requireAdminCaller(req, supabase);
    if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);

    const { username, pin } = await req.json();
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPin = String(pin || '').trim();

    if (!cleanUsername || !/^\d{4,6}$/.test(cleanPin)) {
      return jsonResponse({ ok: false, error: 'Username and a 4-6 digit PIN are required' }, 400);
    }

    const pinHash = await hashPin(cleanPin);
    const { error } = await supabase
      .from('app_users')
      .update({ pin_hash: pinHash, pin_failed_attempts: 0, pin_locked_until: null })
      .eq('username', cleanUsername);

    if (error) return jsonResponse({ ok: false, error: error.message }, 400);
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
