import React, { useState, useEffect } from 'react';
import { StickyNote, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function WONotesSection({ workOrder, woId }) {
  const [form, setForm] = useState({
    notes: workOrder.notes || '',
    internal_notes: workOrder.internal_notes || '',
    admin_correction_notes: workOrder.admin_correction_notes || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      notes: workOrder.notes || '',
      internal_notes: workOrder.internal_notes || '',
      admin_correction_notes: workOrder.admin_correction_notes || '',
    });
  }, [workOrder]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.WorkOrder.update(woId, form);
    setSaving(false);
    toast.success('Notes saved');
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" />
          Notes
        </h3>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white gap-1.5">
          <Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save Notes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Field Notes</label>
          <Textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes from the field..."
            rows={5}
            className="text-sm resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Office Notes</label>
          <Textarea
            value={form.internal_notes}
            onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))}
            placeholder="Internal office notes..."
            rows={5}
            className="text-sm resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-2 block">Admin Corrections</label>
          <Textarea
            value={form.admin_correction_notes}
            onChange={e => setForm(f => ({ ...f, admin_correction_notes: e.target.value }))}
            placeholder="Administrative corrections..."
            rows={5}
            className="text-sm resize-none border-orange-200 focus-visible:ring-orange-400"
          />
        </div>
      </div>
    </div>
  );
}