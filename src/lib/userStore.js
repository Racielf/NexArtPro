import { supabase } from './supabaseClient';
import { base44 } from '@/api/base44Client';
import { normalizeLocalRole } from '@/lib/roleUtils';

function generateRegistrationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RC-';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function codeToPendingUsername(code) {
  return `pending_${String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
}

export function isPendingRegistrationUser(user) {
  return !user?.active && String(user?.username || '').startsWith('pending_');
}

export function getPendingRegistrationCode(user) {
  if (!isPendingRegistrationUser(user)) return '';
  const raw = String(user.username).replace(/^pending_/, '');
  return raw.length === 8 && raw.startsWith('RC') ? `${raw.slice(0, 2)}-${raw.slice(2)}` : raw;
}

export async function getUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, display_name, role, active, created_at')
    .order('created_at');
  if (error) {
    console.error('[userStore] getUsers failed:', error.message);
    return [];
  }
  return data;
}

export async function authenticate(username, password) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, display_name, role, active')
      .eq('username', username)
      .eq('password', password)
      .eq('active', true)
      .single();
    if (error || !data) {
      return { ok: false, error: 'Invalid username or password' };
    }
    return { ok: true, user: data };
  } catch (err) {
    console.error('[userStore] authenticate error:', err);
    return { ok: false, error: 'Connection error' };
  }
}

export async function createUser({ username, password, display_name, role }) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const payload = {
    username,
    password,
    display_name: display_name || username,
    role: normalizeLocalRole(role) || 'field_agent',
    active: true,
  };
  const { data, error } = await supabase
    .from('app_users')
    .insert(payload)
    .select('id, username, display_name, role, active')
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Username already exists' };
    return { ok: false, error: error.message };
  }
  return { ok: true, user: data };
}

export async function createRegistrationInvite({ display_name, role }) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const normalizedRole = normalizeLocalRole(role) || 'field_agent';
  const code = generateRegistrationCode();
  const pendingUsername = codeToPendingUsername(code);

  const { data, error } = await supabase
    .from('app_users')
    .insert({
      username: pendingUsername,
      password: code,
      display_name: display_name || 'Pending Team Member',
      role: normalizedRole,
      active: false,
    })
    .select('id, username, display_name, role, active')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Registration code collision. Try again.' };
    return { ok: false, error: error.message };
  }

  return { ok: true, code, invite: data };
}

export async function completeRegistration({ registrationCode, username, password, display_name }) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const code = String(registrationCode || '').trim().toUpperCase();
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();
  const cleanDisplayName = String(display_name || '').trim();

  if (!code || !cleanUsername || !cleanPassword) {
    return { ok: false, error: 'Registration code, username and password are required' };
  }

  const pendingUsername = codeToPendingUsername(code);

  const { data: pending, error: lookupError } = await supabase
    .from('app_users')
    .select('id, username, display_name, role, active')
    .eq('username', pendingUsername)
    .eq('active', false)
    .single();

  if (lookupError || !pending) {
    return { ok: false, error: 'Invalid or already used registration code' };
  }

  const { data: existing } = await supabase
    .from('app_users')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (existing?.id) {
    return { ok: false, error: 'Username already exists' };
  }

  const { data, error } = await supabase
    .from('app_users')
    .update({
      username: cleanUsername,
      password: cleanPassword,
      display_name: cleanDisplayName || pending.display_name || cleanUsername,
      active: true,
    })
    .eq('id', pending.id)
    .select('id, username, display_name, role, active')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data };
}

export async function toggleUserActive(id) {
  if (!supabase) return false;
  const { data: current, error: fetchErr } = await supabase
    .from('app_users')
    .select('active')
    .eq('id', id)
    .single();
  if (fetchErr || !current) return false;
  const { error } = await supabase
    .from('app_users')
    .update({ active: !current.active })
    .eq('id', id);
  return !error;
}