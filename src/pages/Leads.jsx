import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatusBadge from '@/components/shared/StatusBadge';
import { Search, Phone, Mail, Calendar, ChevronRight, Trash2, Users, UserPlus, PhoneCall, CheckCircle2 } from 'lucide-react';
import { softDeleteMany, filterActiveRecords } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { useAuth } from '@/lib/AuthContext';

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent + '18' }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

export default function Leads() {
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Lead.list('-created_date');
      setLeads(filterActiveRecords(data));
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leads.filter(lead =>
    lead.name?.toLowerCase().includes(search.toLowerCase()) ||
    lead.email?.toLowerCase().includes(search.toLowerCase()) ||
    lead.phone?.includes(search) ||
    lead.service?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const idsArray = Array.from(selectedIds);
    await softDeleteMany(base44.entities.Lead, idsArray, actor);
    await Promise.all(idsArray.map(id => logAuditEvent('archive', 'Lead', id, actor)));
    setSelectedIds(new Set());
    setLeads(leads.filter(l => !selectedIds.has(l.id)));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader eyebrow="CRM" title="Leads" subtitle={`${stats.total} total leads`} />

      <PageShell>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Leads"  value={stats.total}     icon={Users}        accent="#2563EB" />
          <KpiCard label="New"          value={stats.new}       icon={UserPlus}     accent="#0ea5e9" />
          <KpiCard label="Contacted"    value={stats.contacted} icon={PhoneCall}    accent="#f59e0b" />
          <KpiCard label="Converted"    value={stats.converted} icon={CheckCircle2} accent="#10b981" />
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone or service..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm font-semibold text-red-700">{selectedIds.size} selected</span>
              <Button size="sm" variant="destructive" className="gap-1.5 h-7 text-xs"
                onClick={() => { if (confirm(`Delete ${selectedIds.size} lead(s)?`)) handleDeleteSelected(); }}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-sm text-slate-400 shadow-sm">
            Loading leads...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center shadow-sm">
            <p className="text-slate-400 text-sm mb-1">
              {leads.length === 0 ? 'No leads yet' : 'No leads match your search'}
            </p>
            {leads.length === 0 && (
              <p className="text-xs text-slate-300">Leads from the website contact form will appear here.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100" style={{ background: '#f8fafc' }}>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((lead, i) => {
                    const createdDate = lead.created_date
                      ? new Date(lead.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—';
                    const isSelected = selectedIds.has(lead.id);

                    return (
                      <tr
                        key={lead.id || i}
                        className="transition-colors duration-100"
                        style={{ background: isSelected ? '#eff6ff' : undefined }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(lead.id)}
                            className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-800 text-[13px]">{lead.name}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            {lead.email && (
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                                <Mail className="w-3 h-3 flex-shrink-0 text-slate-300" />
                                {lead.email}
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                                <Phone className="w-3 h-3 flex-shrink-0 text-slate-300" />
                                {lead.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-slate-600">{lead.service || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                            <Calendar className="w-3 h-3 flex-shrink-0 text-slate-300" />
                            {createdDate}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                            View <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Table footer count */}
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[11px] text-slate-400">{filtered.length} lead{filtered.length !== 1 ? 's' : ''} shown</p>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}