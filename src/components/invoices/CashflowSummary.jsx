import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, DollarSign, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CashflowSummary() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      const data = await base44.entities.Invoice.list('-created_date');
      setInvoices(data);
      setLoading(false);
    };
    loadInvoices();
  }, []);

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>;

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const totalOutstanding = totalInvoiced - totalCollected;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Total Invoiced</p>
            <p className="text-lg font-bold text-slate-900 truncate">
              ${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Collected</p>
            <p className="text-lg font-bold text-green-600 truncate">
              ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Outstanding</p>
            <p className="text-lg font-bold text-amber-600 truncate">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}