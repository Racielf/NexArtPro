import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://hdjeiugbhqhebrpneyma.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const INVITE_PREFIX = 'invite:';
const BCRYPT_ROUNDS = 12;

const ROLE_ALIASES: Record<string, string> = {
  admin: 'admin',
  owner: 'admin',
  manager: 'admin',
  office_agent: 'office_agent',
  'office-agent': 'office_agent',
  office: 'office_agent',
  dispatcher: 'office_agent',
  coordinator: 'office_agent',
  staff: 'office_agent',
  field_agent: 'field_agent',
  'field-agent': 'field_agent',
  field: 'field_agent',
  technician: 'field_agent',
  tech: 'field_agent',
  worker: 'field_agent',
  agent: 'field_agent',
};

function normalizeRole(role: unknown) {
  const value = String(role || '').trim().toLowerCase();
  return ROLE_ALIASES[value] || null;
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = 'RC-';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return code;
}

function pendingUsernameFromCode(code: string) {
  return `pending_${String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
}

function pendingCodeFromUsername(username: string) {
  const raw = String(username || '').replace(/^pending_/, '');
  return raw.length === 8 && raw.startsWith('RC') ? `${raw.slice(0, 2)}-${raw.slice(2)}` : raw;
}

function publicUser(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: normalizeRole(user.role) || user.role,
    active: user.active,
    created_at: user.created_at,
  };
}

function isPending(user: any) {
  return !user?.active && String(user?.username || '').startsWith('pending_');
}

async function requireAdmin(req: Request, supabase: any) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const role = normalizeRole(user?.role);
    if (role === 'admin') return { ok: true, actor: user?.email || user?.id || 'base44-admin' };
  } catch {
    // Fall through to denied. Local browser session is intentionally not trusted for admin writes.
  }

  return { ok: false, error: 'Admin verification required. Sign in with an Owner / Admin account.' };
}

async function readJson(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ ok: false, error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500, headers });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await readJson(req);
    const action = body?.action;

    if (action === 'authenticate') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '').trim();
      if (!username || !password) return Response.json({ ok: false, error: 'Username and password are required' }, { status: 400, headers });

      const { data: user, error } = await supabase
        .from('app_users')
        .select('id, username, display_name, role, active, password, created_at')
        .eq('username', username)
        .eq('active', true)
        .maybeSingle();

      if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers });
      if (!user) return Response.json({ ok: false, error: 'Invalid credentials' }, { status: 401, headers });

      const stored = String(user.password || '');
      const valid = stored.startsWith('$2')
        ? await bcrypt.compare(password, stored)
        : stored === password;

      if (!valid) return Response.json({ ok: false, error: 'Invalid credentials' }, { status: 401, headers });

      if (!stored.startsWith('$2')) {
        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await supabase.from('app_users').update({ password: hash }).eq('id', user.id);
      }

      return Response.json({ ok: true, user: publicUser(user) }, { headers });
    }

    if (action === 'completeRegistration') {
      const registrationCode = String(body.registrationCode || '').trim().toUpperCase();
      const username = String(body.username || '').trim();
      const password = String(body.password || '').trim();
      const displayName = String(body.display_name || '').trim();

      if (!registrationCode || !username || !password) {
        return Response.json({ ok: false, error: 'Registration code, username and password are required' }, { status: 400, headers });
      }
      if (password.length < 8) {
        return Response.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400, headers });
      }

      const pendingUsername = pendingUsernameFromCode(registrationCode);
      const { data: pending, error: pendingError } = await supabase
        .from('app_users')
        .select('id, username, display_name, role, active, password, created_at')
        .eq('username', pendingUsername)
        .eq('active', false)
        .maybeSingle();

      if (pendingError) return Response.json({ ok: false, error: pendingError.message }, { status: 500, headers });
      if (!pending || !isPending(pending)) {
        return Response.json({ ok: false, error: 'Invalid or already used registration code' }, { status: 404, headers });
      }

      const inviteHash = String(pending.password || '');
      const inviteValid = inviteHash.startsWith(INVITE_PREFIX)
        ? await bcrypt.compare(registrationCode, inviteHash.slice(INVITE_PREFIX.length))
        : pending.password === registrationCode;

      if (!inviteValid) return Response.json({ ok: false, error: 'Invalid registration code' }, { status: 401, headers });

      const { data: existing } = await supabase
        .from('app_users')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existing?.id) return Response.json({ ok: false, error: 'Username already exists' }, { status: 409, headers });

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const { data: activated, error: updateError } = await supabase
        .from('app_users')
        .update({
          username,
          password: passwordHash,
          display_name: displayName || pending.display_name || username,
          active: true,
        })
        .eq('id', pending.id)
        .select('id, username, display_name, role, active, created_at')
        .single();

      if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500, headers });
      return Response.json({ ok: true, user: publicUser(activated) }, { headers });
    }

    const admin = await requireAdmin(req, supabase);
    if (!admin.ok) return Response.json({ ok: false, error: admin.error }, { status: 403, headers });

    if (action === 'listUsers') {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, display_name, role, active, created_at')
        .order('created_at');
      if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers });
      return Response.json({ ok: true, users: (data || []).map(publicUser) }, { headers });
    }

    if (action === 'createInvite') {
      const displayName = String(body.display_name || '').trim();
      const role = normalizeRole(body.role);
      if (!displayName || !role) return Response.json({ ok: false, error: 'Display name and role are required' }, { status: 400, headers });

      const code = randomCode();
      const inviteHash = `${INVITE_PREFIX}${await bcrypt.hash(code, BCRYPT_ROUNDS)}`;
      const username = pendingUsernameFromCode(code);

      const { data, error } = await supabase
        .from('app_users')
        .insert({
          username,
          password: inviteHash,
          display_name: displayName,
          role,
          active: false,
        })
        .select('id, username, display_name, role, active, created_at')
        .single();

      if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers });
      return Response.json({ ok: true, code, invite: publicUser(data) }, { headers });
    }

    if (action === 'toggleUserActive') {
      const id = body.id;
      if (!id) return Response.json({ ok: false, error: 'User id required' }, { status: 400, headers });

      const { data: current, error: fetchErr } = await supabase
        .from('app_users')
        .select('id, active, username')
        .eq('id', id)
        .single();

      if (fetchErr || !current) return Response.json({ ok: false, error: 'User not found' }, { status: 404, headers });
      if (String(current.username || '').startsWith('pending_')) {
        return Response.json({ ok: false, error: 'Pending registrations cannot be enabled manually' }, { status: 400, headers });
      }

      const { error } = await supabase
        .from('app_users')
        .update({ active: !current.active })
        .eq('id', id);

      if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers });
      return Response.json({ ok: true }, { headers });
    }

    if (action === 'getPendingCode') {
      const username = String(body.username || '');
      if (!username.startsWith('pending_')) return Response.json({ ok: false, error: 'Not a pending registration' }, { status: 400, headers });
      return Response.json({ ok: true, code: pendingCodeFromUsername(username) }, { headers });
    }

    return Response.json({ ok: false, error: 'Unknown action' }, { status: 400, headers });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || 'Unexpected server error' }, { status: 500, headers });
  }
});
