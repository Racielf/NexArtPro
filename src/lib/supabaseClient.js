import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Prefer environment variables (Vercel, Netlify, local .env, Antigravity, etc.).
// Fallback values keep the local/preview app working when env config is missing.
const FALLBACK_SUPABASE_URL = 'https://hdiejuqbhqhebrpneymo.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaWVqdXFiaHFoZWJycG5leW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDM2NzIsImV4cCI6MjA5MTMxOTY3Mn0.7sIl0W27SaqDI7jZJtGamImrxq7WllAlCQ3EzM3533g';

const supabaseUrl = env.supabaseUrl || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = env.supabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
