import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { isAdmin } from '@/lib/roleUtils';
import RecoveryAccessModal from '@/components/settings/RecoveryAccessModal';
import { hasValidRecoveryAccessSession } from '@/lib/securityMonitor';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';

const SEVERITY_MAP = {
  recovery_access_attempt: 'INFO',
  recovery_access_granted: 'INFO',
  recovery_access_denied: 'WARNING',
  recovery_restore_attempt: 'WARNING',
  recovery_purge_attempt: 'CRITICAL',
  recovery_session_expired: 'INFO',
  suspicious_activity_detected: 'CRITICAL',
  invalid_login_attempt: 'WARNING',
  privileged_action_requested: 'INFO',
  privileged_action_granted: 'WARNING',
  privileged_action_denied: 'WARNING',
};

const EVENT_LABEL = {
  recovery_access_attempt: 'Recovery Access Attempt',
  recovery_access_granted: 'Recovery Access Granted',
  recovery_access_denied: 'Recovery Access Denied',
  recovery_restore_attempt: 'Restore Operation',
  recovery_purge_attempt: 'Permanent Delete',
  recovery_session_expired: 'Session Expired',
  suspicious_activity_detected: 'Suspicious Activity',
  invalid_login_attempt: 'Invalid Login',
  privileged_action_requested: 'Privileged Action Requested',
  privileged_action_granted: 'Privileged Action Granted',
  privileged_action_denied: 'Privileged Action Denied',
};

