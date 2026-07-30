-- TAREA G (hallazgo nuevo 2026-07-30): funciones SECURITY DEFINER invocables por anon/authenticated
-- via /rest/v1/rpc/... sin necesitarlo. Los unicos callers reales (supabase/functions/_shared/
-- nexartsignSecurity.ts) usan createSupabaseAdmin() (service_role), que ignora estos GRANTs.
-- create_security_block / write_security_audit_log / record_nexartsign_token_attempt son
-- explotables hoy: cualquiera con la anon key puede bloquear IPs/fingerprints ajenos, contaminar
-- security_audit_logs, o falsificar intentos fallidos de otra persona. investor_user_role()
-- se deja intacta a proposito: la usan las policies de RLS de toda la app.
--
-- NOTA: el permiso real viene del grant implicito a PUBLIC que Postgres otorga a toda funcion
-- nueva (visible en pg_proc.proacl como "=X/postgres"), no de un grant explicito a anon/
-- authenticated. `REVOKE ... FROM anon, authenticated` es un no-op en ese caso -- hay que
-- revocar de PUBLIC directamente.

REVOKE EXECUTE ON FUNCTION public.create_security_block(text, text, text, integer, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_security_audit_log(text, text, text, text, jsonb, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_nexartsign_token_attempt(text, text, text, text, text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nexartsign_recent_failed_attempts(text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_origin_blocked(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_invoice_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_welcome_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_company_config_timestamp() FROM PUBLIC;

-- service_role sigue con acceso explicito propio (proacl ya tenia "service_role=X/postgres"
-- ademas del grant a PUBLIC) -- revocar de PUBLIC no le afecta.
GRANT EXECUTE ON FUNCTION public.create_security_block(text, text, text, integer, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.write_security_audit_log(text, text, text, text, jsonb, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_nexartsign_token_attempt(text, text, text, text, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nexartsign_recent_failed_attempts(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_origin_blocked(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_invoice_email() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_welcome_email() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_company_config_timestamp() TO service_role;
