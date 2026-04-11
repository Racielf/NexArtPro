import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_MS = 20 * 60 * 1000; // 20 minutes

export function logout(navigate) {
  sessionStorage.removeItem('local_auth');
  sessionStorage.removeItem('user_role');
  sessionStorage.removeItem('base44_authenticated');
  sessionStorage.removeItem('team_access_granted');
  if (navigate) {
    navigate('/team-access', { replace: true });
  } else {
    window.location.href = '/team-access';
  }
}
}

export function useInactivityTimeout() {
  const navigate = useNavigate();
  const timer = useRef(null);

  useEffect(() => {
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => logout(navigate), INACTIVITY_MS);
    };

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [navigate]);
}