// PATCH NexArtSign integration
import { createSigningPackageForEstimate } from '@/lib/nexArtSign';

// ...keep existing imports and code above unchanged

// inside executeSend replace token logic block with NexArtSign:

// 1. Generate signing package instead of legacy token
let finalLink = `${window.location.origin}/sign-document?token=generating`;
try {
  const currentUser = await base44.auth.me().catch(() => null);
  const pkg = await createSigningPackageForEstimate({ estimate, currentUser });
  finalLink = `${window.location.origin}/sign-document?token=${pkg.token}`;
} catch (err) {
  console.warn('[executeSend] signing package creation failed:', err?.message);
  throw new Error('Failed to generate signing link');
}
