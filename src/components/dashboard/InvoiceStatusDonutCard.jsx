import React from 'react';
import { ReceiptText } from 'lucide-react';
import { Card } from './DashboardPrimitives';
import DonutStat from './DonutStat';

const STATUS_META = {
  paid:    { label: 'Paid',    color: '#16a34a' },
  partial: { label: 'Partial', color: '#df6b2a' },
  sent:    { label: 'Sent',    color: '#2563eb' },
  overdue: { label: 'Overdue', color: '#dc2626' },
  draft:   { label: 'Draft',   color: '#94a3b8' },
};

export default function InvoiceStatusDonutCard({ invoices = [], loading }) {
  const counts = invoices.reduce((acc, inv) => {
    const key = STATUS_META[inv.status] ? inv.status : 'draft';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const data = Object.keys(STATUS_META)
    .filter(k => counts[k] > 0)
    .map(k => ({ label: STATUS_META[k].label, value: counts[k], color: STATUS_META[k].color }));

  return (
    <Card title="Estado de Facturas" icon={ReceiptText} link="/invoices" linkLabel="Ver →" className="h-full">
      <div className="p-4 flex items-center h-full">
        <DonutStat data={data} centerValue={invoices.length} centerLabel="Facturas" loading={loading} />
      </div>
    </Card>
  );
}
