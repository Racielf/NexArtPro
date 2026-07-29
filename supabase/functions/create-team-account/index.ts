// Creates a real Supabase Auth account for a new team member and links it to a new
// app_users row. Replaces the old client-side "registration code" hack in
// src/lib/userStore.js, which inserted directly into app_users via the anon key with
// no validation at all. Only callable by an already-authenticated admin.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, requireAdminCaller } from '../_shared/authAdmin.ts';

const ALLOWED_ROLES = new Set(['admin', 'agent']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createAdminClient();

    const auth = await requireAdminCaller(req, supabase);
    if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status);

    const { email, display_name, role } = await req.json();

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanDisplayName = String(display_name || '').trim();
    const cleanRole = String(role || '').trim();

    if (!cleanEmail || !cleanDisplayName) {
      return jsonResponse({ ok: false, error: 'Email and display name are required' }, 400);
    }
    if (!ALLOWED_ROLES.has(cleanRole)) {
      return jsonResponse({ ok: false, error: `Role must be one of: ${[...ALLOWED_ROLES].join(', ')}` }, 400);
    }

    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(cleanEmail);
    if (inviteErr || !invited?.user) {
      return jsonResponse({ ok: false, error: inviteErr?.message || 'Could not send invite' }, 400);
    }

    const { data: appUser, error: insertErr } = await supabase
      .from('app_users')
      .insert({
        username: cleanEmail,
        email: cleanEmail,
        display_name: cleanDisplayName,
        role: cleanRole,
        active: true,
        auth_user_id: invited.user.id,
        password: '', // no longer used for login; column stays until dropped in a later migration
      })
      .select('id, username, display_name, role, active, auth_user_id')
      .single();

    if (insertErr) {
      // Roll back the auth user so we don't leave an orphaned Supabase Auth account
      // with no corresponding app_users row.
      await supabase.auth.admin.deleteUser(invited.user.id);
      if (insertErr.code === '23505') {
        return jsonResponse({ ok: false, error: 'An account with this email already exists' }, 409);
      }
      return jsonResponse({ ok: false, error: insertErr.message }, 400);
    }

    return jsonResponse({ ok: true, user: appUser });
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
