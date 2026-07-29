import { supabase } from './supabaseClient';

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
