import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async (req) => {
  const base44 = createClientFromRequest(req);
  const { token, action, signer_name } = await req.json();

  const rows = await base44.asServiceRole.entities.SigningPackage.filter({ token });
  if (!rows?.length) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const pkg = rows[0];
  const now = new Date().toISOString();
  const ip = req.headers.get('x-forwarded-for') || '';
  const ua = req.headers.get('user-agent') || '';

  if (action === 'approve') {
    await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
      status: 'signed',
      signed_at: now,
      signer_name: signer_name || pkg.signer_name
    });

    await base44.asServiceRole.entities.SigningEvent.create({
      signing_package_id: pkg.id,
      event_type: 'signed',
      actor_name: signer_name,
      ip_address: ip,
      user_agent: ua,
      created_at: now
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (action === 'decline') {
    await base44.asServiceRole.entities.SigningPackage.update(pkg.id, {
      status: 'declined',
      declined_at: now
    });

    await base44.asServiceRole.entities.SigningEvent.create({
      signing_package_id: pkg.id,
      event_type: 'declined',
      ip_address: ip,
      user_agent: ua,
      created_at: now
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
