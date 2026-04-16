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
  Pencil, Check, X, BookOpen, LayoutTemplate
} from 'lucide-react';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import PriceAuditLog from '@/components/estimates/internal/PriceAuditLog';
import { normalizeLineItem, normalizeGroups, resolveAndNormalizeGroups, normalizeMaterials, sanitizeMaterialForPersistence } from '@/lib/lineItemNormalizer';
import { usePriceAuditLog } from '@/hooks/usePriceAuditLog';
import { calculateLineTotal, runEstimateEngine, suggestPriceFromCost, getNegotiationMeta } from '@/lib/estimateEngine';
import { logChange } from '@/lib/estimateAuditLog';
import EstimateAuditHistory from '@/components/estimates/internal/EstimateAuditHistory';
import { logFieldChange } from '@/lib/pricingAuditService';
import ConcreteMetrics from '@/components/estimates/internal/ConcreteMetrics';
import MaterialsSection from '@/components/estimates/MaterialsSection';
import OtherCostsSection from '@/components/estimates/OtherCostsSection';
import { persistNewServiceToCatalog } from '@/lib/persistNewService';

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_GROUPS = [{ id: uid(), name: 'General', collapsed: false, items: [] }];

const emptyItem = () => normalizeLineItem({ id: uid() });

const UNITS = ['ea', 'hr', 'sq ft', 'ln ft', 'day', 'lump sum', 'ton', 'gal', 'room', 'window', 'door', 'bag', 'box'];

// Shared grid template — single source of truth for header + row alignment
// Cols: grip | service | qty | uom | unit_price | book_ref | line_total | remove
const GRID_COLS = 'minmax(20px,24px) minmax(180px,3fr) minmax(48px,60px) minmax(56px,76px) minmax(88px,110px) minmax(56px,72px) minmax(80px,110px) minmax(24px,28px)';

