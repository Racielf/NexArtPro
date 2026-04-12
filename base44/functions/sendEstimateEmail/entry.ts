import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const senderName = from_name || 'RC Art Construction';
    const fromAddress = `${senderName} <estimates@rcartconstruction.com>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        reply_to: 'rcartconstruction@gmail.com',
        subject,
        text: body,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result?.message || result?.error || 'Resend API error';
      console.error('[sendEstimateEmail] Resend error:', JSON.stringify(result));
      return Response.json({ error: errorMsg }, { status: response.status });
    }

    return Response.json({ success: true, id: result.id });
  } catch (error) {
    console.error('[sendEstimateEmail] Unexpected error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});