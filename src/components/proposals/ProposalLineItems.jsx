import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import { debounce } from 'lodash';

const EDITABLE_STATUSES = ['draft', 'review_needed'];

// Utilidades fuera del componente para evitar re-renderizados innecesarios
const fmtCurrency = (n) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(n || 0);

function calculateLineTotal(item) {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
}

// Pricing indicator badge
function PricingBadge({ bookPrice, yourPrice }) {
  const book = parseFloat(bookPrice) || 0;
  const yours = parseFloat(yourPrice) || 0;
  if (book === 0) return null;
  const diff = yours - book;
  const pct = (diff / book) * 100;
  const isDanger = pct < -15;
  const isWarning = pct < 0 && pct >= -15;
  const isGreen = pct >= 0;
  const dotColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500';
  const textColor = isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600';
  const bgColor = isDanger ? 'bg-red-50 border-red-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
  const label = isDanger ? `Critical ${pct.toFixed(1)}%` : isWarning ? `−${Math.abs(pct).toFixed(1)}% disc` : isGreen && diff > 0 ? `+${pct.toFixed(1)}%` : '✓ at book';
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full border ${bgColor} ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      {label}
    </span>
  );
}

export default function ProposalLineItems({ proposal, onSave, locked, isPreview = false }) {
  const [local, setLocal] = useState(proposal);
  const qtyRefs = useRef({});

  useEffect(() => {
    setLocal(proposal);
  }, [proposal]);

  const debouncedSave = useCallback(
    debounce((data) => onSave(data), 800),
    [onSave]
  );

  const update = (patch) => {
    const merged = { ...local, ...patch };
    
    // Lógica de Recálculo centralizada
    const items = merged.items || [];
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const discounted = Math.max(0, subtotal - (parseFloat(merged.discount_value) || 0));
    const taxAmount = discounted * ((parseFloat(merged.tax_rate) || 0) / 100);
    
    const finalData = {
      ...merged,
      subtotal,
      tax_amount: taxAmount,
      total_amount: discounted + taxAmount,
    };

    setLocal(finalData);
    debouncedSave(finalData);
  };

  const updateItem = (id, field, value) => {
    const items = (local.items || []).map((item) => {
      if (item.id !== id) return item;
      const updatedItem = { ...item, [field]: value };
      updatedItem.line_total = calculateLineTotal(updatedItem);
      return updatedItem;
    });
    update({ items });
  };

  const patchItem = (id, patch) => {
    const items = (local.items || []).map((item) => {
      if (item.id !== id) return item;
      const updatedItem = { ...item, ...patch };
      updatedItem.line_total = calculateLineTotal(updatedItem);
      return updatedItem;
    });
    update({ items });
  };

  const addItem = () => {
    const newItem = {
      id: Math.random().toString(36).slice(2),
      service_name: '',
      description: '',
      quantity: 1,
      unit: 'ea',
      book_price: 0,
      unit_price: 0,
      line_total: 0,
    };
    update({ items: [...(local.items || []), newItem] });
  };

  const removeItem = (id) => {
    update({ items: (local.items || []).filter((item) => item.id !== id) });
  };

  const isEditable = !locked && EDITABLE_STATUSES.includes(local?.status);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header: Project Title & Running Subtotal */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 w-full text-left">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">
            Project Identification
          </label>
          <Input 
            value={local.title || ''} 
            onChange={(e) => update({ title: e.target.value })} 
            disabled={!isEditable} 
            placeholder="e.g. Kitchen Remodel — Phase 1" 
            className="text-lg font-semibold bg-slate-50/50 border-none focus:ring-2 focus:ring-blue-500/20 px-0 pl-2" 
          />
        </div>
        <div className="text-right bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <div className="text-[10px] uppercase font-bold text-blue-400 tracking-tight">Running Subtotal</div>
          <div className="text-xl font-black text-blue-700">{fmtCurrency(local.subtotal)}</div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
        <div className="grid grid-cols-12 gap-3 px-6 py-4 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest">
          <div className={`${isPreview ? 'col-span-7' : 'col-span-5'} text-left`}>Service Details</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-1 text-center">Unit</div>
          {!isPreview && <div className="col-span-2 text-right text-slate-300">Book Ref</div>}
          <div className="col-span-2 text-right">Your Price</div>
          <div className="col-span-1 text-right">Line Total</div>
        </div>

        <div className="divide-y divide-slate-100">
          {(local.items || []).map((item) => {
            const bookPrice = parseFloat(item.book_price) || 0;
            const yourPrice = parseFloat(item.unit_price) || 0;
            const diff = yourPrice - bookPrice;
            const deltaPercent = bookPrice ? (diff / bookPrice) * 100 : 0;
            const isDanger = deltaPercent < -15;
            const isWarning = deltaPercent < 0 && deltaPercent >= -15;

            return (
              <div key={item.id} className={`group transition-all duration-200 ${
                isDanger ? 'bg-red-50/40 hover:bg-red-50/60' : isWarning ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50/50'
              }`}>
                <div className="grid grid-cols-12 gap-3 px-6 py-4 items-start">
                  
                  {/* Service & Description Area */}
                  <div className={`${isPreview ? 'col-span-7' : 'col-span-5'} space-y-1.5 text-left`}>
                    <SmartServicePicker 
                      value={item.service_name || ''} 
                      onChange={(val) => updateItem(item.id, 'service_name', val)}
                      onSelect={(selected) => {
                        patchItem(item.id, {
                          service_name: selected.name,
                          unit: item.unit || selected.unit || 'ea',
                          book_price: selected.unit_price || 0,
                          unit_price: selected.unit_price || 0,
                          description: item.description || selected.description || ''
                        });
                        setTimeout(() => qtyRefs.current[item.id]?.focus(), 50);
                      }}
                      disabled={!isEditable}
                    />
                    <textarea
                      value={item.description || ''}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      disabled={!isEditable}
                      placeholder="Enter detailed scope of work..."
                      className="w-full text-xs text-slate-500 bg-transparent border-none focus:ring-0 p-0 resize-none leading-relaxed placeholder:text-slate-300 italic"
                      rows={2}
                    />
                    
                    {/* Profitability Indicator — internal only */}
                    {!isPreview && bookPrice > 0 && (
                      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter ${
                        diff < 0 ? 'text-red-500' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {diff < 0 ? <TrendingDown className="w-3 h-3"/> : diff > 0 ? <TrendingUp className="w-3 h-3"/> : null}
                        {diff < 0 ? `${Math.abs(deltaPercent).toFixed(0)}% below book` : diff > 0 ? `${deltaPercent.toFixed(0)}% above book` : 'At book price'}
                      </div>
                    )}
                  </div>

                  {/* Quantity & Unit */}
                  <div className="col-span-1">
                    <Input 
                      ref={el => qtyRefs.current[item.id] = el}
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} 
                      className="h-9 text-sm text-center font-medium shadow-sm"
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input 
                      value={item.unit} 
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)} 
                      className="h-9 text-xs text-center uppercase text-slate-500 bg-slate-50/30 shadow-sm"
                      disabled={!isEditable}
                    />
                  </div>

                  {/* Book Price (Locked) — internal only */}
                  {!isPreview && (
                    <div className="col-span-2">
                      <div className="h-9 flex items-center justify-end px-3 text-sm font-medium text-slate-400 bg-slate-50 rounded-md border border-dashed border-slate-200">
                        {fmtCurrency(bookPrice)}
                      </div>
                    </div>
                  )}

                  {/* Your Price (Editable) */}
                  <div className="col-span-2">
                    <div className="flex flex-col gap-1">
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={item.unit_price} 
                          onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                          className={`h-9 text-sm text-right font-bold shadow-sm ${
                            isDanger ? 'border-red-300 bg-red-50/60 text-red-700 focus:ring-red-500' : isWarning ? 'border-amber-300 bg-amber-50/60 text-amber-700 focus:ring-amber-500' : 'focus:ring-blue-500'
                          }`}
                          disabled={!isEditable}
                        />
                      </div>
                      {!isPreview && bookPrice > 0 && <PricingBadge bookPrice={bookPrice} yourPrice={yourPrice} />}
                    </div>
                  </div>

                  {/* Total & Action */}
                  <div className="col-span-1 flex flex-col items-end gap-1 text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {fmtCurrency(item.line_total)}
                    </div>
                    {(parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) > 0) && (
                      <div className="text-[9px] text-slate-400 leading-none">
                        {parseInt(item.quantity) === parseFloat(item.quantity) ? parseInt(item.quantity) : parseFloat(item.quantity).toFixed(2)} {item.unit} × ${parseFloat(item.unit_price).toFixed(2)}
                      </div>
                    )}
                    <PricingBadge bookPrice={item.book_price} yourPrice={item.unit_price} />
                    {isEditable && (
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Service Button */}
        {isEditable && (
          <button
            type="button"
            onClick={addItem}
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all border-t border-slate-100 uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        )}
      </div>

      {/* Summary Section (Discount, Tax, Total) */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start pt-4 text-left">
        <div className="grid grid-cols-2 gap-4 flex-1 w-full">
           {[
            { field: 'payment_terms', label: 'Payment Terms', color: 'text-slate-500' },
            { field: 'internal_notes', label: 'Internal Notes (Hidden)', color: 'text-amber-600' }
          ].map(note => (
            <div key={note.field} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${note.color}`}>
                {note.label}
              </label>
              <textarea 
                value={local[note.field] || ''} 
                onChange={(e) => update({ [note.field]: e.target.value })}
                className="w-full text-xs text-slate-600 bg-transparent border-none p-0 focus:ring-0 resize-none"
                rows={3}
                placeholder="Type here..."
              />
            </div>
          ))}
        </div>

        <div className="w-full md:w-80 bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-widest">
            <span>Subtotal</span>
            <span className="text-white">{fmtCurrency(local.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
            <span>Discount ($)</span>
            <input 
              type="number"
              value={local.discount_value || 0}
              onChange={(e) => update({ discount_value: parseFloat(e.target.value) || 0 })}
              className="w-20 bg-slate-800 border-none rounded px-2 py-1 text-right text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="h-px bg-slate-800 w-full" />
          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-bold">Total Amount</span>
            <span className="text-2xl font-black text-blue-400">{fmtCurrency(local.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}