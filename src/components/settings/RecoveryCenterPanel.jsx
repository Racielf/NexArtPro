import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RotateCcw, Trash2, ShieldAlert, Search, Filter } from 'lucide-react';
import { filterDeletedRecords, restoreEntity } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';
import PermanentDeleteModal from '@/components/shared/PermanentDeleteModal';
import SettingsSection from '@/components/settings/SettingsSection';
import { RECOVERY_REGISTRY } from '@/lib/recoveryRegistry';

export default function RecoveryCenterPanel() {
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState('all');
  const [allRecords, setAllRecords] = useState([]); // flat list { ...record, _entityKey, _entityLabel }
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState(''); // deleted_by filter

  const adminCheck = isAdmin() || user?.role === 'admin';

  useEffect(() => {
    if (adminCheck) loadAllDeleted();
  }, [adminCheck]);

  const loadAllDeleted = async () => {
    setLoading(true);
    setAllRecords([]);
    const results = [];
    await Promise.all(
      RECOVERY_REGISTRY.map(async (entry) => {
        const all = await base44.entities[entry.apiKey].list('-deleted_at');
        const deleted = filterDeletedRecords(all);
        deleted.forEach(r => {
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
    );
    // Sort by deleted_at desc
    results.sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));
    setAllRecords(results);
    setLoading(false);
  };

  const handleRestore = async (record) => {
    setRestoring(record.id);
    await restoreEntity(base44.entities[record._apiKey], record.id, user?.email || 'admin');
    await logAuditEvent('restore', record._entityName, record.id, user?.email, {});
    toast.success(`${record._entityName} restored`);
    setAllRecords(prev => prev.filter(r => r.id !== record.id));
    setRestoring(null);
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    await base44.entities[purgeTarget._apiKey].delete(purgeTarget.id);
    await logAuditEvent('purge', purgeTarget._entityName, purgeTarget.id, user?.email, {
      reason: purgeTarget.delete_reason || null,
    });
    toast.success(`${purgeTarget._entityName} permanently deleted`);
    setAllRecords(prev => prev.filter(r => r.id !== purgeTarget.id));
    setPurgeTarget(null);
  };

  // Unique deletedBy values for filter
  const deletedByOptions = useMemo(() => {
    const set = new Set(allRecords.map(r => r.deleted_by).filter(Boolean));
    return Array.from(set).sort();
  }, [allRecords]);

  // Filtered records
  const filtered = useMemo(() => {
    let list = allRecords;
    if (activeKey !== 'all') list = list.filter(r => r._entityKey === activeKey);
    if (filterBy) list = list.filter(r => r.deleted_by === filterBy);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const label = r._labelField(r) || '';
        const num = r._numField ? r._numField(r) : '';
        return label.toLowerCase().includes(q) || num.toLowerCase().includes(q) || (r.delete_reason || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [allRecords, activeKey, filterBy, search]);

  // Counts per entity
  const countByKey = useMemo(() => {
    const counts = { all: allRecords.length };
    RECOVERY_REGISTRY.forEach(e => {
      counts[e.key] = allRecords.filter(r => r._entityKey === e.key).length;
    });
    return counts;
  }, [allRecords]);

  const purgeLabel = purgeTarget
    ? [purgeTarget._numField ? purgeTarget._numField(purgeTarget) : null, purgeTarget._labelField(purgeTarget)].filter(Boolean).join(' — ')
    : '';

  if (!adminCheck) {
    return (
      <SettingsSection title="Recovery Center" description="Restore or permanently delete archived records.">
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 flex flex-col items-center text-center">
          <ShieldAlert className="w-9 h-9 text-red-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Admin access required</p>
          <p className="text-xs text-slate-400 mt-1">Only administrators can access Recovery Center.</p>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Recovery Center" description="Restore soft-deleted records or permanently remove them. Admin only.">
      <PermanentDeleteModal
        open={!!purgeTarget}
        entityLabel={purgeLabel}
        onCancel={() => setPurgeTarget(null)}
        onConfirm={handlePurge}
      />

      {/* Module filter tabs — generated from registry */}
      <div className="flex items-center gap-1 flex-wrap bg-slate-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveKey('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeKey === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          All
          {countByKey.all > 0 && (
            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{countByKey.all}</span>
          )}
        </button>
        {RECOVERY_REGISTRY.map(entry => {
          const Icon = entry.icon;
          const count = countByKey[entry.key] || 0;
          return (
            <button
              key={entry.key}
              onClick={() => setActiveKey(entry.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeKey === entry.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {entry.label}
              {count > 0 && (
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by name, number, reason…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
        {deletedByOptions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterBy}
              onChange={e => setFilterBy(e.target.value)}
              className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-primary"
            >
              <option value="">All actors</option>
              {deletedByOptions.map(actor => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
          <RotateCcw className="w-7 h-7 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">
            {allRecords.length === 0 ? 'No deleted records found' : 'No records match your filters'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table header */}
          <div className="grid items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80"
            style={{ gridTemplateColumns: '80px 1fr 130px 150px 170px' }}>
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
              return (
                <div key={`${record._entityKey}-${record.id}`}
                  className="grid items-center gap-3 px-4 py-3"
                  style={{ gridTemplateColumns: '80px 1fr 130px 150px 170px' }}>
                  {/* Module badge */}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap self-start mt-0.5 w-fit">
                    {record._entityLabel}
                  </span>
                  {/* Record info */}
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
                    {record.deleted_at ? new Date(record.deleted_at).toLocaleString() : '—'}
                  </span>
                  <div className="flex justify-end gap-1.5">
                    {record._canRestore && (
                      <Button size="sm" variant="outline"
                        className="gap-1 text-xs h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleRestore(record)}
                        disabled={restoring === record.id}>
                        <RotateCcw className="w-3 h-3" />
                        {restoring === record.id ? 'Restoring…' : 'Restore'}
                      </Button>
                    )}
                    {record._canPurge && (
                      <Button size="sm" variant="outline"
                        className="gap-1 text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setPurgeTarget(record)}
                        disabled={restoring === record.id}>
                        <Trash2 className="w-3 h-3" />
                        Purge
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== allRecords.length && ` (${allRecords.length} total)`}
            </p>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}