import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { ClipboardList, Search, Pencil, Trash2, User, MapPin, DollarSign } from 'lucide-react';
import { softDeleteEntity, softDeleteMany, filterActiveRecords } from '@/lib/softDelete';
import { logAuditEvent } from '@/lib/auditLog';
import { useNavigate } from 'react-router-dom';
import ArchiveReasonModal from '@/components/shared/ArchiveReasonModal';
import { useAuth } from '@/lib/AuthContext';

export default function WorkOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actor = user?.email || user?.id || 'unknown';
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [archiveModal, setArchiveModal] = useState({ open: false, id: null, label: '' });
  const [archiveBulkModal, setArchiveBulkModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.WorkOrder.list('-created_date');
    setWorkOrders(filterActiveRecords(data));
    setLoading(false);
  };

  const openEdit = (wo) => { setEditing(wo); setForm({ ...wo }); setShowForm(true); };

  const handleSave = async () => {
    await base44.entities.WorkOrder.update(editing.id, form);
    toast.success('Work order updated');
    setShowForm(false);
    loadData();
  };

  const handleDelete = (wo) => {
    setArchiveModal({ open: true, id: wo.id, label: `WO#${wo.work_order_number}` });
  };

  const handleConfirmArchive = async (reason) => {
    const { id } = archiveModal;
    setArchiveModal({ open: false, id: null, label: '' });
    await softDeleteEntity(base44.entities.WorkOrder, id, actor, reason);
    await logAuditEvent('archive', 'WorkOrder', id, actor, { reason });
    toast.success('Work order archived');
    loadData();
  };

  const filtered = workOrders.filter(w =>
    w.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(w.work_order_number).includes(search)
  );

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(w => w.id)));
    }
  };

  const handleDeleteSelected = () => {
    setArchiveBulkModal(true);
  };

  const handleConfirmBulkArchive = async (reason) => {
    setArchiveBulkModal(false);
    const idsArray = Array.from(selectedIds);
    await softDeleteMany(base44.entities.WorkOrder, idsArray, actor, reason);
    await Promise.all(idsArray.map(id => logAuditEvent('archive', 'WorkOrder', id, actor, { reason })));
    setWorkOrders(prev => prev.filter(w => !selectedIds.has(w.id)));
    setSelectedIds(new Set());
    toast.success(`${idsArray.length} work order${idsArray.length === 1 ? '' : 's'} archived`);
  };

  return (
    <div className="flex flex-col h-full">
      <ArchiveReasonModal
        open={archiveModal.open}
        onCancel={() => setArchiveModal({ open: false, id: null, label: '' })}
        onConfirm={handleConfirmArchive}
        entityLabel={archiveModal.label || 'Work Order'}
      />
      <ArchiveReasonModal
        open={archiveBulkModal}
        onCancel={() => setArchiveBulkModal(false)}
        onConfirm={handleConfirmBulkArchive}
        count={selectedIds.size}
        entityLabel="Work Order"
      />
      <PageHeader title="Work Orders" subtitle={`${workOrders.length} total`} />

      <PageShell>
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-muted-foreground">Select all</span>
            </label>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search work orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-border rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">No work orders yet</p>
            <p className="text-sm text-muted-foreground mt-1">Convert an approved estimate to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
                <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => {
                  handleDeleteSelected();
                }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </Button>
              </div>
            )}
            {filtered.map(wo => (
              <Card key={wo.id} className="bg-white hover:shadow-sm hover:border-border/70 transition-all border-border cursor-pointer" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(wo.id)}
                        onChange={() => toggleSelect(wo.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </label>
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
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(wo)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageShell>

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