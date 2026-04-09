export function getUserRole() {
  return sessionStorage.getItem('user_role') || null;
}

export function isAdmin() {
  return getUserRole() === 'admin';
}

export function isAgent() {
  return getUserRole() === 'agent';
}

export function clearLocalSession() {
  sessionStorage.removeItem('local_auth');
  sessionStorage.removeItem('user_role');
  sessionStorage.removeItem('team_access_granted');
}