const SEVERITY_STYLE = {
  INFO: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400', row: '' },
  WARNING: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', row: 'bg-amber-50/30' },
  CRITICAL: { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', row: 'bg-red-50/30' },
};

const AUDIT_STYLE = {
  archive: { label: 'Archive', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: FileText },
  restore: { label: 'Restore', badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: RotateCcw },
  purge: { label: 'Purge', badge: 'bg-red-50 text-red-700 border-red-200', icon: Trash2 },
};

function getSeverity(eventType) {
  return SEVERITY_MAP[eventType] || 'INFO';
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KpiCard({ icon: Icon, label, value, sub, iconCls, borderCls }) {
  return (
    <div className={`bg-white rounded-xl border ${borderCls || 'border-slate-200'} p-5 flex items-start gap-4 shadow-sm`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const style = SEVERITY_STYLE[severity] || SEVERITY_STYLE.INFO;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {severity}
    </span>
  );
}

function SecurityTable({ events, loading }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading security events…</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-sm text-slate-400 font-medium">No events found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Severity</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Result</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {events.map(ev => {
            const severity = getSeverity(ev.event_type);
            const style = SEVERITY_STYLE[severity] || SEVERITY_STYLE.INFO;
            const isExpanded = expanded === ev.id;
            return (
              <React.Fragment key={ev.id}>
                <tr className={`hover:bg-slate-50 transition-colors ${style.row}`}>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(ev.created_date)}</td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-700 truncate font-medium">{ev.user_identifier || '—'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-slate-800">{EVENT_LABEL[ev.event_type] || ev.event_type}</span>
                    {ev.origin_path && <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{ev.origin_path}</p>}
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={severity} /></td>
                  <td className="px-4 py-3">
                    {ev.success ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" />Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : ev.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1 font-medium"
                    >
                      <Eye className="w-3 h-3" />
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="space-y-2 text-xs">
                        {ev.reason && <div><span className="font-semibold text-slate-600">Reason: </span><span className="text-slate-700">{ev.reason}</span></div>}
                        {ev.metadata_json && (
                          <div>
                            <span className="font-semibold text-slate-600">Metadata:</span>
                            <pre className="mt-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-600 overflow-x-auto">
                              {JSON.stringify(ev.metadata_json, null, 2)}
                            </pre>
                          </div>
                        )}
                        {ev.user_id && <div><span className="font-semibold text-slate-600">User ID: </span><span className="font-mono text-slate-500">{ev.user_id}</span></div>}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ entries, loading }) {
  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading audit log…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center">
        <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No audit entries found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actor</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map(entry => {
            const style = AUDIT_STYLE[entry.action] || { label: entry.action || 'Action', badge: 'bg-slate-100 text-slate-600 border-slate-200', icon: Activity };
            const ActionIcon = style.icon;
            return (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(entry.performed_at)}</td>
                <td className="px-4 py-3 text-xs font-medium text-slate-700">{entry.performed_by || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                    <ActionIcon className="w-3 h-3" />{style.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-slate-700">{entry.entity_type || '—'}</span>
                  {entry.entity_id && <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[110px]">{entry.entity_id}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px]">{entry.reason || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [securityLogs, setSecurityLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingSec, setLoadingSec] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activeTab, setActiveTab] = useState('security');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [successFilter, setSuccessFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7days');
  const [showAccessGate, setShowAccessGate] = useState(false);
  const [securitySessionValid, setSecuritySessionValid] = useState(false);

  const isAdminUser = isAdmin() || user?.role === 'admin';

  const loadAll = async () => {
    setLoadingSec(true);
    setLoadingAudit(true);

    base44.entities.AuthSecurityLog.list('-created_date', 500)
      .then(data => setSecurityLogs(data || []))
      .catch(() => setSecurityLogs([]))
      .finally(() => setLoadingSec(false));

    base44.entities.AuditLog.list('-performed_at', 500)
      .then(data => setAuditLogs(data || []))
      .catch(() => setAuditLogs([]))
      .finally(() => setLoadingAudit(false));
  };

  useEffect(() => {
    if (!isAdminUser) return;
    const hasSession = hasValidRecoveryAccessSession();
    setSecuritySessionValid(hasSession);
    setShowAccessGate(!hasSession);
    if (hasSession) loadAll();
  }, [isAdminUser]);

  const now = new Date();
  const window24h = new Date(now - 24 * 60 * 60 * 1000);
  const window7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const total = securityLogs.length;
  const failed24h = securityLogs.filter(e => !e.success && new Date(e.created_date) >= window24h).length;
  const critical7d = securityLogs.filter(e => getSeverity(e.event_type) === 'CRITICAL' && new Date(e.created_date) >= window7d).length;
  const restoreCount = auditLogs.filter(e => e.action === 'restore').length;
  const purgeCount = auditLogs.filter(e => e.action === 'purge').length;

  const filteredSec = useMemo(() => {
    let rows = [...securityLogs];
    if (dateFilter !== 'all') {
      const days = { today: 1, '7days': 7, '30days': 30 }[dateFilter] || 7;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      rows = rows.filter(e => new Date(e.created_date) >= cutoff);
    }
    if (severityFilter !== 'all') rows = rows.filter(e => getSeverity(e.event_type) === severityFilter);
    if (successFilter !== 'all') rows = rows.filter(e => e.success === (successFilter === 'success'));
    if (eventTypeFilter !== 'all') rows = rows.filter(e => e.event_type === eventTypeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(e =>
        (e.user_identifier || '').toLowerCase().includes(q) ||
        (e.reason || '').toLowerCase().includes(q) ||
        (e.event_type || '').toLowerCase().includes(q) ||
        (e.origin_path || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [securityLogs, dateFilter, severityFilter, successFilter, eventTypeFilter, search]);

  const filteredAudit = useMemo(() => {
    let rows = [...auditLogs];
    if (dateFilter !== 'all') {
      const days = { today: 1, '7days': 7, '30days': 30 }[dateFilter] || 7;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      rows = rows.filter(e => new Date(e.performed_at) >= cutoff);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(e =>
        (e.performed_by || '').toLowerCase().includes(q) ||
        (e.entity_type || '').toLowerCase().includes(q) ||
        (e.reason || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [auditLogs, dateFilter, search]);

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Admin Access Required</h2>
          <p className="text-sm text-slate-500 mt-1">This dashboard is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  if (showAccessGate) {
    return (
      <RecoveryAccessModal
        open={true}
        user={user}
        onSuccess={() => {
          setShowAccessGate(false);
          setSecuritySessionValid(true);
          loadAll();
        }}
        onCancel={() => navigate('/settings')}
      />
    );
  }

  if (!securitySessionValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Privileged Session Required</h2>
          <p className="text-sm text-slate-500 mt-1">Security logs require a temporary privileged session.</p>
          <Button size="sm" variant="outline" onClick={() => setShowAccessGate(true)} className="mt-4">Verify Access</Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'security', label: 'Security Events', count: filteredSec.length },
    { id: 'audit', label: 'Audit Log', count: filteredAudit.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Security Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Read-only · privileged session protected</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadAll} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={Activity} label="Total Events" value={total} sub="all time" iconCls="bg-slate-100 text-slate-600" />
          <KpiCard icon={XCircle} label="Failed (24h)" value={failed24h} sub="last 24 hours" iconCls="bg-red-50 text-red-500" borderCls={failed24h > 0 ? 'border-red-200' : 'border-slate-200'} />
          <KpiCard icon={AlertTriangle} label="Critical (7d)" value={critical7d} sub="last 7 days" iconCls="bg-red-50 text-red-600" borderCls={critical7d > 0 ? 'border-red-200' : 'border-slate-200'} />
          <KpiCard icon={RotateCcw} label="Restores" value={restoreCount} sub="all time" iconCls="bg-blue-50 text-blue-600" />
          <KpiCard icon={Trash2} label="Purges" value={purgeCount} sub="all time" iconCls="bg-amber-50 text-amber-600" borderCls={purgeCount > 0 ? 'border-amber-200' : 'border-slate-200'} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input placeholder="Search user, event, reason…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:border-blue-400">
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            {activeTab === 'security' && (
              <>
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:border-blue-400">
                  <option value="all">All Severities</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
                <select value={successFilter} onChange={e => setSuccessFilter(e.target.value)} className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:border-blue-400">
                  <option value="all">All Results</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
                <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)} className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:border-blue-400">
                  <option value="all">All Event Types</option>
                  {Object.entries(EVENT_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 px-2 pt-2 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                  activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
          {activeTab === 'security' ? (
            <SecurityTable events={filteredSec} loading={loadingSec} />
          ) : (
            <AuditTable entries={filteredAudit} loading={loadingAudit} />
          )}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {activeTab === 'security'
                ? `Showing ${filteredSec.length} of ${securityLogs.length} security events`
                : `Showing ${filteredAudit.length} of ${auditLogs.length} audit entries`}
            </p>
            <p className="text-[10px] text-slate-300 font-mono">Read-only · No writes performed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
