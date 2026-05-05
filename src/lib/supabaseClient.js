import { createClient } from '@supabase/supabase-js';

// Prefer environment variables (Vercel, Netlify, local .env, Antigravity, etc.).
// Fallback to hardcoded values keeps Base44 preview working without env config.
const FALLBACK_SUPABASE_URL = 'https://hdiejuqbhqhebrpneymo.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaWVqdXFiaHFoZWJycG5leW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDM2NzIsImV4cCI6MjA5MTMxOTY3Mn0.7sIl0W27SaqDI7jZJtGamImrxq7WllAlCQ3EzM3533g';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);