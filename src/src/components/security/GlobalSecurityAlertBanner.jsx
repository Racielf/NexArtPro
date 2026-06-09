import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { isAdmin } from '@/lib/roleUtils';
import { AlertTriangle, Bell, ShieldAlert, X } from 'lucide-react';

const POLL_MS = 30000;
const DISMISS_KEY = 'global_security_alert_dismissed_until';

function getSeverity(eventType) {
  if (eventType === 'suspicious_activity_detected') return 'CRITICAL';
  if (eventType === 'recovery_purge_attempt') return 'CRITICAL';
  if (eventType === 'privileged_action_denied') return 'HIGH';
  if (eventType === 'recovery_access_denied') return 'HIGH';
  if (eventType === 'recovery_session_expired') return 'MEDIUM';
  return 'MEDIUM';
}

function getEventLabel(eventType) {
  const labels = {
    suspicious_activity_detected: 'Suspicious activity detected',
    recovery_purge_attempt: 'Permanent delete activity detected',
    privileged_action_denied: 'Privileged action denied',
    recovery_access_denied: 'Recovery access denied',
    recovery_session_expired: 'Recovery session expired',
  };
  return labels[eventType] || eventType || 'Security event';
}

function shouldSuppressDismissed() {
  try {
    const until = sessionStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch (err) {
    return false;
  }
}

function dismissFor(minutes = 15) {
  try {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now() + minutes * 60 * 1000));
  } catch (err) {
    // no-op
  }
}

export default function GlobalSecurityAlertBanner() {
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [hidden, setHidden] = useState(false);
  const admin = isAdmin();

  useEffect(() => {
    if (!admin) return;

    let mounted = true;

    const load = async () => {
      if (shouldSuppressDismissed()) {
        if (mounted) setAlert(null);
        return;
      }

      try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const events = await base44.entities.AuthSecurityLog.list('-created_date', 200).catch(() => []);
        const relevant = (events || [])
          .filter(e => new Date(e.created_date) >= last24h)
          .filter(e => {
            const severity = getSeverity(e.event_type);
            return severity === 'CRITICAL' || severity === 'HIGH';
          })
          .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

        if (!mounted) return;

        if (relevant.length === 0) {
          setAlert(null);
          return;
        }

        const criticalCount = relevant.filter(e => getSeverity(e.event_type) === 'CRITICAL').length;
        const highCount = relevant.filter(e => getSeverity(e.event_type) === 'HIGH').length;
        const latest = relevant[0];

        setAlert({
          latest,
          count: relevant.length,
          criticalCount,
          highCount,
          severity: criticalCount > 0 ? 'CRITICAL' : 'HIGH',
          label: getEventLabel(latest.event_type),
          reason: latest.reason || '',
          timestamp: latest.created_date,
        });
      } catch (err) {
        console.warn('[GlobalSecurityAlertBanner] Failed to load alerts:', err?.message || err);
        if (mounted) setAlert(null);
      }
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [admin]);

  if (!admin || hidden || !alert) return null;

  const isCritical = alert.severity === 'CRITICAL';

  return (
    <div className={`${isCritical ? 'bg-red-600' : 'bg-amber-500'} text-white px-5 py-2.5 border-b border-black/10`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
          {isCritical ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate">
              {alert.severity}: {alert.label}
            </p>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
              {alert.count} event{alert.count === 1 ? '' : 's'} / 24h
            </span>
          </div>
          <p className="text-xs text-white/85 truncate">
            {alert.reason || 'Review Security Dashboard before performing sensitive actions.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/security-dashboard')}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-white text-slate-900 hover:bg-white/90 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          Review
        </button>

        <button
          onClick={() => {
            dismissFor(15);
            setHidden(true);
          }}
          className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors flex-shrink-0"
          title="Dismiss for 15 minutes"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
