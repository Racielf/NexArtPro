import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { display_name, role } = await req.json();

    const code = crypto.randomUUID().slice(0, 8).toUpperCase();

    const { data, error } = await supabase
      .from('app_users')
      .insert({
        display_name,
        role,
        active: false,
        invite_code: code,
        invite_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      })
      .select()
      .single();

    if (error) throw error;

    return jsonResponse({ ok: true, code, invite: data });
  } catch (e) {
    return jsonResponse({ ok: false, error: e.message }, 400);
  }
});
