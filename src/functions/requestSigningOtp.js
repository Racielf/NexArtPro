import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import crypto from 'crypto';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) return json({ error: 'Missing token' }, 400);

    const pkgRows = await base44.asServiceRole.entities.SigningPackage.filter({ token });
    if (!pkgRows?.length) return json({ error: 'Not found' }, 404);

    const pkg = pkgRows[0];

    const otp = generateOtp();
    const otpHash = hash(otp);
    const tokenHash = hash(token);
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.SigningOtpChallenge.create({
      signing_package_id: pkg.id,
      token_hash: tokenHash,
      signer_email: pkg.signer_email,
      otp_hash: otpHash,
      expires_at: expires,
      ip_address: req.headers.get('cf-connecting-ip') || '',
      user_agent: req.headers.get('user-agent') || '',
      delivery_status: 'not_configured',
    });

    // TODO: integrate email/SMS provider
    console.log('[NexArtSign OTP]', pkg.signer_email, otp);

    return json({ success: true, message: 'OTP generated (check logs in dev)' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};
