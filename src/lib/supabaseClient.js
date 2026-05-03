import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdiejuqbhqhebrpneymo.supabase.co';
const supabaseAnonKey = 'sb_publishable_TNoF7weSWe-OarIQ3zB4CA_z0Si5gup';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);