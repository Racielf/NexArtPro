/**
 * logoStorage.js
 * Uploads company logos to Supabase Storage and returns a public URL.
 */
import { supabase } from '@/lib/supabaseClient';

const BUCKET = 'company-assets';
const FOLDER = 'logos';

/**
 * Upload an optimized logo blob to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadLogoToStorage(blob) {
  // Generate a unique, safe filename
  const ext = blob.type === 'image/png' ? 'png'
    : blob.type === 'image/webp' ? 'webp'
    : blob.type === 'image/svg+xml' ? 'svg'
    : 'jpg';
  const filename = `${FOLDER}/logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'image/jpeg',
    });

  if (error) {
    throw new Error(error.message || 'Storage upload failed');
  }

  // Build public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded logo');
  }

  return urlData.publicUrl;
}