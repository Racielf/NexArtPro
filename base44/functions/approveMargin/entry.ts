import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * approveMargin — Server-side PIN validation for low-margin estimate approval.
 *
 * Only authenticated admin users can approve. PIN is validated server-side
 * so it is never exposed in the client bundle.
 *
 * Expects POST body:
 *   { pin: string, estimate_id: string, estimate_number: string|number, margin_pct: number }
 *
 * Returns:
 *   { approved: true } on success
 *   { error: string }  on failure (wrong PIN, not admin, missing fields)
 */

// PIN stored as server-side env var — never sent to the client.
const ADMIN_PIN = Deno.env.get('ADMIN_APPROVAL_PIN') || '1234';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // 1. Verify the caller is authenticated
    let currentUser;
    try {
      currentUser = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Verify the caller is an admin
    const role = (currentUser.role || '').toLowerCase();
    if (role !== 'admin') {
      return Response.json({ error: 'Admin role required' }, { status: 403 });
    }

    // 3. Validate required fields
    const { pin, estimate_id, estimate_number, margin_pct } = body;
    if (!pin || typeof pin !== 'string') {
      return Response.json({ error: 'PIN is required' }, { status: 400 });
    }
    if (!estimate_id) {
      return Response.json({ error: 'estimate_id is required' }, { status: 400 });
    }

    // 4. Validate PIN server-side
    if (pin !== ADMIN_PIN) {
      return Response.json({ error: 'Incorrect PIN' }, { status: 403 });
    }

    // 5. Log the approval in EstimateVersionHistory
    try {
      await base44.asServiceRole.entities.EstimateVersionHistory.create({
        estimate_id,
        estimate_number: String(estimate_number || ''),
        action: 'manual_approval',
        field: 'gross_margin_pct',
        old_value: String(margin_pct),
        new_value: String(margin_pct),
        changed_by: currentUser.full_name || currentUser.email || 'Admin',
        user_role: 'admin',
        change_note: `Admin PIN verified server-side. Margin override approved at ${Number(margin_pct).toFixed(1)}%`,
        timestamp: new Date().toISOString(),
      });
    } catch (logErr) {
      // Audit log failure should not block approval
      console.error('Audit log failed (non-blocking):', logErr);
    }

    return Response.json({ approved: true }, { status: 200 });

  } catch (error) {
    console.error('Error in approveMargin:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
