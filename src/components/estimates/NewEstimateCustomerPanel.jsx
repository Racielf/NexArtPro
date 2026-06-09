import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Plus, Phone, Mail, MapPin, ChevronRight } from 'lucide-react';

export default function NewEstimateCustomerPanel({ estimate, onCustomerSet, docType, docNumber }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('search'); // 'search' | 'new'
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    nexartClient.entities.Client.list('-created_date', 50).then(setClients);
  }, []);

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectClient = (client) => {
    onCustomerSet({
      client_id: client.id,
      client_name: client.full_name,
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: [client.address, client.city, client.state].filter(Boolean).join(', '),
    }, client);
  };

  const handleCreateNew = async () => {
    if (!newClient.full_name) return;
    setSaving(true);
    const created = await nexartClient.entities.Client.create({
      full_name: newClient.full_name,
      phone: newClient.phone,
      email: newClient.email,
      address: newClient.address,
    });
    await onCustomerSet({
      client_id: created.id,
      client_name: created.full_name,
      client_email: created.email || '',
      client_phone: created.phone || '',
      client_address: created.address || '',
    }, created);
    setSaving(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">New {docType || 'Estimate'} #{docNumber ?? estimate?.estimate_number}</p>
        <h2 className="text-base font-bold text-slate-800">Select Customer</h2>
        <p className="text-xs text-slate-400 mt-0.5">Choose an existing customer or create a new one</p>
      </div>

      {/* Toggle */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setMode('search')}
          className={`flex-1 text-xs py-1.5 font-semibold transition-colors ${mode === 'search' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Existing
        </button>
        <button
          onClick={() => setMode('new')}
          className={`flex-1 text-xs py-1.5 font-semibold transition-colors ${mode === 'new' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          New
        </button>
      </div>

      {mode === 'search' ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="space-y-1 max-h-[420px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No customers found</p>
            ) : (
              filtered.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{client.full_name}</p>
                      {client.phone && (
                        <p className="text-xs text-slate-400 truncate">{client.phone}</p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Full Name *</label>
            <Input
              placeholder="John Smith"
              value={newClient.full_name}
              onChange={e => setNewClient(c => ({ ...c, full_name: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Phone</label>
            <Input
              placeholder="(555) 000-0000"
              value={newClient.phone}
              onChange={e => setNewClient(c => ({ ...c, phone: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Email</label>
            <Input
              placeholder="email@example.com"
              value={newClient.email}
              onChange={e => setNewClient(c => ({ ...c, email: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Address</label>
            <Input
              placeholder="123 Main St, City, State"
              value={newClient.address}
              onChange={e => setNewClient(c => ({ ...c, address: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white"
            size="sm"
            disabled={!newClient.full_name || saving}
            onClick={handleCreateNew}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Creating...' : 'Create & Continue'}
          </Button>
        </div>
      )}
    </div>
  );
}