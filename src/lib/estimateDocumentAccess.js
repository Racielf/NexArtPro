/**
 * estimateDocumentAccess.js
 * 
 * Helpers for generating signed URLs for sent estimate PDFs and client attachments.
 * Uses existing Base44 signed URL capability with sensible expiration windows.
 */

import { nexartClient } from '@/api/nexartClient';

/**
 * Generate signed URL for sent estimate PDF snapshot.
 * Expires in 7 days.
 */
export async function generateSignedPdfUrl(snapshotPdfFileUrl) {
  if (!snapshotPdfFileUrl) return null;
  
  try {
    // If it's already a public URL, return as-is
    if (snapshotPdfFileUrl.startsWith('http')) {
      return snapshotPdfFileUrl;
    }
    
    // Otherwise generate signed URL (7 days = 604800 seconds)
    const signed = await nexartClient.integrations.Core.CreateFileSignedUrl({
      file_uri: snapshotPdfFileUrl,
      expires_in: 604800,
    });
    return signed?.signed_url;
  } catch (err) {
    console.warn('[generateSignedPdfUrl] failed:', err?.message);
    return null;
  }
}

/**
 * Generate signed URLs for client-facing attachments.
 * Expires in 30 days.
 */
export async function generateSignedAttachmentUrls(attachments = []) {
  return Promise.all(attachments.map(async (att) => {
    try {
      // If already a public URL, return as-is
      if (att.file_url?.startsWith('http')) {
        return { ...att, signed_url: att.file_url };
      }
      
      // Otherwise generate signed URL (30 days = 2592000 seconds)
      const signed = await nexartClient.integrations.Core.CreateFileSignedUrl({
        file_uri: att.file_url,
        expires_in: 2592000,
      });
      return { ...att, signed_url: signed?.signed_url || att.file_url };
    } catch (err) {
      console.warn('[generateSignedAttachmentUrl] failed for', att.file_name, err?.message);
      return { ...att, signed_url: att.file_url };
    }
  }));
}