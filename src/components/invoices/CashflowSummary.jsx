import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, DollarSign, Clock, AlertTriangle, Zap, HandCoins, ShieldAlert, HelpCircle, Banknote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { computeInvoiceDerivedFields, isInvoiceOverdue } from '@/lib/invoiceHelpers';
import { getInvoiceDashboardMetrics } from '@/lib/invoiceDashboardMetrics';
import { filterActiveRecords } from '@/lib/softDelete';

export default function CashflowSummary() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      const data = await base44.entities.Invoice.list('-created_date');
      setInvoices(filterActiveRecords(data));
      setLoading(false);
    };
    loadInvoices();
  }, []);

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;

  const metrics = getInvoiceDashboardMetrics(invoices);
  const fmt = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  const arBreakdown = [
    { key: 'collectable', label: 'Cobrable',   value: metrics.total_collectable, color: 'text-blue-600',   dot: 'bg-blue-500' },
    { key: 'promised',    label: 'Prometido',  value: metrics.total_promised,    color: 'text-emerald-600', dot: 'bg-emerald-500' },
    { key: 'in_review',   label: 'En revisión', value: metrics.total_in_review,   color: 'text-amber-600',  dot: 'bg-amber-400' },
    { key: 'at_risk',     label: 'En riesgo',  value: metrics.total_at_risk,     color: 'text-red-600',    dot: 'bg-red-500' },
  ];

  return (
    <div className="space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {/* Total Invoiced */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Total Invoiced</p>
            <p className="text-lg font-bold text-slate-900 truncate">
              ${metrics.total_invoiced.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Collected */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Collected</p>
            <p className="text-lg font-bold text-green-600 truncate">
              ${metrics.total_collected.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Outstanding</p>
            <p className="text-lg font-bold text-amber-600 truncate">
              ${metrics.total_outstanding.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overdue (Risk) */}
      <Card className={metrics.total_overdue > 0 ? 'border-red-200 bg-red-50/30' : ''}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            metrics.total_overdue > 0 ? 'bg-red-100' : 'bg-slate-100'
          }`}>
            {metrics.total_overdue > 0 ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <Zap className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Overdue</p>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-lg font-bold truncate ${metrics.total_overdue > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                ${metrics.total_overdue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
              {metrics.overdue_invoice_count > 0 && (
                <span className="text-xs text-red-600 font-semibold">({metrics.overdue_invoice_count})</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Cash-In Forecast */}
    {metrics.total_outstanding > 0 && (
      <div className="bg-white border border-border rounded-xl px-5 py-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
          Flujo esperado — Estimado de cobro
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          <div className="flex items-center gap-2 min-w-[160px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
            <span className="text-xs text-muted-foreground w-28">Próximos 3 días</span>
            <span className={`text-xs font-bold ${metrics.expected_immediate > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
              {fmt(metrics.expected_immediate)}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-[160px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-400" />
            <span className="text-xs text-muted-foreground w-28">Próximos 10 días</span>
            <span className={`text-xs font-bold ${metrics.expected_short_term > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
              {fmt(metrics.expected_short_term)}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-[160px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-300" />
            <span className="text-xs text-muted-foreground w-28">Sin fecha estimada</span>
            <span className={`text-xs font-bold ${metrics.expected_uncertain > 0 ? 'text-slate-500' : 'text-slate-300'}`}>
              {fmt(metrics.expected_uncertain)}
            </span>
          </div>
        </div>
      </div>
    )}

    {/* A/R Classification Breakdown */}
    {metrics.total_outstanding > 0 && (
      <div className="bg-white border border-border rounded-xl px-5 py-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
          Clasificación A/R — Saldo pendiente
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          {arBreakdown.map(({ key, label, value, color, dot }) => (
            <div key={key} className="flex items-center gap-2 min-w-[140px]">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-xs text-muted-foreground w-24">{label}</span>
              <span className={`text-xs font-bold ${value > 0 ? color : 'text-slate-300'}`}>
                {fmt(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}