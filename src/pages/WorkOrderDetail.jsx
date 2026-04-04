import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X, MapPin, DollarSign, CheckCircle, Receipt, Edit2, Save,
  Clock, Camera, ClipboardList, UserCheck, StickyNote, History,
  LayoutGrid
} from 'lucide-react';
import PhotoGallery from '@/components/shared/PhotoGallery';
import StatusBadge from '@/components/shared/StatusBadge';
import CommTimeline from '@/components/shared/CommTimeline';
import WorkerSelector from '@/components/workorders/WorkerSelector';
import WOReviewHeader from '@/components/workorders/review/WOReviewHeader';
import WOAssignmentSection from '@/components/workorders/review/WOAssignmentSection';
import WODailyReportSection from '@/components/workorders/review/WODailyReportSection';
import WOExpensesSection from '@/components/workorders/review/WOExpensesSection';
import WOReceiptsSection from '@/components/workorders/review/WOReceiptsSection';
import WONotesSection from '@/components/workorders/review/WONotesSection';
import WOHistorySection from '@/components/workorders/review/WOHistorySection';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TABS = [
  { id: 'overview',    label: 'Overview',       icon: LayoutGrid },
  { id: 'assignment',  label: 'Assignment',      icon: UserCheck },
  { id: 'daily',       label: 'Daily Review',    icon: ClipboardList },
  { id: 'expenses',    label: 'Expenses',        icon: DollarSign },
  { id: 'receipts',    label: 'Receipts',        icon: Receipt },
  { id: 'photos',      label: 'Photos',          icon: Camera },
  { id: 'notes',       label: 'Notes',           icon: StickyNote },
  { id: 'history',     label: 'History',         icon: History },
];

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
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleStatusChange = async (newStatus) => {
    const extra = {};
    if (newStatus === 'in_progress') extra.started_at = new Date().toISOString();
    if (newStatus === 'completed') {
      const user = await base44.auth.me();
      extra.completed_at = new Date().toISOString();
      extra.completed_by_user = user?.full_name || user?.email || 'Admin';
    }
    setFormData(f => ({ ...f, status: newStatus }));
    await base44.entities.WorkOrder.update(woId, { status: newStatus, ...extra });
    setWorkOrder(w => ({ ...w, status: newStatus, ...extra }));
    // log to history
    await base44.entities.WorkOrderHistory.create({
      work_order_id: woId,
      work_order_number: workOrder.work_order_number,
      field_changed: 'status',
      old_value: workOrder.status,
      new_value: newStatus,
      changed_by: (await base44.auth.me())?.full_name || 'Admin',
      change_note: 'Status updated',
    });
    toast.success('Status updated');
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

        {/* LEFT SIDEBAR */}
        <div className="w-[260px] flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">

          {/* Customer */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Customer</p>
            <p className="font-bold text-slate-900">{workOrder.client_name}</p>
            {workOrder.client_address && (
              <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{workOrder.client_address}</span>
              </div>
            )}
            {workOrder.client_phone && (
              <div className="flex items-center gap-1.5 text-xs mt-1.5">
                <span>📞</span>
                <a href={`tel:${workOrder.client_phone}`} className="text-primary hover:underline">{workOrder.client_phone}</a>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Work Status</p>
            <select
              value={formData.status || ''}
              onChange={e => handleStatusChange(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
            >
              {['draft','assigned','scheduled','on_the_way','in_progress','completed','cancelled','invoiced'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          {/* Scheduled date */}
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Scheduled Date</p>
            {editing ? (
              <Input type="date" value={formData.scheduled_date || ''} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} className="h-8 text-sm" />
            ) : (
              <p className="text-sm text-slate-700">{workOrder.scheduled_date || 'Not scheduled'}</p>
            )}
          </div>

          {/* From estimate */}
          {estimate && (
            <div className="px-4 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">From Estimate</p>
              <button onClick={() => navigate(`/estimate-editor?id=${estimate.id}`)} className="text-sm text-primary hover:underline font-medium">
                Estimate #{estimate.estimate_number}
              </button>
            </div>
          )}

          {/* Total */}
          <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Contract Total</p>
            <div className="flex items-baseline gap-1">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="text-lg font-bold text-primary">{(workOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Communications */}
          <div className="px-4 py-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Communications</p>
            <CommTimeline workOrderId={woId} />
          </div>
        </div>

        {/* RIGHT: TABS + CONTENT */}
        <div className="flex-1 overflow-auto flex flex-col">

          {/* TAB BAR */}
          <div className="bg-white border-b border-slate-200 flex-shrink-0 px-5 overflow-x-auto">
            <div className="flex gap-0.5 py-2 min-w-max">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-5">

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  <WOReviewHeader workOrder={workOrder} />
                  {/* Quick line items summary */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Services &amp; Materials</h3>
                    {workOrder.line_items && workOrder.line_items.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-100">
                            <th className="text-left py-2 font-semibold text-slate-500">Description</th>
                            <th className="text-right py-2 font-semibold text-slate-500 w-16">Qty</th>
                            <th className="text-right py-2 font-semibold text-slate-500 w-24">Price</th>
                            <th className="text-right py-2 font-semibold text-slate-500 w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workOrder.line_items.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-2.5 font-medium text-slate-800">{item.name}
                                {item.description && <span className="block text-xs text-slate-400 mt-0.5">{item.description}</span>}
                              </td>
                              <td className="py-2.5 text-right text-slate-600">{item.quantity || '—'}</td>
                              <td className="py-2.5 text-right text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                              <td className="py-2.5 text-right font-semibold text-slate-900">${(item.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-slate-400">No services listed</p>
                    )}
                    <div className="mt-4 flex justify-end">
                      <div className="w-64 space-y-1.5">
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Subtotal</span>
                          <span className="font-medium">${(workOrder.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-1.5">
                          <span>Total</span>
                          <span className="text-primary">${(workOrder.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ASSIGNMENT */}
              {activeTab === 'assignment' && (
                <WOAssignmentSection workOrder={workOrder} woId={woId} onRefresh={loadWorkOrder} />
              )}

              {/* DAILY REVIEW */}
              {activeTab === 'daily' && (
                <WODailyReportSection workOrder={workOrder} woId={woId} />
              )}

              {/* EXPENSES */}
              {activeTab === 'expenses' && (
                <WOExpensesSection workOrder={workOrder} woId={woId} />
              )}

              {/* RECEIPTS */}
              {activeTab === 'receipts' && (
                <WOReceiptsSection workOrder={workOrder} woId={woId} />
              )}

              {/* PHOTOS */}
              {activeTab === 'photos' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-5">Project Photos</h3>
                  <PhotoGallery
                    workOrderId={woId}
                    customerId={workOrder.client_id}
                    customerName={workOrder.client_name}
                    workOrderNumber={workOrder.work_order_number}
                  />
                </div>
              )}

              {/* NOTES */}
              {activeTab === 'notes' && (
                <WONotesSection workOrder={workOrder} woId={woId} />
              )}

              {/* HISTORY */}
              {activeTab === 'history' && (
                <WOHistorySection woId={woId} />
              )}

            </div>
          </div>
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