/**
 * RecentSecurityAlertsWidget
 *
 * Displays recently triggered security alerts and their delivery status.
 * Shows: alert type, timestamp, recipient, delivery result.
 * Admin-only, surface in Settings > Security & Monitoring.
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCircle, AlertTriangle, AlertCircle, Send } from 'lucide-react';
import { isAdmin } from '@/lib/roleUtils';

const ALERT_TYPE_LABELS = {
  recovery_access_denied: 'Recovery Access Denied',
  suspicious_activity_detected: 'Suspicious Activity',
  recovery_session_expired: 'Session Expiration Spike',
  recovery_restore_attempt_failed: 'Failed Restore Attempts',
  recovery_purge_attempt_failed: 'Failed Purge Attempts',
};

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-50 border-red-200 text-red-700',
  HIGH: 'bg-amber-50 border-amber-200 text-amber-700',
  MEDIUM: 'bg-yellow-50 border-yellow-200 text-yellow-700',
};

const SEVERITY_ICON = {
  CRITICAL: AlertTriangle,
  HIGH: AlertCircle,
  MEDIUM: Bell,
};

export default function RecentSecurityAlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const isAdmin_ = isAdmin();

  useEffect(() => {
    if (!isAdmin_ || !visible) return;
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isAdmin_, visible]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      // Get recent critical security events that may have triggered alerts
      const now = new Date();
      const last24h = new Date(now - 24 * 60 * 60 * 1000);

      const allEvents = await base44.entities.AuthSecurityLog.list('-created_date');
      const recent = allEvents
        .filter(e => new Date(e.created_date) >= last24h)
        .filter(e => {
          // Only show events that would trigger alerts
          return (
            e.event_type === 'suspicious_activity_detected' ||
            e.event_type === 'recovery_access_denied' ||
            (e.event_type === 'recovery_session_expired' && !e.success) ||
            e.event_type === 'recovery_purge_attempt'
          );
        })
        .slice(0, 5); // Last 5 events

      // Enrich with alert delivery metadata from metadata_json if available
      const alertsData = recent.map(e => ({
        id: e.id,
        event_type: e.event_type,
        severity: getSeverity(e.event_type),
        user_identifier: e.user_identifier,
        timestamp: new Date(e.created_date),
        reason: e.reason,
        delivered: e.metadata_json?.alert_sent === true,
        delivery_error: e.metadata_json?.alert_error,
      }));

      setAlerts(alertsData);
    } catch (err) {
      console.error('[RecentSecurityAlertsWidget] Error loading alerts:', err?.message);
      setAlerts([]);
    }
    setLoading(false);
  };

  if (!isAdmin_) return null;

  if (!visible) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setVisible(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
        >
          <Bell className="w-3.5 h-3.5" /> Show alert history
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">Security Alerts (24h)</h3>
          {alerts.length > 0 && (
            <span className="inline-block px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-4">
          <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin inline-block" />
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-xs text-slate-500">No security alerts in the last 24 hours</p>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const SeverityIcon = SEVERITY_ICON[alert.severity] || Bell;
            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-3 space-y-1.5 ${SEVERITY_COLORS[alert.severity]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <SeverityIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {ALERT_TYPE_LABELS[alert.event_type] || alert.event_type}
                    </span>
                  </div>
                  {alert.delivered ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  ) : alert.delivery_error ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p>
                    <span className="font-medium">User:</span> {alert.user_identifier || 'system'}
                  </p>
                  <p className="text-slate-500">
                    {alert.timestamp.toLocaleString()}
                  </p>
                  {alert.reason && (
                    <p className="text-slate-600 italic">"{alert.reason}"</p>
                  )}
                  {alert.delivery_error && (
                    <p className="text-red-600 font-medium">
                      ⚠️ Delivery failed: {alert.delivery_error}
                    </p>
                  )}
                  {alert.delivered && (
                    <p className="text-green-600 text-[10px]">✓ Email alert sent</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getSeverity(event_type) {
  if (event_type === 'suspicious_activity_detected') return 'CRITICAL';
  if (event_type === 'recovery_access_denied') return 'CRITICAL';
  if (event_type === 'recovery_purge_attempt_failed') return 'CRITICAL';
  if (event_type === 'recovery_session_expired') return 'HIGH';
  if (event_type === 'recovery_restore_attempt_failed') return 'HIGH';
  return 'MEDIUM';
}