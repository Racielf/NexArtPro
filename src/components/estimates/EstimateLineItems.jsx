import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Plus, BookOpen, LayoutTemplate, GripVertical, Eye, EyeOff, X, FileText, StickyNote } from 'lucide-react';

const emptyItem = () => ({
  id: Date.now() + Math.random(),
  name: '',
  description: '',
  quantity: 1,
  unit_price: 0,
  unit_cost: 0,
  total_price: 0,
});

export default function EstimateLineItems({ estimate, onSave, saving }) {
  const [items, setItems] = useState(estimate?.line_items?.length ? estimate.line_items : [emptyItem()]);
  const [taxRate, setTaxRate] = useState(estimate?.tax_rate || 0);
  const [expirationDate, setExpirationDate] = useState(estimate?.expiration_date || '');
  const [showCosts, setShowCosts] = useState(true);
  const [notes, setNotes] = useState(estimate?.notes || '');
  const [internalNotes, setInternalNotes] = useState(estimate?.internal_notes || '');
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setItems(estimate?.line_items?.length ? estimate.line_items : [emptyItem()]);
    setTaxRate(estimate?.tax_rate || 0);
    setExpirationDate(estimate?.expiration_date || '');
    setNotes(estimate?.notes || '');
    setInternalNotes(estimate?.internal_notes || '');
  }, [estimate?.id]);

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(updated.quantity) || 0;
        const price = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(updated.unit_price) || 0;
        updated.total_price = qty * price;
      }
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
  const taxAmount = subtotal * ((taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  const handleSave = () => {
    onSave({ ...estimate, line_items: items, tax_rate: taxRate, expiration_date: expirationDate, notes, internal_notes: internalNotes });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl">

      {/* CANVAS HEADER */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-bold text-slate-900 text-lg">Estimate #{estimate?.estimate_number}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="text-xs">Expiration date:</span>
              <Input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className="h-6 text-xs w-36 border-slate-200 px-2"
              />
            </div>
            <span className="text-xs text-slate-400">Customer can approve: <span className="text-primary font-medium">Only one option</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowCosts(v => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded px-2 py-1"
          >
            {showCosts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showCosts ? 'Hide costs' : 'Show costs'}
          </button>
          <button
            onClick={() => setShowNotesPanel(v => !v)}
            className={`flex items-center gap-1.5 text-xs border rounded px-2 py-1 transition-colors ${showNotesPanel ? 'bg-primary/10 text-primary border-primary/30' : 'text-slate-500 hover:text-slate-700 border-slate-200'}`}
          >
            <StickyNote className="w-3.5 h-3.5" />Notes
          </button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white h-8 px-4">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* LINE ITEMS HEADER ROW */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Items</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-slate-300">
              <BookOpen className="w-3.5 h-3.5" />Service Price Book
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-slate-300">
              <LayoutTemplate className="w-3.5 h-3.5" />Templates
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-slate-300 text-primary border-primary/40 hover:bg-primary/5" onClick={addItem}>
              <Plus className="w-3.5 h-3.5" />Add Service
            </Button>
          </div>
        </div>
      </div>

      {/* TABLE COLUMNS */}
      <div className="grid text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-2 bg-slate-50/50 border-b border-slate-100"
        style={{ gridTemplateColumns: '20px 1fr 70px 100px 70px 60px' }}>
        <div />
        <div>Service</div>
        <div className="text-center">Qty</div>
        <div className="text-right">Unit Price</div>
        <div className="text-right">Total</div>
        <div />
      </div>

      {/* ITEMS */}
      <div className="divide-y divide-slate-100 min-h-[100px]">
        {items.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            showCosts={showCosts}
            editingId={editingId}
            setEditingId={setEditingId}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        ))}
        {items.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-sm">
            No line items yet. Click "Add Service" to get started.
          </div>
        )}
      </div>

      {/* SUBTOTAL SUMMARY */}
      <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center">
        <span className="text-xs text-slate-400">Services subtotal</span>
        <span className="text-sm font-semibold text-slate-700">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      {/* TOTALS */}
      <div className="px-5 pb-5 pt-2 flex justify-end border-t border-slate-100">
        <div className="w-60 space-y-1.5 text-sm">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100 gap-3">
            <span className="text-slate-500">Tax (%)</span>
            <Input
              type="number"
              value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              className="h-7 w-20 text-right text-sm"
              min={0} max={100}
            />
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tax ({taxRate}%)</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t-2 border-slate-200">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-bold text-primary text-lg">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* NOTES PANEL */}
      {showNotesPanel && (
        <div className="border-t border-slate-200 px-5 py-4 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <StickyNote className="w-4 h-4" />Notes
            </h4>
            <button onClick={() => setShowNotesPanel(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Customer Notes <span className="text-slate-400">(visible to client)</span></label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes visible to the client..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Internal Notes <span className="text-slate-400">(team only)</span></label>
              <Textarea
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder="Private notes for your team..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LineItemRow({ item, showCosts, editingId, setEditingId, onUpdate, onRemove }) {
  const isEditing = editingId === item.id;

  return (
    <div className="px-4 py-3 hover:bg-slate-50/50 transition-colors group">
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: '20px 1fr 70px 100px 70px 60px' }}>

        {/* Drag handle */}
        <div className="pt-1.5 text-slate-300 cursor-grab">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Name + description + cost */}
        <div>
          <Input
            value={item.name}
            onChange={e => onUpdate(item.id, 'name', e.target.value)}
            placeholder="Service name"
            className="h-7 text-sm border-slate-200 font-medium"
          />
          {isEditing ? (
            <Input
              value={item.description}
              onChange={e => onUpdate(item.id, 'description', e.target.value)}
              placeholder="Description (optional)"
              className="h-6 text-xs border-slate-200 mt-1 text-slate-500"
            />
          ) : item.description ? (
            <div className="text-xs text-slate-400 mt-0.5 pl-1 leading-snug">{item.description}</div>
          ) : null}
          {showCosts && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Unit cost: $</span>
              <Input
                type="number"
                step="0.01"
                value={item.unit_cost}
                onChange={e => onUpdate(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                className="h-6 w-20 text-xs border-slate-200 text-slate-500"
                min={0}
              />
            </div>
          )}
        </div>

        {/* Qty */}
        <div>
          <Input
            type="number"
            value={item.quantity}
            onChange={e => onUpdate(item.id, 'quantity', e.target.value)}
            className="h-7 text-sm text-center border-slate-200"
            min={0}
          />
        </div>

        {/* Unit Price */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
          <Input
            type="number"
            step="0.01"
            value={item.unit_price}
            onChange={e => onUpdate(item.id, 'unit_price', e.target.value)}
            className="h-7 pl-5 text-sm text-right border-slate-200"
            min={0}
          />
        </div>

        {/* Total */}
        <div className="text-right pt-1.5 font-semibold text-slate-800 text-sm">
          ${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-0.5 pt-0.5">
          <button
            onClick={() => setEditingId(isEditing ? null : item.id)}
            className="p-1 text-slate-300 hover:text-primary rounded hover:bg-primary/5 transition-colors"
            title="Edit description"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}