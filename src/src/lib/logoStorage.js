/**
 * logoStorage.js
 * Uploads company logos using Base44's built-in UploadFile integration.
 */
import { base44 } from '@/api/base44Client';

/**
 * Upload an optimized logo blob to Base44 storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadLogoToStorage(blob) {
  // Convert Blob to File if needed (UploadFile expects a File)
  const ext = blob.type === 'image/png' ? 'png'
    : blob.type === 'image/webp' ? 'webp'
    : blob.type === 'image/svg+xml' ? 'svg'
    : 'jpg';
  const fileName = `logo_${Date.now()}.${ext}`;
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  if (!file_url) {
    throw new Error('Upload succeeded but no URL was returned');
  }

  return file_url;
}