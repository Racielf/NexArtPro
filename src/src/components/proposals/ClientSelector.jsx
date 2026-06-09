import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';

export default function ClientSelector({ open, onOpenChange, onSelect, onCreateNew }) {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      base44.entities.Client.list('-created_date', 100)
        .then(setClients)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select or Create Customer</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
           <Input
             autoFocus
             placeholder="Search by name, phone, or email..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="pl-12 h-12 text-base font-medium"
           />
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-slate-400">Loading customers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-slate-400">
                {clients.length === 0 ? 'No customers yet' : 'No matches found'}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 grid grid-cols-1 gap-2 pr-2">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c);
                    onOpenChange(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{c.full_name}</p>
                      <div className="flex gap-3 mt-1 text-[11px] text-slate-500">
                        {c.phone && <span>{c.phone}</span>}
                        {c.email && <span>{c.email}</span>}
                      </div>
                      {c.address && (
                        <p className="text-[11px] text-slate-400 mt-1">{c.address}</p>
                      )}
                    </div>
                    <span className="text-primary font-medium text-sm">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3 flex justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onCreateNew();
            }}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Customer
          </Button>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}