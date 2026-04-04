import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Phone, Wrench, X, Check } from 'lucide-react';

const TRADE_LABELS = {
  electrician: '⚡ Electrician',
  plumber: '🔧 Plumber',
  carpenter: '🪚 Carpenter',
  painter: '🖌️ Painter',
  hvac: '❄️ HVAC',
  general: '🔨 General',
  supervisor: '👷 Supervisor',
  other: '🔩 Other',
};

const ROLE_COLORS = {
  technician: 'bg-blue-100 text-blue-700',
  lead: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-amber-100 text-amber-700',
  subcontractor: 'bg-slate-100 text-slate-600',
};

export default function WorkerSelector({ currentWorkerId, onSelect, onCancel }) {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Worker.filter({ active: true }).then(data => {
      setWorkers(data);
      setLoading(false);
    });
  }, []);

  const filtered = workers.filter(w =>
    w.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.trade?.toLowerCase().includes(search.toLowerCase()) ||
    w.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Select Worker</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose a technician to assign this job</p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, trade or role..."
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[360px]">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">Loading workers...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">{search ? 'No workers match your search' : 'No active workers found'}</p>
              <p className="text-slate-400 text-xs mt-1">Add workers in the Workers settings page</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(worker => {
                const isSelected = worker.id === currentWorkerId;
                return (
                  <button
                    key={worker.id}
                    onClick={() => onSelect(worker)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {isSelected ? <Check className="w-4 h-4" /> : worker.full_name?.charAt(0)?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">{worker.full_name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[worker.role] || 'bg-slate-100 text-slate-600'}`}>
                          {worker.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500">{TRADE_LABELS[worker.trade] || worker.trade}</span>
                        {worker.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone className="w-3 h-3" />{worker.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && <span className="text-xs text-primary font-semibold flex-shrink-0">Current</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}