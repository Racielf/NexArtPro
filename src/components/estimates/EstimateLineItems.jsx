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
  const [projectStartDate, setProjectStartDate] = useState(estimate?.project_start_date || '');
  const [projectEndDate, setProjectEndDate] = useState(estimate?.project_end_date || '');
  const [depositPercent, setDepositPercent] = useState(estimate?.deposit_percent || 0);

  useEffect(() => {
    setItems(estimate?.line_items?.length ? estimate.line_items : [emptyItem()]);
    setTaxRate(estimate?.tax_rate || 0);
    setExpirationDate(estimate?.expiration_date || '');
    setNotes(estimate?.notes || '');
    setInternalNotes(estimate?.internal_notes || '');
    setAssignedTo(estimate?.assigned_to || '');
    setProjectStartDate(estimate?.project_start_date || '');
    setProjectEndDate(estimate?.project_end_date || '');
    setDepositPercent(estimate?.deposit_percent || 0);
  }, [estimate?.id]);

  // Auto-save on item change
  useEffect(() => {
    const timer = setTimeout(() => {
      const subtotal = items.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
      const tax_amount = subtotal * ((taxRate || 0) / 100);
      onSave({ ...estimate, line_items: items, tax_rate: taxRate, expiration_date: expirationDate, notes, internal_notes: internalNotes, assigned_to: assignedTo, project_start_date: projectStartDate, project_end_date: projectEndDate, deposit_percent: depositPercent, subtotal, tax_amount, total: subtotal + tax_amount });
    }, 800);
    return () => clearTimeout(timer);
  }, [items, taxRate, projectStartDate, projectEndDate, depositPercent]);

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ maxWidth: 900 }}>

      {/* ESTIMATE HEADER */}
      <div className="px-7 pt-6 pb-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Estimate <span className="text-primary">#{estimate?.estimate_number}</span>
        </h2>
        <div className="flex items-center gap-6 text-sm text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span>Expiration date:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              {!expirationDate && <Plus className="w-3.5 h-3.5 text-primary" />}
              <input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className={`text-sm border-none outline-none bg-transparent cursor-pointer ${expirationDate ? 'text-slate-700 font-medium' : 'text-primary font-medium w-5 opacity-0 absolute'}`}
              />
              {!expirationDate && <span className="text-primary font-medium hover:underline">Expiration date</span>}
              {expirationDate && <span className="text-slate-700 font-medium">{expirationDate}</span>}
            </label>
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
      <div className="px-7 py-3.5 flex items-center justify-between border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Line items</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
            title="List view"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ASSIGNED TO ROW */}
      <div className="px-7 py-3 border-b border-slate-100 flex items-center gap-2">
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
      <div className="px-7 py-3 flex items-center justify-between">
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
      <div className="grid text-xs text-slate-400 font-semibold px-7 py-2.5 bg-slate-50 border-y border-slate-100"
        style={{ gridTemplateColumns: '16px 1fr 80px 100px 110px 64px' }}>
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
            onEdit={() => setEditingItemId(item.id)}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        ))}
      </div>

      {/* ADD SERVICE */}
      <div className="px-7 py-4 border-t border-slate-100">
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          <Plus className="w-4 h-4" />Add service
        </button>
      </div>

      {/* TOTALS */}
      <div className="px-7 py-6 border-t border-slate-200 flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-800">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between py-2 gap-4">
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
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Tax ({taxRate}%)</span>
              <span className="font-semibold">${taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t-2 border-slate-200">
            <span className="font-bold text-slate-900 text-base">Total</span>
            <span className="font-bold text-primary text-lg">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className="px-7 pb-7 pt-5 border-t border-slate-100 grid grid-cols-2 gap-5">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Customer Notes</label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Visible to client..."
            rows={3}
            className="text-sm resize-none border-slate-200"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Internal Notes</label>
          <Textarea
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="Team only..."
            rows={3}
            className="text-sm resize-none border-slate-200"
          />
        </div>
      </div>
    </div>
  );
}

function LineItemRow({ item, isEditing, onEdit, onUpdate, onRemove }) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className={`px-7 py-4 transition-colors group ${isEditing ? 'bg-blue-50/30 border-l-2 border-primary' : 'hover:bg-slate-50/60 border-l-2 border-transparent'}`}>

      {/* PRIMARY ROW */}
      <div className="grid items-start gap-3" style={{ gridTemplateColumns: '16px 1fr 80px 100px 110px 64px' }}>

        <div className="text-slate-200 cursor-grab active:cursor-grabbing pt-1">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Service name + description always below */}
        <div>
          <Input
            value={item.name}
            onChange={e => onUpdate(item.id, 'name', e.target.value)}
            onFocus={() => !isEditing && onEdit()}
            placeholder="Service name"
            className="h-8 text-sm font-semibold text-slate-900 border-transparent hover:border-slate-200 focus:border-primary bg-transparent hover:bg-white focus:bg-white transition-colors px-2 mb-1"
          />
          {/* Description — always visible, editable when active */}
          {isEditing ? (
            <Input
              value={item.description}
              onChange={e => onUpdate(item.id, 'description', e.target.value)}
              placeholder="Add description..."
              className="h-7 text-xs text-slate-500 border-slate-200 bg-white"
            />
          ) : item.description ? (
            <p className="text-xs text-slate-400 leading-snug px-2">{item.description}</p>
          ) : null}
          {/* Unit cost row when expanded */}
          {isEditing && (
            <div className="mt-2 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Unit cost</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={e => onUpdate(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                    className="h-6 w-20 pl-5 text-xs border-slate-200"
                    min={0}
                  />
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                <input type="checkbox" checked={item.taxable ?? true} onChange={e => onUpdate(item.id, 'taxable', e.target.checked)} className="rounded" />
                Taxable
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                <input type="checkbox" checked={item.save_to_pricebook ?? false} onChange={e => onUpdate(item.id, 'save_to_pricebook', e.target.checked)} className="rounded" />
                Save to price book
              </label>
            </div>
          )}
          {!isEditing && item.unit_cost > 0 && (
            <p className="text-xs text-slate-400 px-2 mt-1">Unit cost: ${item.unit_cost?.toFixed(2)}</p>
          )}
        </div>

        {/* Qty */}
        <Input
          type="number"
          value={item.quantity}
          onChange={e => onUpdate(item.id, 'quantity', e.target.value)}
          onFocus={() => !isEditing && onEdit()}
          className="h-8 text-sm text-right border-slate-200 w-full"
          min={0}
        />

        {/* Unit Price */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
          <Input
            type="number"
            step="0.01"
            value={item.unit_price}
            onChange={e => onUpdate(item.id, 'unit_price', e.target.value)}
            onFocus={() => !isEditing && onEdit()}
            className="h-8 pl-5 text-sm text-right border-slate-200"
            min={0}
          />
        </div>

        {/* Total — read only */}
        <div className="text-right font-bold text-slate-900 text-sm pt-1 pr-1">
          ${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>

        {/* Actions: edit + remove — always visible */}
        <div className="flex items-center justify-end gap-1 pt-0.5">
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-slate-300 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}