import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  X, Receipt, Eye, Save, Camera, ClipboardList, StickyNote, History,
  LayoutGrid
} from 'lucide-react';
import PhotoGallery from '@/components/shared/PhotoGallery';
import StatusBadge from '@/components/shared/StatusBadge';
import CommTimeline from '@/components/shared/CommTimeline';
import WOAssignmentSection from '@/components/workorders/review/WOAssignmentSection';
import WODailyReportSection from '@/components/workorders/review/WODailyReportSection';
import WOExpensesSection from '@/components/workorders/review/WOExpensesSection';
import WOReceiptsSection from '@/components/workorders/review/WOReceiptsSection';
import WONotesSection from '@/components/workorders/review/WONotesSection';
import WOHistorySection from '@/components/workorders/review/WOHistorySection';
import WorkOrderSidebar from '@/components/workorders/WorkOrderSidebar';
import WorkOrderGroups from '@/components/workorders/WorkOrderGroups';
import { toast } from 'sonner';

const TABS = [
  { id: 'services',  label: 'Services',      icon: LayoutGrid },
  { id: 'assignment',  label: 'Assignment',      icon: ClipboardList },
  { id: 'daily',       label: 'Daily Review',    icon: ClipboardList },
  { id: 'expenses',    label: 'Expenses',        icon: ClipboardList },
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
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  useEffect(() => { loadWorkOrder(); }, []);

  const loadWorkOrder = async () => {
    if (!woId) { setLoading(false); return; }
    const list = await base44.entities.WorkOrder.filter({ id: woId });
    if (list.length) {
      const wo = list[0];
      setWorkOrder(wo);
      if (wo.estimate_id) {
        const ests = await base44.entities.Estimate.filter({ id: wo.estimate_id });
        if (ests.length) setEstimate(ests[0]);
      }
    }
    setLoading(false);
  };

  const handleSave = async (updatedWO) => {
    setSaving(true);
    await base44.entities.WorkOrder.update(woId, updatedWO);
    setWorkOrder(updatedWO);
    setSaving(false);
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
      <div className="bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center px-4 h-12 gap-2">
          <button onClick={() => navigate('/work-orders')}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <span className="font-bold text-slate-900 text-sm whitespace-nowrap flex-shrink-0">
            Work Order #{workOrder?.work_order_number} · {workOrder?.client_name}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={workOrder?.status} />
            {workOrder?.status === 'completed' && (
              <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={handleConvertToInvoice} disabled={saving}>
                <Receipt className="w-3.5 h-3.5 mr-1" />Create Invoice
              </Button>
            )}
            <button onClick={() => setShowPreview(true)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Preview">
              <Eye className="w-4 h-4" />
            </button>
            {saving && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Save className="w-3 h-3 animate-pulse" />Saving…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN 2-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-64 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white">
          <WorkOrderSidebar
            workOrder={workOrder}
            onUpdate={handleSave}
            saving={saving}
          />
          {/* Communications */}
          <div className="px-4 py-4 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Communications</p>
            <CommTimeline workOrderId={woId} />
          </div>
        </div>

        {/* RIGHT CANVAS */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'services' ? (
            <WorkOrderGroups
              workOrder={workOrder}
              onSave={handleSave}
              saving={saving}
            />
          ) : (
            <div className="max-w-5xl mx-auto space-y-5">
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
                    customerId={workOrder?.client_id}
                    customerName={workOrder?.client_name}
                    workOrderNumber={workOrder?.work_order_number}
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
          )}
        </div>
      </div>
    </div>
  );
}