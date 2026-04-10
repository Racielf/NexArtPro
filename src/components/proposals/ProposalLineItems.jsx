import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import { debounce } from 'lodash';

const EDITABLE_STATUSES = ['draft', 'review_needed'];

function emptyItem() {
  return {
    id: Math.random().toString(36).slice(2),
    service_name: '',
    description: '',
    quantity: 1,
    unit: 'ea',
    unit_price: 0,
    line_total: 0,
  };
}

function recalc(data) {
  const items = data.items || [];
  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.line_total) || 0),
    0
  );
  const discounted = Math.max(
    0,
    subtotal - (parseFloat(data.discount_value) || 0)
  );
  const taxAmount = discounted * ((parseFloat(data.tax_rate) || 0) / 100);

  return {
    subtotal,
    tax_amount: taxAmount,
    total_amount: discounted + taxAmount,
  };
}

const fmtCurrency = (n) =>
  `$${(parseFloat(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

export default function ProposalLineItems({ proposal, onSave, locked }) {
  const [local, setLocal] = useState(proposal);
  const qtyRefs = useRef({});

  useEffect(() => {
    setLocal(proposal);
  }, [proposal]);

  const debouncedSave = useCallback(
    debounce((data) => onSave(data), 800),
    [onSave]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const update = (patch) => {
    const merged = { ...local, ...patch };
    const totals = recalc(merged);
    const finalData = { ...merged, ...totals };

    setLocal(finalData);
    debouncedSave(finalData);
  };

  const updateItem = (id, field, value) => {
    const items = (local.items || []).map((item) => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        updatedItem.line_total =
          (parseFloat(updatedItem.quantity) || 0) *
          (parseFloat(updatedItem.unit_price) || 0);
      }

      return updatedItem;
    });

    update({ items });
  };

  const patchItem = (id, patch) => {
    const items = (local.items || []).map((item) => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, ...patch };
      updatedItem.line_total =
        (parseFloat(updatedItem.quantity) || 0) *
        (parseFloat(updatedItem.unit_price) || 0);

      return updatedItem;
    });

    update({ items });
  };

  const addItem = () => {
    update({ items: [...(local.items || []), emptyItem()] });
  };

  const removeItem = (id) => {
    update({ items: (local.items || []).filter((item) => item.id !== id) });
  };

  const isEditable = !locked && EDITABLE_STATUSES.includes(local?.status);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="text-xs text-slate-500 font-medium block mb-1">
          Project Title
        </label>
        <Input
          value={local.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          disabled={!isEditable}
          placeholder="e.g. Kitchen Remodel — Phase 1"
          className="text-sm font-medium"
        />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-t-xl px-5 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="text-xs font-medium text-slate-500">
          Running Subtotal
        </div>
        <div className="text-sm font-bold text-slate-900">
          {fmtCurrency(local.subtotal)}
        </div>
      </div>

      <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            Services
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {(local.items || []).length}{' '}
            {(local.items || []).length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest border-b border-slate-200 bg-slate-50">
          <div className="col-span-4">Service</div>
          <div className="col-span-2">Notes</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-1 text-center">Unit</div>
          <div className="col-span-2 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        {(local.items || []).map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-slate-100 items-center group hover:bg-blue-50/40 transition-colors"
          >
            <div className="col-span-4">
              <SmartServicePicker
                value={item.service_name || ''}
                onChange={(value) => updateItem(item.id, 'service_name', value)}
                onSelect={(selected) => {
                  patchItem(item.id, {
                    service_name: selected.name || item.service_name || '',
                    ...(selected.unit && !item.unit
                      ? { unit: selected.unit }
                      : {}),
                    unit_price:
                      selected.unit_price !== undefined
                        ? selected.unit_price
                        : item.unit_price || 0,
                    description:
                      selected.description || item.description || '',
                  });

                  setTimeout(() => {
                    qtyRefs.current[item.id]?.focus();
                  }, 0);
                }}
                placeholder="Service name"
                className={`h-7 text-xs border border-slate-200 rounded px-2 ${
                  !isEditable ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                disabled={!isEditable}
              />
            </div>

            <div className="col-span-2">
              <Input
                value={item.description || ''}
                onChange={(e) =>
                  updateItem(item.id, 'description', e.target.value)
                }
                disabled={!isEditable}
                placeholder="Notes"
                className="h-7 text-xs"
              />
            </div>

            <div className="col-span-1">
              <Input
                ref={(el) => {
                  qtyRefs.current[item.id] = el;
                }}
                type="number"
                value={item.quantity ?? 1}
                onChange={(e) =>
                  updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                }
                onFocus={(e) => e.target.select()}
                disabled={!isEditable}
                className="h-7 text-xs text-center"
              />
            </div>

            <div className="col-span-1">
              <Input
                value={item.unit || 'ea'}
                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                disabled={!isEditable}
                className="h-7 text-xs text-center"
              />
            </div>

            <div className="col-span-2">
              <Input
                type="number"
                value={item.unit_price ?? 0}
                onChange={(e) =>
                  updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                }
                disabled={!isEditable}
                className="h-7 text-xs text-right"
              />
            </div>

            <div
              className={`${
                isEditable ? 'col-span-1' : 'col-span-2'
              } text-right text-sm font-semibold text-slate-800`}
            >
              {fmtCurrency(item.line_total)}
            </div>

            {isEditable && (
              <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {isEditable && (
          <button
            type="button"
            onClick={addItem}
            className="w-full flex items-center gap-2 px-5 py-3.5 text-xs text-primary hover:bg-primary/10 font-semibold transition-colors border-t border-slate-100"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        )}

        {(local.items || []).length === 0 && !isEditable && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No line items
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="max-w-xs ml-auto space-y-2.5">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold">{fmtCurrency(local.subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-sm text-slate-600">
            <span>Discount ($)</span>
            <Input
              type="number"
              value={local.discount_value || 0}
              onChange={(e) =>
                update({ discount_value: parseFloat(e.target.value) || 0 })
              }
              disabled={!isEditable}
              className="h-7 text-xs w-28 text-right"
            />
          </div>

          <div className="flex justify-between items-center text-sm text-slate-600">
            <span>Tax (%)</span>
            <Input
              type="number"
              value={local.tax_rate || 0}
              onChange={(e) =>
                update({ tax_rate: parseFloat(e.target.value) || 0 })
              }
              disabled={!isEditable}
              className="h-7 text-xs w-28 text-right"
            />
          </div>

          <div className="flex justify-between items-center text-sm text-slate-600">
            <span>Expiration Date</span>
            <Input
              type="date"
              value={local.expiration_date || ''}
              onChange={(e) => update({ expiration_date: e.target.value })}
              disabled={!isEditable}
              className="h-7 text-xs w-36"
            />
          </div>

          <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total</span>
            <span className="text-primary">
              {fmtCurrency(local.total_amount)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pb-8">
        {[
          {
            field: 'payment_terms',
            label: 'Payment Terms',
            placeholder: 'e.g. 50% deposit, balance on completion…',
            internal: false,
          },
          {
            field: 'legal_terms',
            label: 'Legal Terms',
            placeholder: 'Legal language, warranty, liability…',
            internal: false,
          },
          {
            field: 'notes',
            label: 'Client Notes',
            placeholder: 'Visible to client…',
            internal: false,
          },
          {
            field: 'internal_notes',
            label: 'Internal Notes',
            placeholder: 'Team only — not visible to client…',
            internal: true,
          },
        ].map(({ field, label, placeholder, internal }) => (
          <div
            key={field}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <label
              className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
                internal ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              {label}
            </label>
            <textarea
              value={local[field] || ''}
              onChange={(e) => update({ [field]: e.target.value })}
              disabled={!isEditable}
              placeholder={placeholder}
              rows={3}
              className="w-full text-xs text-slate-700 resize-none focus:outline-none placeholder:text-slate-300 disabled:opacity-60"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
