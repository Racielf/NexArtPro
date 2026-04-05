import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Pencil, Eye, Printer, Send, CheckCircle2,
  User, Phone, Mail, MapPin, Calendar, Briefcase, Clock,
  ClipboardList, Package, ImageIcon
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWorkOrder(); }, [id]);

  const loadWorkOrder = async () => {
    if (!id) { setLoading(false); return; }
    const list = await base44.entities.WorkOrder.filter({ id });
    if (list.length) setWorkOrder(list[0]);
    setLoading(false);
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
        <Button onClick={() => navigate('/work-orders')}>← Back to Work Orders</Button>
      </div>
    </div>
  );

  const allItems = (workOrder.groups || []).flatMap(g => g.items || []);

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">

          {/* Back */}
          <button
            onClick={() => navigate('/work-orders')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Work Orders
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 whitespace-nowrap">
                Work Order #{workOrder.work_order_number}
              </h1>
              <StatusBadge status={workOrder.status} />
            </div>
            <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />{workOrder.client_name}
              </span>
              {workOrder.client_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{workOrder.client_address}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Send
            </Button>
            <Button size="sm" className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Customer</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                  {workOrder.client_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">{workOrder.client_name}</p>
              </div>
              {workOrder.client_phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
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

          {/* Job Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Job Details</p>
            <div className="space-y-3.5">

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Status</p>
                <StatusBadge status={workOrder.status} />
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Assigned Worker</p>
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.assigned_worker_name
                    ? <span>{workOrder.assigned_worker_name}</span>
                    : <span className="text-slate-400 italic">Unassigned</span>}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Scheduled Date</p>
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.scheduled_date
                    ? <span>{workOrder.scheduled_date}</span>
                    : <span className="text-slate-400 italic">Not set</span>}
                </div>
              </div>

              {workOrder.scheduled_time && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Time</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {workOrder.scheduled_time}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          {(workOrder.subtotal != null || workOrder.total != null) && (
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
                  <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-100 pt-1.5 mt-1">
                    <span>Total</span>
                    <span>${workOrder.total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* 1. Scope of Work */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Scope of Work</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{workOrder.title || '—'}</p>
                {workOrder.description && (
                  <p className="text-sm text-slate-500 mt-1">{workOrder.description}</p>
                )}
              </div>

              {allItems.length > 0 ? (
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Service</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center w-16">Qty</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right w-28">Unit Price</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allItems.map((item, i) => (
                        <tr key={item.id || i} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{item.service_name}</p>
                            {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">${(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">${(item.line_total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-slate-400">
                  <ClipboardList className="w-6 h-6 mb-2" />
                  <p className="text-sm">No services listed</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Work Execution */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Work Execution</h2>
            </div>
            <div className="px-6 py-5">
              <textarea
                className="w-full h-32 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none bg-slate-50"
                placeholder="Field notes, observations, work performed…"
                readOnly
              />
            </div>
          </div>

          {/* 3. Time Tracking */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Time Tracking</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-3 gap-4">
                {['Arrival Time', 'Departure Time', 'Total Hours'].map((label) => (
                  <div key={label} className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-4 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
                    <p className="text-2xl font-semibold text-slate-200">—</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Materials & Expenses */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Materials & Expenses</h2>
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
              <h2 className="text-sm font-bold text-slate-900">Receipts & Photos</h2>
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
                : 'Mark as completed when all work is done.'}
            </p>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={workOrder.status === 'completed' || workOrder.status === 'invoiced'}
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