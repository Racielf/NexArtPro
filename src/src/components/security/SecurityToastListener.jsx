import { useEffect } from 'react';
import { SECURITY_EVENT_BROWSER_EVENT } from '@/lib/securityMonitor';
import { isAdmin } from '@/lib/roleUtils';
import { toast } from 'sonner';

function getSeverity(eventType) {
  if (eventType === 'suspicious_activity_detected') return 'CRITICAL';
  if (eventType === 'recovery_purge_attempt') return 'CRITICAL';
  if (eventType === 'privileged_action_denied') return 'HIGH';
  if (eventType === 'recovery_access_denied') return 'HIGH';
  return 'MEDIUM';
}

export default function SecurityToastListener() {
  useEffect(() => {
    if (!isAdmin()) return;

    const handler = (e) => {
      const event = e.detail;
      if (!event) return;

      const severity = getSeverity(event.event_type);
      if (severity === 'MEDIUM') return; // ignore low noise

      const title = severity === 'CRITICAL'
        ? '🚨 Critical Security Event'
        : '⚠️ Security Warning';

      const message = event.reason || event.event_type;

      toast(message, {
        description: title,
        duration: severity === 'CRITICAL' ? 10000 : 6000,
      });
    };

    window.addEventListener(SECURITY_EVENT_BROWSER_EVENT, handler);
    return () => window.removeEventListener(SECURITY_EVENT_BROWSER_EVENT, handler);
  }, []);

  return null;
}
