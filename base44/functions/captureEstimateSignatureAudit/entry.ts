import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getHeader(req: Request, name: string) {
  return req.headers.get(name) || req.headers.get(name.toLowerCase()) || '';
}

function getSignerIp(req: Request) {
  const candidates = [
    getHeader(req, 'cf-connecting-ip'),
    getHeader(req, 'x-real-ip'),
    getHeader(req, 'x-client-ip'),
    getHeader(req, 'x-forwarded-for'),
    getHeader(req, 'forwarded'),
  ].filter(Boolean);

  const raw = candidates[0] || '';
  if (raw.includes(',')) return raw.split(',')[0].trim();

  const forwardedMatch = raw.match(/for=\"?([^;,"]+)/i);
  if (forwardedMatch?.[1]) return forwardedMatch[1].replace(/^\[/, '').replace(/\]$/, '').trim();

  return raw.trim();
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseToken(token: string) {
  const parts = String(token || '').split('_').filter(Boolean);

  if (parts.length === 2) {
    const [estimateId, signature] = parts;
    return { estimateId, signature, nonce: '', format: 'legacy' as const };
  }

  if (parts.length >= 3) {
    const [estimateId, nonce, ...rest] = parts;
    return { estimateId, nonce, signature: rest.join('_'), format: 'v2' as const };
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { token, estimate_id } = payload || {};

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = parseToken(token);
    if (!parsed?.estimateId || !parsed?.signature) {
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (estimate_id && estimate_id !== parsed.estimateId) {
      return new Response(JSON.stringify({ error: 'Token does not match estimate' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const list = await base44.asServiceRole.entities.Estimate.filter({ id: parsed.estimateId });
    if (!list || list.length === 0) {
      return new Response(JSON.stringify({ error: 'Estimate not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const estimate = list[0];
    const legacySignature = await sha256Hex(`${parsed.estimateId}${estimate.client_email || ''}`);
    const currentSignature = parsed.nonce
      ? await sha256Hex(`${parsed.estimateId}:${parsed.nonce}:${estimate.client_email || ''}`)
      : '';

    if (parsed.signature !== legacySignature && parsed.signature !== currentSignature) {
      return new Response(JSON.stringify({ error: 'Token verification failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ipAddress = getSignerIp(req);
    const xForwardedFor = getHeader(req, 'x-forwarded-for');
    const forwarded = getHeader(req, 'forwarded');
    const userAgent = getHeader(req, 'user-agent');
    const acceptLanguage = getHeader(req, 'accept-language');

    return new Response(JSON.stringify({
      ok: true,
      audit: {
        ip_address: ipAddress || 'unavailable',
        ip_captured_from: ipAddress ? 'server_request_headers' : 'unavailable',
        ip_capture_headers: {
          cf_connecting_ip: getHeader(req, 'cf-connecting-ip'),
          x_real_ip: getHeader(req, 'x-real-ip'),
          x_client_ip: getHeader(req, 'x-client-ip'),
          x_forwarded_for: xForwardedFor,
          forwarded,
        },
        server_user_agent: userAgent,
        server_accept_language: acceptLanguage,
        captured_at: new Date().toISOString(),
        token_verified: true,
        estimate_id: parsed.estimateId,
        estimate_number: estimate.estimate_number,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[captureEstimateSignatureAudit] Server error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
