// Centralized NexArt environment configuration.
// New NexArt-named variables take priority; legacy Base44 names remain only as temporary fallback.
export const env = {
  appBaseUrl:
    import.meta.env?.VITE_NEXART_APP_BASE_URL ||
    import.meta.env?.VITE_APP_BASE_URL ||
    import.meta.env?.VITE_BASE44_APP_BASE_URL ||
    '',

  supabaseUrl:
    import.meta.env?.VITE_NEXART_SUPABASE_URL ||
    import.meta.env?.VITE_SUPABASE_URL ||
    '',

  supabaseAnonKey:
    import.meta.env?.VITE_NEXART_SUPABASE_ANON_KEY ||
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    '',
};
