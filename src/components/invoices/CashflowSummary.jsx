import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, DollarSign, Clock, AlertTriangle, Zap } from 'lucide-react';
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

  // Get all metrics using pure derivation
  const metrics = getInvoiceDashboardMetrics(invoices);
  const overdueInvoices = invoices.filter(i => isInvoiceOverdue(i));

  return (
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
  );
}