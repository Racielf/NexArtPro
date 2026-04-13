import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatusBadge from '@/components/shared/StatusBadge';
import { Search, Phone, Mail, MapPin, Calendar, ChevronRight, Trash2 } from 'lucide-react';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Lead.list('-created_date');
      setLeads(data || []);
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
    await Promise.all(idsArray.map(id => base44.entities.Lead.delete(id)));
    setSelectedIds(new Set());
    setLeads(leads.filter(l => !selectedIds.has(l.id)));
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Leads" subtitle={`${stats.total} total`} />

      <PageShell>
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Leads', value: stats.total, color: 'text-slate-800' },
            { label: 'New', value: stats.new, color: 'text-blue-600' },
            { label: 'Contacted', value: stats.contacted, color: 'text-yellow-600' },
            { label: 'Converted', value: stats.converted, color: 'text-green-600' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
            <Button size="sm" variant="destructive" className="gap-1.5"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} lead(s)?`)) handleDeleteSelected();
              }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </Button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-3">
              {leads.length === 0 ? 'No leads yet' : 'No leads match your search'}
            </p>
            {leads.length === 0 && (
              <p className="text-xs text-slate-400">
                Leads from the website contact form will appear here.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Contact</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Service</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Date</th>
                    <th className="px-6 py-3 text-right font-semibold text-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => {
                    const createdDate = lead.created_date
                      ? new Date(lead.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—';

                    return (
                      <tr key={lead.id || i} className="border-b border-border/50 hover:bg-accent/50 transition">
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            className="w-4 h-4 cursor-pointer"
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">{lead.name}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {lead.email}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {lead.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-foreground">{lead.service}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            {createdDate}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                            View <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}