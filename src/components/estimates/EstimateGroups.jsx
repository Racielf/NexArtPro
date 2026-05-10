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
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  Pencil, Check, X, BookOpen, LayoutTemplate
} from 'lucide-react';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import PriceAuditLog from '@/components/estimates/internal/PriceAuditLog';
import { normalizeLineItem, resolveAndNormalizeGroups, normalizeMaterials, sanitizeMaterialForPersistence } from '@/lib/lineItemNormalizer';
import { usePriceAuditLog } from '@/hooks/usePriceAuditLog';
import { calculateLineTotal, runEstimateEngine, suggestPriceFromCost, getNegotiationMeta } from '@/lib/estimateEngine';
import EstimateAuditHistory from '@/components/estimates/internal/EstimateAuditHistory';
import { logFieldChange } from '@/lib/pricingAuditService';
import ConcreteMetrics from '@/components/estimates/internal/ConcreteMetrics';
import MaterialsSection from '@/components/estimates/MaterialsSection';
import OtherCostsSection from '@/components/estimates/OtherCostsSection';
import { persistNewServiceToCatalog } from '@/lib/persistNewService';
import { calculateRiskScore } from '@/lib/estimateRiskScoring';
import RiskScorePanel from '@/components/estimates/internal/RiskScorePanel';

const uid = () => Math.random().toString(36).slice(2, 10);
const DEFAULT_GROUPS = [{ id: uid(), name: 'General', collapsed: false, items: [] }];
const emptyItem = () => normalizeLineItem({ id: uid() });
const UNITS = ['ea', 'hr', 'sq ft', 'ln ft', 'day', 'lump sum', 'ton', 'gal', 'room', 'window', 'door', 'bag', 'box'];
const GRID_COLS = 'minmax(20px,24px) minmax(220px,3fr) minmax(52px,64px) minmax(60px,78px) minmax(96px,118px) minmax(56px,72px) minmax(92px,118px) minmax(24px,28px)';

