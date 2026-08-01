import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SmartServicePicker from '@/components/shared/services/SmartServicePicker';
import {
  normalizeLineItem,
  normalizeMaterials,
  resolveAndNormalizeGroups,
  sanitizeMaterialForPersistence,
} from '@/lib/lineItemNormalizer';
import { calculateLineTotal, runEstimateEngine } from '@/lib/estimateEngine';
import { persistNewServiceToCatalog } from '@/lib/persistNewService';
import { resolvePickedUnit } from '@/lib/uomNormalize';
import { ORGANIC, organicHeadingStyle } from '@/components/estimates/estimatePipelineTheme';
import { useLanguage } from '@/lib/i18n';

const uid = () => Math.random().toString(36).slice(2, 10);
const DEFAULT_GROUP = { id: 'general', name: 'General', collapsed: false, items: [] };
const money = (value) => `$${(Number(value) || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function emptyService() {
  return normalizeLineItem({
    id: uid(),
    service_name: '',
    description: '',
    quantity: 1,
    unit: 'ea',
    unit_price: 0,
    unit_cost: 0,
    line_total: 0,
  });
}

function emptyMaterial() {
  return {
    id: uid(),
    name: '',
    description: '',
    quantity: 1,
    unit: 'ea',
    unit_price: 0,
    unit_cost: 0,
    line_total: 0,
  };
}

function PipelineServiceRow({ item, onUpdate, onRemove, readOnly, t }) {
  const update = (field, rawValue) => {
    const numeric = ['quantity', 'unit_price', 'unit_cost'].includes(field);
    const value = numeric ? (parseFloat(rawValue) || 0) : rawValue;
    const next = { ...item, [field]: value };
    if (field === 'unit_price') {
      const cost = Number(next.unit_cost) || 0;
      next.markup_pct = cost > 0 ? Number((((value - cost) / cost) * 100).toFixed(2)) : 0;
      next.markup_override = true;
    }
    next.line_total = calculateLineTotal(next.quantity, next.unit_price);
    onUpdate(next);
  };

  const selectService = (picked) => {
    if (!picked?.name) return;
    const unitPrice = Number(picked.unit_price) || 0;
    const unitCost = Number(picked.unit_cost) || 0;
    const unit = resolvePickedUnit(picked.unit, item.unit, 'ea');
    const next = normalizeLineItem({
      ...item,
      service_id: picked.service_id || null,
      service_name: picked.name,
      description: picked.description || item.description || '',
      category: picked.category || item.category || 'Misc',
      unit,
      unit_price: unitPrice,
      unit_cost: unitCost,
      book_price: picked.book_price ?? picked.unit_price ?? 0,
      markup_pct: unitCost > 0 ? Number((((unitPrice - unitCost) / unitCost) * 100).toFixed(2)) : 0,
      markup_override: false,
      line_total: calculateLineTotal(item.quantity, unitPrice),
    });
    onUpdate(next);
    if (picked._is_new && picked.source === 'custom') {
      persistNewServiceToCatalog({
        service_name: picked.name,
        category: picked.category || 'Misc',
        unit,
        description: picked.description || '',
        unit_price: unitPrice,
        unit_cost: unitCost,
      }).then((result) => {
        if (result?.service_id && !next.service_id) onUpdate({ ...next, service_id: result.service_id });
      });
    }
  };

  return (
    <div className="grid items-center gap-3 py-3 border-b" style={{ gridTemplateColumns: 'minmax(220px,1fr) 56px 78px 96px 28px', borderColor: ORGANIC.divider }}>
      <div className="min-w-0">
        {readOnly ? (
          <div>
            <p className="text-[14.5px] font-semibold truncate" style={{ color: ORGANIC.ink900 }}>{item.service_name || t('estimate.document.service')}</p>
            {item.description && <p className="text-xs mt-0.5 truncate" style={{ color: ORGANIC.ink400 }}>{item.description}</p>}
          </div>
        ) : (
          <SmartServicePicker
            value={item.service_name || ''}
            onChange={(value) => update('service_name', value)}
            onSelect={selectService}
            placeholder={t('estimate.document.searchService')}
            className="w-full border-0 bg-transparent p-0 h-8 text-[14.5px] font-semibold focus:ring-0 focus:outline-none"
          />
        )}
      </div>
      {readOnly ? (
        <span className="text-[13.5px] text-center" style={{ color: ORGANIC.ink500 }}>{item.quantity}×</span>
      ) : (
        <input type="number" min="0" value={item.quantity} onChange={(event) => update('quantity', event.target.value)} className="w-full h-8 rounded-full border bg-transparent px-2 text-center text-[13px]" style={{ borderColor: ORGANIC.divider }} />
      )}
      {readOnly ? (
        <span className="text-[13px] text-right" style={{ color: ORGANIC.ink500 }}>{money(item.unit_price)}</span>
      ) : (
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: ORGANIC.ink400 }}>$</span>
          <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => update('unit_price', event.target.value)} className="w-full h-8 rounded-full border bg-transparent pl-5 pr-2 text-right text-[13px]" style={{ borderColor: ORGANIC.divider }} />
        </div>
      )}
      <span className="text-[14px] font-semibold text-right tabular-nums" style={{ color: ORGANIC.ink900 }}>{money(item.line_total)}</span>
      {!readOnly ? (
        <button type="button" onClick={onRemove} className="w-7 h-7 rounded-full grid place-items-center" style={{ color: ORGANIC.ink400 }} title={t('estimate.document.deleteService')}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : <span />}
    </div>
  );
}

function PipelineMaterialRow({ item, onUpdate, onRemove, readOnly, t }) {
  const update = (field, rawValue) => {
    const numeric = ['quantity', 'unit_price', 'unit_cost'].includes(field);
    const value = numeric ? (parseFloat(rawValue) || 0) : rawValue;
    const next = { ...item, [field]: value };
    next.line_total = calculateLineTotal(next.quantity, next.unit_price);
    onUpdate(next);
  };

  return (
    <div className="grid items-center gap-3 py-3 border-b" style={{ gridTemplateColumns: 'minmax(220px,1fr) 56px 78px 96px 28px', borderColor: ORGANIC.divider }}>
      {readOnly ? (
        <p className="text-[14.5px] font-semibold truncate" style={{ color: ORGANIC.ink900 }}>{item.name || t('estimate.document.material')}</p>
      ) : (
        <input value={item.name || ''} onChange={(event) => update('name', event.target.value)} placeholder={t('estimate.document.materialName')} className="w-full h-8 border-0 bg-transparent p-0 text-[14.5px] font-semibold focus:outline-none" />
      )}
      {readOnly ? (
        <span className="text-[13.5px] text-center" style={{ color: ORGANIC.ink500 }}>{item.quantity}×</span>
      ) : (
        <input type="number" min="0" value={item.quantity} onChange={(event) => update('quantity', event.target.value)} className="w-full h-8 rounded-full border bg-transparent px-2 text-center text-[13px]" style={{ borderColor: ORGANIC.divider }} />
      )}
      {readOnly ? (
        <span className="text-[13px] text-right" style={{ color: ORGANIC.ink500 }}>{money(item.unit_price)}</span>
      ) : (
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: ORGANIC.ink400 }}>$</span>
          <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => update('unit_price', event.target.value)} className="w-full h-8 rounded-full border bg-transparent pl-5 pr-2 text-right text-[13px]" style={{ borderColor: ORGANIC.divider }} />
        </div>
      )}
      <span className="text-[14px] font-semibold text-right tabular-nums" style={{ color: ORGANIC.ink900 }}>{money(item.line_total)}</span>
      {!readOnly ? (
        <button type="button" onClick={onRemove} className="w-7 h-7 rounded-full grid place-items-center" style={{ color: ORGANIC.ink400 }} title={t('estimate.document.deleteMaterial')}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : <span />}
    </div>
  );
}

const EstimatePipelineDocument = forwardRef(function EstimatePipelineDocument({
  estimate,
  onSave,
  isPreview = false,
  onDirty,
  onTotalsChange,
  pricingWarningsMap = {},
}, ref) {
  const { t } = useLanguage();
  const initialGroups = resolveAndNormalizeGroups(estimate);
  const [groups, setGroups] = useState(initialGroups.length ? initialGroups : [{ ...DEFAULT_GROUP, id: uid() }]);
  const [materials, setMaterials] = useState(() => normalizeMaterials(estimate?.materials || []));
  const [otherCosts] = useState(estimate?.other_costs || []);
  const [taxRate, setTaxRate] = useState(Number(estimate?.tax_rate) || 0);
  const [discountType, setDiscountType] = useState(estimate?.discount_type || 'percent');
  const [discountValue, setDiscountValue] = useState(Number(estimate?.discount_value) || 0);
  const [depositPercent, setDepositPercent] = useState(Number(estimate?.deposit_percent) || 0);
  const [expirationDate, setExpirationDate] = useState(estimate?.expiration_date || '');
  const mountedRef = useRef(false);

  const billMaterialsToClient = estimate?.document_config?.billMaterialsToClient !== false;
  const billOtherCostsToClient = estimate?.document_config?.billOtherCostsToClient === true;
  const result = runEstimateEngine(groups, {
    taxRate,
    discountType,
    discountValue,
    depositPercent,
    materials,
    otherCosts,
    billMaterialsToClient,
    billOtherCostsToClient,
  });

  useEffect(() => {
    const resolved = resolveAndNormalizeGroups(estimate);
    setGroups(resolved.length ? resolved : [{ ...DEFAULT_GROUP, id: uid() }]);
    setMaterials(normalizeMaterials(estimate?.materials || []));
    setTaxRate(Number(estimate?.tax_rate) || 0);
    setDiscountType(estimate?.discount_type || 'percent');
    setDiscountValue(Number(estimate?.discount_value) || 0);
    setDepositPercent(Number(estimate?.deposit_percent) || 0);
    setExpirationDate(estimate?.expiration_date || '');
    mountedRef.current = false;
  }, [estimate?.id]);

  const persistableGroups = result.groups.map((group) => ({
    ...group,
    items: (group.items || []).filter((item) => String(item.service_name || item.name || '').trim()),
  }));
  const persistableMaterials = result.materials.filter((item) => String(item.name || '').trim());

  const buildPayload = () => ({
    ...estimate,
    groups: persistableGroups,
    materials: persistableMaterials.map(sanitizeMaterialForPersistence),
    materials_subtotal: result.materialsSubtotal,
    other_costs: otherCosts,
    other_costs_total: result.otherCostsTotal,
    tax_rate: taxRate,
    discount_type: discountType,
    discount_value: discountValue,
    deposit_percent: depositPercent,
    expiration_date: expirationDate,
    subtotal: result.subtotal,
    discount_amount: result.discountAmount,
    tax_amount: result.taxAmount,
    total: result.total,
    deposit_amount: result.depositAmount,
    total_cost: result.totalCost,
    service_cost: result.serviceCost,
    materials_cost: result.materialsCost,
    net_profit: result.netProfit,
    net_profit_pct: result.netProfitPct,
    gross_margin: result.grossMargin,
    gross_margin_pct: result.grossMarginPct,
  });

  useEffect(() => {
    onTotalsChange?.({
      subtotal: result.subtotal,
      total: result.total,
      totalCost: result.totalCost,
      netProfit: result.netProfit,
      netProfitPct: result.netProfitPct,
      depositAmount: result.depositAmount,
      taxRate,
      discountType,
      discountValue,
      depositPercent,
      expirationDate,
    });
  }, [result.subtotal, result.total, result.totalCost, result.netProfit, result.netProfitPct, result.depositAmount, taxRate, discountType, discountValue, depositPercent, expirationDate]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return undefined;
    }
    onDirty?.();
    const timer = setTimeout(() => onSave(buildPayload()), 800);
    return () => clearTimeout(timer);
  }, [groups, materials, taxRate, discountType, discountValue, depositPercent, expirationDate]);

  const addService = () => setGroups((current) => {
    if (!current.length) return [{ ...DEFAULT_GROUP, id: uid(), items: [emptyService()] }];
    const lastIndex = current.length - 1;
    return current.map((group, index) => index === lastIndex ? { ...group, items: [...(group.items || []), emptyService()] } : group);
  });

  const updateService = (groupId, updatedItem) => setGroups((current) => current.map((group) => group.id === groupId
    ? { ...group, items: (group.items || []).map((item) => item.id === updatedItem.id ? updatedItem : item) }
    : group));

  const removeService = (groupId, itemId) => setGroups((current) => current.map((group) => group.id === groupId
    ? { ...group, items: (group.items || []).filter((item) => item.id !== itemId) }
    : group));

  const addMaterial = () => setMaterials((current) => [...current, emptyMaterial()]);
  const updateMaterial = (updated) => setMaterials((current) => current.map((item) => item.id === updated.id ? updated : item));
  const removeMaterial = (id) => setMaterials((current) => current.filter((item) => item.id !== id));

  const applyAllPricingFixes = () => setGroups((current) => current.map((group) => ({
    ...group,
    items: (group.items || []).map((item) => {
      const warning = pricingWarningsMap?.[item.id];
      if (!warning?.suggestedCatalogPrice) return item;
      const unitPrice = Number(warning.suggestedCatalogPrice) || 0;
      return { ...item, unit_price: unitPrice, line_total: calculateLineTotal(item.quantity, unitPrice) };
    }),
  })));

  useImperativeHandle(ref, () => ({
    flushSave: () => onSave(buildPayload()),
    applyAllPricingFixes,
    setPricingSettings: (patch) => {
      if ('taxRate' in patch) setTaxRate(Number(patch.taxRate) || 0);
      if ('discountType' in patch) setDiscountType(patch.discountType || 'percent');
      if ('discountValue' in patch) setDiscountValue(Number(patch.discountValue) || 0);
      if ('depositPercent' in patch) setDepositPercent(Number(patch.depositPercent) || 0);
      if ('expirationDate' in patch) setExpirationDate(patch.expirationDate || '');
    },
  }));

  const serviceCount = groups.reduce((total, group) => total + (group.items || []).length, 0);
  const totalItems = serviceCount + materials.length;

  return (
    <section className="p-6" style={{ background: ORGANIC.surface, borderRadius: ORGANIC.radiusLg, boxShadow: ORGANIC.shadowSm }}>
      <div className="flex items-center gap-3">
        <h2 className="text-[22px] flex-1" style={{ ...organicHeadingStyle, color: ORGANIC.ink900 }}>{t('estimate.document.items')}</h2>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <span className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ background: ORGANIC.neutral200 }}>
          <span className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold text-white" style={{ background: ORGANIC.accent }}>{(estimate?.client_name || 'C').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
          <span className="text-[13px] font-semibold" style={{ color: ORGANIC.ink900 }}>{estimate?.client_name || 'Cliente'}</span>
        </span>
      </div>

      <div className="flex items-baseline gap-3 mt-6 pb-2 border-b" style={{ borderColor: ORGANIC.divider }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: ORGANIC.ink700 }}>{t('estimate.document.services')}</span>
      </div>

      {groups.map((group) => (
        <div key={group.id}>
          {groups.length > 1 && <p className="mt-3 text-xs font-bold" style={{ color: ORGANIC.ink500 }}>{group.name}</p>}
          {(group.items || []).map((item) => (
            <PipelineServiceRow key={item.id} item={item} readOnly={isPreview} t={t} onUpdate={(updated) => updateService(group.id, updated)} onRemove={() => removeService(group.id, item.id)} />
          ))}
        </div>
      ))}
      {!isPreview && (
        <button type="button" onClick={addService} className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold" style={{ color: ORGANIC.accent700 }}><Plus className="w-4 h-4" />{t('estimate.document.addService')}</button>
      )}

      <div className="flex items-baseline gap-3 mt-5 pb-2 border-b" style={{ borderColor: ORGANIC.divider }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: ORGANIC.ink700 }}>{t('estimate.document.materials')}</span>
      </div>
      {materials.map((item) => (
        <PipelineMaterialRow key={item.id} item={item} readOnly={isPreview} t={t} onUpdate={updateMaterial} onRemove={() => removeMaterial(item.id)} />
      ))}
      {!isPreview && (
        <button type="button" onClick={addMaterial} className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold" style={{ color: ORGANIC.accent700 }}><Plus className="w-4 h-4" />{t('estimate.document.addMaterial')}</button>
      )}

      <div className="mt-5">
        <div className="flex items-center py-3 border-t text-[14px]" style={{ borderColor: ORGANIC.divider }}><span className="flex-1">{t('estimate.document.subtotal')}</span><strong>{money(result.subtotal)}</strong></div>
        {result.discountAmount > 0 && <div className="flex items-center py-3 border-t text-[14px]" style={{ borderColor: ORGANIC.divider }}><span className="flex-1">{t('estimate.document.discount')}</span><strong>−{money(result.discountAmount)}</strong></div>}
        <div className="flex items-center py-3 border-t text-[14px]" style={{ borderColor: ORGANIC.divider }}><div className="flex-1"><p>{t('estimate.document.tax')}</p><p className="text-[11px]" style={{ color: ORGANIC.ink400 }}>{taxRate.toFixed(2)}%</p></div><strong>{money(result.taxAmount)}</strong></div>
        <div className="flex items-center pt-4 border-t-2" style={{ borderColor: ORGANIC.neutral300 }}><span className="flex-1 text-[20px]" style={organicHeadingStyle}>{t('estimate.document.total')}</span><strong className="text-[24px]" style={organicHeadingStyle}>{money(result.total)}</strong></div>
      </div>

      <div className="mt-6 rounded-2xl overflow-hidden border" style={{ borderColor: ORGANIC.divider }}>
        <div className="grid gap-3 px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ gridTemplateColumns: '1fr 150px 140px', background: ORGANIC.neutral200, color: ORGANIC.ink700 }}>
          <span>{t('estimate.document.costBreakdown')}</span><span className="text-right">{t('estimate.document.totalCost')}</span><span className="text-right">{t('estimate.document.profitLoss')}</span>
        </div>
        <div className="grid gap-3 px-4 py-4 text-[13.5px]" style={{ gridTemplateColumns: '1fr 150px 140px' }}>
          <span style={{ color: ORGANIC.ink400 }}>{t('estimate.document.counts', { services: serviceCount, materials: materials.length })}</span>
          <strong className="text-right">{money(result.totalCost)}</strong>
          <strong className="text-right" style={{ color: result.netProfitPct >= 0 ? ORGANIC.olive700 : ORGANIC.danger }}>{result.netProfitPct.toFixed(2)}%</strong>
        </div>
      </div>

      {totalItems === 0 && <p className="mt-4 text-center text-xs" style={{ color: ORGANIC.ink300 }}>{t('estimate.document.empty')}</p>}
    </section>
  );
});

export default EstimatePipelineDocument;
