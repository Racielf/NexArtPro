/**
 * resolveAttachmentPublicUrl.js
 *
 * Generates a public download URL for an attachment.
 * NO authentication required — uses the public token mechanism.
 *
 * Generates a signed URL if the underlying file_url is private.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { attachment_id, estimate_id, token } = payload;

    if (!attachment_id || !estimate_id || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify token is valid for this estimate
    const parts = token.split('_');
    if (parts.length !== 2 || parts[0] !== estimate_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid token for estimate' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch estimate to verify attachment exists and token is correct
    const list = await base44.asServiceRole.entities.Estimate.filter({ id: estimate_id });
    if (!list || list.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Estimate not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const estimate = list[0];
    const [estimateIdFromToken, signature] = parts;

    // Verify token signature
    const data = new TextEncoder().encode(estimateIdFromToken + (estimate.client_email || ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== computedSignature) {
      return new Response(
        JSON.stringify({ error: 'Token verification failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the attachment
    const attachment = (estimate.attachments || []).find(a => a.id === attachment_id);
    if (!attachment || attachment.intent !== 'send_to_client') {
      return new Response(
        JSON.stringify({ error: 'Attachment not found or not accessible' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If file_url already public (starts with http), return it directly
    if (attachment.file_url && attachment.file_url.startsWith('http')) {
      return new Response(
        JSON.stringify({ url: attachment.file_url }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If file_url is a file_uri (private storage), create a signed URL
    if (attachment.file_url && attachment.file_url.includes('/')) {
      try {
        const signedUrlRes = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: attachment.file_url,
          expires_in: 604800, // 7 days
        });
        if (signedUrlRes.signed_url) {
          return new Response(
            JSON.stringify({ url: signedUrlRes.signed_url }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (err) {
        console.warn('[resolveAttachmentPublicUrl] Failed to create signed URL:', err.message);
      }
    }

    // Fallback: return original file_url (may be empty)
    return new Response(
      JSON.stringify({ url: attachment.file_url || '' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[resolveAttachmentPublicUrl] Server error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};