import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import { Search, Phone, Mail, MapPin, Calendar, ChevronRight } from 'lucide-react';

const statusConfig = {
  new: { label: 'New', bg: 'bg-blue-100', text: 'text-blue-700' },
  contacted: { label: 'Contacted', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  converted: { label: 'Converted', bg: 'bg-green-100', text: 'text-green-700' },
  declined: { label: 'Declined', bg: 'bg-red-100', text: 'text-red-700' },
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Leads" subtitle={`${stats.total} total`} />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Contact</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Service</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Date</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => {
                    const statusInfo = statusConfig[lead.status] || statusConfig.new;
                    const createdDate = lead.created_date
                      ? new Date(lead.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—';

                    return (
                      <tr key={lead.id || i} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-medium text-slate-900">{lead.name}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {lead.email}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {lead.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{lead.service}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
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
      </div>
    </div>
  );
}