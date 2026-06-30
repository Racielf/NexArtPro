import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nexartClient } from '@/api/nexartClient';
import { toast } from 'sonner';
import { FileText, Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DOC_TYPES = ['completion', 'inspection', 'progress', 'invoice', 'proposal', 'change_order'];
const TEMPLATES = ['classic', 'modern', 'executive'];

export default function WODocumentTab({ workOrderId, workOrder }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ doc_type: 'completion', template: 'classic', notes: '', tax_pct: 0 });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['wo_documents', workOrderId],
    queryFn: () => nexartClient.entities.WorkOrderDocument.filter({ work_order_id: workOrderId }, '-created_at'),
    enabled: !!workOrderId,
  });

  const createMut = useMutation({
    mutationFn: (payload) => nexartClient.entities.WorkOrderDocument.create(payload),
    onSuccess: () => {
      qc.invalidateQueries(['wo_documents', workOrderId]);
      setCreating(false);
      setForm({ doc_type: 'completion', template: 'classic', notes: '', tax_pct: 0 });
      toast.success('Document created');
    },
    onError: (e) => toast.error(e?.message || 'Could not create document'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => nexartClient.entities.WorkOrderDocument.delete(id),
    onSuccess: () => qc.invalidateQueries(['wo_documents', workOrderId]),
  });

  const handleCreate = () => {
    createMut.mutate({
      work_order_id: workOrderId,
      doc_type: form.doc_type,
      template: form.template,
      notes: form.notes || null,
      tax_pct: parseFloat(form.tax_pct) || 0,
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Work Order Documents</p>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white">
            <Plus className="w-3.5 h-3.5" /> New Document
          </Button>
        )}
      </div>

      {creating && (
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New Document</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Document Type</label>
              <select
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                value={form.doc_type}
                onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}
              >
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Template</label>
              <select
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                value={form.template}
                onChange={e => setForm(p => ({ ...p, template: e.target.value }))}
              >
                {TEMPLATES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Notes</label>
            <textarea
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white resize-none h-16"
              placeholder="Additional notes for this document…"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMut.isPending} className="bg-[#d97706] hover:bg-[#b45309] text-white">
              {createMut.isPending ? 'Creating…' : 'Create Document'}
            </Button>
          </div>
        </div>
      )}

      {docs.length === 0 && !creating ? (
        <div className="border border-dashed border-slate-200 rounded-xl py-12 flex flex-col items-center text-slate-400">
          <FileText className="w-8 h-8 mb-2" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs mt-1">Create a completion certificate, progress report, or invoice</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 bg-white hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {doc.doc_type?.replace('_', ' ')}
                    <span className="ml-2 text-xs font-normal text-slate-400 capitalize">({doc.template})</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    {doc.total > 0 && ` · $${doc.total.toFixed(2)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
                <button
                  onClick={() => deleteMut.mutate(doc.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
