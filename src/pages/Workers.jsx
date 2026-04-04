import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, User, Phone, Mail, ToggleRight, ToggleLeft, Pencil } from 'lucide-react';
import WorkerFormModal from '@/components/workers/WorkerFormModal';
import WorkerProfile from '@/components/workers/WorkerProfile';
import { toast } from 'sonner';

const TRADE_LABELS = {
  electrician: '⚡ Electrician', plumber: '🔧 Plumber', carpenter: '🪚 Carpenter',
  painter: '🖌️ Painter', hvac: '❄️ HVAC', general: '🔨 General',
  supervisor: '👷 Supervisor', other: '🔩 Other',
};
const TYPE_COLORS = {
  employee: 'bg-blue-100 text-blue-700',
  subcontractor: 'bg-purple-100 text-purple-700',
  agent: 'bg-teal-100 text-teal-700',
};
const ROLE_COLORS = {
  technician: 'bg-sky-100 text-sky-700',
  lead: 'bg-violet-100 text-violet-700',
  supervisor: 'bg-amber-100 text-amber-700',
  subcontractor: 'bg-slate-100 text-slate-600',
};

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setWorkers(await base44.entities.Worker.list('-created_date'));
    setLoading(false);
  };

  const handleToggleActive = async (e, w) => {
    e.stopPropagation();
    await base44.entities.Worker.update(w.id, { active: !w.active });
    toast.success(w.active ? 'Worker deactivated' : 'Worker activated');
    loadData();
  };

  const handleEdit = (e, w) => {
    e.stopPropagation();
    setEditingWorker(w);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingWorker(null);
  };

  // Show profile view
  if (selectedWorker) {
    const latest = workers.find(w => w.id === selectedWorker.id) || selectedWorker;
    return (
      <WorkerProfile
        worker={latest}
        onBack={() => setSelectedWorker(null)}
        onUpdated={() => { loadData(); }}
      />
    );
  }

  const filtered = workers.filter(w => {
    const matchesSearch = !search ||
      w.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      w.trade?.toLowerCase().includes(search.toLowerCase()) ||
      w.worker_type?.toLowerCase().includes(search.toLowerCase()) ||
      w.email?.toLowerCase().includes(search.toLowerCase()) ||
      w.phone?.includes(search);
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? w.active !== false : w.active === false);
    const matchesType = filterType === 'all' || w.worker_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeCount = workers.filter(w => w.active !== false).length;
  const inactiveCount = workers.filter(w => w.active === false).length;

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workers</h1>
          <p className="text-xs text-slate-400 mt-0.5">{activeCount} active · {inactiveCount} inactive</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5" onClick={() => { setEditingWorker(null); setShowForm(true); }}>
          <Plus className="w-3.5 h-3.5" />New Worker
        </Button>
      </div>

      <div className="p-6 space-y-4 flex-1 overflow-auto">

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, trade, email..." className="pl-9 bg-white" />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterStatus(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterStatus === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {[['all','All Types'],['employee','Employee'],['subcontractor','Subcontractor'],['agent','Agent']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterType(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterType === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-slate-400">{filtered.length} worker{filtered.length !== 1 ? 's' : ''} shown</p>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading workers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-3">{search ? 'No workers match your search' : 'No workers yet'}</p>
            {!search && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add First Worker
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(w => (
              <div
                key={w.id}
                onClick={() => setSelectedWorker(w)}
                className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group ${w.active === false ? 'opacity-60' : ''}`}
              >
                {/* Top row: avatar + name + toggle */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${w.active !== false ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                      {w.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{w.full_name}</p>
                      <p className="text-xs text-slate-500">{TRADE_LABELS[w.trade] || w.trade}</p>
                      {w.company_name && <p className="text-xs text-slate-400">{w.company_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => handleEdit(e, w)} className="p-1 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={(e) => handleToggleActive(e, w)} className="p-1 rounded hover:bg-slate-100 transition-colors" title={w.active !== false ? 'Deactivate' : 'Activate'}>
                      {w.active !== false
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[w.worker_type] || 'bg-slate-100 text-slate-600'}`}>
                    {w.worker_type || 'employee'}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[w.role] || 'bg-slate-100 text-slate-600'}`}>
                    {w.role}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${w.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {w.active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Contact */}
                {(w.phone || w.email) && (
                  <div className="space-y-1 border-t border-slate-50 pt-2">
                    {w.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="w-3 h-3" />{w.phone}</div>}
                    {w.email && <div className="flex items-center gap-2 text-xs text-slate-500 truncate"><Mail className="w-3 h-3" />{w.email}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkerFormModal
        open={showForm}
        onClose={handleFormClose}
        worker={editingWorker}
        onSaved={loadData}
      />
    </div>
  );
}