function LineItemRow({ item, onUpdate, onRemove, showCost, isFixed = false, onLogChange, isPreview = false, pricingWarning = null }) {
  const [expanded, setExpanded] = useState(!item.service_name || !item.description);
  const committedRef = React.useRef({ unit_price: item.unit_price, unit_cost: item.unit_cost });

  const update = (field, value) => {
    const numericFields = new Set(['quantity', 'unit_price', 'unit_cost', 'book_price']);
    const safeValue = numericFields.has(field) ? (parseFloat(value) || 0) : value;
    const updated = { ...item, [field]: safeValue };
    updated.line_total = calculateLineTotal(
      field === 'quantity' ? safeValue : updated.quantity,
      field === 'unit_price' ? safeValue : updated.unit_price
    );
    onUpdate(updated);
  };

  const applyPricingSuggestion = () => {
    if (!pricingWarning?.suggestedCatalogPrice) return;
    update('unit_price', pricingWarning.suggestedCatalogPrice);
  };

  const handlePriceBlur = async (field) => {
    const oldValue = committedRef.current[field];
    const newValue = item[field];
    if (oldValue !== newValue && onLogChange) {
      onLogChange({ item, field, oldValue, newValue });
    }
    committedRef.current[field] = newValue;
  };

  const price = parseFloat(item.unit_price) || 0;
  const cost = parseFloat(item.unit_cost) || 0;
  const book = parseFloat(item.book_price) || 0;
  const qty = parseFloat(item.quantity) || 0;
  const lineMarginPct = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null;
  const isLoss = cost > 0 && price > 0 && price < cost;
  const isZeroProfit = cost > 0 && price > 0 && Math.abs(price - cost) < 0.01;
  const autoSuggest = !isPreview ? suggestPriceFromCost(cost, 0.30) : 0;
  const negMeta = !isPreview ? getNegotiationMeta(cost, price) : { status: 'none' };

  return (
    <div className={`border-b border-slate-100 last:border-0 transition-colors group/row ${isFixed ? 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-200' : expanded ? 'bg-blue-50/10' : 'hover:bg-slate-50/70'}`}>
      <div className="grid items-center gap-2 px-4 py-2.5" style={{ gridTemplateColumns: GRID_COLS }}>
        <button className="text-slate-200 hover:text-slate-400 cursor-grab active:cursor-grabbing flex justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <div className="min-w-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-0.5 leading-none">Service</p>
          <SmartServicePicker
            value={item.service_name}
            onChange={v => update('service_name', v)}
            onSelect={picked => {
              if (!picked?.name) return;
              setExpanded(true);
              const pickedPrice = picked.unit_price !== null ? Number(picked.unit_price) : price;
              const pickedCost = picked.unit_cost !== null ? Number(picked.unit_cost) : cost;
              const safePrice = isNaN(pickedPrice) ? 0 : pickedPrice;
              const safeCost = isNaN(pickedCost) ? 0 : pickedCost;
              const pickedBook = picked.book_price !== null && picked.book_price !== undefined
                ? Number(picked.book_price)
                : (picked.unit_price !== null ? Number(picked.unit_price) : book);
              const safeBook = isNaN(pickedBook) ? 0 : pickedBook;
              const qtyVal = parseFloat(item.quantity) || 0;
              const lineTotal = calculateLineTotal(qtyVal, safePrice);
              const updated = {
                ...item,
                service_id: picked.service_id ?? null,
                service_name: picked.name || item.service_name,
                description: picked.description || item.description || '',
                category: picked.category || item.category || 'Misc',
                unit: picked.unit || item.unit || 'ea',
                unit_price: safePrice,
                unit_cost: safeCost,
                book_price: safeBook,
                line_total: lineTotal,
              };
              onUpdate(updated);
              if (picked._is_new && picked.source === 'custom') {
                persistNewServiceToCatalog({
                  service_name: picked.name,
                  category: picked.category || 'Misc',
                  unit: picked.unit || 'ea',
                  description: picked.description || '',
                  unit_price: safePrice,
                  unit_cost: safeCost,
                }).then(result => {
                  if (result.service_id && !updated.service_id) onUpdate({ ...updated, service_id: result.service_id });
                });
              }
            }}
            placeholder="Search service from Price Book…"
            className="h-9 w-full text-[13px] font-medium text-slate-800 border-transparent hover:border-slate-200 focus:border-blue-400 bg-transparent hover:bg-white focus:bg-white px-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/15 transition placeholder:text-slate-300"
          />

          {!expanded && item.description && (
            <p className="text-[11px] text-slate-400 px-2 leading-snug truncate mt-0.5 font-normal">{item.description}</p>
          )}
          {!expanded && (
            <button onClick={() => setExpanded(true)} className="text-[10px] text-slate-400 hover:text-primary px-2 mt-0.5 font-medium opacity-0 group-hover/row:opacity-100 transition-opacity">
              {item.description ? 'edit' : '+ desc'}
            </button>
          )}

          {!isPreview && <ConcreteMetrics item={item} />}

          {!isPreview && (cost > 0 || book > 0 || pricingWarning) && (
            <div className="px-2 mt-1.5 flex flex-wrap gap-1">
              {lineMarginPct !== null && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border ${
                  lineMarginPct >= 30 ? 'bg-emerald-50/80 border-emerald-100 text-emerald-600' :
                  lineMarginPct >= 20 ? 'bg-amber-50/80 border-amber-100 text-amber-600' :
                  lineMarginPct >= 0 ? 'bg-red-50/80 border-red-100 text-red-500' :
                  'bg-red-50 border-red-200 text-red-600'
                }`}>
                  <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                    lineMarginPct >= 30 ? 'bg-emerald-400' :
                    lineMarginPct >= 20 ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  {lineMarginPct.toFixed(1)}%
                </span>
              )}

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

              {pricingWarning && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border bg-red-50 border-red-200 text-red-600">
                  ⚠ underpriced {Math.abs(pricingWarning.deltaPercent)}%
                </span>
              )}

              {negMeta.status !== 'none' && negMeta.status !== 'healthy' && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border ${
                  negMeta.status === 'critical' ? 'bg-red-50/60 border-red-100 text-red-500' : 'bg-amber-50/60 border-amber-100 text-amber-500'
                }`}>
                  sug ${negMeta.suggested.toFixed(0)}
                </span>
              )}

              {book > 0 && (() => {
                const diff = price - book;
                const pct = (diff / book) * 100;
                const isDanger = pct < -15;
                const isWarning = pct < 0 && pct >= -15;
                const cls = isDanger ? 'bg-red-50/60 border-red-100 text-red-500'
                  : isWarning ? 'bg-amber-50/60 border-amber-100 text-amber-500'
                  : 'bg-emerald-50/60 border-emerald-100 text-emerald-500';
                const label = isDanger ? `−${Math.abs(pct).toFixed(0)}%↓`
                  : isWarning ? `−${Math.abs(pct).toFixed(0)}%`
                  : diff > 0 ? `+${pct.toFixed(0)}%`
                  : '✓';
                return <span className={`inline-flex items-center text-[9px] font-semibold leading-none px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
              })()}

              {pricingWarning && (
                <button
                  type="button"
                  onClick={applyPricingSuggestion}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors leading-none font-semibold"
                  title={`Apply suggested catalog price $${pricingWarning.suggestedCatalogPrice}`}
                >
                  Fix → ${pricingWarning.suggestedCatalogPrice}
                </button>
              )}
            </div>
          )}
        </div>

        {isPreview ? (
          <div className="h-8 text-sm text-center font-semibold tabular-nums flex items-center justify-center text-slate-700">{item.quantity}</div>
        ) : (
          <Input type="number" value={item.quantity} onChange={e => update('quantity', e.target.value)} className="h-8 text-sm text-center border-slate-200 font-semibold px-1 w-full tabular-nums rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15" min={0} />
        )}

        {isPreview ? (
          <div className="h-8 text-[11px] flex items-center justify-center text-slate-500 font-medium">{item.unit}</div>
        ) : (
          <select value={item.unit} onChange={e => update('unit', e.target.value)} className="h-8 text-[11px] border border-slate-200 rounded-lg px-1.5 bg-white text-slate-500 w-full font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 focus:outline-none">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}

        <div className="min-w-0 overflow-hidden">
          <div className="relative flex items-center">
            {isPreview ? (
              <div className={`h-8 px-2 text-sm text-right font-semibold tabular-nums flex items-center justify-end w-full ${isLoss ? 'text-red-600' : isZeroProfit ? 'text-amber-600' : 'text-slate-800'}`}>${price.toFixed(2)}</div>
            ) : (
              <>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unit_price}
                  onChange={e => update('unit_price', e.target.value)}
                  onBlur={() => handlePriceBlur('unit_price')}
                  className={`h-8 pl-4 pr-2 text-sm text-right font-semibold tabular-nums rounded-lg border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 ${
                    isLoss ? 'border-red-300 bg-red-50/40 text-red-600' :
                    isZeroProfit ? 'border-amber-300 bg-amber-50/40 text-amber-600' :
                    pricingWarning ? 'border-red-300 bg-red-50/30 text-slate-800' : 'text-slate-800'
                  }`}
                  min={0}
                />
              </>
            )}
            {!isPreview && autoSuggest > 0 && (
              <button type="button" onClick={() => update('unit_price', autoSuggest)} title={`Set suggested price at 30% margin: $${autoSuggest.toFixed(2)}`} className="absolute right-1 top-1/2 -translate-y-1/2 text-[11px] leading-none hover:text-amber-500 text-slate-300 transition-colors">⚡</button>
            )}
          </div>
          {!isPreview && book > 0 && (() => {
            const MARGINS = [0.10, 0.20, 0.30];
            const suggestions = MARGINS.map(m => ({ label: `+${m * 100}%`, p: parseFloat((book * (1 + m)).toFixed(2)), margin: m }));
            const isAtBook = Math.abs(price - book) < 0.01;
            return (
              <div className="flex gap-0.5 mt-0.5 flex-wrap">
                {suggestions.map(s => (
                  <button key={s.margin} type="button" onClick={() => update('unit_price', s.p)} title={`Set to $${s.p} (${s.label} over book)`} className={`text-[9px] px-1 py-0.5 rounded border transition-colors leading-none font-semibold ${price === s.p ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:border-primary/40 hover:text-primary'}`}>{s.label}</button>
                ))}
                {!isAtBook && (
                  <button type="button" onClick={() => update('unit_price', book)} title={`Reset to book price $${book.toFixed(2)}`} className="text-[9px] px-1 py-0.5 rounded border border-slate-200 bg-white text-slate-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors leading-none font-semibold">↺ book</button>
                )}
              </div>
            );
          })()}
        </div>

        {!isPreview ? (() => {
          if (book === 0) return <div className="text-right text-xs text-slate-200">—</div>;
          return (
            <div className="text-right leading-tight min-w-0">
              <div className="text-[10px] text-slate-400 font-medium tabular-nums">${book.toFixed(2)}</div>
              <div className="text-[9px] text-slate-300 leading-none">book</div>
            </div>
          );
        })() : <div />}

        <div className="text-right min-w-0">
          <div className="font-bold text-slate-800 text-sm tabular-nums">${(parseFloat(item.line_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          {(qty > 0 && price > 0) && <div className="text-[9px] text-slate-400 leading-none mt-0.5 tabular-nums">{qty % 1 === 0 ? parseInt(qty) : qty.toFixed(2)} × ${price.toFixed(2)}</div>}
        </div>

        {!isPreview ? (
          <button onClick={() => onRemove(item.id)} className="flex justify-center p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover/row:opacity-100">
            <X className="w-3 h-3" />
          </button>
        ) : <div />}
      </div>

      {expanded && (
        <div className="px-10 pb-3 pt-0.5 space-y-1.5">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Description</p>
          {isPreview ? (
            <p className="text-sm text-slate-400 px-1 py-1 leading-relaxed">{item.description || '—'}</p>
          ) : (
            <Input value={item.description} onChange={e => update('description', e.target.value)} placeholder="Service description / scope details…" className="h-8 text-sm border-slate-100 bg-slate-50/60 text-slate-400 rounded-lg focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300 focus:bg-white transition" />
          )}
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-400">{item.taxable !== false ? 'Taxable' : 'Not taxable'}</span>
            {!isPreview && (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors">
                <input type="checkbox" checked={item.taxable !== false} onChange={e => update('taxable', e.target.checked)} className="rounded accent-primary" />
                Toggle taxable
              </label>
            )}
            <button onClick={() => setExpanded(false)} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">↑ collapse</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkGroup({ group, onUpdate, onRemove, showCost, isOnly, fixedItemIds = new Set(), onLogChange, isPreview = false, pricingWarningsMap = {} }) {
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
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.04)' }}>
      <div className="overflow-x-auto">
      <div className="flex items-center gap-3 px-6 py-3 bg-slate-800 text-white">
        <button onClick={() => onUpdate({ ...group, collapsed: !group.collapsed })} className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0">
          {group.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <Input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveGroupName()} className="h-8 text-sm font-bold bg-white/10 border-white/30 text-white placeholder:text-white/50 flex-1" />
            <button onClick={saveGroupName} className="p-1 rounded hover:bg-white/20"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingName(false)} className="p-1 rounded hover:bg-white/20"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <button onClick={() => !isPreview && setEditingName(true)} className={`flex items-center gap-2 text-left group ${isPreview ? 'cursor-default' : ''}`}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 leading-none mb-0.5">Work Group</p>
                <span className="font-bold text-sm tracking-wide">{group.name}</span>
              </div>
              {!isPreview && <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
            </button>
            {isPreview && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10">Read-only</span>}
          </div>
        )}

        <div className="flex items-center gap-4 ml-auto">
          <span className="text-[11px] text-white/60">{group.items?.length || 0} item{(group.items?.length || 0) !== 1 ? 's' : ''}</span>
          <span className="text-sm font-bold text-white tabular-nums">${groupSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          {!isOnly && !isPreview && (
            <button onClick={() => onRemove(group.id)} className="p-1 rounded hover:bg-red-500/30 text-white/50 hover:text-white transition-colors ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>

      {!group.collapsed && (
        <>
          <div className="grid text-[9px] text-slate-400 font-bold uppercase tracking-widest px-4 py-2 bg-slate-50/80 border-b border-slate-100" style={{ gridTemplateColumns: GRID_COLS }}>
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
            {group.items.length === 0 && <div className="py-6 text-center text-slate-300 text-xs">No items yet — click below to add</div>}
            {group.items.map(item => (
              <LineItemRow key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} showCost={showCost} isFixed={fixedItemIds.has(item.id)} onLogChange={onLogChange} isPreview={isPreview} pricingWarning={pricingWarningsMap?.[item.id] || null} />
            ))}
          </div>

          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Group Total</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">${groupSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {!isPreview && (
            <div className="px-6 py-2.5 flex items-center gap-4 border-t border-slate-100 bg-white/80">
              <button onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm font-bold text-primary hover:bg-blue-100 hover:border-blue-200 transition-colors"><Plus className="w-4 h-4" />Add line item</button>
              <button type="button" disabled title="Coming soon" className="inline-flex items-center gap-1.5 text-sm text-slate-300 cursor-not-allowed"><BookOpen className="w-4 h-4" />Price book</button>
              <button type="button" disabled title="Coming soon" className="inline-flex items-center gap-1.5 text-sm text-slate-300 cursor-not-allowed"><LayoutTemplate className="w-4 h-4" />Templates</button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <span className="text-[13px] font-bold text-slate-700 tabular-nums leading-none">{time}</span>
      <span className="text-[10px] text-slate-400 leading-none">{date}</span>
    </div>
  );
}

function NotesSection({ label, placeholder, value, onChange, accent, badge }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className={`text-[11px] font-bold uppercase tracking-widest ${accent ? 'text-amber-600' : 'text-slate-500'}`}>{label}</label>
        {badge && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-600 leading-none">{badge}</span>}
      </div>
      <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={8} className={`text-sm resize-none leading-relaxed placeholder:text-slate-300 ${accent ? 'border-amber-200 bg-amber-50/20 focus-visible:ring-amber-400/30' : 'border-slate-200 bg-slate-50/40 focus-visible:ring-primary/20'}`} />
    </div>
  );
}

const EstimateGroups = forwardRef(function EstimateGroups({ estimate, onSave, saving, readOnlyDiscountType = false, isPreview = false, readOnly = false, currentUser, onDirty, pricingWarningsMap = {} }, ref) {
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
  const [scopeSummary, setScopeSummary] = useState(estimate?.scope_summary || '');
  const [assumptions, setAssumptions] = useState(estimate?.assumptions || '');
  const [changeRequestPolicy, setChangeRequestPolicy] = useState(estimate?.change_request_policy || '');
  const [includedScopeBullets, setIncludedScopeBullets] = useState(estimate?.included_scope_bullets || '');
  const [contingencyType, setContingencyType] = useState(estimate?.contingency_type || 'none');
  const [contingencyValue, setContingencyValue] = useState(estimate?.contingency_value || 0);
  const [showContingencyToClient, setShowContingencyToClient] = useState(estimate?.show_contingency_to_client || false);
  const [uncertaintyNote, setUncertaintyNote] = useState(estimate?.uncertainty_note || '');
  const [materials, setMaterials] = useState(() => normalizeMaterials(estimate?.materials || []));
  const [otherCosts, setOtherCosts] = useState(estimate?.other_costs || []);
  const showCost = true;
  const [showTerms, setShowTerms] = useState(false);
  const [fixedItemIds, setFixedItemIds] = useState(new Set());
  const { priceLog, addLog, clearLog } = usePriceAuditLog();

  const handleFieldAudit = ({ item, field, oldValue, newValue }) => {
    addLog({ item, field, oldValue, newValue, user: currentUser?.email || 'admin' });
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
    setScopeSummary(estimate.scope_summary || '');
    setAssumptions(estimate.assumptions || '');
    setChangeRequestPolicy(estimate.change_request_policy || '');
    setIncludedScopeBullets(estimate.included_scope_bullets || '');
    setContingencyType(estimate.contingency_type || 'none');
    setContingencyValue(estimate.contingency_value || 0);
    setShowContingencyToClient(estimate.show_contingency_to_client || false);
    setUncertaintyNote(estimate.uncertainty_note || '');
    setMaterials(normalizeMaterials(estimate.materials || []));
    setOtherCosts(estimate.other_costs || []);
  }, [estimate?.id]);

  // ── Hydration guard ──────────────────────────────────────────
  // After estimate.id changes (hydration / load), skip the first autosave cycle
  // so we don't persist immediately-after-hydration state back to the DB.
  const hydratedRef = useRef(false);
  useEffect(() => {
    hydratedRef.current = false;
  }, [estimate?.id]);

  useEffect(() => {
    // ── Hotfix: autosave guards ───────────────────────────────────────
    // 1. Lock guard: if estimate is legally locked or in preview, do NOT autosave.
    //    Visual read-only is not enough — we must also block the save call.
    if (isPreview || readOnly) return;
    // 2. Hydration guard: skip exactly one save cycle after estimate.id changes
    //    to avoid persisting hydration state on initial mount.
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
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
        scope_summary: scopeSummary,
        assumptions,
        change_request_policy: changeRequestPolicy,
        included_scope_bullets: includedScopeBullets,
        contingency_type: contingencyType,
        contingency_value: contingencyValue,
        contingency_amount: (() => {
          if (contingencyType === 'percent' && contingencyValue > 0) return parseFloat((result.total * contingencyValue / 100).toFixed(2));
          if (contingencyType === 'fixed' && contingencyValue > 0) return contingencyValue;
          return 0;
        })(),
        show_contingency_to_client: showContingencyToClient,
        uncertainty_note: uncertaintyNote,
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
  }, [groups, taxRate, discountType, discountValue, depositPercent, expirationDate, notes, internalNotes, exclusions, warrantyTerms, paymentTerms, legalTerms, scopeSummary, assumptions, changeRequestPolicy, includedScopeBullets, contingencyType, contingencyValue, showContingencyToClient, uncertaintyNote, materials, otherCosts]);

  const updateGroup = (updated) => setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
  const removeGroup = (id) => setGroups(prev => prev.filter(g => g.id !== id));
  const addGroup = () => setGroups(prev => [...prev, { id: uid(), name: 'New Group', collapsed: false, items: [] }]);
  const applyAllPricingFixes = () => {
    setGroups(prev => prev.map(group => ({
      ...group,
      items: (group.items || []).map(item => {
        const warning = pricingWarningsMap?.[item.id];
        if (!warning?.suggestedCatalogPrice) return item;
        const unitPrice = Number(warning.suggestedCatalogPrice);
        return {
          ...item,
          unit_price: unitPrice,
          line_total: calculateLineTotal(item.quantity, unitPrice),
        };
      }),
    })));
  };

  const { subtotal, discountAmount, taxAmount, total, depositAmount,
    totalCost, materialsCost, grossMargin, grossMarginPct,
    materialsSubtotal, servicesSubtotal,
    otherCostsTotal, netProfit, netProfitPct } = runEstimateEngine(groups, { taxRate, discountType, discountValue, depositPercent, materials, otherCosts });

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const lossItems = [];
  groups.forEach(g => (g.items || []).forEach(item => {
    const p = parseFloat(item.unit_price) || 0;
    const c = parseFloat(item.unit_cost) || 0;
    if (c > 0 && p > 0 && p < c) lossItems.push(item);
  }));

  const pricingWarningCount = Object.keys(pricingWarningsMap || {}).length;

  const riskData = !isPreview ? calculateRiskScore({ scopeSummary, assumptions, includedScopeBullets, contingencyType, contingencyValue, total, discountValue, discountType, materials }, groups, { grossMarginPct }) : null;

  useImperativeHandle(ref, () => ({
    applyAllPricingFixes
  }));

  return (
    <div className="w-full space-y-0 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="12" height="2" rx="1" fill="white" fillOpacity="0.8"/><rect x="1" y="5" width="8" height="2" rx="1" fill="white" fillOpacity="0.5"/><rect x="1" y="9" width="10" height="2" rx="1" fill="white" fillOpacity="0.5"/></svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Scope of Work</p>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 leading-tight">
              Services
              {isPreview && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Read-only</span>}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isPreview && pricingWarningCount > 0 && (
            <button onClick={applyAllPricingFixes} className="h-8 px-3 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
              Fix all pricing ({pricingWarningCount})
            </button>
          )}
          <LiveClock />
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Expires</span>
            {isPreview ? <span className="text-xs text-slate-600 font-medium h-7 flex items-center">{expirationDate || '—'}</span> : <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="h-7 text-xs w-36 shrink-0 border-slate-200 bg-white" />}
          </div>
        </div>
      </div>

      {!isPreview && lossItems.length > 0 && (
        <div className="bg-red-50/60 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-red-100 border border-red-300 flex items-center justify-center flex-shrink-0"><span className="text-[11px] leading-none font-bold text-red-600">!</span></div>
          <div className="flex-1 min-w-0"><span className="text-[11px] font-bold text-red-700">Loss Prevention · </span><span className="text-[11px] text-red-600">{lossItems.length} item{lossItems.length > 1 ? 's' : ''} priced below cost — review before sending.</span></div>
        </div>
      )}

      <div className="space-y-3 mb-3">
        {groups.map(group => (
          <WorkGroup key={group.id} group={group} onUpdate={updateGroup} onRemove={removeGroup} showCost={showCost} isOnly={groups.length === 1} fixedItemIds={fixedItemIds} onLogChange={handleFieldAudit} isPreview={isPreview} pricingWarningsMap={pricingWarningsMap} />
        ))}
      </div>

      {!isPreview && <button onClick={addGroup} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-primary border border-dashed border-slate-200 hover:border-primary/30 rounded-xl w-full py-2.5 justify-center transition-colors mb-5 bg-white/60 hover:bg-white"><Plus className="w-3.5 h-3.5" />Add work group</button>}
      <div className="mb-5"><MaterialsSection materials={materials} onChange={setMaterials} showCost={showCost} /></div>
      {!isPreview && <div className="mb-5"><OtherCostsSection otherCosts={otherCosts} onChange={setOtherCosts} /></div>}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-5" style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.04)' }}>
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Summary</p>
          {!isPreview && (() => {
            const marginStatus = grossMarginPct >= 60 ? { label: 'Good', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' } : grossMarginPct >= 40 ? { label: 'Warning', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' } : { label: 'Low margin', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' };
            return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${marginStatus.bg} ${marginStatus.text}`}><span className={`w-1.5 h-1.5 rounded-full ${marginStatus.dot}`} />{marginStatus.label} · {grossMarginPct.toFixed(1)}%</span>;
          })()}
        </div>

        <div className="flex gap-0 flex-wrap">
          {!isPreview && (() => {
            const marginStatus = grossMarginPct >= 60 ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' } : grossMarginPct >= 40 ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' } : { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
            return <div className="flex-1 min-w-[280px] px-6 py-5 border-r border-slate-100"><p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mb-3">🔒 Internal · Profit Analysis</p><div className="grid grid-cols-2 gap-2"><div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Services</p><p className="text-sm font-bold text-slate-800 tabular-nums">{fmt(servicesSubtotal)}</p></div>{materialsSubtotal > 0 && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-emerald-500 mb-1">Materials cost</p><p className="text-sm font-bold text-emerald-700 tabular-nums">{fmt(materialsCost)}</p></div>}{otherCostsTotal > 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-amber-500 mb-1">Other costs</p><p className="text-sm font-bold text-amber-700 tabular-nums">{fmt(otherCostsTotal)}</p></div>}<div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Total cost</p><p className="text-sm font-bold text-slate-700 tabular-nums">{fmt(totalCost)}</p></div><div className={`border rounded-lg px-3 py-2.5 col-span-2 ${marginStatus.bg} ${marginStatus.border}`}><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Gross profit</p><div className="flex items-baseline gap-2"><p className={`text-base font-bold tabular-nums ${marginStatus.text}`}>{fmt(grossMargin)}</p><p className={`text-[11px] font-bold tabular-nums ${marginStatus.text}`}>({grossMarginPct.toFixed(1)}%)</p></div></div></div></div>;
          })()}

          <div className="flex-shrink-0 w-80 px-6 py-5 space-y-2 text-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Client-Facing Total</p>
            <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Subtotal</span><span className="font-semibold text-slate-800 tabular-nums">{fmt(subtotal)}</span></div>
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Discount</span>
              {isPreview ? <span className="text-sm font-semibold text-slate-700 tabular-nums">{discountValue > 0 ? `${discountType === 'percent' ? discountValue + '%' : '$' + discountValue}` : '—'}</span> : <div className="flex items-center gap-1.5">{readOnlyDiscountType ? <div className="h-7 px-2 flex items-center text-xs text-slate-500 font-medium bg-slate-50 rounded border border-slate-200">{discountType === 'percent' ? '%' : '$'}</div> : <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="h-7 text-xs border border-slate-200 rounded px-2 bg-white text-slate-600"><option value="percent">%</option><option value="fixed">$</option></select>}<Input type="number" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} className="h-7 w-20 text-right text-sm border-slate-200" min={0} /></div>}
            </div>
            {discountAmount > 0 && <div className="flex justify-between text-xs text-slate-400"><span>Discount applied</span><span className="text-red-500 font-semibold tabular-nums">−{fmt(discountAmount)}</span></div>}
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Tax (%)</span>
              {isPreview ? <span className="text-sm font-semibold text-slate-700 tabular-nums">{taxRate > 0 ? `${taxRate}%` : '—'}</span> : <Input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="h-7 w-20 text-right text-sm border-slate-200" min={0} max={100} />}
            </div>
            {taxAmount > 0 && <div className="flex justify-between text-xs text-slate-400"><span>Tax ({taxRate}%)</span><span className="font-semibold tabular-nums">{fmt(taxAmount)}</span></div>}
            <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-slate-200"><span className="font-bold text-slate-900 text-base">Total</span><span className="font-bold text-primary tabular-nums" style={{ fontSize: '1.75rem', lineHeight: 1 }}>{fmt(total)}</span></div>
            <div className="flex items-center justify-between gap-3 pt-2"><span className="text-slate-500 text-xs">Deposit (%)</span>{isPreview ? <span className="text-sm font-semibold text-slate-700 tabular-nums">{depositPercent > 0 ? `${depositPercent}%` : '—'}</span> : <Input type="number" value={depositPercent} onChange={e => setDepositPercent(parseFloat(e.target.value) || 0)} className="h-7 w-20 text-right text-sm border-slate-200" min={0} max={100} />}</div>
            {depositAmount > 0 && <div className="flex justify-between text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-1"><span>Deposit due</span><span className="tabular-nums">{fmt(depositAmount)}</span></div>}
          </div>
        </div>
      </div>

      {!isPreview && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-5" style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.04)' }}>
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/60"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes & Terms</p></div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-5">
              <NotesSection label="Customer Notes" placeholder="Visible to client — scope overview, access instructions…" value={notes} onChange={setNotes} />
              <NotesSection label="Internal Notes" placeholder="Team only — not visible to customer…" value={internalNotes} onChange={setInternalNotes} accent badge="Internal only" />
              <NotesSection label="Exclusions" placeholder="What is NOT included in this estimate…" value={exclusions} onChange={setExclusions} />
              <NotesSection label="Payment Terms" placeholder="e.g. 50% deposit, balance on completion…" value={paymentTerms} onChange={setPaymentTerms} />
            </div>
            <div className="grid grid-cols-2 gap-5 mt-5 pt-5 border-t border-slate-100">
              <NotesSection label="Scope Summary" placeholder="High-level description of the full scope of work visible to the client…" value={scopeSummary} onChange={setScopeSummary} />
              <NotesSection label="Assumptions & Conditions" placeholder="Agreed project assumptions — site access, permits, materials provided by client…" value={assumptions} onChange={setAssumptions} />
              <NotesSection label="Change Request Policy" placeholder="How changes after approval are handled — process, pricing, written approval required…" value={changeRequestPolicy} onChange={setChangeRequestPolicy} />
              <NotesSection label="What's Included" placeholder="Each line = one bullet in the document — e.g. Labor and installation&#10;Cleanup and haul-away&#10;All materials listed above" value={includedScopeBullets} onChange={setIncludedScopeBullets} />
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Contingency & Uncertainty</label><span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-slate-50 border-slate-200 text-slate-400 leading-none">Optional</span></div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Type</label><select value={contingencyType} onChange={e => setContingencyType(e.target.value)} className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-700 font-medium focus:border-blue-400 focus:outline-none"><option value="none">None</option><option value="percent">Percent (%)</option><option value="fixed">Fixed ($)</option></select></div>
                    {contingencyType !== 'none' && <div className="flex flex-col gap-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{contingencyType === 'percent' ? 'Percentage' : 'Amount ($)'}</label><div className="relative flex items-center">{contingencyType === 'fixed' && <span className="absolute left-2 text-xs text-slate-400 pointer-events-none">$</span>}<Input type="number" min={0} step={contingencyType === 'percent' ? '0.1' : '0.01'} value={contingencyValue} onChange={e => setContingencyValue(parseFloat(e.target.value) || 0)} className={`h-8 w-28 text-sm border-slate-200 text-right ${contingencyType === 'fixed' ? 'pl-5' : ''}`} />{contingencyType === 'percent' && <span className="ml-1.5 text-xs text-slate-400">%</span>}</div></div>}
                  </div>
                  {contingencyType !== 'none' && contingencyValue > 0 && (() => {
                    const amt = contingencyType === 'percent' ? parseFloat(((total || 0) * contingencyValue / 100).toFixed(2)) : contingencyValue;
                    return <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">Contingency amount: <span className="font-bold text-slate-700">${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>;
                  })()}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600"><input type="checkbox" checked={showContingencyToClient} onChange={e => setShowContingencyToClient(e.target.checked)} className="rounded accent-primary" disabled={contingencyType === 'none'} />Show contingency line to client</label>
                </div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Uncertainty Note</label><Textarea value={uncertaintyNote} onChange={e => setUncertaintyNote(e.target.value)} placeholder="Optional client-visible note about project uncertainties or scope assumptions…" rows={4} className="text-sm resize-none border-slate-200 bg-slate-50/40 placeholder:text-slate-300 focus-visible:ring-primary/20" /></div>
              </div>
            </div>
            <button onClick={() => setShowTerms(v => !v)} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700 mt-5 transition-colors border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 bg-white">{showTerms ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}{showTerms ? 'Hide' : 'Show'} warranty & legal terms</button>
            {showTerms && <div className="grid grid-cols-2 gap-5 mt-5 pt-5 border-t border-slate-100"><NotesSection label="Warranty Terms" placeholder="e.g. 1-year labor warranty…" value={warrantyTerms} onChange={setWarrantyTerms} /><NotesSection label="Legal Terms" placeholder="Terms and conditions…" value={legalTerms} onChange={setLegalTerms} /></div>}
          </div>
        </div>
      )}

      {!isPreview && riskData && <div className="mt-5"><RiskScorePanel riskData={riskData} /></div>}
      {!isPreview && <div className="space-y-3 mt-2"><PriceAuditLog entries={priceLog} onClear={clearLog} />{estimate?.id && <EstimateAuditHistory estimateId={estimate.id} />}</div>}
    </div>
  );
});

export default EstimateGroups;