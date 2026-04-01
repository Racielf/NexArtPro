import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { ClipboardList, Search, Pencil, Trash2, Receipt, CheckCircle, User, MapPin, DollarSign } from 'lucide-react';

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.WorkOrder.list('-created_date');
    setWorkOrders(data);
    setLoading(false);
  };

  const openEdit = (wo) => { setEditing(wo); setForm({ ...wo }); setShowForm(true); };

  const handleSave = async () => {
    await base44.entities.WorkOrder.update(editing.id, form);
    toast.success('Work order updated');
    setShowForm(false);
    loadData();
  };

  const handleComplete = async (wo) => {
    await base44.entities.WorkOrder.update(wo.id, { status: 'completed', completed_at: new Date().toISOString() });
    toast.success('Work order completed!');
    loadData();
  };

  const handleConvertToInvoice = async (wo) => {
    const invNum = Math.floor(Math.random() * 9000) + 1000;
    await base44.entities.Invoice.create({
      invoice_number: invNum,
      work_order_id: wo.id,
      client_name: wo.client_name,
      client_address: wo.client_address,
      client_phone: wo.client_phone,
      line_items: wo.line_items,
      subtotal: wo.subtotal,
      total: wo.total,
      status: 'draft'
    });
    await base44.entities.WorkOrder.update(wo.id, { status: 'invoiced' });
    toast.success('Converted to Invoice!');
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this work order?')) return;
    await base44.entities.WorkOrder.delete(id);
    toast.success('Work order deleted');
    loadData();
  };

  const filtered = workOrders.filter(w =>
    w.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(w.work_order_number).includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Work Orders" subtitle={`${workOrders.length} total`} />

      <div className="p-6 space-y-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search work orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No work orders yet</p>
            <p className="text-sm text-muted-foreground mt-1">Convert an approved estimate to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(wo => (
              <Card key={wo.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-purple-600">WO#{wo.work_order_number}</span>
                        <h3 className="font-semibold text-foreground">{wo.client_name}</h3>
                        <StatusBadge status={wo.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{wo.title}</p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {wo.client_address && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />{wo.client_address}
                          </span>
                        )}
                        {wo.assigned_to && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />{wo.assigned_to}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <DollarSign className="w-3 h-3" />${(wo.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(wo)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {wo.status === 'pending' && (
                        <Button size="sm" variant="outline" className="border-green-300 text-green-600 hover:bg-green-50" onClick={() => handleComplete(wo)}>
                          <CheckCircle className="w-3 h-3 mr-1" />Complete
                        </Button>
                      )}
                      {wo.status === 'completed' && (
                        <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => handleConvertToInvoice(wo)}>
                          <Receipt className="w-3 h-3 mr-1" />Create Invoice
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(wo.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Work Order #{editing?.work_order_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Technician name" />
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled Date</Label>
              <Input type="date" value={form.scheduled_date || ''} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}