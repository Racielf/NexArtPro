/**
 * verifyTeamAccess — Server-side gate for the Team Access pre-login step.
 *
 * Validates an access code before allowing users to reach the login page.
 * This is NOT authentication — it's a simple gate to prevent casual visitors.
 *
 * Access code rules:
 *   - Exactly 6 alphanumeric characters
 *   - At least 1 letter
 *
 * Expects POST body: { pin: string }
 * Returns: { granted: true } or { error: string }
 */

const PIN_REGEX = /^(?=.*[A-Za-z])[A-Za-z0-9]{6}$/;

const TEAM_ACCESS_PIN = Deno.env.get('TEAM_ACCESS_PIN');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Fail closed if env is missing or misconfigured
    if (!TEAM_ACCESS_PIN || !PIN_REGEX.test(TEAM_ACCESS_PIN)) {
      return Response.json({ error: 'Team access is not configured' }, { status: 503 });
    }

    const body = await req.json();

    if (!body.pin || typeof body.pin !== 'string' || !body.pin.trim()) {
      return Response.json({ error: 'Access code is required' }, { status: 400 });
    }

    const submitted = body.pin.trim();

    if (!PIN_REGEX.test(submitted)) {
      return Response.json({ error: 'Invalid access code format' }, { status: 400 });
    }

    if (submitted !== TEAM_ACCESS_PIN) {
      return Response.json({ error: 'Invalid access code' }, { status: 403 });
    }

    return Response.json({ granted: true }, { status: 200 });

  } catch (error) {
    console.error('Error in verifyTeamAccess:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
