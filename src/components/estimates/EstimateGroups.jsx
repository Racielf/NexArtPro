/**
 * EstimateGroups — professional grouped line items engine.
 * Each group = a work category (e.g. Demolition, Plumbing, Flooring).
 * Auto-saves with debounce on every change.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  Pencil, Check, X, Eye, EyeOff, BookOpen, LayoutTemplate
} from 'lucide-react';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import PriceDisciplineGuard from '@/components/estimates/internal/PriceDisciplineGuard';
import PriceAuditLog from '@/components/estimates/internal/PriceAuditLog';
import { usePriceAuditLog } from '@/hooks/usePriceAuditLog';
import { calculateLineTotal, calculateVariance, runEstimateEngine, suggestPriceFromCost, getNegotiationMeta } from '@/lib/estimateEngine';
import { logChange } from '@/lib/estimateAuditLog';
import EstimateAuditHistory from '@/components/estimates/internal/EstimateAuditHistory';

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

const UNITS = ['ea', 'hr', 'sq ft', 'ln ft', 'day', 'lump sum', 'ton', 'gal', 'room', 'window', 'door', 'bag', 'box', 'gal'];

// calcTotals is now delegated to estimateEngine.js (Decimal.js-backed pure functions)

// ─── Single Line Item Row ──────────────────────────────────────────────────────
function LineItemRow({ item, onUpdate, onRemove, showCost, isFixed = false, onLogChange }) {
  const [expanded, setExpanded] = useState(!item.service_name);
  // Track "committed" values for onBlur diffing (price + cost only)
  const committedRef = React.useRef({ unit_price: item.unit_price, unit_cost: item.unit_cost });

  const update = (field, value) => {
    const updated = { ...item, [field]: value };
    // Always recalculate line_total using the decimal engine to avoid float errors
    updated.line_total = calculateLineTotal(
      field === 'quantity'   ? value : updated.quantity,
      field === 'unit_price' ? value : updated.unit_price
    );
    onUpdate(updated);
  };

  // Called on onBlur of price/cost — logs only if value actually changed
  const handlePriceBlur = async (field) => {
    const oldValue = committedRef.current[field];
    const newValue = item[field];
    if (oldValue !== newValue) {
      if (onLogChange) {
        onLogChange({ item, field, oldValue, newValue });
      }
    }
    committedRef.current[field] = newValue;
  };

  return (
    <div className={`border-b border-slate-100 last:border-0 transition-colors ${isFixed ? 'bg-emerald-50/60 ring-1 ring-inset ring-emerald-300' : expanded ? 'bg-blue-50/20' : 'hover:bg-slate-50/60'}`}>
      {/* Main row — grid: grip | service(2fr) | qty(55px) | unit(80px) | price(110px) | book(80px) | [cost] | total(110px) | remove */}
      <div className="grid items-center gap-2 px-4 py-2.5"
        style={{ gridTemplateColumns: '20px 2fr 55px 80px 110px 80px 1fr 110px 28px' }}>

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

        {/* Qty — standalone, prominent */}
        <Input
          type="number" value={item.quantity} onChange={e => update('quantity', e.target.value)}
          className="h-8 text-sm text-center border-slate-200 font-semibold px-1 w-full" min={0}
        />

        {/* Unit of Measure — standalone, readable */}
        <select value={item.unit} onChange={e => update('unit', e.target.value)}
          className="h-8 text-[11px] border border-slate-200 rounded px-1.5 bg-white text-slate-600 w-full font-medium">
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        {/* Price — primary editable field + variance badge + smart price suggestions */}
        {(() => {
          const book         = parseFloat(item.book_price) || 0;
          const real         = parseFloat(item.unit_price) || 0;
          const cost         = parseFloat(item.unit_cost)  || 0;
          const autoSuggest  = suggestPriceFromCost(cost, 0.30);
          const negMeta      = getNegotiationMeta(cost, real);
          const diff         = real - book;
          const isAtBook = book > 0 && Math.abs(diff) < 0.01;
          const isLow  = book > 0 && diff < -0.001;
          const isHigh = book > 0 && diff > 0.001;
          const isOk   = book > 0 && !isLow && !isHigh;

          let greenColor = 'text-slate-400';
          if (book > 0) {
            const markupPct = (diff / book) * 100;
            if (markupPct >= 20) greenColor = 'text-emerald-900';
            else if (markupPct >= 15) greenColor = 'text-emerald-800';
            else if (markupPct >= 10) greenColor = 'text-emerald-700';
            else if (markupPct >= 5) greenColor = 'text-emerald-600';
            else if (markupPct > 0) greenColor = 'text-emerald-500';
            else greenColor = 'text-slate-400';
          }

          // Smart price suggestions (admin-only, only when book_price exists)
          const MARGINS = [0.10, 0.20, 0.30];
          const suggested = MARGINS.map(m => ({
            label: `+${m * 100}%`,
            price: parseFloat((book * (1 + m)).toFixed(2)),
            margin: m,
          }));

          return (
            <div className="flex flex-col gap-0.5">
              <div className="relative flex items-center gap-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                <Input
                  type="number" step="0.01" value={item.unit_price}
                  onChange={e => update('unit_price', e.target.value)}
                  onBlur={() => handlePriceBlur('unit_price')}
                  className={`h-8 pl-4 pr-7 text-sm text-right font-semibold border-slate-200 ${
                    negMeta.status === 'critical' ? 'border-red-400 bg-red-50/60 text-red-700' :
                    isLow ? 'border-red-300 bg-red-50/50 text-red-700' : 'text-slate-900'
                  }`}
                  min={0}
                />
                {/* ⚡ Auto-price button — internal only, never in PDF */}
                {autoSuggest > 0 && (
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
              {/* ── Negotiation Helper — internal only, never in PDF/client ── */}
              {negMeta.status !== 'none' && (() => {
                const { margin, suggested, floor, status } = negMeta;
                const statusIcon =
                  status === 'healthy'  ? <span style={{ color: '#10b981', fontSize: 10 }}>✔</span> :
                  status === 'warning'  ? <span style={{ color: '#f59e0b', fontSize: 10 }}>⚠</span> :
                                          <span style={{ color: '#ef4444', fontSize: 10 }}>✗</span>;
                const marginColor =
                  status === 'healthy' ? '#10b981' :
                  status === 'warning' ? '#d97706' : '#ef4444';

                return (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 2,
                    padding: '4px 6px', borderRadius: 6, marginTop: 2,
                    background: status === 'critical' ? 'rgba(239,68,68,0.06)' : status === 'warning' ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid ${status === 'critical' ? 'rgba(239,68,68,0.2)' : status === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  }}>
                    {/* Margin row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {statusIcon}
                      <span style={{ fontSize: 9, fontWeight: 700, color: marginColor }}>
                        {margin !== null ? `${margin.toFixed(1)}% margin` : '—'}
                      </span>
                    </div>
                    {/* Suggested & floor prices */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 9, color: '#64748b' }}>
                        Suggested (30%): <strong style={{ color: '#10b981' }}>${suggested.toFixed(2)}</strong>
                      </span>
                      <span style={{ fontSize: 9, color: '#64748b' }}>
                        Min (20%): <strong style={{ color: '#f59e0b' }}>${floor.toFixed(2)}</strong>
                      </span>
                    </div>
                    {/* Critical warning */}
                    {status === 'critical' && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#b91c1c' }}>
                        Below minimum margin (20%)
                      </span>
                    )}
                  </div>
                );
              })()}
              
              {book > 0 && (() => {
                const pct = (diff / book) * 100;
                const isDanger  = pct < -15;
                const isWarning = pct < 0 && pct >= -15;
                const isGreen   = pct >= 0;
                const dotColor  = isDanger ? 'bg-red-500 shadow-red-400' : isWarning ? 'bg-amber-400 shadow-amber-300' : 'bg-emerald-500 shadow-emerald-300';
                const textColor = isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600';
                const bgColor   = isDanger ? 'bg-red-50 border-red-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
                const label     = isDanger  ? `Critical ${pct.toFixed(1)}%`
                                : isWarning ? `−${Math.abs(pct).toFixed(1)}% disc`
                                : isGreen && diff > 0 ? `+${pct.toFixed(1)}%`
                                : '✓ at book';
                return (
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full border ${bgColor} ${textColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm ${dotColor}`} />
                    {label}
                  </span>
                );
              })()}
              {/* ── Smart Price Suggestions + Reset — ADMIN ONLY ── */}
              {book > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                  {suggested.map(s => (
                    <button
                      key={s.margin}
                      type="button"
                      onClick={() => update('unit_price', s.price)}
                      title={`Set to $${s.price} (${s.label} over book)`}
                      className={`text-[9px] px-1 py-0.5 rounded border transition-colors leading-none font-semibold
                        ${real === s.price
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-primary/40 hover:text-primary'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  {/* Reset to book price */}
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
              )}
            </div>
          );
        })()}

        {/* Book Price — secondary reference, properly styled */}
        {(() => {
          const book = parseFloat(item.book_price) || 0;
          return (
            <div className="flex items-center justify-end h-8 px-2 rounded border border-slate-100 bg-slate-50/40 text-right">
              {book > 0 ? (
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] text-slate-600 font-semibold">${book.toFixed(2)}</div>
                  <div className="text-[9px] text-slate-400 leading-none">ref</div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-300 font-medium italic">no ref</div>
              )}
            </div>
          );
        })()}

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

      {/* ── INTERNAL PRICE AUDIT LOG — session-only, never in PDF/preview/send ── */}
      <PriceAuditLog entries={priceLog} onClear={clearLog} />

      {/* ── INTERNAL AUDIT HISTORY — persistent audit trail from EstimateVersionHistory ── */}
      {estimate?.id && <EstimateAuditHistory estimateId={estimate.id} />}

    </div>
    );
    }

    export default EstimateGroups;