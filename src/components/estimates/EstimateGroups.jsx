/**
 * EstimateGroups — professional grouped line items engine.
 * Each group = a work category (e.g. Demolition, Plumbing, Flooring).
 * Auto-saves with debounce on every change.
 *
 * PRICING MODEL (NexArt Pro Official):
 *   book_price  = internal reference from price book (never drives totals)
 *   unit_price  = customer-facing sale price (drives all totals)
 *   unit_cost   = internal cost
 *   line_total  = quantity * unit_price
 *   line_margin = ((unit_price - unit_cost) / unit_price) * 100
 */
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  Pencil, Check, X, Eye, EyeOff, BookOpen, LayoutTemplate
} from 'lucide-react';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import PriceAuditLog from '@/components/estimates/internal/PriceAuditLog';
import { normalizeLineItem, normalizeGroups, resolveAndNormalizeGroups } from '@/lib/lineItemNormalizer';
import { usePriceAuditLog } from '@/hooks/usePriceAuditLog';
import { calculateLineTotal, runEstimateEngine, suggestPriceFromCost, getNegotiationMeta } from '@/lib/estimateEngine';
import { logChange } from '@/lib/estimateAuditLog';
import EstimateAuditHistory from '@/components/estimates/internal/EstimateAuditHistory';
import { logFieldChange } from '@/lib/pricingAuditService';

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_GROUPS = [{ id: uid(), name: 'General', collapsed: false, items: [] }];

const emptyItem = () => normalizeLineItem({ id: uid() });

const UNITS = ['ea', 'hr', 'sq ft', 'ln ft', 'day', 'lump sum', 'ton', 'gal', 'room', 'window', 'door', 'bag', 'box'];

// Shared grid template — single source of truth for header + row alignment
// Cols: grip | service | qty | uom | unit_price | book_ref | cost | line_total | remove
const GRID_COLS = 'minmax(20px,24px) minmax(180px,3fr) minmax(48px,60px) minmax(56px,76px) minmax(88px,110px) minmax(56px,72px) minmax(56px,90px) minmax(80px,110px) minmax(24px,28px)';

