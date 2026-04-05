import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Receipt, Eye, Printer, Send, Save,
  User, Phone, Mail, MapPin, Calendar, Briefcase,
  ClipboardList, Clock, Package, ImageIcon, CheckCircle2
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const woId = urlParams.get('id');

  const [workOrder, setWorkOrder] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!workOrder) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Work Order not found</p>
        <Button onClick={() => navigate('/work-orders')}>Back to Work Orders</Button>
      </div>
    </div>
  );

  // Collect all service items from groups
  const allItems = (workOrder.groups || []).flatMap(g => g.items || []);

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          {/* Back */}
          <button
            onClick={() => navigate('/work-orders')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Work Orders</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Title info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900">
                Work Order #{workOrder.work_order_number}
              </h1>
              <StatusBadge status={workOrder.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {workOrder.client_name}
              </span>
              {workOrder.client_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {workOrder.client_address}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Send
            </Button>
            <Button size="sm" className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> Edit
            </Button>
            {workOrder.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 gap-1.5"
                onClick={handleConvertToInvoice}
                disabled={saving}
              >
                <Receipt className="w-3.5 h-3.5" /> Create Invoice
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Customer</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{workOrder.client_name}</p>
                </div>
              </div>
              {workOrder.client_phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.client_phone}
                </div>
              )}
              {workOrder.client_email && (
                <div className="flex items-center gap-2 text-sm text-slate-600 break-all">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {workOrder.client_email}
                </div>
              )}
              {workOrder.client_address && (
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  {workOrder.client_address}
                </div>
              )}
            </div>
          </div>

          {/* Job Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Job Details</p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Status</p>
                <StatusBadge status={workOrder.status} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Assigned Worker</p>
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.assigned_worker_name || <span className="text-slate-400 italic">Unassigned</span>}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Scheduled Date</p>
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.scheduled_date || <span className="text-slate-400 italic">Not set</span>}
                </div>
              </div>
              {workOrder.scheduled_time && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Scheduled Time</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {workOrder.scheduled_time}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          {(workOrder.subtotal || workOrder.total) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Summary</p>
              <div className="space-y-1.5 text-sm">
                {workOrder.subtotal != null && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>${workOrder.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {workOrder.total != null && (
                  <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-100 pt-1.5 mt-1.5">
                    <span>Total</span>
                    <span>${workOrder.total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div className="flex-1 space-y-5">

          {/* 1. Scope of Work */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Scope of Work</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{workOrder.title || 'Work Order'}</p>
                {workOrder.notes && (
                  <p className="text-sm text-slate-500 mt-1">{workOrder.notes}</p>
                )}
              </div>
              {/* Service list */}
              {allItems.length > 0 ? (
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Service</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Qty</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right">Price</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allItems.map((item, i) => (
                        <tr key={item.id || i} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{item.service_name}</p>
                            {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">${(item.line_total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400">
                  <ClipboardList className="w-6 h-6 mb-2" />
                  <p className="text-sm">No services added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Work Execution */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Work Execution</h2>
            </div>
            <div className="px-6 py-5">
              <textarea
                className="w-full h-28 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none bg-slate-50"
                placeholder="Field notes, observations, work performed…"
                disabled
              />
            </div>
          </div>

          {/* 3. Time Tracking */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Time Tracking</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Arrival Time', placeholder: '—' },
                  { label: 'Departure Time', placeholder: '—' },
                  { label: 'Total Hours', placeholder: '—' },
                ].map(({ label, placeholder }) => (
                  <div key={label} className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-xl font-semibold text-slate-300">{placeholder}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Materials & Expenses */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Materials & Expenses</h2>
            </div>
            <div className="px-6 py-5">
              <div className="border border-dashed border-slate-200 rounded-lg py-10 flex flex-col items-center text-slate-400">
                <Package className="w-6 h-6 mb-2" />
                <p className="text-sm">No expenses recorded yet</p>
              </div>
            </div>
          </div>

          {/* 5. Receipts & Photos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Receipts & Photos</h2>
            </div>
            <div className="px-6 py-5">
              <div className="border border-dashed border-slate-200 rounded-lg py-10 flex flex-col items-center text-slate-400">
                <ImageIcon className="w-6 h-6 mb-2" />
                <p className="text-sm">No files uploaded yet</p>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {workOrder.status === 'completed'
                ? 'This work order has been completed.'
                : 'Mark this work order as completed when all work is done.'}
            </p>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={workOrder.status === 'completed'}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark as Completed
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}