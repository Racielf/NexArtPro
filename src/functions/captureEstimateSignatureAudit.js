/**
 * captureEstimateSignatureAudit.js
 *
 * Public serverless handler used by the client estimate portal immediately
 * before approval/signature. It validates the public token and captures
 * server-observed request metadata, including the signer IP address.
 *
 * NO authentication required — token verification is the security boundary.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getHeader(req, name) {
  return req.headers.get(name) || req.headers.get(name.toLowerCase()) || '';
}

function getSignerIp(req) {
  const candidates = [
    getHeader(req, 'cf-connecting-ip'),
    getHeader(req, 'x-real-ip'),
    getHeader(req, 'x-client-ip'),
    getHeader(req, 'x-forwarded-for'),
    getHeader(req, 'forwarded'),
  ].filter(Boolean);

  const raw = candidates[0] || '';

  // x-forwarded-for may contain: client, proxy1, proxy2
  if (raw.includes(',')) return raw.split(',')[0].trim();

  // Forwarded may contain: for=1.2.3.4;proto=https
  const forwardedMatch = raw.match(/for=\"?([^;,"]+)/i);
  if (forwardedMatch?.[1]) return forwardedMatch[1].replace(/^\[/, '').replace(/\]$/, '').trim();

  return raw.trim();
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async (req) => {
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

    const parts = token.split('_');
    if (parts.length !== 2) {
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [estimateId, signature] = parts;
    if (estimate_id && estimate_id !== estimateId) {
      return new Response(JSON.stringify({ error: 'Token does not match estimate' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const list = await base44.asServiceRole.entities.Estimate.filter({ id: estimateId });
    if (!list || list.length === 0) {
      return new Response(JSON.stringify({ error: 'Estimate not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const estimate = list[0];
    const computedSignature = await sha256Hex(estimateId + (estimate.client_email || ''));

    if (signature !== computedSignature) {
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
        estimate_id: estimateId,
        estimate_number: estimate.estimate_number,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[captureEstimateSignatureAudit] Server error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
