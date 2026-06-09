import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { getCriticalSecurityAlerts, getRecentSuspiciousActivity } from '@/lib/securityAlerts';
import { isAdmin } from '@/lib/roleUtils';

export default function SecurityAlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin_ = isAdmin();

  useEffect(() => {
    if (!isAdmin_) {
      setLoading(false);
      return;
    }

    loadAlerts();
    // Refresh every 60s
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [isAdmin_]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const criticalAlerts = await getCriticalSecurityAlerts();
      setAlerts(criticalAlerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setAlerts([]);
    }
    setLoading(false);
  };

  if (!isAdmin_ || alerts.length === 0) {
    return null;
  }

  const severityConfig = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle },
    high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: AlertTriangle },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertCircle },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: Info },
  };

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert, idx) => {
        const cfg = severityConfig[alert.severity] || severityConfig.low;
        const Icon = cfg.icon;
        return (
          <div key={idx} className={`${cfg.bg} border ${cfg.border} rounded-lg px-4 py-3 flex items-start gap-3`}>
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cfg.text}`}>{alert.message}</p>
              {alert.lastEvent && (
                <p className="text-xs text-slate-500 mt-1">
                  Last: {new Date(alert.lastEvent.created_date).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}