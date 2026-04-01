import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EstimatePreview from '@/components/estimates/EstimatePreview';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Trash2, Pencil, Send, CheckCircle,
  XCircle, Printer, Download, ClipboardList, Receipt,
  Search, GripVertical, X, Calendar
} from 'lucide-react';
import { logComm, logCommFailed } from '@/lib/commTracking';

const emptyItem = () => ({ id: Date.now(), name: '', description: '', quantity: 1, unit_price: 0, unit_cost: 0, total_price: 0 });

const emptyForm = {
  client_name: '', client_email: '', client_phone: '', client_address: '',
  expiration_date: '', title: '', notes: '', internal_notes: '',
  assigned_to: '', tax_rate: 0, line_items: [emptyItem()]
};

export default function Estimates() {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [finishEstimate, setFinishEstimate] = useState(null);
  const [finishDate, setFinishDate] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [finishNotify, setFinishNotify] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingEstimate, setViewingEstimate] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    loadData();
    // Check URL params for pre-filling from appointment
    const p = new URLSearchParams(window.location.search);
    if (p.get('appointment')) {
      setForm(f => ({
        ...f,
        client_name: decodeURIComponent(p.get('client_name') || ''),
        client_email: decodeURIComponent(p.get('client_email') || ''),
        client_address: decodeURIComponent(p.get('client_address') || ''),
        client_phone: decodeURIComponent(p.get('client_phone') || ''),
        appointment_id: p.get('appointment')
      }));
      setShowForm(true);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [data, cls] = await Promise.all([
      base44.entities.Estimate.list('-created_date'),
      base44.entities.Client.list('-created_date')
    ]);
    setEstimates(data);
    setClients(cls);
    setLoading(false);
  };

  const calcTotals = (items, taxRate) => {
    const subtotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
    const tax_amount = subtotal * ((taxRate || 0) / 100);
    return { subtotal, tax_amount, total: subtotal + tax_amount };
  };

  const updateItem = (id, field, value) => {
    setForm(f => {
      const items = f.line_items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = (field === 'quantity' ? value : updated.quantity) * (field === 'unit_price' ? value : updated.unit_price);
        }
        return updated;
      });
      return { ...f, line_items: items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, line_items: [...f.line_items, emptyItem()] }));
  const removeItem = (id) => setForm(f => ({ ...f, line_items: f.line_items.filter(i => i.id !== id) }));

  const getNextNumber = () => {
    if (estimates.length === 0) return 1;
    return Math.max(...estimates.map(e => e.estimate_number || 0)) + 1;
  };

  const handleSave = async (status = 'draft') => {
    if (!form.client_name) { toast.error('Client name is required'); return; }
    const { subtotal, tax_amount, total } = calcTotals(form.line_items, form.tax_rate);
    const data = { ...form, subtotal, tax_amount, total, status };

    if (editing) {
      await base44.entities.Estimate.update(editing.id, data);
      toast.success('Estimate updated');
      setShowForm(false);
      setEditing(null);
      loadData();
    } else {
      data.estimate_number = getNextNumber();
      const created = await base44.entities.Estimate.create(data);
      setShowForm(false);
      // Navigate to the full editor (Housecall Pro style)
      navigate(`/estimate-editor?id=${created.id}`);
    }
  };

  const handleSend = async (estimate) => {
    if (!estimate.client_email) { toast.error('Client email required to send'); return; }
    await base44.entities.Estimate.update(estimate.id, { status: 'sent', sent_at: new Date().toISOString() });
    try {
      await base44.integrations.Core.SendEmail({
        to: estimate.client_email,
        subject: `Estimate #${estimate.estimate_number} - Please Review`,
        body: `Hi ${estimate.client_name},\n\nPlease find your estimate #${estimate.estimate_number} attached for review.\n\nTotal: $${(estimate.total || 0).toFixed(2)}\n\nPlease reply to approve or decline this estimate.\n\nThank you!`
      });
      await logComm({ event_type: 'estimate_sent', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email, estimate_id: estimate.id, appointment_id: estimate.appointment_id || '', subject: `Estimate #${estimate.estimate_number} - Please Review`, preview: `Total: $${(estimate.total || 0).toFixed(2)}` });
    } catch {
      await logCommFailed({ event_type: 'estimate_sent', client_name: estimate.client_name, client_email: estimate.client_email, estimate_id: estimate.id, subject: `Estimate #${estimate.estimate_number} - Please Review` });
    }
    toast.success('Estimate sent to client!');
    loadData();
  };

  const handleApprove = async (estimate) => {
    await base44.entities.Estimate.update(estimate.id, { status: 'approved', approved_at: new Date().toISOString() });
    await logComm({ event_type: 'estimate_approved', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email || '', estimate_id: estimate.id, subject: `Estimate #${estimate.estimate_number} Approved`, status: 'delivered' });
    toast.success('Estimate approved!');
    loadData();
  };

  const handleDecline = async (estimate) => {
    await base44.entities.Estimate.update(estimate.id, { status: 'declined' });
    await logComm({ event_type: 'estimate_declined', client_id: estimate.client_id || '', client_name: estimate.client_name, client_email: estimate.client_email || '', estimate_id: estimate.id, subject: `Estimate #${estimate.estimate_number} Declined`, status: 'delivered' });
    toast.success('Estimate marked as declined');
    loadData();
  };

  const handleConvertToWorkOrder = async (estimate) => {
    const existing = await base44.entities.WorkOrder.filter({ estimate_id: estimate.id });
    if (existing.length > 0) { toast.error('Already converted to work order'); return; }
    const woNum = Math.floor(Math.random() * 9000) + 1000;
    await base44.entities.WorkOrder.create({
      work_order_number: woNum,
      estimate_id: estimate.id,
      client_name: estimate.client_name,
      client_address: estimate.client_address,
      client_phone: estimate.client_phone,
      title: estimate.title || `Work Order from Estimate #${estimate.estimate_number}`,
      line_items: estimate.line_items,
      subtotal: estimate.subtotal,
      total: estimate.total,
      status: 'pending'
    });
    await base44.entities.Estimate.update(estimate.id, { status: 'converted' });
    toast.success('Converted to Work Order!');
    loadData();
  };

  const handleConvertToInvoice = async (estimate) => {
    const invNum = Math.floor(Math.random() * 9000) + 1000;
    await base44.entities.Invoice.create({
      invoice_number: invNum,
      estimate_id: estimate.id,
      client_name: estimate.client_name,
      client_email: estimate.client_email,
      client_address: estimate.client_address,
      client_phone: estimate.client_phone,
      line_items: estimate.line_items,
      subtotal: estimate.subtotal,
      tax_rate: estimate.tax_rate,
      tax_amount: estimate.tax_amount,
      total: estimate.total,
      status: 'draft'
    });
    toast.success('Converted to Invoice!');
    loadData();
  };

  const openEdit = (est) => {
    setEditing(est);
    setForm({ ...est, line_items: est.line_items?.length ? est.line_items : [emptyItem()] });
    setShowForm(true);
  };

  const openPrint = (est) => { setViewingEstimate(est); setShowPrint(true); };

  const openFinish = (est) => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const year = now.getFullYear();
    let h = now.getHours();
    const min = pad(now.getMinutes());
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    setFinishDate(`${month}/${day}/${year}`);
    setFinishTime(`${h}:${min}${ampm}`);
    setFinishNotify(false);
    setFinishEstimate(est);
    setShowFinish(true);
  };

  const handleFinish = async () => {
    await base44.entities.Estimate.update(finishEstimate.id, {
      status: 'approved',
      approved_at: new Date().toISOString()
    });
    if (finishNotify && finishEstimate.client_email) {
      await base44.integrations.Core.SendEmail({
        to: finishEstimate.client_email,
        subject: `Estimate #${finishEstimate.estimate_number} - Completed`,
        body: `Hi ${finishEstimate.client_name},\n\nYour estimate has been completed on ${finishDate} at ${finishTime}.\n\nThank you!`
      });
    }
    toast.success('Estimate finished!');
    setShowFinish(false);
    loadData();
  };

  const handlePrint = () => {
    const area = document.getElementById('estimate-print-area');
    if (!area) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Estimate #${viewingEstimate?.estimate_number}</title>
      <style>body{font-family:Inter,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left}th{background:#1f2937;color:white}.total{font-weight:bold}</style>
    </head><body>${area.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const filtered = estimates.filter(e =>
    e.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(e.estimate_number).includes(search)
  );

  const formTotals = calcTotals(form.line_items || [], form.tax_rate);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Estimates" subtitle={`${estimates.length} total`} actionLabel="New Estimate" onAction={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} />

      <div className="p-6 space-y-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search estimates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No estimates yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(est => (
              <Card key={est.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary">#{est.estimate_number}</span>
                        <h3 className="font-semibold text-foreground">{est.client_name}</h3>
                        <StatusBadge status={est.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground">{est.title || 'No title'}</span>
                        <span className="text-sm font-semibold text-foreground">${(est.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        {est.expiration_date && <span className="text-xs text-muted-foreground">Exp: {est.expiration_date}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild title="Edit">
                        <Link to={`/estimate-editor?id=${est.id}`}><Pencil className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild title="Send / Preview">
                        <Link to={`/estimate-editor?id=${est.id}`}><Send className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" asChild title="Schedule">
                        <Link to={`/schedule-estimate?id=${est.id}`}><Calendar className="w-4 h-4" /></Link>
                      </Button>
                      {(est.status === 'draft' || est.status === 'sent') && (
                        <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50" onClick={() => openFinish(est)}>
                          Finish
                        </Button>
                      )}
                      {est.status === 'draft' && (
                        <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => handleSend(est)}>
                          <Send className="w-3 h-3 mr-1" />Send
                        </Button>
                      )}
                      {est.status === 'sent' && (
                        <>
                          <Button size="sm" variant="outline" className="border-green-300 text-green-600 hover:bg-green-50" onClick={() => handleApprove(est)}>
                            <CheckCircle className="w-3 h-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-500 hover:bg-red-50" onClick={() => handleDecline(est)}>
                            <XCircle className="w-3 h-3 mr-1" />Decline
                          </Button>
                        </>
                      )}
                      {est.status === 'approved' && (
                        <>
                          <Button size="sm" variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50" onClick={() => handleConvertToWorkOrder(est)}>
                            <ClipboardList className="w-3 h-3 mr-1" />Work Order
                          </Button>
                          <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => handleConvertToInvoice(est)}>
                            <Receipt className="w-3 h-3 mr-1" />Invoice
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Estimate Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Estimate #${editing.estimate_number}` : 'New Estimate'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client Name *</Label>
                <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Client name" />
              </div>
              <div className="space-y-1.5">
                <Label>Title / Description</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Flooring Installation" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} placeholder="client@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={form.client_address} onChange={e => setForm({ ...form, client_address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiration Date</Label>
                <Input type="date" value={form.expiration_date} onChange={e => setForm({ ...form, expiration_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Technician" />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Line Items</h3>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" />Add Service
                </Button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-4">Service</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-1 text-right">Unit Cost</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {form.line_items?.map((item, idx) => (
                  <div key={item.id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-t border-border`}>
                    <div className="col-span-4">
                      <Input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Service name" className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Details" className="h-8 text-sm" />
                    </div>
                    <div className="col-span-1">
                      <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center" />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-sm pl-5 text-right" />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input type="number" step="0.01" value={item.unit_cost} onChange={e => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)} className="h-8 text-sm pl-5 text-right" />
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-sm font-semibold text-foreground">${(item.total_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeItem(item.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex justify-end mt-4">
                <div className="w-56 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${formTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Tax %</span>
                    <Input type="number" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} className="h-7 w-16 text-right text-sm" />
                  </div>
                  {form.tax_rate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">${formTotals.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-bold text-foreground">TOTAL</span>
                    <span className="font-bold text-primary text-base">${formTotals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Visible to client..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Internal Notes</Label>
                <Textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} placeholder="Only visible to your team..." rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="outline" onClick={() => handleSave('draft')}>Save Draft</Button>
              <Button onClick={() => handleSave('sent')} className="bg-primary hover:bg-primary/90">
                <Send className="w-4 h-4 mr-2" />Save & Send to Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finish Estimate Dialog */}
      <Dialog open={showFinish} onOpenChange={setShowFinish}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Finish Estimate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            This will stop estimate duration tracking and mark the estimate end time.
          </p>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-sm text-foreground mb-1.5 block">Finish estimate at:</Label>
              <div className="relative">
                <Input
                  value={finishDate}
                  onChange={e => setFinishDate(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className="pr-9"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <Input
              value={finishTime}
              onChange={e => setFinishTime(e.target.value)}
              placeholder="8:17pm"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={finishNotify}
                onChange={e => setFinishNotify(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">Notify customer</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" className="text-muted-foreground" onClick={() => setShowFinish(false)}>Cancel</Button>
            <Button className="text-primary bg-transparent hover:bg-primary/5 border-0 shadow-none font-semibold" variant="outline" onClick={handleFinish}>
              Finish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Estimate #{viewingEstimate?.estimate_number}</DialogTitle>
              <Button onClick={handlePrint} size="sm" className="bg-primary hover:bg-primary/90">
                <Printer className="w-4 h-4 mr-2" />Print / Download PDF
              </Button>
            </div>
          </DialogHeader>
          {viewingEstimate && <EstimatePreview estimate={viewingEstimate} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}