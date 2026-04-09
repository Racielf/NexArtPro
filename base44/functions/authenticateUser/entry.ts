import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = 'https://hdjeiugbhqhebrpneyma.supabase.co';
const supabaseAnonKey = 'sb_publishable_TNoF7weSWe-OarIQ3zB4CA_z0Si5gup';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

Deno.serve(async (req) => {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ ok: false, error: 'Username and password required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, display_name, role, active')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return Response.json({ ok: false, error: 'Invalid username or password' });
    }

    if (!data.active) {
      return Response.json({ ok: false, error: 'Account is deactivated' });
    }

    return Response.json({ ok: true, user: data });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
});