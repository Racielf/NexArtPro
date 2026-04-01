import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus, GripVertical, X, BookOpen, LayoutTemplate, AlignLeft, LayoutGrid } from 'lucide-react';

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
  const [approvalMode, setApprovalMode] = useState('one');
  const [notes, setNotes] = useState(estimate?.notes || '');
  const [internalNotes, setInternalNotes] = useState(estimate?.internal_notes || '');
  const [assignedTo, setAssignedTo] = useState(estimate?.assigned_to || '');
  const [viewMode, setViewMode] = useState('list');
  const [editingItemId, setEditingItemId] = useState(null);

  useEffect(() => {
    setItems(estimate?.line_items?.length ? estimate.line_items : [emptyItem()]);
    setTaxRate(estimate?.tax_rate || 0);
    setExpirationDate(estimate?.expiration_date || '');
    setNotes(estimate?.notes || '');
    setInternalNotes(estimate?.internal_notes || '');
    setAssignedTo(estimate?.assigned_to || '');
  }, [estimate?.id]);

  // Auto-save on item change
  useEffect(() => {
    const timer = setTimeout(() => {
      const subtotal = items.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
      const tax_amount = subtotal * ((taxRate || 0) / 100);
      onSave({ ...estimate, line_items: items, tax_rate: taxRate, expiration_date: expirationDate, notes, internal_notes: internalNotes, assigned_to: assignedTo, subtotal, tax_amount, total: subtotal + tax_amount });
    }, 800);
    return () => clearTimeout(timer);
  }, [items, taxRate]);

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

  const addItem = () => {
    const newItem = emptyItem();
    setItems(prev => [...prev, newItem]);
    setEditingItemId(newItem.id);
  };
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
  const taxAmount = subtotal * ((taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden" style={{ maxWidth: 820 }}>

      {/* ESTIMATE HEADER */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200">
        <div className="flex items-baseline gap-2 mb-2">
          <h2 className="text-xl font-bold text-slate-900">Estimate <span className="text-primary">#{estimate?.estimate_number}</span></h2>
        </div>
        <div className="flex items-center gap-5 text-xs text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span>Expiration date:</span>
            {expirationDate ? (
              <span className="text-slate-700 font-medium">{expirationDate}</span>
            ) : (
              <button
                onClick={() => document.getElementById('expiry-input').showPicker?.()}
                className="text-primary font-medium flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />Expiration date
              </button>
            )}
            <input
              id="expiry-input"
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Customer can approve:</span>
            <button
              onClick={() => setApprovalMode(m => m === 'one' ? 'multiple' : 'one')}
              className="text-primary font-medium hover:underline"
            >
              {approvalMode === 'one' ? 'Only one option' : 'Multiple options'}
            </button>
          </div>
        </div>
      </div>

      {/* LINE ITEMS HEADER */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Line items</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Toggle view"
          >
            {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ASSIGNED TO ROW */}
      <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-xs text-slate-700 font-medium">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
            {(assignedTo || 'T').charAt(0).toUpperCase()}
          </div>
          <span>{assignedTo || 'Unassigned'}</span>
        </div>
        <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SERVICES SECTION HEADER */}
      <div className="px-5 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Services</span>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
            <LayoutTemplate className="w-3.5 h-3.5" />Templates
          </button>
          <button className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
            <BookOpen className="w-3.5 h-3.5" />Service Price Book
          </button>
        </div>
      </div>

      {/* COLUMN HEADERS */}
      <div className="grid text-xs text-slate-400 font-semibold px-5 py-1.5 bg-slate-50/60 border-y border-slate-100"
        style={{ gridTemplateColumns: '20px 1fr 80px 90px 100px 60px' }}>
        <div />
        <div>Service</div>
        <div className="text-right">Quantity</div>
        <div className="text-right">Unit price</div>
        <div className="text-right">Total price</div>
        <div />
      </div>

      {/* LINE ITEMS */}
      <div className="divide-y divide-slate-100 min-h-[80px]">
        {items.length === 0 && (
          <div className="py-10 text-center text-slate-300 text-sm">No services added yet</div>
        )}
        {items.map(item => (
          <LineItemRow
            key={item.id}
            item={item}
            isEditing={editingItemId === item.id}
            onEdit={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        ))}
      </div>

      {/* ADD SERVICE */}
      <div className="px-5 py-3 border-t border-slate-100">
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          <Plus className="w-4 h-4" />Add service
        </button>
      </div>

      {/* TOTALS */}
      <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-800">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between py-1 gap-4">
            <span className="text-slate-500">Tax (%)</span>
            <Input
              type="number"
              value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              className="h-7 w-20 text-right text-sm border-slate-200"
              min={0} max={100}
            />
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Tax ({taxRate}%)</span>
              <span className="font-semibold">${taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t-2 border-slate-200">
            <span className="font-bold text-slate-900 text-base">Total</span>
            <span className="font-bold text-primary text-lg">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className="px-5 pb-4 pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-medium">Customer Notes</label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Visible to client..."
            rows={2}
            className="text-sm resize-none border-slate-200"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-medium">Internal Notes</label>
          <Textarea
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="Team only..."
            rows={2}
            className="text-sm resize-none border-slate-200"
          />
        </div>
      </div>
    </div>
  );
}

function LineItemRow({ item, isEditing, onEdit, onUpdate, onRemove }) {
  return (
    <div className="px-5 py-3 hover:bg-slate-50/60 transition-colors group">
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: '20px 1fr 80px 90px 100px 60px' }}>

        {/* Drag handle */}
        <div className="pt-1 text-slate-300 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Name + description + unit cost */}
        <div className="space-y-1">
          <Input
            value={item.name}
            onChange={e => onUpdate(item.id, 'name', e.target.value)}
            placeholder="Service name"
            className="h-7 text-sm font-semibold text-slate-900 border-transparent hover:border-slate-200 focus:border-primary bg-transparent hover:bg-white focus:bg-white transition-colors"
          />
          {isEditing ? (
            <Input
              value={item.description}
              onChange={e => onUpdate(item.id, 'description', e.target.value)}
              placeholder="Add description..."
              className="h-6 text-xs text-slate-500 border-slate-200 mt-0.5"
            />
          ) : item.description ? (
            <div className="text-xs text-slate-500 leading-snug px-1">{item.description}</div>
          ) : null}
          {/* Unit cost - always visible (admin) */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-slate-400">Unit cost</span>
            <div className="relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">$</span>
              <Input
                type="number"
                step="0.01"
                value={item.unit_cost}
                onChange={e => onUpdate(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                className="h-5 w-16 pl-3.5 text-[11px] text-slate-500 border-slate-200"
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Qty */}
        <div className="text-right">
          <Input
            type="number"
            value={item.quantity}
            onChange={e => onUpdate(item.id, 'quantity', e.target.value)}
            className="h-7 text-sm text-right border-slate-200 w-full"
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

        {/* Total Price */}
        <div className="text-right pt-1 font-bold text-slate-900 text-sm">
          ${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-0.5 pt-0.5">
          <button
            onClick={onEdit}
            className={`p-1.5 rounded transition-colors ${isEditing ? 'text-primary bg-primary/10' : 'text-slate-300 hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100'}`}
            title="Edit description"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}