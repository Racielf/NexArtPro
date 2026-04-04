import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, User, Phone, Mail, ToggleRight, ToggleLeft } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
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
  const [showForm, setShowForm] = useState(false);
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

  // If a worker is selected, show the profile view
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
      w.worker_type?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? w.active : !w.active);
    return matchesSearch && matchesStatus;
  });

  const activeCount = workers.filter(w => w.active).length;
  const inactiveCount = workers.filter(w => !w.active).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Workers"
        subtitle={`${activeCount} active · ${inactiveCount} archived`}
        action={{ label: 'New Worker', icon: Plus, onClick: () => setShowForm(true) }}
      />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, trade..." className="pl-9" />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterStatus(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                  ${filterStatus === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading workers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-3">
              {search ? 'No workers match your search' : 'No workers yet'}
            </p>
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
                className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all
                  ${!w.active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0
                      ${w.active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                      {w.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{w.full_name}</p>
                      <p className="text-xs text-slate-500">{TRADE_LABELS[w.trade] || w.trade}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleToggleActive(e, w)}
                    className="p-1 rounded hover:bg-slate-100 transition-colors flex-shrink-0"
                    title={w.active ? 'Deactivate' : 'Activate'}
                  >
                    {w.active
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[w.worker_type] || 'bg-slate-100 text-slate-600'}`}>
                    {w.worker_type || 'employee'}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[w.role] || 'bg-slate-100 text-slate-600'}`}>
                    {w.role}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${w.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {w.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {(w.phone || w.email) && (
                  <div className="space-y-1 border-t border-slate-50 pt-2">
                    {w.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />{w.phone}
                      </div>
                    )}
                    {w.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                        <Mail className="w-3 h-3" />{w.email}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkerFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        worker={null}
        onSaved={loadData}
      />
    </div>
  );
}