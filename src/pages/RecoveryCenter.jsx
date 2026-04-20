import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RotateCcw, Trash2, ShieldAlert, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { filterDeletedRecords, restoreEntity } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import PermanentDeleteModal from '@/components/shared/PermanentDeleteModal';
import { RECOVERY_REGISTRY } from '@/lib/recoveryRegistry';

export default function RecoveryCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState('all');
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('');

  const adminCheck = isAdmin() || user?.role === 'admin';

  useEffect(() => {
    if (adminCheck) loadAllDeleted();
  }, [adminCheck]);

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

  const deletedByOptions = useMemo(() => {
    const set = new Set(allRecords.map(r => r.deleted_by).filter(Boolean));
    return Array.from(set).sort();
  }, [allRecords]);

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

  const countByKey = useMemo(() => {
    const counts = { all: allRecords.length };
    RECOVERY_REGISTRY.forEach(e => { counts[e.key] = allRecords.filter(r => r._entityKey === e.key).length; });
    return counts;
  }, [allRecords]);

  const purgeLabel = purgeTarget
    ? [purgeTarget._numField ? purgeTarget._numField(purgeTarget) : null, purgeTarget._labelField(purgeTarget)].filter(Boolean).join(' — ')
    : '';

  return (
    <div className="flex flex-col h-full">
      <PermanentDeleteModal
        open={!!purgeTarget}
        entityLabel={purgeLabel}
        onCancel={() => setPurgeTarget(null)}
        onConfirm={handlePurge}
      />
      <PageHeader eyebrow="ADMIN" title="Recovery Center" subtitle="Restore soft-deleted records" />
      <PageShell>

        {/* Module tabs — from registry */}
        <div className="flex items-center gap-1 flex-wrap bg-white border border-slate-200 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveKey('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeKey === 'all' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
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
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {entry.label}
                {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search + actor filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search by name, number, reason…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          {deletedByOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterBy}
                onChange={e => setFilterBy(e.target.value)}
                className="h-9 text-sm border border-slate-200 rounded-md px-2 bg-white focus:outline-none focus:border-primary"
              >
                <option value="">All actors</option>
                {deletedByOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
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
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80"
              style={{ gridTemplateColumns: '90px 1fr 140px 160px 190px' }}>
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
                    className="grid items-center gap-3 px-4 py-3.5"
                    style={{ gridTemplateColumns: '90px 1fr 140px 160px 190px' }}>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap w-fit">
                      {record._entityLabel}
                    </span>
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
                    <div className="flex justify-end gap-2">
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
                          <Trash2 className="w-3 h-3" />
                          Delete permanently
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[11px] text-slate-400">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== allRecords.length && ` (${allRecords.length} total deleted)`}
              </p>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}