// ─── Single Line Item Row ──────────────────────────────────────────────────────
function LineItemRow({ item, onUpdate, onRemove, showCost, isFixed = false, onLogChange, isPreview = false }) {
  const [expanded, setExpanded] = useState(!item.service_name);
  const committedRef = React.useRef({ unit_price: item.unit_price, unit_cost: item.unit_cost });

  const update = (field, value) => {
    const numericFields = new Set(['quantity', 'unit_price', 'unit_cost', 'book_price']);
    const safeValue = numericFields.has(field) ? (parseFloat(value) || 0) : value;
    const updated = { ...item, [field]: safeValue };
    // line_total = quantity * unit_price (ALWAYS from unit_price, never book_price)
    updated.line_total = calculateLineTotal(
      field === 'quantity'   ? safeValue : updated.quantity,
      field === 'unit_price' ? safeValue : updated.unit_price
    );
    onUpdate(updated);
  };

  const handlePriceBlur = async (field) => {
    const oldValue = committedRef.current[field];
    const newValue = item[field];
    if (oldValue !== newValue && onLogChange) {
      onLogChange({ item, field, oldValue, newValue });
    }
    committedRef.current[field] = newValue;
  };

  // === Derived values (computed once, used in multiple places) ===
  const price = parseFloat(item.unit_price) || 0;
  const cost  = parseFloat(item.unit_cost)  || 0;
  const book  = parseFloat(item.book_price) || 0;
  const qty   = parseFloat(item.quantity)   || 0;

  // Line-level margin: ((unit_price - unit_cost) / unit_price) * 100
  const lineMarginPct = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null;

  // Loss prevention flags (recalculate live on every render)
  const isLoss       = cost > 0 && price > 0 && price < cost;
  const isZeroProfit = cost > 0 && price > 0 && Math.abs(price - cost) < 0.01;

  // Internal helpers (only computed outside preview)
  const autoSuggest = !isPreview ? suggestPriceFromCost(cost, 0.30) : 0;
  const negMeta     = !isPreview ? getNegotiationMeta(cost, price) : { status: 'none' };

  return (
    <div className={`border-b border-slate-100 last:border-0 transition-colors ${isFixed ? 'bg-emerald-50/60 ring-1 ring-inset ring-emerald-300' : expanded ? 'bg-blue-50/20' : 'hover:bg-slate-50/60'}`}>
      {/* Main row — shared grid template */}
      <div className="grid items-center gap-2 px-4 py-2.5"
        style={{ gridTemplateColumns: GRID_COLS }}>

        {/* Grip */}
        <button className="text-slate-200 hover:text-slate-400 cursor-grab active:cursor-grabbing flex justify-center">
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* === SERVICE COLUMN ===
            Order per rules: service name → description → internal margin/warnings */}
        <div className="min-w-0">
          <SmartServicePicker
            value={item.service_name}
            onChange={v => update('service_name', v)}
            onSelect={picked => {
                if (!picked?.name) return;
                setExpanded(true);
                // Null = source has no data → preserve existing. Number = explicit.
                const pickedPrice = picked.unit_price !== null ? Number(picked.unit_price) : price;
                const pickedCost  = picked.unit_cost  !== null ? Number(picked.unit_cost)  : cost;
                // NaN safety
                const safePrice = isNaN(pickedPrice) ? 0 : pickedPrice;
                const safeCost  = isNaN(pickedCost)  ? 0 : pickedCost;
                // book_price: prefer explicit book_price from picker, fallback to unit_price, then existing
                const pickedBook  = picked.book_price !== null && picked.book_price !== undefined
                  ? Number(picked.book_price)
                  : (picked.unit_price !== null ? Number(picked.unit_price) : book);
                const safeBook = isNaN(pickedBook) ? 0 : pickedBook;
                // Compute line_total explicitly: quantity * unit_price
                const qty = parseFloat(item.quantity) || 0;
                const lineTotal = calculateLineTotal(qty, safePrice);
                const updated = {
                  ...item,
                  service_id:   picked.service_id ?? null,
                  service_name: picked.name || item.service_name,
                  description:  picked.description || item.description || '',
                  category:     picked.category || item.category || 'Misc',
                  unit:         picked.unit || item.unit || 'ea',
                  unit_price:   safePrice,
                  unit_cost:    safeCost,
                  book_price:   safeBook,
                  line_total:   lineTotal,
                };
                onUpdate(updated);
              }}
            placeholder="Service name"
            className="h-8 w-full text-sm font-semibold border-transparent hover:border-slate-200 focus:border-primary bg-transparent hover:bg-white focus:bg-white px-2 rounded-md outline-none focus:ring-1 focus:ring-primary/30 transition"
          />

          {/* Description — always visible below service name */}
          {item.description && (
            <p className="text-[11px] text-slate-400 px-2 leading-snug truncate mt-0.5">{item.description}</p>
          )}

          {/* === INTERNAL-ONLY: line margin + loss prevention + negotiation helpers ===
              Rule 8: placed inside Service column, below description.
              Rule 9: hidden in preview/PDF/client-facing mode. */}
          {!isPreview && (cost > 0 || book > 0) && (
            <div className="px-2 mt-1 space-y-1">
              {/* Line margin % — rule 3: ((unit_price - unit_cost) / unit_price) * 100 */}
              {lineMarginPct !== null && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full border ${
                  lineMarginPct >= 30 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  lineMarginPct >= 20 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                  lineMarginPct >= 0  ? 'bg-red-50 border-red-200 text-red-600' :
                                        'bg-red-100 border-red-300 text-red-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    lineMarginPct >= 30 ? 'bg-emerald-500' :
                    lineMarginPct >= 20 ? 'bg-amber-400' : 'bg-red-500'
                  }`} />
                  {lineMarginPct.toFixed(1)}% margin
                </span>
              )}

              {/* ⚠️ Loss prevention alerts — rule 10 */}
              {isLoss && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-100 border border-red-300">
                  <span className="text-red-600 text-[10px] font-bold">⚠ LOSS:</span>
                  <span className="text-red-600 text-[10px]">Price ${price.toFixed(2)} &lt; Cost ${cost.toFixed(2)} — losing ${(cost - price).toFixed(2)}/unit</span>
                </div>
              )}
              {isZeroProfit && !isLoss && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 border border-amber-300">
                  <span className="text-amber-700 text-[10px] font-bold">⚠ Zero Profit:</span>
                  <span className="text-amber-600 text-[10px]">Price equals cost — no margin on this item</span>
                </div>
              )}

              {/* Negotiation helper — shows suggested & floor when margin is below target */}
              {negMeta.status !== 'none' && negMeta.status !== 'healthy' && (
                <div className={`flex flex-col gap-0.5 px-1.5 py-1 rounded text-[9px] border ${
                  negMeta.status === 'critical' ? 'bg-red-50/60 border-red-200' : 'bg-amber-50/60 border-amber-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">Suggested (30%): <strong className="text-emerald-600">${negMeta.suggested.toFixed(2)}</strong></span>
                    <span className="text-slate-500">Min (20%): <strong className="text-amber-600">${negMeta.floor.toFixed(2)}</strong></span>
                  </div>
                </div>
              )}

              {/* Book price variance badge */}
              {book > 0 && (() => {
                const diff = price - book;
                const pct = (diff / book) * 100;
                const isDanger  = pct < -15;
                const isWarning = pct < 0 && pct >= -15;
                const dotColor  = isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500';
                const textColor = isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600';
                const bgColor   = isDanger ? 'bg-red-50 border-red-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
                const label     = isDanger  ? `Critical ${pct.toFixed(1)}%`
                                : isWarning ? `−${Math.abs(pct).toFixed(1)}% disc`
                                : diff > 0 ? `+${pct.toFixed(1)}%`
                                : '✓ at book';
                return (
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full border ${bgColor} ${textColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                    {label}
                  </span>
                );
              })()}
            </div>
          )}
        </div>

        {/* Qty */}
        <Input
          type="number" value={item.quantity} onChange={e => update('quantity', e.target.value)}
          className="h-8 text-sm text-center border-slate-200 font-semibold px-1 w-full" min={0}
        />

        {/* UOM */}
        <select value={item.unit} onChange={e => update('unit', e.target.value)}
          className="h-8 text-[11px] border border-slate-200 rounded px-1.5 bg-white text-slate-600 w-full font-medium">
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        {/* Unit Price — clean editable field, drives all totals */}
        <div className="min-w-0 overflow-hidden">
          <div className="relative flex items-center">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
            <Input
              type="number" step="0.01" value={item.unit_price}
              onChange={e => update('unit_price', e.target.value)}
              onBlur={() => handlePriceBlur('unit_price')}
              className={`h-8 pl-4 pr-2 text-sm text-right font-semibold border-slate-200 ${
                isLoss ? 'border-red-400 bg-red-50/60 text-red-700' :
                isZeroProfit ? 'border-amber-400 bg-amber-50/60 text-amber-700' :
                'text-slate-900'
              }`}
              min={0}
            />
            {/* ⚡ Auto-price button — internal only */}
            {!isPreview && autoSuggest > 0 && (
              <button
                type="button"
                onClick={() => update('unit_price', autoSuggest)}
                title={`Set suggested price at 30% margin: $${autoSuggest.toFixed(2)}`}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-[11px] leading-none hover:text-amber-500 text-slate-300 transition-colors"
              >
                ⚡
              </button>
            )}
          </div>
          {/* Smart price suggestion buttons — internal only */}
          {!isPreview && book > 0 && (() => {
            const MARGINS = [0.10, 0.20, 0.30];
            const suggestions = MARGINS.map(m => ({
              label: `+${m * 100}%`,
              p: parseFloat((book * (1 + m)).toFixed(2)),
              margin: m,
            }));
            const isAtBook = Math.abs(price - book) < 0.01;
            return (
              <div className="flex gap-0.5 mt-0.5 flex-wrap">
                {suggestions.map(s => (
                  <button
                    key={s.margin}
                    type="button"
                    onClick={() => update('unit_price', s.p)}
                    title={`Set to $${s.p} (${s.label} over book)`}
                    className={`text-[9px] px-1 py-0.5 rounded border transition-colors leading-none font-semibold
                      ${price === s.p
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-primary/40 hover:text-primary'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
                {!isAtBook && (
                  <button
                    type="button"
                    onClick={() => update('unit_price', book)}
                    title={`Reset to book price $${book.toFixed(2)}`}
                    className="text-[9px] px-1 py-0.5 rounded border border-slate-200 bg-white text-slate-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors leading-none font-semibold"
                  >
                    ↺ book
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Book Price — internal reference, hidden in preview */}
        {!isPreview ? (() => {
          if (book === 0) return <div className="text-right text-xs text-slate-200">—</div>;
          return (
            <div className="text-right leading-tight min-w-0">
              <div className="text-[10px] text-slate-400 font-medium">${book.toFixed(2)}</div>
              <div className="text-[9px] text-slate-300 leading-none">book ref</div>
            </div>
          );
        })() : <div />}

        {/* Unit cost (internal only) */}
        <div className="min-w-0">
          {showCost && !isPreview ? (
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
              <Input type="number" step="0.01" value={item.unit_cost} onChange={e => update('unit_cost', e.target.value)}
                onBlur={() => handlePriceBlur('unit_cost')}
                className="h-8 pl-4 text-sm text-right border-slate-200 bg-amber-50/60" min={0} />
            </div>
          ) : <div />}
        </div>

        {/* Line total — quantity * unit_price */}
        <div className="text-right min-w-0">
          <div className="font-bold text-slate-900 text-sm tabular-nums">
            ${(parseFloat(item.line_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          {(qty > 0 && price > 0) && (
            <div className="text-[9px] text-slate-400 leading-none mt-0.5 tabular-nums">
              {qty % 1 === 0 ? parseInt(qty) : qty.toFixed(2)} {item.unit} × ${price.toFixed(2)}
            </div>
          )}
        </div>

        {/* Remove */}
        <button onClick={() => onRemove(item.id)}
          className="flex justify-center p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded detail row — editable description + taxable */}
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
function WorkGroup({ group, onUpdate, onRemove, showCost, isOnly, fixedItemIds = new Set(), onLogChange, isPreview = false }) {
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
      {/* Responsive scroll wrapper for narrow screens */}
      <div className="overflow-x-auto">
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
          <div className="flex items-center gap-2 flex-1">
            <button onClick={() => !isPreview && setEditingName(true)}
              className={`flex items-center gap-2 text-left group ${isPreview ? 'cursor-default' : ''}`}>
              <span className="font-bold text-base tracking-wide">{group.name}</span>
              {!isPreview && <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />}
            </button>
            {isPreview && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/15 text-white/60">Read-only</span>
            )}
          </div>
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
            style={{ gridTemplateColumns: GRID_COLS }}>
            <div />
            <div>Service</div>
            <div className="text-center text-slate-500">Qty</div>
            <div className="text-center text-slate-500">UOM</div>
            <div className="text-right text-slate-600">Unit Price</div>
            {!isPreview ? <div className="text-right text-slate-400 text-[9px]">Book<br/>ref</div> : <div />}
            <div className={`text-right ${showCost && !isPreview ? 'text-amber-600' : ''}`}>{showCost && !isPreview ? 'Cost' : ''}</div>
            <div className="text-right">Line Total</div>
            <div />
          </div>

          <div className="divide-y divide-slate-100 min-h-[40px]">
            {group.items.length === 0 && (
              <div className="py-6 text-center text-slate-300 text-xs">No items yet — click below to add</div>
            )}
            {group.items.map(item => (
              <LineItemRow key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} showCost={showCost} isFixed={fixedItemIds.has(item.id)} onLogChange={onLogChange} isPreview={isPreview} />
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
      </div>{/* end overflow-x-auto */}
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
// readOnlyDiscountType: if true, disables discount type selector (Proposal mode)
export default function EstimateGroups({ estimate, onSave, saving, readOnlyDiscountType = false, isPreview = false, currentUser }) {
  const [groups, setGroups] = useState(() => {
    const resolved = resolveAndNormalizeGroups(estimate);
    return resolved.length ? resolved : DEFAULT_GROUPS.map(g => ({ ...g, id: uid(), items: [] }));
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
  const [fixedItemIds, setFixedItemIds] = useState(new Set());
  const { priceLog, addLog, clearLog } = usePriceAuditLog();

  // Persist pricing field changes to audit trail
  const handleFieldAudit = ({ item, field, oldValue, newValue }) => {
    // Add to session log (UI-only, not persisted)
    addLog({ item, field, oldValue, newValue, user: currentUser?.email || 'admin' });
    // Persist to database (fire-and-forget) — only if value actually changed
    if (estimate?.id) {
      const oldNum = parseFloat(oldValue) || 0;
      const newNum = parseFloat(newValue) || 0;
      if (Math.abs(newNum - oldNum) >= 0.01) {
        logFieldChange({
          documentId: estimate.id,
          documentKind: estimate.document_type === 'BID' ? 'bid' : 'estimate',
          userEmail: currentUser?.email || '',
          userRole: currentUser?.role || '',
          metadata: {
            field_name: field,
            old_value: oldNum,
            new_value: newNum,
            line_item_id: item.id,
            line_item_name: item.service_name || '(unnamed)',
            margin_at_event: parseFloat(estimate.gross_margin_pct) || null,
            total_at_event: parseFloat(estimate.total) || null,
          },
        });
      }
    }
  };

  // Sync when estimate id changes
  useEffect(() => {
    if (!estimate?.id) return;
    const resolved = resolveAndNormalizeGroups(estimate);
    setGroups(resolved.length ? resolved : DEFAULT_GROUPS.map(g => ({ ...g, id: uid(), items: [] })));
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
      const result = runEstimateEngine(groups, { taxRate, discountType, discountValue, depositPercent });

      onSave({
        ...estimate,
        groups: result.groups,
        tax_rate: taxRate,
        discount_type: discountType,
        discount_value: discountValue,
        deposit_percent: depositPercent,
        expiration_date: expirationDate,
        notes,
        internal_notes: internalNotes,
        exclusions,
        warranty_terms: warrantyTerms,
        payment_terms: paymentTerms,
        legal_terms: legalTerms,
        subtotal: result.subtotal,
        discount_amount: result.discountAmount,
        tax_amount: result.taxAmount,
        total: result.total,
        deposit_amount: result.depositAmount,
        total_cost: result.totalCost,
        gross_margin: result.grossMargin,
        gross_margin_pct: result.grossMarginPct,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [groups, taxRate, discountType, discountValue, depositPercent, expirationDate, notes, internalNotes, exclusions, warrantyTerms, paymentTerms, legalTerms]);

  const updateGroup = (updated) => setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
  const removeGroup = (id) => setGroups(prev => prev.filter(g => g.id !== id));
  const addGroup = () => setGroups(prev => [...prev, { id: uid(), name: 'New Group', collapsed: false, items: [] }]);

  // Live reactive calculation
  const { subtotal, discountAmount, taxAmount, total, depositAmount,
          totalCost, grossMargin, grossMarginPct,
          totalVariance, totalBookValue, marginPercentage } =
    runEstimateEngine(groups, { taxRate, discountType, discountValue, depositPercent });

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Count loss items for estimate-level warning
  const lossItems = [];
  groups.forEach(g => (g.items || []).forEach(item => {
    const p = parseFloat(item.unit_price) || 0;
    const c = parseFloat(item.unit_cost) || 0;
    if (c > 0 && p > 0 && p < c) lossItems.push(item);
  }));

  return (
    <div className="w-full space-y-0">

      {/* ── SERVICES SECTION HEADER ── */}
      <div className="bg-white rounded-lg border border-slate-200 mb-4 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            Services
            {isPreview && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Read-only
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Expires</span>
              <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
                className="h-7 text-xs w-32 border-slate-200" />
            </div>
            <button onClick={() => setShowCost(v => !v)}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${showCost ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
              {showCost ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {showCost ? 'Cost on' : 'Cost'}
            </button>
          </div>
        </div>
      </div>

      {/* ── ESTIMATE-LEVEL LOSS WARNING — warning-only, not blocking ── */}
      {!isPreview && lossItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg px-5 py-3 mb-4 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">🚨</span>
          <div>
            <p className="text-sm font-bold text-red-800">Loss Prevention Warning</p>
            <p className="text-xs text-red-700 mt-0.5">
              {lossItems.length} item{lossItems.length > 1 ? 's' : ''} priced below cost — you will lose money on {lossItems.length > 1 ? 'these items' : 'this item'}.
              Review pricing before sending to client.
            </p>
          </div>
        </div>
      )}

      {groups.map(group => (
        <WorkGroup key={group.id} group={group} onUpdate={updateGroup} onRemove={removeGroup}
          showCost={showCost} isOnly={groups.length === 1} fixedItemIds={fixedItemIds} onLogChange={handleFieldAudit} isPreview={isPreview} />
      ))}

      {/* Add group button */}
      <button onClick={addGroup}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary border-2 border-dashed border-slate-200 hover:border-primary/40 rounded-xl w-full py-3 justify-center transition-colors mb-4">
        <Plus className="w-4 h-4" />Add work group
      </button>

      {/* ── TOTALS CARD ── */}
      <div className="bg-white rounded-lg border border-slate-200 px-6 py-5 mb-4">
        <div className="flex gap-8 flex-wrap justify-between">

          {/* ── INTERNAL COST SUMMARY — visible when Cost toggle is on ── */}
          {showCost && !isPreview && (() => {
            return (
              <div className="space-y-2" style={{ minWidth: 200 }}>
                <p className="text-[9px] font-bold tracking-widest uppercase text-amber-600">🔒 Internal Cost View</p>
                <div className="flex gap-3 flex-wrap">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex-1 min-w-[100px]">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Total Cost</p>
                    <p className="text-base font-bold text-slate-700">{fmt(totalCost)}</p>
                  </div>
                  <div className={`border rounded-lg px-4 py-3 flex-1 min-w-[100px] ${
                    grossMarginPct >= 30 ? 'bg-emerald-50/50 border-emerald-200' :
                    grossMarginPct >= 20 ? 'bg-amber-50/50 border-amber-200' :
                    'bg-red-50/50 border-red-200'
                  }`}>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Gross Margin</p>
                    <p className={`text-base font-bold ${
                      grossMarginPct >= 30 ? 'text-emerald-700' :
                      grossMarginPct >= 20 ? 'text-amber-600' : 'text-red-600'
                    }`}>{fmt(grossMargin)} ({grossMarginPct.toFixed(1)}%)</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Right: Customer-facing totals */}
          <div className="space-y-3 text-sm ml-auto w-80">
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-800">{fmt(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-slate-600">Discount</span>
              <div className="flex items-center gap-1.5">
                {readOnlyDiscountType ? (
                  <div className="h-8 px-2 flex items-center text-xs text-slate-500 font-medium bg-slate-50 rounded border border-slate-200">
                    {discountType === 'percent' ? '%' : '$'}
                  </div>
                ) : (
                  <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                    className="h-8 text-xs border border-slate-200 rounded px-2 bg-white text-slate-600">
                    <option value="percent">%</option>
                    <option value="fixed">$</option>
                  </select>
                )}
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

            <div className="flex justify-between pt-4 border-t-2 border-slate-300">
              <span className="font-bold text-slate-900 text-lg">Total</span>
              <span className="font-bold text-primary text-3xl">{fmt(total)}</span>
            </div>

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

      {/* ── INTERNAL PRICE AUDIT LOG (session) ── */}
      {!isPreview && <PriceAuditLog entries={priceLog} onClear={clearLog} />}

      {/* ── INTERNAL AUDIT HISTORY (legacy) ── */}
      {!isPreview && estimate?.id && <EstimateAuditHistory estimateId={estimate.id} />}

    </div>
  );
}