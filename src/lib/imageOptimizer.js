/**
 * imageOptimizer.js
 * Client-side image validation, resize, and optimization using canvas.
 */

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DIM = 600;

export function validateImageFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type "${file.type}". Accepted: PNG, JPG, WEBP, SVG.` };
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File too large (${sizeMB} MB). Maximum is 5 MB.` };
  }
  return { valid: true, error: null };
}

/**
 * Resize and optimize an image file.
 * Returns a Blob ready for upload.
 * Preserves transparency for PNG/WebP; uses JPEG for opaque images.
 */
export function optimizeImage(file) {
  return new Promise((resolve, reject) => {
    // SVGs don't need resizing
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Don't upscale small images
      if (width <= MAX_DIM && height <= MAX_DIM) {
        // Still re-encode to optimize
      }

      // Calculate new dimensions preserving aspect ratio
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Check for transparency
      const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';

      if (!hasAlpha) {
        // Fill white background for JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      const outputType = hasAlpha ? 'image/png' : 'image/jpeg';
      const quality = hasAlpha ? undefined : 0.85;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to process image'));
            return;
          }
          resolve(blob);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}