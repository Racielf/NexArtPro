import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, MapPin, User, DollarSign, CheckCircle, Receipt, Edit2, Save } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import CommTimeline from '@/components/shared/CommTimeline';
import { toast } from 'sonner';

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const woId = urlParams.get('id');

  const [workOrder, setWorkOrder] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadWorkOrder(); }, []);

  const loadWorkOrder = async () => {
    if (!woId) { setLoading(false); return; }
    const list = await base44.entities.WorkOrder.filter({ id: woId });
    if (list.length) {
      const wo = list[0];
      setWorkOrder(wo);
      setFormData(wo);
      if (wo.estimate_id) {
        const ests = await base44.entities.Estimate.filter({ id: wo.estimate_id });
        if (ests.length) setEstimate(ests[0]);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.WorkOrder.update(woId, formData);
    setWorkOrder(formData);
    setEditing(false);
    setSaving(false);
    toast.success('Work order updated');
  };

  const handleComplete = async () => {
    setSaving(true);
    await base44.entities.WorkOrder.update(woId, { status: 'completed', completed_at: new Date().toISOString() });
    setWorkOrder(w => ({ ...w, status: 'completed' }));
    setSaving(false);
    toast.success('Work order completed!');
  };

  const handleConvertToInvoice = async () => {
    const invNum = Math.floor(Math.random() * 9000) + 1000;
    await base44.entities.Invoice.create({
      invoice_number: invNum,
      work_order_id: woId,
      client_id: workOrder.client_id,
      client_name: workOrder.client_name,
      client_email: workOrder.client_email || '',
      client_address: workOrder.client_address || '',
      client_phone: workOrder.client_phone || '',
      line_items: workOrder.line_items,
      subtotal: workOrder.subtotal,
      total: workOrder.total,
      status: 'draft'
    });
    await base44.entities.WorkOrder.update(woId, { status: 'invoiced' });
    setWorkOrder(w => ({ ...w, status: 'invoiced' }));
    toast.success('Converted to Invoice!');
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!workOrder) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Work Order not found</p>
        <Button onClick={() => navigate('/work-orders')}>Back to Work Orders</Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#f0f2f5] flex flex-col z-50 overflow-hidden">

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 flex items-center justify-between px-5 py-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/work-orders')} className="p-1.5 hover:bg-slate-100 rounded transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <p className="text-sm font-bold text-slate-800">Work Order #{workOrder.work_order_number}</p>
            <p className="text-xs text-slate-400">{workOrder.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={workOrder.status} />
          {workOrder.status === 'pending' && (
            <Button size="sm" variant="outline" className="border-green-300 text-green-600 hover:bg-green-50" onClick={handleComplete} disabled={saving}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />Complete
            </Button>
          )}
          {workOrder.status === 'completed' && (
            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={handleConvertToInvoice} disabled={saving}>
              <Receipt className="w-3.5 h-3.5 mr-1" />Create Invoice
            </Button>
          )}
          {editing ? (
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleSave} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" />{saving ? 'Saving...' : 'Save'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="w-3.5 h-3.5 mr-1" />Edit
            </Button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <div className="w-[280px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">

          {/* CUSTOMER SECTION */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Customer</p>
            <div className="space-y-2.5">
              <div>
                <p className="font-bold text-slate-900">{workOrder.client_name}</p>
              </div>
              {workOrder.client_address && (
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div className="leading-snug">{workOrder.client_address}</div>
                </div>
              )}
              {workOrder.client_phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>📞</span>
                  <a href={`tel:${workOrder.client_phone}`} className="text-primary hover:underline">{workOrder.client_phone}</a>
                </div>
              )}
            </div>
          </div>

          {/* ESTIMATE SOURCE */}
          {estimate && (
            <div className="px-4 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">From Estimate</p>
              <button
                onClick={() => navigate(`/estimate-editor?id=${estimate.id}`)}
                className="text-sm text-primary hover:underline font-medium block"
              >
                Estimate #{estimate.estimate_number}
              </button>
            </div>
          )}

          {/* WORK STATUS */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Work Status</p>
            {editing ? (
              <select
                value={formData.status || ''}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="invoiced">Invoiced</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <StatusBadge status={workOrder.status} />
              </div>
            )}
          </div>

          {/* ASSIGNED WORKER */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Assigned Worker</p>
            {editing ? (
              <Input
                value={formData.assigned_to || ''}
                onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="Technician name"
                className="h-8 text-sm"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium">{workOrder.assigned_to || 'Unassigned'}</span>
              </div>
            )}
          </div>

          {/* SCHEDULED DATE */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Scheduled Date</p>
            {editing ? (
              <Input
                type="date"
                value={formData.scheduled_date || ''}
                onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm text-slate-700">{workOrder.scheduled_date || 'Not scheduled'}</p>
            )}
          </div>

          {/* TOTAL */}
          <div className="px-4 py-4 bg-slate-50 border-y border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Total</p>
            <div className="flex items-baseline gap-2">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="text-lg font-bold text-primary">{(workOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* COMMUNICATIONS */}
          <div className="px-4 py-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Communications</p>
            <CommTimeline workOrderId={woId} />
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 overflow-auto p-7">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm max-w-4xl">

            {/* NOTES SECTION */}
            <div className="px-7 py-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Notes</h3>
              {editing ? (
                <Textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Work order notes..."
                  rows={4}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{workOrder.notes || 'No notes yet'}</p>
              )}
            </div>

            {/* LINE ITEMS */}
            <div className="px-7 py-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Services &amp; Materials</h3>
              {workOrder.line_items && workOrder.line_items.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-2 font-semibold text-slate-600">Description</th>
                      <th className="text-right py-2 font-semibold text-slate-600 w-20">Qty</th>
                      <th className="text-right py-2 font-semibold text-slate-600 w-24">Unit Price</th>
                      <th className="text-right py-2 font-semibold text-slate-600 w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrder.line_items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          {item.description && <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>}
                        </td>
                        <td className="text-right text-slate-700">{item.quantity || '—'}</td>
                        <td className="text-right text-slate-700">${(item.unit_price || 0).toFixed(2)}</td>
                        <td className="text-right font-semibold text-slate-900">${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-500">No services or materials listed</p>
              )}
              <div className="mt-6 flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-900">${(workOrder.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">${(workOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}