import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdiejuqbhqhebrpneymo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaWVqdXFiaHFoZWJycG5leW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDM2NzIsImV4cCI6MjA5MTMxOTY3Mn0.7sIl0W27SaqDI7jZJtGamImrxq7WllAlCQ3EzM3533g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);