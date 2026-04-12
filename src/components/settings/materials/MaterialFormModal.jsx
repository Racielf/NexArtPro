import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS } from './materialsSeed';

export default function MaterialFormModal({ open, onClose, onSave, material = null }) {
  const [form, setForm] = useState({
    material_name: '', category: '', unit: 'ea', unit_cost: 0,
    supplier: '', sku_or_ref: '', notes: '', is_active: true,
  });

  useEffect(() => {
    if (material) {
      setForm({
        material_name: material.material_name || '',
        category: material.category || '',
        unit: material.unit || 'ea',
        unit_cost: material.unit_cost || 0,
        supplier: material.supplier || '',
        sku_or_ref: material.sku_or_ref || '',
        notes: material.notes || '',
        is_active: material.is_active !== false,
      });
    } else {
      setForm({ material_name: '', category: '', unit: 'ea', unit_cost: 0, supplier: '', sku_or_ref: '', notes: '', is_active: true });
    }
  }, [material, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.material_name.trim()) return;
    onSave({ ...form, unit_cost: parseFloat(form.unit_cost) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Material' : 'Add Material'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Material Name *</label>
            <Input value={form.material_name} onChange={e => set('material_name', e.target.value)} placeholder="e.g. Concrete (80lb bag)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full h-9 text-sm border border-slate-200 rounded-md px-3 bg-white">
                <option value="">Select...</option>
                {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)}
                className="w-full h-9 text-sm border border-slate-200 rounded-md px-3 bg-white">
                {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Unit Cost ($)</label>
              <Input type="number" step="0.01" min="0" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">SKU / Reference</label>
              <Input value={form.sku_or_ref} onChange={e => set('sku_or_ref', e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Supplier</label>
            <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="e.g. Home Depot" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" rows={2} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
            Active
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!form.material_name.trim()}>
            {material ? 'Update' : 'Add Material'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}