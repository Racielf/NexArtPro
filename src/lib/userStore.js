import { supabase } from './supabaseClient';
import { base44 } from '@/api/base44Client';

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
  const response = await base44.functions.invoke('authenticateUser', { username, password });
  return response.data;
}

export async function createUser({ username, password, role }) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('app_users')
    .insert({ username, password, role: role || 'agent' })
    .select('id, username, role, active')
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Username already exists' };
    return { ok: false, error: error.message };
  }
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