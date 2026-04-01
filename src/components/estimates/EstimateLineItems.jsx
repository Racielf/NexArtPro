import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus, BookOpen, LayoutTemplate, GripVertical, Eye, EyeOff } from 'lucide-react';

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
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setItems(estimate?.line_items?.length ? estimate.line_items : [emptyItem()]);
    setTaxRate(estimate?.tax_rate || 0);
    setExpirationDate(estimate?.expiration_date || '');
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
    onSave({ ...estimate, line_items: items, tax_rate: taxRate, expiration_date: expirationDate });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
      {/* Canvas Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">Estimate #{estimate?.estimate_number}</h2>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Expiration date:</span>
              <Input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className="h-6 text-xs w-36 border-slate-200 px-2"
              />
            </div>
            <div className="text-sm text-slate-500">
              Customer can approve: <span className="font-medium text-slate-700">Only one option</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCosts(v => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded px-2 py-1"
            title="Toggle internal costs"
          >
            {showCosts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showCosts ? 'Hide costs' : 'Show costs'}
          </button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white h-8"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide mr-2">Add:</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-slate-300">
          <BookOpen className="w-3.5 h-3.5" />Service Price Book
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-slate-300">
          <LayoutTemplate className="w-3.5 h-3.5" />Templates
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-slate-300" onClick={addItem}>
          <Plus className="w-3.5 h-3.5" />Line Item
        </Button>
      </div>

      {/* Table Header */}
      <div className="grid items-center bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2"
        style={{ gridTemplateColumns: '24px 1fr 80px 110px 110px 80px 64px' }}>
        <div />
        <div>Service</div>
        <div className="text-center">Qty</div>
        <div className="text-right">Unit Price</div>
        {showCosts && <div className="text-right">Unit Cost</div>}
        {!showCosts && <div />}
        <div className="text-right">Total Price</div>
        <div />
      </div>

      {/* Line Items */}
      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => (
          <LineItemRow
            key={item.id}
            item={item}
            idx={idx}
            showCosts={showCosts}
            editingId={editingId}
            setEditingId={setEditingId}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        ))}
      </div>

      {/* Subtotal row */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/30 flex justify-end">
        <div className="text-sm text-slate-500">
          Services subtotal: <span className="font-semibold text-slate-800">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Totals */}
      <div className="px-6 pb-6 pt-2 flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 gap-3">
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
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Tax ({taxRate}%)</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t border-slate-200">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-bold text-primary text-base">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItemRow({ item, idx, showCosts, editingId, setEditingId, onUpdate, onRemove }) {
  const isEditing = editingId === item.id;

  return (
    <div className="px-4 py-3">
      <div
        className="grid items-center gap-2"
        style={{ gridTemplateColumns: '24px 1fr 80px 110px 110px 80px 64px' }}
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center text-slate-300 cursor-grab">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Service name */}
        <div>
          <Input
            value={item.name}
            onChange={e => onUpdate(item.id, 'name', e.target.value)}
            placeholder="Service name"
            className="h-8 text-sm border-slate-200 font-medium"
          />
          {isEditing && (
            <Input
              value={item.description}
              onChange={e => onUpdate(item.id, 'description', e.target.value)}
              placeholder="Description (optional)"
              className="h-7 text-xs border-slate-200 mt-1 text-slate-500"
            />
          )}
          {!isEditing && item.description && (
            <div className="text-xs text-slate-400 mt-0.5 pl-1">{item.description}</div>
          )}
          {showCosts && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-slate-400">Unit cost:</span>
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unit_cost}
                  onChange={e => onUpdate(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                  className="h-6 pl-5 text-xs border-slate-200 text-slate-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <Input
            type="number"
            value={item.quantity}
            onChange={e => onUpdate(item.id, 'quantity', e.target.value)}
            className="h-8 text-sm text-center border-slate-200"
            min={0}
          />
        </div>

        {/* Unit Price */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 z-10">$</span>
          <Input
            type="number"
            step="0.01"
            value={item.unit_price}
            onChange={e => onUpdate(item.id, 'unit_price', e.target.value)}
            className="h-8 pl-6 text-sm text-right border-slate-200"
            min={0}
          />
        </div>

        {/* Unit Cost (column placeholder) */}
        {showCosts ? (
          <div className="text-right text-xs text-slate-400 pr-1">
            ${(item.unit_cost || 0).toFixed(2)}
          </div>
        ) : <div />}

        {/* Total */}
        <div className="text-right font-semibold text-slate-800 text-sm pr-1">
          ${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => setEditingId(isEditing ? null : item.id)}
            className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-slate-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}