// ─── Single Line Item Row ──────────────────────────────────────────────────────
function LineItemRow({ item, onUpdate, onRemove, showCost, isFixed = false, onLogChange, isPreview = false }) {
  const [expanded, setExpanded] = useState(!item.service_name || !item.description);
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
    <div className={`border-b border-slate-100 last:border-0 transition-colors group/row ${isFixed ? 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-200' : expanded ? 'bg-blue-50/10' : 'hover:bg-slate-50/70'}`}>
      {/* Main row — shared grid template */}
      <div className="grid items-center gap-2 px-4 py-3"
        style={{ gridTemplateColumns: GRID_COLS }}>

        {/* Grip */}
        <button className="text-slate-200 hover:text-slate-400 cursor-grab active:cursor-grabbing flex justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
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

                // Fire-and-forget: persist new manual services to catalog
                if (picked._is_new && picked.source === 'custom') {
                  persistNewServiceToCatalog({
                    service_name: picked.name,
                    category: picked.category || 'Misc',
                    unit: picked.unit || 'ea',
                    description: picked.description || '',
                    unit_price: safePrice,
                    unit_cost: safeCost,
                  }).then(result => {
                    if (result.service_id && !updated.service_id) {
                      onUpdate({ ...updated, service_id: result.service_id });
                    }
                  });
                }
              }}
            placeholder="Service name"
            className="h-8 w-full text-sm font-medium text-slate-800 border-transparent hover:border-slate-200 focus:border-blue-400 bg-transparent hover:bg-white focus:bg-white px-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/15 transition placeholder:text-slate-300"
          />

          {/* Description — always visible below service name */}
          {!expanded && item.description && (
            <p className="text-[11px] text-slate-400 px-2 leading-snug truncate mt-0.5 font-normal">{item.description}</p>
          )}
          {!expanded && (
            <button onClick={() => setExpanded(true)} className="text-[10px] text-slate-400 hover:text-primary px-2 mt-0.5 font-medium opacity-0 group-hover/row:opacity-100 transition-opacity">
              {item.description ? 'edit' : '+ desc'}
            </button>
          )}

          {/* === INTERNAL-ONLY: concrete metrics === */}
          {!isPreview && <ConcreteMetrics item={item} />}

          {/* === INTERNAL-ONLY: line margin + loss prevention + negotiation helpers === */}
          {!isPreview && (cost > 0 || book > 0) && (
            <div className="px-2 mt-1.5 flex flex-wrap gap-1">
              {/* Line margin % — subtle pill */}
              {lineMarginPct !== null && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border ${
                  lineMarginPct >= 30 ? 'bg-emerald-50/80 border-emerald-100 text-emerald-600' :
                  lineMarginPct >= 20 ? 'bg-amber-50/80 border-amber-100 text-amber-600' :
                  lineMarginPct >= 0  ? 'bg-red-50/80 border-red-100 text-red-500' :
                                        'bg-red-50 border-red-200 text-red-600'
                }`}>
                  <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                    lineMarginPct >= 30 ? 'bg-emerald-400' :
                    lineMarginPct >= 20 ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  {lineMarginPct.toFixed(1)}%
                </span>
              )}

              {/* ⚠️ Loss alert — compact inline */}
              {isLoss && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border bg-red-50/80 border-red-200 text-red-600">
                  ↓ −${(cost - price).toFixed(2)}/u
                </span>
              )}
              {isZeroProfit && !isLoss && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border bg-amber-50/80 border-amber-100 text-amber-600">
                  0% profit
                </span>
              )}

              {/* Negotiation helper — very compact */}
              {negMeta.status !== 'none' && negMeta.status !== 'healthy' && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border ${
                  negMeta.status === 'critical' ? 'bg-red-50/60 border-red-100 text-red-500' : 'bg-amber-50/60 border-amber-100 text-amber-500'
                }`}>
                  sug ${negMeta.suggested.toFixed(0)}
                </span>
              )}

              {/* Book price variance */}
              {book > 0 && (() => {
                const diff = price - book;
                const pct = (diff / book) * 100;
                const isDanger  = pct < -15;
                const isWarning = pct < 0 && pct >= -15;
                const cls = isDanger ? 'bg-red-50/60 border-red-100 text-red-500'
                          : isWarning ? 'bg-amber-50/60 border-amber-100 text-amber-500'
                          : 'bg-emerald-50/60 border-emerald-100 text-emerald-500';
                const label = isDanger  ? `−${Math.abs(pct).toFixed(0)}%↓`
                            : isWarning ? `−${Math.abs(pct).toFixed(0)}%`
                            : diff > 0  ? `+${pct.toFixed(0)}%`
                            : '✓';
                return (
                  <span className={`inline-flex items-center text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border ${cls}`}>
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
          className="h-8 text-sm text-center border-slate-200 font-semibold px-1 w-full tabular-nums rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15" min={0}
        />

        {/* UOM */}
        <select value={item.unit} onChange={e => update('unit', e.target.value)}
          className="h-8 text-[11px] border border-slate-200 rounded-lg px-1.5 bg-white text-slate-500 w-full font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 focus:outline-none">
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
              className={`h-8 pl-4 pr-2 text-sm text-right font-semibold tabular-nums rounded-lg border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 ${
                isLoss ? 'border-red-300 bg-red-50/40 text-red-600' :
                isZeroProfit ? 'border-amber-300 bg-amber-50/40 text-amber-600' :
                'text-slate-800'
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
              <div className="text-[10px] text-slate-400 font-medium tabular-nums">${book.toFixed(2)}</div>
              <div className="text-[9px] text-slate-300 leading-none">book</div>
            </div>
          );
        })() : <div />}

        {/* Line total — quantity * unit_price */}
        <div className="text-right min-w-0">
          <div className="font-bold text-slate-800 text-sm tabular-nums">
            ${(parseFloat(item.line_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          {(qty > 0 && price > 0) && (
            <div className="text-[9px] text-slate-400 leading-none mt-0.5 tabular-nums">
              {qty % 1 === 0 ? parseInt(qty) : qty.toFixed(2)} × ${price.toFixed(2)}
            </div>
          )}
        </div>

        {/* Remove — only visible on row hover */}
        <button onClick={() => onRemove(item.id)}
          className="flex justify-center p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover/row:opacity-100">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded detail row — editable description + taxable */}
      {expanded && (
        <div className="px-10 pb-4 pt-0.5 space-y-2">
          <Input value={item.description} onChange={e => update('description', e.target.value)}
            placeholder="Description (optional)…"
            className="h-8 text-sm border-slate-200 text-slate-600 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 placeholder:text-slate-300" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors">
              <input type="checkbox" checked={item.taxable !== false}
                onChange={e => update('taxable', e.target.checked)} className="rounded accent-primary" />
              Taxable
            </label>
            <button onClick={() => setExpanded(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">↑ collapse</button>
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

  const saveGroupName = () => {
    onUpdate({ ...group, name: nameVal || 'Group' });
    setEditingName(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Responsive scroll wrapper for narrow screens */}
      <div className="overflow-x-auto">
      {/* Group header */}
      <div className="flex items-center gap-3 px-6 py-3.5 bg-slate-800 text-white">
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
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 leading-none mb-0.5">Work Group</p>
                <span className="font-bold text-sm tracking-wide">{group.name}</span>
              </div>
              {!isPreview && <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
            </button>
            {isPreview && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10">Read-only</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 ml-auto">
          <span className="text-[11px] text-white/60">{group.items?.length || 0} item{(group.items?.length || 0) !== 1 ? 's' : ''}</span>
          <span className="text-sm font-bold text-white tabular-nums">${groupSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
          <div className="grid text-[9px] text-slate-400 font-bold uppercase tracking-widest px-4 py-2 bg-slate-50/80 border-b border-slate-100"
            style={{ gridTemplateColumns: GRID_COLS }}>
            <div />
            <div className="text-slate-500">Service</div>
            <div className="text-center">Qty</div>
            <div className="text-center">UOM</div>
            <div className="text-right">Unit Price</div>
            {!isPreview ? <div className="text-right text-slate-300">Book</div> : <div />}
            <div className="text-right">Total</div>
            <div />
          </div>

          <div className="divide-y divide-slate-100/80 min-h-[40px]">
            {group.items.length === 0 && (
              <div className="py-8 text-center text-slate-300 text-xs">No items yet — click below to add</div>
            )}
            {group.items.map(item => (
              <LineItemRow key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} showCost={showCost} isFixed={fixedItemIds.has(item.id)} onLogChange={onLogChange} isPreview={isPreview} />
            ))}
          </div>

          {/* Section Total Row */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Group Total</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              ${groupSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="px-6 py-2.5 flex items-center gap-4 border-t border-slate-100 bg-white/80">
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
function NotesSection({ label, placeholder, value, onChange, accent, badge }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className={`text-[11px] font-bold uppercase tracking-widest ${accent ? 'text-amber-600' : 'text-slate-500'}`}>{label}</label>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-600 leading-none">
            {badge}
          </span>
        )}
      </div>
      <Textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={8}
        className={`text-sm resize-none leading-relaxed placeholder:text-slate-300 ${
          accent
            ? 'border-amber-200 bg-amber-50/20 focus-visible:ring-amber-400/30'
            : 'border-slate-200 bg-slate-50/40 focus-visible:ring-primary/20'
        }`} />
    </div>
  );
}

// ─── Main EstimateGroups Component ────────────────────────────────────────────
// readOnlyDiscountType: if true, disables discount type selector (Proposal mode)
export default function EstimateGroups({ estimate, onSave, saving, readOnlyDiscountType = false, isPreview = false, currentUser, onDirty }) {
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
  const [materials, setMaterials] = useState(() => normalizeMaterials(estimate?.materials || []));
  const [otherCosts, setOtherCosts] = useState(estimate?.other_costs || []);
  const showCost = true; // Materials cost always tracked internally
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
    setMaterials(normalizeMaterials(estimate.materials || []));
    setOtherCosts(estimate.other_costs || []);
  }, [estimate?.id]);

  // Debounced auto-save
  useEffect(() => {
    // Signal parent that local changes exist before debounce fires
    if (onDirty) onDirty();
    const t = setTimeout(() => {
      const result = runEstimateEngine(groups, { taxRate, discountType, discountValue, depositPercent, materials, otherCosts });

      onSave({
        ...estimate,
        groups: result.groups,
        materials: result.materials.map(sanitizeMaterialForPersistence),
        materials_subtotal: result.materialsSubtotal,
        other_costs: otherCosts,
        other_costs_total: result.otherCostsTotal,
        net_profit: result.netProfit,
        net_profit_pct: result.netProfitPct,
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
  }, [groups, taxRate, discountType, discountValue, depositPercent, expirationDate, notes, internalNotes, exclusions, warrantyTerms, paymentTerms, legalTerms, materials, otherCosts]);

  const updateGroup = (updated) => setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
  const removeGroup = (id) => setGroups(prev => prev.filter(g => g.id !== id));
  const addGroup = () => setGroups(prev => [...prev, { id: uid(), name: 'New Group', collapsed: false, items: [] }]);

  // Live reactive calculation
  const { subtotal, discountAmount, taxAmount, total, depositAmount,
          totalCost, materialsCost, grossMargin, grossMarginPct,
          totalVariance, totalBookValue, marginPercentage, materialsSubtotal,
          otherCostsTotal, netProfit, netProfitPct } =
    runEstimateEngine(groups, { taxRate, discountType, discountValue, depositPercent, materials, otherCosts });

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Count loss items for estimate-level warning
  const lossItems = [];
  groups.forEach(g => (g.items || []).forEach(item => {
    const p = parseFloat(item.unit_price) || 0;
    const c = parseFloat(item.unit_cost) || 0;
    if (c > 0 && p > 0 && p < c) lossItems.push(item);
  }));

  return (
    <div className="w-full space-y-0 max-w-5xl mx-auto">

      {/* ── SERVICES SECTION HEADER ── */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="12" height="2" rx="1" fill="white" fillOpacity="0.8"/>
              <rect x="1" y="5" width="8" height="2" rx="1" fill="white" fillOpacity="0.5"/>
              <rect x="1" y="9" width="10" height="2" rx="1" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Scope of Work</p>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 leading-tight">
              Services
              {isPreview && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Read-only
                </span>
              )}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires</span>
          <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
            className="h-8 text-xs w-40 min-w-[160px] shrink-0 border-slate-200 bg-white" />
        </div>
      </div>

      {/* ── ESTIMATE-LEVEL LOSS WARNING — warning-only, not blocking ── */}
      {!isPreview && lossItems.length > 0 && (
        <div className="bg-red-50/60 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-red-100 border border-red-300 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] leading-none font-bold text-red-600">!</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-red-700">Loss Prevention · </span>
            <span className="text-[11px] text-red-600">
              {lossItems.length} item{lossItems.length > 1 ? 's' : ''} priced below cost — review before sending.
            </span>
          </div>
        </div>
      )}

      {/* ── WORK GROUPS ── */}
      <div className="space-y-3 mb-3">
        {groups.map(group => (
          <WorkGroup key={group.id} group={group} onUpdate={updateGroup} onRemove={removeGroup}
            showCost={showCost} isOnly={groups.length === 1} fixedItemIds={fixedItemIds} onLogChange={handleFieldAudit} isPreview={isPreview} />
        ))}
      </div>

      {/* Add group button */}
      <button onClick={addGroup}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-primary border border-dashed border-slate-200 hover:border-primary/30 rounded-xl w-full py-2.5 justify-center transition-colors mb-5 bg-white/60 hover:bg-white">
        <Plus className="w-3.5 h-3.5" />Add work group
      </button>

      {/* ── MATERIALS SECTION ── */}
      <div className="mb-5">
        <MaterialsSection materials={materials} onChange={setMaterials} showCost={showCost} />
      </div>

      {/* ── OTHER COSTS SECTION (internal only) ── */}
      {!isPreview && (
        <div className="mb-5">
          <OtherCostsSection otherCosts={otherCosts} onChange={setOtherCosts} />
        </div>
      )}

      {/* ── TOTALS CARD ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5 shadow-sm">

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Summary</p>
          {!isPreview && (() => {
            const marginStatus = grossMarginPct >= 60
              ? { label: 'Good', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
              : grossMarginPct >= 40
              ? { label: 'Warning', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
              : { label: 'Low margin', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' };
            return (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${marginStatus.bg} ${marginStatus.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${marginStatus.dot}`} />
                {marginStatus.label} · {grossMarginPct.toFixed(1)}%
              </span>
            );
          })()}
        </div>

        <div className="flex gap-0 flex-wrap">

          {/* ── LEFT: Internal Profit Analysis ── */}
          {!isPreview && (() => {
            const marginStatus = grossMarginPct >= 60
              ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
              : grossMarginPct >= 40
              ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' }
              : { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
            return (
              <div className="flex-1 min-w-[280px] px-6 py-5 border-r border-slate-100">
                <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mb-3">🔒 Internal · Profit Analysis</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Services</p>
                    <p className="text-sm font-bold text-slate-800 tabular-nums">{fmt(subtotal)}</p>
                  </div>
                  {materialsSubtotal > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-500 mb-1">Materials cost</p>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">{fmt(materialsCost)}</p>
                    </div>
                  )}
                  {otherCostsTotal > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-amber-500 mb-1">Other costs</p>
                      <p className="text-sm font-bold text-amber-700 tabular-nums">{fmt(otherCostsTotal)}</p>
                    </div>
                  )}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Total cost</p>
                    <p className="text-sm font-bold text-slate-700 tabular-nums">{fmt(totalCost)}</p>
                  </div>
                  <div className={`border rounded-lg px-3 py-2.5 col-span-2 ${marginStatus.bg} ${marginStatus.border}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Gross profit</p>
                    <div className="flex items-baseline gap-2">
                      <p className={`text-base font-bold tabular-nums ${marginStatus.text}`}>{fmt(grossMargin)}</p>
                      <p className={`text-[11px] font-bold tabular-nums ${marginStatus.text}`}>({grossMarginPct.toFixed(1)}%)</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── RIGHT: Customer-facing totals ── */}
          <div className="flex-shrink-0 w-80 px-6 py-5 space-y-2 text-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Client-Facing Total</p>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-800 tabular-nums">{fmt(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Discount</span>
              <div className="flex items-center gap-1.5">
                {readOnlyDiscountType ? (
                  <div className="h-7 px-2 flex items-center text-xs text-slate-500 font-medium bg-slate-50 rounded border border-slate-200">
                    {discountType === 'percent' ? '%' : '$'}
                  </div>
                ) : (
                  <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                    className="h-7 text-xs border border-slate-200 rounded px-2 bg-white text-slate-600">
                    <option value="percent">%</option>
                    <option value="fixed">$</option>
                  </select>
                )}
                <Input type="number" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-7 w-20 text-right text-sm border-slate-200" min={0} />
              </div>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Discount applied</span>
                <span className="text-red-500 font-semibold tabular-nums">−{fmt(discountAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Tax (%)</span>
              <Input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="h-7 w-20 text-right text-sm border-slate-200" min={0} max={100} />
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Tax ({taxRate}%)</span>
                <span className="font-semibold tabular-nums">{fmt(taxAmount)}</span>
              </div>
            )}

            {/* Grand total */}
            <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-slate-200">
              <span className="font-bold text-slate-900 text-base">Total</span>
              <span className="font-bold text-primary tabular-nums" style={{ fontSize: '1.75rem', lineHeight: 1 }}>{fmt(total)}</span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-slate-500 text-xs">Deposit (%)</span>
              <Input type="number" value={depositPercent} onChange={e => setDepositPercent(parseFloat(e.target.value) || 0)}
                className="h-7 w-20 text-right text-sm border-slate-200" min={0} max={100} />
            </div>
            {depositAmount > 0 && (
              <div className="flex justify-between text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-1">
                <span>Deposit due</span>
                <span className="tabular-nums">{fmt(depositAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NOTES & TERMS ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5 shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes & Terms</p>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-5">
            <NotesSection label="Customer Notes" placeholder="Visible to client — scope overview, access instructions…" value={notes} onChange={setNotes} />
            <NotesSection label="Internal Notes" placeholder="Team only — not visible to customer…" value={internalNotes} onChange={setInternalNotes} accent badge="Internal only" />
            <NotesSection label="Exclusions" placeholder="What is NOT included in this estimate…" value={exclusions} onChange={setExclusions} />
            <NotesSection label="Payment Terms" placeholder="e.g. 50% deposit, balance on completion…" value={paymentTerms} onChange={setPaymentTerms} />
          </div>

          <button onClick={() => setShowTerms(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700 mt-5 transition-colors border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 bg-white">
            {showTerms ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {showTerms ? 'Hide' : 'Show'} warranty & legal terms
          </button>

          {showTerms && (
            <div className="grid grid-cols-2 gap-5 mt-5 pt-5 border-t border-slate-100">
              <NotesSection label="Warranty Terms" placeholder="e.g. 1-year labor warranty…" value={warrantyTerms} onChange={setWarrantyTerms} />
              <NotesSection label="Legal Terms" placeholder="Terms and conditions…" value={legalTerms} onChange={setLegalTerms} />
            </div>
          )}
        </div>
      </div>

      {/* ── INTERNAL AUDIT TRAIL ── */}
      {!isPreview && (
        <div className="space-y-3 mt-2">
          <PriceAuditLog entries={priceLog} onClear={clearLog} />
          {estimate?.id && <EstimateAuditHistory estimateId={estimate.id} />}
        </div>
      )}

    </div>
  );
}