export function normalizeLocalRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['admin', 'owner', 'manager'].includes(value)) return 'admin';
  if (['office_agent', 'office-agent', 'office', 'dispatcher', 'coordinator', 'staff'].includes(value)) return 'office_agent';
  if (['field_agent', 'field-agent', 'field', 'technician', 'tech', 'worker', 'agent'].includes(value)) return 'field_agent';
  return value || null;
}

export function getUserRole() {
  return normalizeLocalRole(sessionStorage.getItem('user_role'));
}

export function getLocalUser() {
  return {
    id: sessionStorage.getItem('local_user_id') || '',
    username: sessionStorage.getItem('local_username') || '',
    display_name: sessionStorage.getItem('local_display_name') || '',
    role: getUserRole(),
  };
}

export function isAdmin() {
  return getUserRole() === 'admin';
}

export function isOfficeAgent() {
  return getUserRole() === 'office_agent';
}

export function isFieldAgent() {
  return getUserRole() === 'field_agent';
}

export function isAgent() {
  return isOfficeAgent() || isFieldAgent();
}

export function getDefaultRouteForRole(role) {
  const normalized = normalizeLocalRole(role);
  if (normalized === 'field_agent') return '/field';
  if (normalized === 'office_agent') return '/dashboard';
  if (normalized === 'admin') return '/dashboard';
  return '/team-access';
}

export function clearLocalSession() {
  sessionStorage.removeItem('local_auth');
  sessionStorage.removeItem('user_role');
  sessionStorage.removeItem('local_user_id');
  sessionStorage.removeItem('local_username');
  sessionStorage.removeItem('local_display_name');
  sessionStorage.removeItem('team_access_granted');
  sessionStorage.removeItem('base44_authenticated');
}