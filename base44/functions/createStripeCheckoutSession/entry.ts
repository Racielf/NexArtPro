import Stripe from 'npm:stripe@17.5.0';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const appBaseUrl = Deno.env.get('APP_BASE_URL') || Deno.env.get('VITE_APP_BASE_URL') || 'http://localhost:5173';

function headers() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: headers() });

  try {
    if (!stripeSecretKey) {
      return Response.json({ ok: false, error: 'STRIPE_SECRET_KEY is not configured' }, { status: 500, headers: headers() });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });
    const { invoice_id, invoice_number, client_email, client_name, amount, currency = 'usd' } = await req.json();
    const amountNumber = Number(amount);

    if (!invoice_id || !invoice_number || !amountNumber || amountNumber <= 0) {
      return Response.json({ ok: false, error: 'invoice_id, invoice_number and valid amount are required' }, { status: 400, headers: headers() });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: client_email || undefined,
      client_reference_id: invoice_id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(amountNumber * 100),
          product_data: {
            name: `Invoice #${invoice_number}`,
            description: client_name ? `Payment for ${client_name}` : 'Invoice payment',
          },
        },
      }],
      metadata: {
        invoice_id,
        invoice_number: String(invoice_number),
        source: 'client_portal_checkout',
      },
      payment_intent_data: {
        metadata: {
          invoice_id,
          invoice_number: String(invoice_number),
          source: 'client_portal_checkout',
        },
      },
      success_url: `${appBaseUrl}/client-portal?payment=success&invoice=${invoice_id}`,
      cancel_url: `${appBaseUrl}/client-portal?payment=cancelled&invoice=${invoice_id}`,
    });

    return Response.json({ ok: true, url: session.url, session_id: session.id }, { headers: headers() });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || 'Failed to create checkout session' }, { status: 500, headers: headers() });
  }
});
