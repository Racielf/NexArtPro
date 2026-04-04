import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Phone, Mail, ToggleLeft, ToggleRight, User } from 'lucide-react';

const TRADES = ['electrician', 'plumber', 'carpenter', 'painter', 'hvac', 'general', 'supervisor', 'other'];
const ROLES = ['technician', 'lead', 'supervisor', 'subcontractor'];
const TRADE_LABELS = {
  electrician: '⚡ Electrician', plumber: '🔧 Plumber', carpenter: '🪚 Carpenter',
  painter: '🖌️ Painter', hvac: '❄️ HVAC', general: '🔨 General',
  supervisor: '👷 Supervisor', other: '🔩 Other',
};

const EMPTY_FORM = { full_name: '', trade: 'general', role: 'technician', active: true, phone: '', email: '', notes: '' };

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setWorkers(await base44.entities.Worker.list('-created_date'));
    setLoading(false);
  };

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (w) => { setEditing(w); setForm({ ...w }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (editing) {
      await base44.entities.Worker.update(editing.id, form);
      toast.success('Worker updated');
    } else {
      await base44.entities.Worker.create(form);
      toast.success('Worker added');
    }
    setShowForm(false);
    loadData();
  };

  const handleToggleActive = async (w) => {
    await base44.entities.Worker.update(w.id, { active: !w.active });
    toast.success(w.active ? 'Worker deactivated' : 'Worker activated');
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this worker?')) return;
    await base44.entities.Worker.delete(id);
    toast.success('Worker deleted');
    loadData();
  };

  const filtered = workers.filter(w =>
    w.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.trade?.toLowerCase().includes(search.toLowerCase()) ||
    w.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Workers"
        subtitle={`${workers.filter(w => w.active).length} active`}
        action={{ label: 'Add Worker', icon: Plus, onClick: openNew }}
      />

      <div className="p-6 space-y-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers..." className="pl-9" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">No workers yet</p>
            <Button size="sm" className="mt-3" onClick={openNew}>Add First Worker</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(w => (
              <div key={w.id} className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${!w.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${w.active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                      {w.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{w.full_name}</p>
                      <p className="text-xs text-slate-500">{TRADE_LABELS[w.trade] || w.trade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleActive(w)} className="p-1 rounded hover:bg-slate-100 transition-colors" title={w.active ? 'Deactivate' : 'Activate'}>
                      {w.active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                    </button>
                    <button onClick={() => openEdit(w)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(w.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${w.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {w.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{w.role}</span>
                </div>

                {(w.phone || w.email) && (
                  <div className="space-y-1">
                    {w.phone && (
                      <a href={`tel:${w.phone}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary transition-colors">
                        <Phone className="w-3 h-3" />{w.phone}
                      </a>
                    )}
                    {w.email && (
                      <a href={`mailto:${w.email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary transition-colors">
                        <Mail className="w-3 h-3" />{w.email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Worker' : 'Add Worker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name *</label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. John Smith" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Trade</label>
                <select value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })}
                  className="w-full h-9 text-sm border border-slate-200 rounded-md px-2 focus:outline-none focus:border-primary">
                  {TRADES.map(t => <option key={t} value={t}>{TRADE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full h-9 text-sm border border-slate-200 rounded-md px-2 focus:outline-none focus:border-primary capitalize">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Phone</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(503) 555-0100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="worker@email.com" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2} placeholder="Skills, certifications, etc."
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-primary resize-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="rounded" />
              <span className="text-sm text-slate-700">Active worker (available for assignments)</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Worker'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}