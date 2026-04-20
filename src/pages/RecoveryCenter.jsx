import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RotateCcw, Trash2, ShieldAlert, Search, Filter, Eye, Archive, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { filterDeletedRecords, restoreEntity } from '@/lib/softDelete';
import { markVaultPurged } from '@/lib/recoverySnapshot';
import { logAuditEvent } from '@/lib/auditLog';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import PermanentDeleteModal from '@/components/shared/PermanentDeleteModal';
import RecoveryPreviewModal from '@/components/settings/RecoveryPreviewModal';
import { RECOVERY_REGISTRY } from '@/lib/recoveryRegistry';
import { groupByTimeline, filterByDateRange, formatDeletedAt } from '@/lib/recoveryTimeline';
import RecoveryAccessModal from '@/components/settings/RecoveryAccessModal';
import {
  logSecurityEvent,
  hasValidRecoveryAccessSession,
  clearRecoveryAccessSession,
} from '@/lib/securityMonitor';

export default function RecoveryCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState('all');
  const [allRecords, setAllRecords] = useState([]);
  const [vaultMap, setVaultMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [previewVault, setPreviewVault] = useState(null);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [searchDebounce, setSearchDebounce] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState('timeline');
  const [showAccessGate, setShowAccessGate] = useState(false);
  const [recoverySessionValid, setRecoverySessionValid] = useState(false);

  const adminCheck = isAdmin() || user?.role === 'admin';

  useEffect(() => {
    if (adminCheck) {
      // Check if recovery session already valid
      const hasSession = hasValidRecoveryAccessSession();
      setRecoverySessionValid(hasSession);
      
      if (hasSession) {
        loadAllDeleted();
      } else {
        // Prompt for access gate
        setShowAccessGate(true);
      }
    }
  }, [adminCheck]);

  const deletedByOptions = useMemo(() => {
    const set = new Set(allRecords.map(r => r.deleted_by).filter(Boolean));
    return Array.from(set).sort();
  }, [allRecords]);

  // Debounced search for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = useMemo(() => {
    let list = allRecords;
    if (activeKey !== 'all') list = list.filter(r => r._entityKey === activeKey);
    if (filterBy) list = list.filter(r => r.deleted_by === filterBy);
    
    // Date range filter
    list = filterByDateRange(list, dateFilter, customStartDate, customEndDate);
    
    if (searchDebounce?.trim()) {
      const q = searchDebounce.toLowerCase();
      list = list.filter(r => {
        const label = r._labelField(r) || '';
        const num = r._numField ? r._numField(r) : '';
        const vault = vaultMap[r.id];
        const entityType = r._entityLabel || '';
        
        // Deep search across multiple fields
        return (
          label.toLowerCase().includes(q) ||
          num.toLowerCase().includes(q) ||
          (r.delete_reason || '').toLowerCase().includes(q) ||
          (vault?.search_text || '').toLowerCase().includes(q) ||
          entityType.toLowerCase().includes(q) ||
          (r.deleted_by || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [allRecords, activeKey, filterBy, searchDebounce, vaultMap, dateFilter, customStartDate, customEndDate]);

  const countByKey = useMemo(() => {
    const counts = { all: allRecords.length };
    RECOVERY_REGISTRY.forEach(e => { counts[e.key] = allRecords.filter(r => r._entityKey === e.key).length; });
    return counts;
  }, [allRecords]);

  if (!adminCheck) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-center px-4">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <p className="font-semibold text-slate-700">Admin access required</p>
        <p className="text-sm text-slate-400">Recovery Center is only accessible to administrators.</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  // Recovery Access Gate
  if (showAccessGate) {
    return (
      <>
        <RecoveryAccessModal
          open={true}
          user={user}
          onSuccess={() => {
            setShowAccessGate(false);
            setRecoverySessionValid(true);
            loadAllDeleted();
          }}
          onCancel={() => navigate('/settings')}
        />
      </>
    );
  }

  if (!recoverySessionValid) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-center px-4">
        <ShieldAlert className="w-10 h-10 text-amber-500" />
        <p className="font-semibold text-slate-700">Session expired</p>
        <p className="text-sm text-slate-400">Your recovery access session has expired. Please navigate to Recovery Center again.</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/settings')}>Back to Settings</Button>
      </div>
    );
  }

  const loadAllDeleted = async () => {
    setLoading(true);
    setAllRecords([]);
    setVaultMap({});
    const results = [];
    const [, vaultAll] = await Promise.all([
      Promise.all(
        RECOVERY_REGISTRY.map(async (entry) => {
          const all = await base44.entities[entry.apiKey].list('-deleted_at');
          filterDeletedRecords(all).forEach(r => {
            results.push({
              ...r,
              _entityKey: entry.key,
              _entityLabel: entry.label,
              _entityName: entry.entityName,
              _apiKey: entry.apiKey,
              _labelField: entry.labelField,
              _numField: entry.numField,
              _canRestore: entry.canRestore,
              _canPurge: entry.canPurge,
            });
          });
        })
      ),
      base44.entities.RecoveryVault.list('-deleted_at').catch(() => []),
    ]);
    // vault map: entity_id → most recent active vault entry
    const map = {};
    (vaultAll || []).forEach(v => {
      if (!v.is_purged) {
        const existing = map[v.entity_id];
        if (!existing || new Date(v.deleted_at) > new Date(existing.deleted_at)) map[v.entity_id] = v;
      }
    });
    setVaultMap(map);
    results.sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));
    setAllRecords(results);
    setLoading(false);
  };

  const handleRestore = async (record) => {
    // Verify recovery session is still valid
    if (!hasValidRecoveryAccessSession()) {
      setShowAccessGate(true);
      await logSecurityEvent({
        event_type: 'recovery_session_expired',
        success: false,
        user_identifier: user?.email || 'admin',
        reason: 'Recovery session expired during restore attempt',
      });
      toast.error('Recovery session expired. Please verify again.');
      return;
    }

    setRestoring(record.id);
    setPreviewVault(null);
    
    await logSecurityEvent({
      event_type: 'recovery_restore_attempt',
      success: true,
      user_identifier: user?.email || 'admin',
      reason: `Restoring ${record._entityName}`,
      metadata_json: { entity_id: record.id, entity_type: record._entityName },
    });

    await restoreEntity(base44.entities[record._apiKey], record.id, user?.email || 'admin');
    await logAuditEvent('restore', record._entityName, record.id, user?.email, {});
    toast.success(`${record._entityName} restored`);
    setAllRecords(prev => prev.filter(r => r.id !== record.id));
    setVaultMap(prev => { const n = { ...prev }; delete n[record.id]; return n; });
    setRestoring(null);
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;

    // Verify recovery session is still valid
    if (!hasValidRecoveryAccessSession()) {
      setShowAccessGate(true);
      await logSecurityEvent({
        event_type: 'recovery_session_expired',
        success: false,
        user_identifier: user?.email || 'admin',
        reason: 'Recovery session expired during purge attempt',
      });
      toast.error('Recovery session expired. Please verify again.');
      return;
    }

    await logSecurityEvent({
      event_type: 'recovery_purge_attempt',
      success: true,
      user_identifier: user?.email || 'admin',
      reason: `Permanently deleting ${purgeTarget._entityName}`,
      metadata_json: { entity_id: purgeTarget.id, entity_type: purgeTarget._entityName },
    });

    await base44.entities[purgeTarget._apiKey].delete(purgeTarget.id);
    await logAuditEvent('purge', purgeTarget._entityName, purgeTarget.id, user?.email, { reason: purgeTarget.delete_reason || null });
    await markVaultPurged(purgeTarget.id, user?.email || 'admin');
    toast.success(`${purgeTarget._entityName} permanently deleted`);
    setAllRecords(prev => prev.filter(r => r.id !== purgeTarget.id));
    setVaultMap(prev => { const n = { ...prev }; delete n[purgeTarget.id]; return n; });
    setPurgeTarget(null);
  };

  const purgeLabel = purgeTarget
    ? [purgeTarget._numField ? purgeTarget._numField(purgeTarget) : null, purgeTarget._labelField(purgeTarget)].filter(Boolean).join(' — ')
    : '';

  return (
    <div className="flex flex-col h-full">
      <PermanentDeleteModal open={!!purgeTarget} entityLabel={purgeLabel} onCancel={() => setPurgeTarget(null)} onConfirm={handlePurge} />
      <RecoveryPreviewModal
        open={!!previewVault}
        vaultEntry={previewVault}
        onClose={() => setPreviewVault(null)}
        onRestore={async () => {
          const record = allRecords.find(r => r.id === previewVault.entity_id);
          if (record) {
            await handleRestore(record);
            setPreviewVault(null);
          }
        }}
        restoring={restoring === previewVault?.entity_id}
      />
      <PageHeader eyebrow="ADMIN" title="Recovery Center" subtitle="Restore soft-deleted records" />
      <PageShell>

        {/* Module tabs */}
        <div className="flex items-center gap-1 flex-wrap bg-white border border-slate-200 rounded-xl p-1 self-start">
          <button onClick={() => setActiveKey('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeKey === 'all' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}>
            All
            {countByKey.all > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeKey === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{countByKey.all}</span>}
          </button>
          {RECOVERY_REGISTRY.map(entry => {
            const Icon = entry.icon;
            const count = countByKey[entry.key] || 0;
            const isActive = activeKey === entry.key;
            return (
              <button key={entry.key} onClick={() => setActiveKey(entry.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {entry.label}
                {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search name, number, email, reason…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          
          {/* Date filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-primary">
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">This month</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          
          {/* Custom date inputs */}
          {dateFilter === 'custom' && (
            <>
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                className="h-9 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-primary" />
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                className="h-9 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-primary" />
            </>
          )}
          
          {/* Actor filter */}
          {deletedByOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select value={filterBy} onChange={e => setFilterBy(e.target.value)}
                className="h-9 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-primary">
                <option value="">All actors</option>
                {deletedByOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1 ml-auto">
            {[
              { key: 'timeline', label: 'Timeline' },
              { key: 'list', label: 'List' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setViewMode(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
            <RotateCcw className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">
              {allRecords.length === 0 ? 'No deleted records found' : 'No records match your filters'}
            </p>
          </div>
        ) : viewMode === 'timeline' ? (
          // Timeline view (grouped by time period)
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {(() => {
              const grouped = groupByTimeline(filtered);
              const groups = Object.entries(grouped);
              return groups.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No records for this period</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groups.map(([groupLabel, records]) => (
                    <div key={groupLabel}>
                      {/* Group header */}
                      <div className="sticky top-0 bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {groupLabel} <span className="text-slate-300 font-normal">({records.length})</span>
                        </p>
                      </div>
                      {/* Group records */}
                      <div className="divide-y divide-slate-100">
                        {records.map(record => {
                          const label = record._labelField(record) || '—';
                          const num = record._numField ? record._numField(record) : null;
                          const vault = vaultMap[record.id];
                          return (
                            <div key={`${record._entityKey}-${record.id}`}
                              className="px-4 py-3.5 hover:bg-slate-50 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap w-fit">
                                      {record._entityLabel}
                                    </span>
                                    {num && <span className="text-[11px] font-bold text-slate-400 tabular-nums">{num}</span>}
                                    <span className="font-semibold text-slate-700 text-[13px] truncate">{label}</span>
                                    {vault && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold flex items-center gap-0.5">
                                        <Archive className="w-2.5 h-2.5" />vault
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-slate-500">
                                    <span>{formatDeletedAt(record.deleted_at)}</span>
                                    {record.deleted_by && <span>by {record.deleted_by}</span>}
                                    {record.delete_reason && <span className="text-slate-400 italic">({record.delete_reason})</span>}
                                  </div>
                                </div>
                                <div className="flex justify-end gap-1.5 flex-wrap flex-shrink-0">
                                  {vault && (
                                    <Button size="sm" variant="outline"
                                      className="gap-1 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                                      onClick={() => setPreviewVault(vault)}>
                                      <Eye className="w-3 h-3" />Preview
                                    </Button>
                                  )}
                                  {record._canRestore && (
                                    <Button size="sm" variant="outline"
                                      className="gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                      onClick={() => handleRestore(record)}
                                      disabled={restoring === record.id}>
                                      <RotateCcw className="w-3 h-3" />
                                      {restoring === record.id ? 'Restoring…' : 'Restore'}
                                    </Button>
                                  )}
                                  {record._canPurge && (
                                    <Button size="sm" variant="outline"
                                      className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={() => setPurgeTarget(record)}
                                      disabled={restoring === record.id}>
                                      <Trash2 className="w-3 h-3" />Delete
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== allRecords.length && ` (${allRecords.length} total deleted)`}
              </p>
              <p className="text-[11px] text-slate-300">{Object.keys(vaultMap).length} with vault snapshot</p>
            </div>
          </div>
        ) : (
          // List view (original grid layout)
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80"
              style={{ gridTemplateColumns: '90px 1fr 140px 160px 230px' }}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Module</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Record</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deleted By</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deleted At</span>
              <div />
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map(record => {
                const label = record._labelField(record) || '—';
                const num = record._numField ? record._numField(record) : null;
                const vault = vaultMap[record.id];
                return (
                  <div key={`${record._entityKey}-${record.id}`}
                    className="grid items-center gap-3 px-4 py-3.5"
                    style={{ gridTemplateColumns: '90px 1fr 140px 160px 230px' }}>
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap w-fit">
                        {record._entityLabel}
                      </span>
                      {vault && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold w-fit flex items-center gap-0.5">
                          <Archive className="w-2.5 h-2.5" />vault
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {num && <span className="text-[11px] font-bold text-slate-400 tabular-nums flex-shrink-0">{num}</span>}
                        <span className="font-semibold text-slate-700 text-[13px] truncate">{label}</span>
                      </div>
                      {record.delete_reason && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">Reason: {record.delete_reason}</p>
                      )}
                    </div>
                    <span className="text-[12px] text-slate-500 truncate">{record.deleted_by || '—'}</span>
                    <span className="text-[12px] text-slate-500">
                      {formatDeletedAt(record.deleted_at)}
                    </span>
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {vault && (
                        <Button size="sm" variant="outline"
                          className="gap-1 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={() => setPreviewVault(vault)}>
                          <Eye className="w-3 h-3" />Preview
                        </Button>
                      )}
                      {record._canRestore && (
                        <Button size="sm" variant="outline"
                          className="gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleRestore(record)}
                          disabled={restoring === record.id}>
                          <RotateCcw className="w-3 h-3" />
                          {restoring === record.id ? 'Restoring…' : 'Restore'}
                        </Button>
                      )}
                      {record._canPurge && (
                        <Button size="sm" variant="outline"
                          className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setPurgeTarget(record)}
                          disabled={restoring === record.id}>
                          <Trash2 className="w-3 h-3" />Delete permanently
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== allRecords.length && ` (${allRecords.length} total deleted)`}
              </p>
              <p className="text-[11px] text-slate-300">{Object.keys(vaultMap).length} with vault snapshot</p>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}