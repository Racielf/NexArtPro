/**
 * submitContactForm — Edge Function (Supabase)
 * Public endpoint (no login) for the website contact form (Contact.jsx, PublicHome.jsx x2).
 * Ported from base44/functions/submitContactForm/entry.ts against the real `leads` schema --
 * the original required `address` (Contact.jsx always sends '' for it, which the original
 * would have rejected) and used field names (name, service) that don't exist as columns on the
 * live `leads` table (full_name, project_type). Extra fields with no dedicated column
 * (address, city, property_type, size) go into `metadata`.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BUSINESS_EMAIL = 'info@rcartconstruction.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function sendEmail(payload: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/sendEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[submitContactForm] sendEmail call failed:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const service = String(body.service || '').trim();
    const details = String(body.details || '').trim();
    const address = String(body.address || '').trim();

    const required: Record<string, string> = { name, phone, email };
    for (const [field, value] of Object.entries(required)) {
      if (!value) return json({ error: `Missing or invalid required field: ${field}` }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email format' }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const metadata: Record<string, string> = {};
    if (address) metadata.address = address;
    if (body.city) metadata.city = String(body.city).trim();
    if (body.propertyType) metadata.property_type = String(body.propertyType).trim();
    if (body.size) metadata.size = String(body.size).trim();
    if (body.budget) metadata.budget_note = String(body.budget).trim();

    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        full_name: name,
        phone,
        email,
        project_type: service || null,
        scope: details || null,
        budget: body.budget ? String(body.budget).trim() : null,
        timeline: body.timeline ? String(body.timeline).trim() : null,
        zip: body.zip ? String(body.zip).trim() : null,
        source: 'website',
        status: 'new',
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[submitContactForm] Insert failed:', insertError);
      return json({ error: 'Could not save your request. Please try again.' }, 500);
    }

    await sendEmail({
      to: BUSINESS_EMAIL,
      subject: `New Lead Received - ${name}`,
      body: [
        'A new lead has been submitted through your website:',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        address ? `Address: ${address}` : '',
        service ? `Service: ${service}` : '',
        `Project Details: ${details || 'No details provided'}`,
        '',
        'Please contact this lead within 24 hours.',
      ].filter(Boolean).join('\n'),
      from_name: 'NexArt Pro',
    });

    await sendEmail({
      to: email,
      subject: 'We Received Your Estimate Request',
      body: [
        `Hello ${name},`,
        '',
        "Thank you for submitting your estimate request! We've received your information and will review your project details.",
        '',
        `Our team will contact you within 24 hours at ${phone}${service ? ` to discuss your ${service} project` : ''} and provide you with a detailed estimate.`,
        '',
        address ? `Project Address: ${address}` : '',
        '',
        'If you have any questions in the meantime, feel free to reach out to us.',
        '',
        'Best regards,',
        'R.C Art Construction LLC',
      ].filter(Boolean).join('\n'),
      from_name: 'NexArt Pro',
    });

    return json({ success: true, message: 'Lead created successfully', leadId: lead.id }, 201);
  } catch (error) {
    console.error('[submitContactForm] Error:', error);
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
