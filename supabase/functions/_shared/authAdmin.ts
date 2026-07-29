import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Identifies the caller from the request's bearer token and confirms they're an
// active admin in app_users. Used to gate admin-only operations (e.g. creating team
// accounts) since these functions run with service_role and bypass RLS entirely --
// the caller check has to happen here, not in Postgres.
export async function requireAdminCaller(req: Request, adminClient: ReturnType<typeof createAdminClient>) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false as const, status: 401, error: 'Missing Authorization header' };

  const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false as const, status: 401, error: 'Invalid or expired session' };
  }

  const { data: appUser, error: appUserErr } = await adminClient
    .from('app_users')
    .select('id, role, active')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (appUserErr || !appUser || appUser.active === false || appUser.role !== 'admin') {
    return { ok: false as const, status: 403, error: 'Admin access required' };
  }

  return { ok: true as const, authUserId: userData.user.id, appUser };
}
