import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const { attachment_id, estimate_id, token } = payload;

    if (!attachment_id || !estimate_id || !token) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = parseToken(token);
    if (!parsed || parsed.estimateId !== estimate_id) {
      return new Response(JSON.stringify({ error: 'Invalid token for estimate' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const list = await base44.asServiceRole.entities.Estimate.filter({ id: estimate_id });
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

    const attachment = (estimate.attachments || []).find((a: any) => a.id === attachment_id);
    if (!attachment || attachment.intent !== 'send_to_client') {
      return new Response(JSON.stringify({ error: 'Attachment not found or not accessible' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (attachment.file_url && attachment.file_url.startsWith('http')) {
      return new Response(JSON.stringify({ url: attachment.file_url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (attachment.file_url && attachment.file_url.includes('/')) {
      try {
        const signedUrlRes = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: attachment.file_url,
          expires_in: 604800,
        });
        if (signedUrlRes.signed_url) {
          return new Response(JSON.stringify({ url: signedUrlRes.signed_url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (err: any) {
        console.warn('[resolveAttachmentPublicUrl] Failed to create signed URL:', err.message);
      }
    }

    return new Response(JSON.stringify({ url: attachment.file_url || '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[resolveAttachmentPublicUrl] Server error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
