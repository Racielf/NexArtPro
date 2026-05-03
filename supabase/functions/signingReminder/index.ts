/**
 * signingReminder — Edge Function (Supabase)
 * Placeholder: reminder functionality is handled by reissueSigningAccess with mode='reminder'.
 * This function can be extended for automated/scheduled reminders via Supabase cron.
 */
import { json } from '../_shared/signingContext.ts';

Deno.serve(async (_req) => {
  return json({
    message: 'signingReminder is handled via reissueSigningAccess with mode=reminder',
    code: 'use_reissue_endpoint',
  }, 200);
});
