import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/shared/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, Phone, Mail, MapPin, Pencil, Trash2, Calendar, FileText, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CommTimeline from '@/components/shared/CommTimeline';
import ClientDocuments from '@/components/clients/ClientDocuments';

const emptyClient = { full_name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', notes: '' };

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [expandedComm, setExpandedComm] = useState(null);
  const [expandedDocs, setExpandedDocs] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    const data = await base44.entities.Client.list('-created_date');
    setClients(data);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyClient); setShowForm(true); };
  const openEdit = (client) => { setEditing(client); setForm({ ...client }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.full_name || !form.phone) { toast.error('Name and phone are required'); return; }
    if (editing) {
      await base44.entities.Client.update(editing.id, form);
      toast.success('Client updated');
    } else {
      await base44.entities.Client.create(form);
      toast.success('Client created');
    }
    setShowForm(false);
    loadClients();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    await base44.entities.Client.delete(id);
    toast.success('Client deleted');
    loadClients();
  };

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

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
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const idsArray = Array.from(selectedIds);
    await Promise.all(idsArray.map(id => handleDelete(id)));
    setSelectedIds(new Set());
    toast.success(`${idsArray.length} client(s) deleted`);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Clients" subtitle={`${clients.length} total clients`} actionLabel="New Client" onAction={openCreate} />

      <div className="p-6 space-y-4 flex-1">
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600">Select all</span>
            </label>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading clients...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No clients found</p>
            <Button className="mt-4" onClick={openCreate}>Add your first client</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <span className="text-sm font-semibold text-blue-900">{selectedIds.size} selected</span>
                <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1.5" onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} client(s)?`)) handleDeleteSelected();
                }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </Button>
              </div>
            )}
            {filtered.map(client => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <label className="flex-shrink-0 mt-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(client.id)}
                        onChange={() => toggleSelect(client.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </label>
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{client.full_name}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          {client.phone && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="w-3 h-3" />{client.phone}</span>}
                          {client.email && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="w-3 h-3" />{client.email}</span>}
                          {client.address && <span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="w-3 h-3" />{client.address}{client.city ? `, ${client.city}` : ''}</span>}
                        </div>
                        {client.notes && <p className="text-xs text-muted-foreground mt-1 italic">{client.notes}</p>}
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => setExpandedDocs(expandedDocs === client.id ? null : client.id)}
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                          >
                            <FileText className="w-3 h-3" />
                            {expandedDocs === client.id ? 'Hide Documents' : 'Documents'}
                            {expandedDocs === client.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => setExpandedComm(expandedComm === client.id ? null : client.id)}
                            className="text-xs text-slate-500 hover:underline flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            {expandedComm === client.id ? 'Hide Comms' : 'Communications'}
                          </button>
                        </div>
                        {expandedDocs === client.id && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <ClientDocuments client={client} />
                          </div>
                        )}
                        {expandedComm === client.id && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <CommTimeline clientId={client.id} limit={15} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground" title="Appointments">
                        <Link to={`/appointments?client=${client.id}`}><Calendar className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(client)} title="Edit client">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Client' : 'New Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(503) 555-0100" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@email.com" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="1440 SE 143rd Ave" />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Portland" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="OR" />
                </div>
                <div className="space-y-1.5">
                  <Label>ZIP</Label>
                  <Input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} placeholder="97233" />
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes about this client..." rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create Client'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}