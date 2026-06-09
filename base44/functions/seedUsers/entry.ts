import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

Deno.serve(async (req) => {
  try {
    const { data: existing } = await supabase.from('app_users').select('username');
    const existingNames = (existing || []).map(u => u.username);

    const toInsert = [
      { username: 'admin', password: 'admin', role: 'admin', active: true, display_name: 'Admin' },
      { username: 'agent1', password: 'admin', role: 'agent', active: true, display_name: 'Agent 1' },
    ].filter(u => !existingNames.includes(u.username));

    if (toInsert.length === 0) {
      return Response.json({ ok: true, message: 'Users already exist', existing: existingNames });
    }

    const { data, error } = await supabase.from('app_users').insert(toInsert).select('username, role');
    if (error) return Response.json({ ok: false, error: error.message });

    return Response.json({ ok: true, inserted: data });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
});