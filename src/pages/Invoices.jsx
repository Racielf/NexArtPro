import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { Receipt, Search, Send, CheckCircle, DollarSign, MapPin, Printer, ChevronRight } from 'lucide-react';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Invoice.list('-created_date');
    setInvoices(data);
    setLoading(false);
  };

  const handleSend = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { status: 'sent', sent_at: new Date().toISOString() });
    toast.success('Invoice marked as sent!');
    loadData();
  };

  const handleMarkPaid = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { status: 'paid', paid_at: new Date().toISOString(), amount_paid: inv.total });
    toast.success('Invoice marked as paid!');
    loadData();
  };

  const handlePrint = (inv) => {
    const content = `
      <html><head><title>Invoice #${inv.invoice_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#111}
        h1{color:#1a56db}table{width:100%;border-collapse:collapse;margin:20px 0}
        th{background:#1f2937;color:white;padding:10px;text-align:left}
        td{padding:10px;border-bottom:1px solid #eee}
        .total{font-size:18px;font-weight:bold;color:#1a56db}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div><h1>INVOICE</h1><p style="color:#666;font-size:20px">#${inv.invoice_number}</p></div>
        <div style="text-align:right"><strong style="color:#1a56db;font-size:20px">FSM Pro</strong></div>
      </div>
      <div class="grid">
        <div style="background:#f9fafb;padding:16px;border-radius:8px">
          <p style="color:#888;font-size:11px;text-transform:uppercase;font-weight:bold">Bill To</p>
          <p><strong>${inv.client_name}</strong></p>
          ${inv.client_address ? `<p>${inv.client_address}</p>` : ''}
          ${inv.client_phone ? `<p>${inv.client_phone}</p>` : ''}
          ${inv.client_email ? `<p>${inv.client_email}</p>` : ''}
        </div>
        <div style="background:#f9fafb;padding:16px;border-radius:8px">
          <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
          ${inv.due_date ? `<p>Due: <strong>${inv.due_date}</strong></p>` : ''}
          <p>Status: <strong>${inv.status?.toUpperCase()}</strong></p>
        </div>
      </div>
      <table>
        <thead><tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>
          ${(inv.line_items || []).map(item => `
            <tr>
              <td><strong>${item.name}</strong>${item.description ? `<br><small style="color:#666">${item.description}</small>` : ''}</td>
              <td>${item.quantity}</td>
              <td>$${(item.unit_price || 0).toFixed(2)}</td>
              <td>$${(item.total_price || 0).toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:20px">
        <p>Subtotal: $${(inv.subtotal || 0).toFixed(2)}</p>
        ${inv.tax_rate > 0 ? `<p>Tax (${inv.tax_rate}%): $${(inv.tax_amount || 0).toFixed(2)}</p>` : ''}
        <p class="total">TOTAL: $${(inv.total || 0).toFixed(2)}</p>
        ${inv.status === 'paid' ? `<p style="color:green;font-weight:bold">✓ PAID</p>` : ''}
      </div>
      ${inv.notes ? `<div style="margin-top:30px;border-top:1px solid #eee;padding-top:20px"><p style="color:#888;font-size:11px;font-weight:bold">NOTES</p><p>${inv.notes}</p></div>` : ''}
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(content);
    w.document.close();
    w.print();
  };

  const filtered = invoices.filter(i =>
    i.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(i.invoice_number).includes(search)
  );

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Invoices" subtitle={`${invoices.length} total`} />

      <div className="p-6 space-y-4 flex-1">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-xl font-bold text-green-600">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-orange-600">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inv => (
              <Card key={inv.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary">INV#{inv.invoice_number}</span>
                        <h3 className="font-semibold text-foreground">{inv.client_name}</h3>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {inv.client_address && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />{inv.client_address}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-foreground">
                          ${(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {inv.due_date && <span className="text-xs text-muted-foreground">Due: {inv.due_date}</span>}
                        {inv.paid_at && <span className="text-xs text-green-600">Paid {new Date(inv.paid_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handlePrint(inv)} title="Print">
                        <Printer className="w-4 h-4" />
                      </Button>
                      {inv.status === 'draft' && (
                        <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => handleSend(inv)}>
                          <Send className="w-3 h-3 mr-1" />Send
                        </Button>
                      )}
                      {inv.status === 'sent' && (
                        <Button size="sm" variant="outline" className="border-green-300 text-green-600 hover:bg-green-50" onClick={() => handleMarkPaid(inv)}>
                          <CheckCircle className="w-3 h-3 mr-1" />Mark Paid
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}