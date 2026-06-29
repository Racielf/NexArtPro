import React, { useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Phone, Mail, MessageSquare, FileText, Handshake, ClipboardList, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_CONFIG = {
  call:        { label: 'Call',        icon: Phone,         bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  email:       { label: 'Email',       icon: Mail,          bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  text:        { label: 'Text',        icon: MessageSquare, bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  note:        { label: 'Note',        icon: FileText,      bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  agreement:   { label: 'Agreement',   icon: Handshake,     bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  instruction: { label: 'Instruction', icon: ClipboardList, bg: 'bg-slate-100 text-slate-700 border-slate-300' },
};

const EMPTY_FORM = { type: 'note', subject: '', body: '', person: '' };

export default function WOCommsTab({ workOrderId }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: comms = [], isLoading } = useQuery({
    queryKey: ['wo-comms', workOrderId],
    queryFn: () => nexartClient.entities.WorkOrderComm.filter({ work_order_id: workOrderId }),
    enabled: !!workOrderId,
  });

  const addMutation = useMutation({
    mutationFn: (data) => nexartClient.entities.WorkOrderComm.create({ ...data, work_order_id: workOrderId }),
    onSuccess: () => {
      qc.invalidateQueries(['wo-comms', workOrderId]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success('Communication logged');
    },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => nexartClient.entities.WorkOrderComm.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['wo-comms', workOrderId]);
      toast.success('Removed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.subject && !form.body) { toast.error('Add a subject or body'); return; }
    addMutation.mutate(form);
  };

  const sorted = [...comms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{comms.length} log{comms.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-3.5 h-3.5" />
          Log Communication
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-slate-700">New Communication</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all ${
                    form.type === key ? cfg.bg + ' ring-2 ring-offset-1 ring-primary' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Subject"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="col-span-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Person (name)"
              value={form.person}
              onChange={e => setForm(f => ({ ...f, person: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <textarea
            placeholder="Details…"
            rows={3}
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <MessageSquare className="w-8 h-8 mb-3 opacity-40" />
          <p className="text-sm">No communications logged</p>
          <p className="text-xs mt-1 opacity-70">Track calls, emails, notes and agreements here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(comm => {
            const cfg = TYPE_CONFIG[comm.type] || TYPE_CONFIG.note;
            const Icon = cfg.icon;
            return (
              <div key={comm.id} className="group flex gap-3 bg-white rounded-xl border border-slate-200 p-4">
                <div className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-full border flex items-center justify-center ${cfg.bg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                      {comm.subject && (
                        <p className="text-sm font-semibold text-slate-800 leading-snug">{comm.subject}</p>
                      )}
                      {comm.person && (
                        <p className="text-xs text-slate-500 mt-0.5">With: {comm.person}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(comm.created_at).toLocaleDateString()} {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => deleteMutation.mutate(comm.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {comm.body && (
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{comm.body}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
