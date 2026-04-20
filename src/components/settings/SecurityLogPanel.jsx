import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import { AlertTriangle, Activity, Shield, Lock, Search, Calendar, Filter, Clock } from 'lucide-react';
import { isAdmin } from '@/lib/roleUtils';
import SecurityAlertsWidget from '@/components/settings/SecurityAlertsWidget';

const EVENT_LABELS = {
  recovery_access_attempt: 'Recovery Access Attempt',
  recovery_access_granted: 'Recovery Access Granted',
  recovery_access_denied: 'Recovery Access Denied',
  recovery_restore_attempt: 'Restore Operation',
  recovery_purge_attempt: 'Permanent Delete',
  recovery_session_expired: 'Session Expired',
  suspicious_activity_detected: 'Suspicious Activity',
  invalid_login_attempt: 'Invalid Login',
};

const EVENT_ICONS = {
  recovery_access_attempt: Shield,
  recovery_access_granted: Shield,
  recovery_access_denied: AlertTriangle,
  recovery_restore_attempt: Lock,
  recovery_purge_attempt: AlertTriangle,
  recovery_session_expired: Clock,
  suspicious_activity_detected: AlertTriangle,
  invalid_login_attempt: AlertTriangle,
};

const EVENT_COLORS = {
  recovery_access_attempt: 'text-blue-600 bg-blue-50',
  recovery_access_granted: 'text-green-600 bg-green-50',
  recovery_access_denied: 'text-red-600 bg-red-50',
  recovery_restore_attempt: 'text-amber-600 bg-amber-50',
  recovery_purge_attempt: 'text-red-600 bg-red-50',
  recovery_session_expired: 'text-orange-600 bg-orange-50',
  suspicious_activity_detected: 'text-red-600 bg-red-50',
  invalid_login_attempt: 'text-red-600 bg-red-50',
};

function SuspiciousSummary({ events }) {
  const now = new Date();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);

  const failed24h = events.filter(e => !e.success && new Date(e.created_date) >= last24h).length;
  const suspicious24h = events.filter(e => e.event_type === 'suspicious_activity_detected' && new Date(e.created_date) >= last24h).length;
  const deniedRecovery24h = events.filter(e => e.event_type === 'recovery_access_denied' && new Date(e.created_date) >= last24h).length;
  const sessionExpired24h = events.filter(e => e.event_type === 'recovery_session_expired' && new Date(e.created_date) >= last24h).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Failed Attempts (24h)</p>
        </div>
        <p className="text-2xl font-bold text-slate-900">{failed24h}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-red-600" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Suspicious Events</p>
        </div>
        <p className="text-2xl font-bold text-slate-900">{suspicious24h}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-orange-500" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Recovery Denied (24h)</p>
        </div>
        <p className="text-2xl font-bold text-slate-900">{deniedRecovery24h}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-orange-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Sessions Expired (24h)</p>
        </div>
        <p className="text-2xl font-bold text-slate-900">{sessionExpired24h}</p>
      </div>
    </div>
  );
}

export default function SecurityLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [successFilter, setSuccessFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const isAdmin_ = isAdmin();

  useEffect(() => {
    if (!isAdmin_) return;
    loadLogs();
  }, [isAdmin_]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.AuthSecurityLog.list('-created_date');
      setLogs(all || []);
    } catch (err) {
      console.error('Failed to load security logs:', err);
      setLogs([]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = [...logs];

    // Event type filter
    if (eventFilter !== 'all') {
      result = result.filter(log => log.event_type === eventFilter);
    }

    // Success filter
    if (successFilter !== 'all') {
      const isSuc = successFilter === 'success';
      result = result.filter(log => log.success === isSuc);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(log => new Date(log.created_date) >= today);
    } else if (dateFilter === '7days') {
      const week = new Date(now - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(log => new Date(log.created_date) >= week);
    } else if (dateFilter === '30days') {
      const month = new Date(now - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(log => new Date(log.created_date) >= month);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(log =>
        (log.user_identifier || '').toLowerCase().includes(q) ||
        (log.reason || '').toLowerCase().includes(q) ||
        (log.origin_path || '').toLowerCase().includes(q) ||
        log.event_type.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, eventFilter, successFilter, dateFilter, search]);

  if (!isAdmin_) {
    return (
      <SettingsSection title="Security & Monitoring" description="Admin-only security event logs.">
        <SettingsCard>
          <div className="px-5 py-8 text-center">
            <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Admin access required</p>
          </div>
        </SettingsCard>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Security & Monitoring" description="Real-time security event logs and suspicious activity tracking.">
      {/* Critical alerts banner */}
      <SecurityAlertsWidget />

      {/* Summary cards */}
      {!loading && logs.length > 0 && <SuspiciousSummary events={logs} />}

      {/* Filters */}
      <SettingsCard>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Search user, reason, path…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <select
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="all">All Events</option>
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={successFilter}
              onChange={e => setSuccessFilter(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="all">All Results</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>

            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">This Month</option>
            </select>

            <Button size="sm" variant="outline" onClick={loadLogs} className="h-9">
              Refresh
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* Log list */}
      <SettingsCard>
        {loading ? (
          <div className="px-5 py-8 text-center">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading logs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No events found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filtered.map(log => {
              const Icon = EVENT_ICONS[log.event_type] || Activity;
              const colors = EVENT_COLORS[log.event_type] || 'text-slate-600 bg-slate-50';
              return (
                <div key={log.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colors}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">
                          {EVENT_LABELS[log.event_type] || log.event_type}
                        </p>
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          log.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {log.success ? '✓ Success' : '✗ Failed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-medium">{log.user_identifier}</span> • {log.origin_path}
                      </p>
                      {log.reason && (
                        <p className="text-xs text-slate-600 mt-1">{log.reason}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(log.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
          Showing {filtered.length} of {logs.length} events
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}