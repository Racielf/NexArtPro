import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const cutoff14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const packages = await base44.asServiceRole.entities.SigningPackage
      .filter({ status: 'sent' }).catch(() => []);

    const eligible = (packages || []).filter(pkg => {
      const sentAt = pkg.sent_at || pkg.created_date || '';
      return sentAt < cutoff48h && sentAt > cutoff14d;
    });

    let sent = 0;
    for (const pkg of eligible) {
      try {
        await base44.functions.invoke('reissueSigningAccess', {
          package_id: pkg.id,
          mode: 'reminder',
          send_email: true,
          expires_in_days: 30,
        });
        sent++;
      } catch {
        // continúa con el siguiente
      }
    }

    return new Response(JSON.stringify({ success: true, reminders_sent: sent }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});