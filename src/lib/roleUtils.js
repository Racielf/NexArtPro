export const ROLES = {
  ADMIN: 'admin',
  OFFICE_AGENT: 'office_agent',
  FIELD_AGENT: 'field_agent',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Owner / Admin',
  [ROLES.OFFICE_AGENT]: 'Office Agent',
  [ROLES.FIELD_AGENT]: 'Field Agent',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['admin:all', 'team:manage', 'office:access', 'field:access'],
  [ROLES.OFFICE_AGENT]: ['office:access'],
  [ROLES.FIELD_AGENT]: ['field:access'],
};

export function normalizeLocalRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['admin', 'owner', 'manager'].includes(value)) return ROLES.ADMIN;
  if (['office_agent', 'office-agent', 'office', 'dispatcher', 'coordinator', 'staff'].includes(value)) return ROLES.OFFICE_AGENT;
  if (['field_agent', 'field-agent', 'field', 'technician', 'tech', 'worker', 'agent'].includes(value)) return ROLES.FIELD_AGENT;
  return value || null;
}

export function isKnownRole(role) {
  return Object.values(ROLES).includes(normalizeLocalRole(role));
}

export function roleHasPermission(role, permission) {
  const normalized = normalizeLocalRole(role);
  if (!normalized) return false;
  const permissions = ROLE_PERMISSIONS[normalized] || [];
  return permissions.includes('admin:all') || permissions.includes(permission);
}

export function canAccessAdmin(role) {
  return roleHasPermission(role, 'office:access');
}

export function canAccessField(role) {
  return roleHasPermission(role, 'field:access');
}

export function canManageTeam(role) {
  return roleHasPermission(role, 'team:manage');
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
  return getUserRole() === ROLES.ADMIN;
}

export function isOfficeAgent() {
  return getUserRole() === ROLES.OFFICE_AGENT;
}

export function isFieldAgent() {
  return getUserRole() === ROLES.FIELD_AGENT;
}

export function isAgent() {
  return isOfficeAgent() || isFieldAgent();
}

export function getDefaultRouteForRole(role) {
  const normalized = normalizeLocalRole(role);
  if (normalized === ROLES.FIELD_AGENT) return '/field';
  if (normalized === ROLES.OFFICE_AGENT) return '/dashboard';
  if (normalized === ROLES.ADMIN) return '/dashboard';
  return '/team-access';
}

export function clearLocalSession() {
  sessionStorage.removeItem('local_auth');
  sessionStorage.removeItem('user_role');
  sessionStorage.removeItem('local_user_id');
  sessionStorage.removeItem('local_username');
  sessionStorage.removeItem('local_display_name');
  sessionStorage.removeItem('team_access_granted');
  sessionStorage.removeItem('nexartpro_authenticated');
}