/**
 * EstimateGroups — professional grouped line items engine.
 * Each group = a work category (e.g. Demolition, Plumbing, Flooring).
 * Auto-saves with debounce on every change.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  Pencil, Check, X, Eye, EyeOff, BookOpen, LayoutTemplate
} from 'lucide-react';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import PriceDisciplineGuard from '@/components/estimates/internal/PriceDisciplineGuard';

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_GROUPS = [{ id: uid(), name: 'General', collapsed: false, items: [] }];

const emptyItem = () => ({
  id: uid(),
  service_name: '',
  description: '',
  quantity: 1,
  unit: 'ea',
  unit_price: 0,
  unit_cost: 0,
  book_price: 0,
  line_total: 0,
  taxable: true,
});

const UNITS = ['ea', 'hr', 'sq ft', 'ln ft', 'day', 'lump sum', 'ton', 'gal'];

// ─── Totals Calculator ────────────────────────────────────────────────────────
function calcTotals(groups, taxRate, discountType, discountValue, depositPercent) {
  let subtotal = 0;
  let totalCost = 0;
  groups.forEach(g => {
    (g.items || []).forEach(it => {
      subtotal += parseFloat(it.line_total) || 0;
      totalCost += (parseFloat(it.unit_cost) || 0) * (parseFloat(it.quantity) || 0);
    });
  });
  const discountAmount = discountType === 'percent'
    ? subtotal * ((parseFloat(discountValue) || 0) / 100)
    : parseFloat(discountValue) || 0;
  const afterDiscount = subtotal - discountAmount;
  const taxableBase = groups.reduce((acc, g) => {
    (g.items || []).forEach(it => { if (it.taxable !== false) acc += parseFloat(it.line_total) || 0; });
    return acc;
  }, 0);
  const taxAmount = (taxableBase - discountAmount) * ((parseFloat(taxRate) || 0) / 100);
  const total = afterDiscount + taxAmount;
  const depositAmount = total * ((parseFloat(depositPercent) || 0) / 100);
  const grossMargin = total - totalCost;
  const grossMarginPct = total > 0 ? (grossMargin / total) * 100 : 0;
  return { subtotal, discountAmount, taxAmount, total, depositAmount, totalCost, grossMargin, grossMarginPct };
}

// ─── Single Line Item Row ──────────────────────────────────────────────────────
function LineItemRow({ item, onUpdate, onRemove, showCost }) {
  const [expanded, setExpanded] = useState(!item.service_name);

  const update = (field, value) => {
    const updated = { ...item, [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
      const price = parseFloat(field === 'unit_price' ? value : updated.unit_price) || 0;
      updated.line_total = qty * price;
    }
    onUpdate(updated);
  };

  return (
    <div className={`border-b border-slate-100 last:border-0 transition-colors ${expanded ? 'bg-blue-50/20' : 'hover:bg-slate-50/60'}`}>
      {/* Main row — grid: grip | service(2fr) | qty+unit(90px) | price(110px) | book(80px) | [cost] | total(100px) | remove */}
      <div className="grid items-center gap-2 px-4 py-2.5"
        style={{ gridTemplateColumns: '20px 2fr 90px 110px 80px 1fr 100px 28px' }}>

        {/* Grip */}
        <button className="text-slate-200 hover:text-slate-400 cursor-grab active:cursor-grabbing flex justify-center">
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Service name — Smart Picker */}
        <div>
          <SmartServicePicker
            value={item.service_name}
            onChange={v => update('service_name', v)}
            onSelect={picked => {
                setExpanded(true);
                const pickedPrice = picked.unit_price ?? item.unit_price;
                const bookPrice = picked.unit_price != null ? picked.unit_price : (item.book_price || 0);
                const updated = {
                  ...item,
                  service_name: picked.name,
                  description:  item.description || picked.description || '',
                  unit:         picked.unit || item.unit,
                  unit_price:   pickedPrice,
                  unit_cost:    picked.unit_cost ?? item.unit_cost,
                  book_price:   bookPrice,
                  line_total:   (parseFloat(item.quantity) || 1) * pickedPrice,
                };
                onUpdate(updated);
              }}
            placeholder="Service name"
            className="h-8 w-full text-sm font-semibold border-transparent hover:border-slate-200 focus:border-primary bg-transparent hover:bg-white focus:bg-white px-2 rounded-md outline-none focus:ring-1 focus:ring-primary/30 transition"
          />
          {!expanded && item.description && (
            <p className="text-xs text-slate-400 px-2 leading-snug truncate">{item.description}</p>
          )}
        </div>

        {/* Qty + Unit — inline, compact */}
        <div className="flex items-center gap-1">
          <Input
            type="number" value={item.quantity} onChange={e => update('quantity', e.target.value)}
            className="h-8 text-sm text-center border-slate-200 px-1 w-10 flex-shrink-0" min={0}
          />
          <select value={item.unit} onChange={e => update('unit', e.target.value)}
            className="h-8 text-[11px] border border-slate-200 rounded px-1 bg-white text-slate-500 flex-1 min-w-0">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Price — primary editable field + variance badge */}
        {(() => {
          const book = parseFloat(item.book_price) || 0;
          const real = parseFloat(item.unit_price) || 0;
          const diff = real - book;
          const isLow  = book > 0 && diff < -0.001;
          const isHigh = book > 0 && diff > 0.001;
          const isOk   = book > 0 && !isLow && !isHigh;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                <Input
                  type="number" step="0.01" value={item.unit_price}
                  onChange={e => update('unit_price', e.target.value)}
                  className={`h-8 pl-4 text-sm text-right font-semibold border-slate-200 ${isLow ? 'border-red-300 bg-red-50/50 text-red-700' : 'text-slate-900'}`}
                  min={0}
                />
              </div>
              {book > 0 && (
                <span className={`text-[9px] font-bold text-right leading-none tracking-tight ${isLow ? 'text-red-500' : isHigh ? 'text-emerald-600' : 'text-emerald-500'}`}>
                  {isLow  ? `↓ -$${Math.abs(diff).toFixed(2)} vs book` : ''}
                  {isHigh ? `↑ +$${Math.abs(diff).toFixed(2)} vs book` : ''}
                  {isOk   ? '✓ at book' : ''}
                </span>
              )}
            </div>
          );
        })()}

        {/* Book Price — secondary reference, visually muted */}
        {(() => {
          const book = parseFloat(item.book_price) || 0;
          if (book === 0) return <div className="text-right text-xs text-slate-200">—</div>;
          return (
            <div className="text-right leading-tight">
              <div className="text-[10px] text-slate-400 font-medium">${book.toFixed(2)}</div>
              <div className="text-[9px] text-slate-300 leading-none">book ref</div>
            </div>
          );
        })()}

        {/* Unit cost (internal only) — placeholder keeps grid */}
        <div>
          {showCost && (
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
              <Input type="number" step="0.01" value={item.unit_cost} onChange={e => update('unit_cost', e.target.value)}
                className="h-8 pl-4 text-sm text-right border-slate-200 bg-amber-50/60" min={0} />
            </div>
          )}
        </div>

        {/* Line total */}
        <div className="text-right font-bold text-slate-900 text-sm tabular-nums">
          ${(item.line_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>

        {/* Remove */}
        <button onClick={() => onRemove(item.id)}
          className="flex justify-center p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded detail row */}
      {expanded && (
        <div className="px-10 pb-4 space-y-2">
          <Input value={item.description} onChange={e => update('description', e.target.value)}
            placeholder="Description (optional)…"
            className="h-8 text-sm border-slate-200 text-slate-600" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input type="checkbox" checked={item.taxable !== false}
                onChange={e => update('taxable', e.target.checked)} className="rounded" />
              Taxable
            </label>
            <button onClick={() => setExpanded(false)}
              className="text-xs text-slate-400 hover:text-slate-600">collapse</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Work Group ────────────────────────────────────────────────────────────────
function WorkGroup({ group, onUpdate, onRemove, showCost, isOnly }) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(group.name);

  const updateItem = (updatedItem) => {
    onUpdate({ ...group, items: group.items.map(i => i.id === updatedItem.id ? updatedItem : i) });
  };
  const removeItem = (id) => {
    onUpdate({ ...group, items: group.items.filter(i => i.id !== id) });
  };
  const addItem = () => {
    const item = emptyItem();
    onUpdate({ ...group, items: [...group.items, item] });
  };

  const groupSubtotal = (group.items || []).reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0);
  const groupCost = (group.items || []).reduce((s, i) => s + (parseFloat(i.unit_cost) || 0) * (parseFloat(i.quantity) || 0), 0);

  const saveGroupName = () => {
    onUpdate({ ...group, name: nameVal || 'Group' });
    setEditingName(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-3">
      {/* Group header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-slate-800 text-white">
        <button onClick={() => onUpdate({ ...group, collapsed: !group.collapsed })}
          className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0">
          {group.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <Input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveGroupName()}
              className="h-8 text-sm font-bold bg-white/10 border-white/30 text-white placeholder:text-white/50 flex-1" />
            <button onClick={saveGroupName} className="p-1 rounded hover:bg-white/20"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingName(false)} className="p-1 rounded hover:bg-white/20"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => setEditingName(true)}
            className="flex items-center gap-2 flex-1 text-left group">
            <span className="font-bold text-base tracking-wide">{group.name}</span>
            <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        )}

        <div className="flex items-center gap-4 ml-auto text-sm font-semibold">
          <span className="text-white/70">{group.items?.length || 0} items</span>
          <span className="text-white">${groupSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          {showCost && <span className="text-amber-300 text-xs">cost ${groupCost.toFixed(2)}</span>}
          {!isOnly && (
            <button onClick={() => onRemove(group.id)}
              className="p-1 rounded hover:bg-red-500/30 text-white/50 hover:text-white transition-colors ml-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Column headers */}
      {!group.collapsed && (
        <>
          <div className="grid text-[10px] text-slate-400 font-semibold uppercase tracking-wide px-4 py-2 bg-slate-50 border-b border-slate-100"
            style={{ gridTemplateColumns: '20px 2fr 90px 110px 80px 1fr 100px 28px' }}>
            <div />
            <div>Service</div>
            <div className="text-center">Qty / Unit</div>
            <div className="text-right text-slate-600">Price</div>
            <div className="text-right text-slate-400 text-[9px]">Book<br/>ref</div>
            <div className={`text-right ${showCost ? 'text-amber-600' : ''}`}>{showCost ? 'Cost' : ''}</div>
            <div className="text-right">Total</div>
            <div />
          </div>

          <div className="divide-y divide-slate-100 min-h-[40px]">
            {group.items.length === 0 && (
              <div className="py-6 text-center text-slate-300 text-xs">No items yet — click below to add</div>
            )}
            {group.items.map(item => (
              <LineItemRow key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} showCost={showCost} />
            ))}
          </div>

          <div className="px-6 py-3 flex items-center gap-4 border-t border-slate-100 bg-slate-50/50">
            <button onClick={addItem}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-4 h-4" />Add line item
            </button>
            <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              <BookOpen className="w-4 h-4" />Price book
            </button>
            <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              <LayoutTemplate className="w-4 h-4" />Templates
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Notes Section ─────────────────────────────────────────────────────────────
function NotesSection({ label, placeholder, value, onChange, accent }) {
  return (
    <div>
      <label className={`text-sm font-semibold block mb-2 ${accent ? 'text-amber-700' : 'text-slate-700'}`}>{label}</label>
      <Textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={3}
        className={`text-sm resize-none border-slate-200 ${accent ? 'bg-amber-50/30' : ''}`} />
    </div>
  );
}

// ─── Main EstimateGroups Component ────────────────────────────────────────────
export default function EstimateGroups({ estimate, onSave, saving }) {
  const [groups, setGroups] = useState(() => {
    if (estimate?.groups?.length) return estimate.groups;
    if (estimate?.line_items?.length) {
      return [{ id: uid(), name: 'General', collapsed: false, items: estimate.line_items.map(li => ({
        id: uid(), service_name: li.name || '', description: li.description || '',
        quantity: li.quantity || 1, unit: 'ea', unit_price: li.unit_price || 0,
        unit_cost: li.unit_cost || 0, line_total: li.total_price || 0, taxable: true,
      })) }];
    }
    return DEFAULT_GROUPS.map(g => ({ ...g, id: uid(), items: [] }));
  });

  const [taxRate, setTaxRate] = useState(estimate?.tax_rate || 0);
  const [discountType, setDiscountType] = useState(estimate?.discount_type || 'percent');
  const [discountValue, setDiscountValue] = useState(estimate?.discount_value || 0);
  const [depositPercent, setDepositPercent] = useState(estimate?.deposit_percent || 0);
  const [expirationDate, setExpirationDate] = useState(estimate?.expiration_date || '');
  const [notes, setNotes] = useState(estimate?.notes || '');
  const [internalNotes, setInternalNotes] = useState(estimate?.internal_notes || '');
  const [exclusions, setExclusions] = useState(estimate?.exclusions || '');
  const [warrantyTerms, setWarrantyTerms] = useState(estimate?.warranty_terms || '');
  const [paymentTerms, setPaymentTerms] = useState(estimate?.payment_terms || '');
  const [legalTerms, setLegalTerms] = useState(estimate?.legal_terms || '');
  const [showCost, setShowCost] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [approvalMode, setApprovalMode] = useState('one');

  // Sync when estimate id changes
  useEffect(() => {
    if (!estimate?.id) return;
    setGroups(estimate.groups?.length ? estimate.groups :
      estimate.line_items?.length ? [{
        id: uid(), name: 'General', collapsed: false,
        items: estimate.line_items.map(li => ({
          id: uid(), service_name: li.name || '', description: li.description || '',
          quantity: li.quantity || 1, unit: 'ea', unit_price: li.unit_price || 0,
          unit_cost: li.unit_cost || 0, line_total: li.total_price || 0, taxable: true,
        }))
      }] : DEFAULT_GROUPS.map(g => ({ ...g, id: uid(), items: [] })));
    setTaxRate(estimate.tax_rate || 0);
    setDiscountType(estimate.discount_type || 'percent');
    setDiscountValue(estimate.discount_value || 0);
    setDepositPercent(estimate.deposit_percent || 0);
    setExpirationDate(estimate.expiration_date || '');
    setNotes(estimate.notes || '');
    setInternalNotes(estimate.internal_notes || '');
    setExclusions(estimate.exclusions || '');
    setWarrantyTerms(estimate.warranty_terms || '');
    setPaymentTerms(estimate.payment_terms || '');
    setLegalTerms(estimate.legal_terms || '');
  }, [estimate?.id]);

  // Debounced auto-save
  useEffect(() => {
    const t = setTimeout(() => {
      const { subtotal, discountAmount, taxAmount, total, depositAmount, totalCost, grossMargin, grossMarginPct } =
        calcTotals(groups, taxRate, discountType, discountValue, depositPercent);
      onSave({
        ...estimate, groups, tax_rate: taxRate, discount_type: discountType, discount_value: discountValue,
        discount_amount: discountAmount, deposit_percent: depositPercent, deposit_amount: depositAmount,
        expiration_date: expirationDate, notes, internal_notes: internalNotes, exclusions,
        warranty_terms: warrantyTerms, payment_terms: paymentTerms, legal_terms: legalTerms,
        subtotal, tax_amount: taxAmount, total, total_cost: totalCost, gross_margin: grossMargin,
        gross_margin_pct: grossMarginPct,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [groups, taxRate, discountType, discountValue, depositPercent, expirationDate, notes, internalNotes, exclusions, warrantyTerms, paymentTerms, legalTerms]);

  const updateGroup = (updated) => setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
  const removeGroup = (id) => setGroups(prev => prev.filter(g => g.id !== id));
  const addGroup = () => setGroups(prev => [...prev, { id: uid(), name: 'New Group', collapsed: false, items: [] }]);

  const { subtotal, discountAmount, taxAmount, total, depositAmount, totalCost, grossMargin, grossMarginPct } =
    calcTotals(groups, taxRate, discountType, discountValue, depositPercent);

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="w-full space-y-0">

      {/* ── ESTIMATE HEADER CARD ── */}
      <div className="bg-white rounded-lg border border-slate-200 mb-4 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Estimate <span className="text-primary">#{estimate?.estimate_number}</span>
            </h2>
            {estimate?.title && <p className="text-sm text-slate-500 mt-1">{estimate.title}</p>}
          </div>
          <div className="flex items-center gap-5 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs font-medium">Expires</span>
              <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
                className="h-8 text-sm w-36 border-slate-200" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium">Customer can approve</span>
              <button onClick={() => setApprovalMode(m => m === 'one' ? 'multiple' : 'one')}
                className="text-xs text-primary font-semibold hover:underline">
                {approvalMode === 'one' ? 'One option' : 'Multiple options'}
              </button>
            </div>
            <button onClick={() => setShowCost(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${showCost ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {showCost ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {showCost ? 'Hiding cost' : 'Show cost'}
            </button>
          </div>
        </div>
      </div>

      {/* ── GROUPS ── */}
      {groups.map(group => (
        <WorkGroup key={group.id} group={group} onUpdate={updateGroup} onRemove={removeGroup}
          showCost={showCost} isOnly={groups.length === 1} />
      ))}

      {/* Add group button */}
      <button onClick={addGroup}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary border-2 border-dashed border-slate-200 hover:border-primary/40 rounded-xl w-full py-3 justify-center transition-colors mb-4">
        <Plus className="w-4 h-4" />Add work group
      </button>

      {/* ── PRICE DISCIPLINE GUARD (internal only — never in PDF/preview/send) ── */}
      <PriceDisciplineGuard groups={groups} minVarianceThreshold={-0.20} />

      {/* ── TOTALS CARD ── */}
      <div className="bg-white rounded-lg border border-slate-200 px-6 py-5 mb-4">
        <div className="flex gap-8 flex-wrap justify-between">

          {/* Left: Internal financials (only when cost visible) */}
          {showCost && (
            <div className="space-y-2.5 text-sm min-w-[180px]">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Internal View</p>
              <div className="flex justify-between gap-6">
                <span className="text-slate-600">Total Cost</span>
                <span className="font-semibold text-slate-800">{fmt(totalCost)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-600">Gross Margin $</span>
                <span className={`font-semibold ${grossMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(grossMargin)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-600">Gross Margin %</span>
                <span className={`font-bold ${grossMarginPct >= 30 ? 'text-green-600' : grossMarginPct >= 15 ? 'text-amber-600' : 'text-red-500'}`}>
                  {grossMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Right: Customer-facing totals */}
          <div className="space-y-3 text-sm ml-auto w-80">
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-800">{fmt(subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-slate-600">Discount</span>
              <div className="flex items-center gap-1.5">
                <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                  className="h-8 text-xs border border-slate-200 rounded px-2 bg-white text-slate-600">
                  <option value="percent">%</option>
                  <option value="fixed">$</option>
                </select>
                <Input type="number" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-8 w-20 text-right text-sm border-slate-200" min={0} />
              </div>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Discount amount</span>
                <span className="text-red-500 font-medium">-{fmt(discountAmount)}</span>
              </div>
            )}

            {/* Tax */}
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-slate-600">Tax (%)</span>
              <Input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="h-8 w-20 text-right text-sm border-slate-200" min={0} max={100} />
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Tax ({taxRate}%)</span>
                <span className="font-medium">{fmt(taxAmount)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between pt-4 border-t-2 border-slate-300">
              <span className="font-bold text-slate-900 text-lg">Total</span>
              <span className="font-bold text-primary text-3xl">{fmt(total)}</span>
            </div>

            {/* Deposit */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-slate-600 text-xs font-medium">Deposit (%)</span>
              <div className="flex items-center gap-1.5">
                <Input type="number" value={depositPercent} onChange={e => setDepositPercent(parseFloat(e.target.value) || 0)}
                  className="h-8 w-20 text-right text-sm border-slate-200" min={0} max={100} />
              </div>
            </div>
            {depositAmount > 0 && (
              <div className="flex justify-between text-sm text-green-700 font-medium bg-green-50 rounded px-3 py-2">
                <span>Deposit due</span>
                <span>{fmt(depositAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NOTES & TERMS ── */}
      <div className="bg-white rounded-lg border border-slate-200 px-6 py-5 mb-4">
        <div className="grid grid-cols-2 gap-6">
          <NotesSection label="Customer Notes" placeholder="Visible to client…" value={notes} onChange={setNotes} />
          <NotesSection label="Internal Notes" placeholder="Team only — not visible to customer…" value={internalNotes} onChange={setInternalNotes} accent />
          <NotesSection label="Exclusions" placeholder="What is NOT included in this estimate…" value={exclusions} onChange={setExclusions} />
          <NotesSection label="Payment Terms" placeholder="e.g. 50% deposit, balance on completion…" value={paymentTerms} onChange={setPaymentTerms} />
        </div>

        {/* Expandable terms */}
        <button onClick={() => setShowTerms(v => !v)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mt-5 font-medium transition-colors">
          {showTerms ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {showTerms ? 'Hide' : 'Show'} warranty & legal terms
        </button>

        {showTerms && (
          <div className="grid grid-cols-2 gap-6 mt-5">
            <NotesSection label="Warranty Terms" placeholder="e.g. 1-year labor warranty…" value={warrantyTerms} onChange={setWarrantyTerms} />
            <NotesSection label="Legal Terms" placeholder="Terms and conditions…" value={legalTerms} onChange={setLegalTerms} />
          </div>
        )}
      </div>

    </div>
  );
}