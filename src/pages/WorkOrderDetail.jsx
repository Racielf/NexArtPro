import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, MapPin, User, DollarSign, CheckCircle, Receipt, Edit2, Save, UserCheck, Clock, History, Camera } from 'lucide-react';
import PhotoGallery from '@/components/shared/PhotoGallery';
import StatusBadge from '@/components/shared/StatusBadge';
import CommTimeline from '@/components/shared/CommTimeline';
import WorkerSelector from '@/components/workorders/WorkerSelector';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  const [showWorkerSelector, setShowWorkerSelector] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'photos'

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
      const hist = await base44.entities.JobAssignment.filter({ work_order_id: woId });
      setAssignments(hist.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
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

  const handleAssignWorker = async (worker) => {
    setShowWorkerSelector(false);
    const user = await base44.auth.me();
    const isReassign = !!workOrder.assigned_worker_id;
    const now = new Date().toISOString();
    const update = {
      status: workOrder.status === 'draft' ? 'assigned' : workOrder.status,
      assigned_worker_id: worker.id,
      assigned_worker_name: worker.full_name,
      assigned_worker_phone: worker.phone || '',
      assigned_by: isReassign ? workOrder.assigned_by : (user?.full_name || user?.email || 'Admin'),
      assigned_at: isReassign ? workOrder.assigned_at : now,
      previous_worker_id: isReassign ? workOrder.assigned_worker_id : null,
      previous_worker_name: isReassign ? workOrder.assigned_worker_name : null,
      reassigned_at: isReassign ? now : null,
      reassigned_by: isReassign ? (user?.full_name || user?.email || 'Admin') : null,
    };
    await base44.entities.WorkOrder.update(woId, update);
    await base44.entities.JobAssignment.create({
      work_order_id: woId,
      work_order_number: workOrder.work_order_number,
      worker_id: worker.id,
      worker_name: worker.full_name,
      worker_phone: worker.phone || '',
      client_name: workOrder.client_name,
      title: workOrder.title,
      action: isReassign ? 'reassigned' : 'assigned',
      assigned_by: user?.full_name || user?.email || 'Admin',
      previous_worker_name: isReassign ? workOrder.assigned_worker_name : null,
    });
    toast.success(`${isReassign ? 'Reassigned' : 'Assigned'} to ${worker.full_name}`);
    loadWorkOrder();
  };

  const handleConvertToInvoice = async () => {
    const invNum = Math.floor(Math.random() * 9000) + 1000;
    const inv = await base44.entities.Invoice.create({
      invoice_number: invNum,
      work_order_id: woId,
      estimate_id: workOrder.estimate_id || '',
      client_id: workOrder.client_id || '',
      client_name: workOrder.client_name,
      client_email: workOrder.client_email || '',
      client_address: workOrder.client_address || '',
      client_phone: workOrder.client_phone || '',
      title: workOrder.title || '',
      groups: workOrder.groups || [],
      line_items: workOrder.line_items || [],
      subtotal: workOrder.subtotal || 0,
      tax_rate: workOrder.tax_rate || 0,
      tax_amount: workOrder.tax_amount || 0,
      discount_amount: workOrder.discount_amount || 0,
      total: workOrder.total || 0,
      notes: workOrder.notes || '',
      status: 'draft',
    });
    await base44.entities.WorkOrder.update(woId, { status: 'invoiced' });
    setWorkOrder(w => ({ ...w, status: 'invoiced' }));
    toast.success('Invoice created!');
    navigate(`/invoice-detail?id=${inv.id}`);
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Work Status</p>
            <select
              value={formData.status || workOrder.status || ''}
              onChange={async e => {
                const newStatus = e.target.value;
                setFormData(f => ({ ...f, status: newStatus }));
                const extra = {};
                if (newStatus === 'in_progress') extra.started_at = new Date().toISOString();
                if (newStatus === 'completed') extra.completed_at = new Date().toISOString();
                await base44.entities.WorkOrder.update(woId, { status: newStatus, ...extra });
                setWorkOrder(w => ({ ...w, status: newStatus, ...extra }));
                toast.success('Status updated');
              }}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
            >
              {['draft','assigned','scheduled','on_the_way','in_progress','completed','cancelled','invoiced'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          {/* ASSIGNED WORKER */}
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assigned Worker</p>
              <button onClick={() => setShowWorkerSelector(true)}
                className="flex items-center gap-1 text-[10px] text-primary font-semibold hover:underline">
                <UserCheck className="w-3 h-3" />
                {workOrder.assigned_worker_id ? 'Reassign' : 'Assign'}
              </button>
            </div>
            {workOrder.assigned_worker_name ? (
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {workOrder.assigned_worker_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{workOrder.assigned_worker_name}</p>
                    {workOrder.assigned_worker_phone && <p className="text-xs text-slate-400">{workOrder.assigned_worker_phone}</p>}
                  </div>
                </div>
                {workOrder.assigned_by && (
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {workOrder.reassigned_at
                      ? `Reassigned by ${workOrder.reassigned_by}`
                      : `Assigned by ${workOrder.assigned_by}`}
                  </p>
                )}
              </div>
            ) : (
              <button onClick={() => setShowWorkerSelector(true)}
                className="flex items-center gap-2 text-sm text-slate-400 italic hover:text-primary transition-colors">
                <User className="w-3.5 h-3.5" />Click to assign a worker
              </button>
            )}
          </div>

          {/* ASSIGNMENT HISTORY */}
          {assignments.length > 0 && (
            <div className="px-4 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <History className="w-3 h-3" />Assignment History
              </p>
              <div className="space-y-2">
                {assignments.map((a, i) => (
                  <div key={a.id || i} className="text-[11px] text-slate-500 leading-snug">
                    <span className="font-semibold text-slate-700">{a.action === 'reassigned' ? '↻ Reassigned' : '→ Assigned'}</span>
                    {' to '}<span className="font-medium text-slate-700">{a.worker_name}</span>
                    {a.previous_worker_name && <span> (from {a.previous_worker_name})</span>}
                    {a.assigned_by && <span className="text-slate-400"> · by {a.assigned_by}</span>}
                    <br />
                    <span className="text-slate-400">{a.created_date ? format(new Date(a.created_date), 'MMM d, h:mm a') : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* TABS */}
          <div className="flex gap-1 mb-5">
            {[{ id: 'details', label: 'Details' }, { id: 'photos', label: 'Photos', icon: Camera }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'photos' && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-4xl">
              <h3 className="text-lg font-bold text-slate-900 mb-5">Project Photos</h3>
              <PhotoGallery
                workOrderId={woId}
                customerId={workOrder.client_id}
                customerName={workOrder.client_name}
                workOrderNumber={workOrder.work_order_number}
              />
            </div>
          )}

          {activeTab === 'details' && (
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
          )} {/* end details tab */}
        </div>

      </div>

    {showWorkerSelector && (
        <WorkerSelector
          currentWorkerId={workOrder.assigned_worker_id}
          onSelect={handleAssignWorker}
          onCancel={() => setShowWorkerSelector(false)}
        />
      )}
    </div>
  );
}