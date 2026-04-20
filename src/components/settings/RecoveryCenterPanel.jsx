import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RotateCcw, Trash2, ShieldAlert, User, FileText, ClipboardList, Receipt } from 'lucide-react';
import { filterDeletedRecords, restoreEntity } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { isAdmin } from '@/lib/roleUtils';
import { useAuth } from '@/lib/AuthContext';
import PermanentDeleteModal from '@/components/shared/PermanentDeleteModal';
import SettingsSection from '@/components/settings/SettingsSection';

const TABS = [
  { key: 'customers',  label: 'Customers',   icon: User,          entityName: 'Customer',  apiKey: 'Customer',  labelField: r => r.display_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '—', numField: null },
  { key: 'estimates',  label: 'Estimates',   icon: FileText,      entityName: 'Estimate',  apiKey: 'Estimate',  labelField: r => r.client_name || '—', numField: r => `#${r.estimate_number}` },
  { key: 'workorders', label: 'Work Orders', icon: ClipboardList, entityName: 'WorkOrder', apiKey: 'WorkOrder', labelField: r => r.client_name || '—', numField: r => `WO#${r.work_order_number}` },
  { key: 'invoices',   label: 'Invoices',    icon: Receipt,       entityName: 'Invoice',   apiKey: 'Invoice',   labelField: r => r.client_name || '—', numField: r => `INV#${r.invoice_number}` },
];

export default function RecoveryCenterPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('customers');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);

  const adminCheck = isAdmin() || user?.role === 'admin';

  useEffect(() => {
    if (adminCheck) loadDeleted();
  }, [activeTab, adminCheck]);

  const loadDeleted = async () => {
    setLoading(true);
    setRecords([]);
    const tab = TABS.find(t => t.key === activeTab);
    if (!tab) { setLoading(false); return; }
    const all = await base44.entities[tab.apiKey].list('-deleted_at');
    setRecords(filterDeletedRecords(all));
    setLoading(false);
  };

  const handleRestore = async (record) => {
    const tab = TABS.find(t => t.key === activeTab);
    if (!tab) return;
    setRestoring(record.id);
    await restoreEntity(base44.entities[tab.apiKey], record.id, user?.email || 'admin');
    await logAuditEvent('restore', tab.entityName, record.id, user?.email, {});
    toast.success(`${tab.entityName} restored`);
    setRecords(prev => prev.filter(r => r.id !== record.id));
    setRestoring(null);
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    const tab = TABS.find(t => t.key === activeTab);
    if (!tab) return;
    await base44.entities[tab.apiKey].delete(purgeTarget.id);
    await logAuditEvent('purge', tab.entityName, purgeTarget.id, user?.email, {
      reason: purgeTarget.delete_reason || null,
    });
    toast.success(`${tab.entityName} permanently deleted`);
    setRecords(prev => prev.filter(r => r.id !== purgeTarget.id));
    setPurgeTarget(null);
  };

  const tab = TABS.find(t => t.key === activeTab);
  const purgeLabel = purgeTarget
    ? [tab?.numField ? tab.numField(purgeTarget) : null, tab?.labelField(purgeTarget)].filter(Boolean).join(' — ')
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

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start w-fit mb-4">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
          <RotateCcw className="w-7 h-7 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">No deleted {tab?.label.toLowerCase()} found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid items-center gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50/80"
            style={{ gridTemplateColumns: '1fr 140px 160px 160px' }}>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Record</span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deleted By</span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deleted At</span>
            <div />
          </div>

          <div className="divide-y divide-slate-100">
            {records.map(record => {
              const label = tab?.labelField(record) || '—';
              const num = tab?.numField ? tab.numField(record) : null;
              return (
                <div key={record.id} className="grid items-center gap-4 px-4 py-3"
                  style={{ gridTemplateColumns: '1fr 140px 160px 160px' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {num && <span className="text-[11px] font-bold text-slate-400 tabular-nums">{num}</span>}
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
                    <Button size="sm" variant="outline"
                      className="gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleRestore(record)}
                      disabled={restoring === record.id}>
                      <RotateCcw className="w-3 h-3" />
                      {restoring === record.id ? 'Restoring…' : 'Restore'}
                    </Button>
                    <Button size="sm" variant="outline"
                      className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setPurgeTarget(record)}
                      disabled={restoring === record.id}>
                      <Trash2 className="w-3 h-3" />
                      Delete permanently
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[11px] text-slate-400">{records.length} deleted record{records.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}