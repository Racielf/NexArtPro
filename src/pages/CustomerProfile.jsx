import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, Home, HardHat,
  Calendar, FileText, ClipboardList, Receipt, Plus, Pencil,
  ChevronRight, Clock, DollarSign, User, StickyNote, AlertTriangle
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

const TYPE_ICONS = { residential: Home, commercial: Building2, contractor: HardHat };
const TYPE_COLORS = {
  residential: 'bg-blue-50 text-blue-700 border-blue-200',
  commercial: 'bg-purple-50 text-purple-700 border-purple-200',
  contractor: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function CustomerProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('id');

  const [customer, setCustomer] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => { if (customerId) loadAll(); }, [customerId]);

  const loadAll = async () => {
    setLoading(true);
    const [cust, appts, ests, wos, invs] = await Promise.all([
      base44.entities.Customer.filter({ id: customerId }),
      base44.entities.Appointment.filter({ customer_id: customerId }, '-created_date', 20),
      base44.entities.Estimate.filter({ client_id: customerId }, '-created_date', 20),
      base44.entities.WorkOrder.filter({ client_id: customerId }, '-created_date', 20),
      base44.entities.Invoice.filter({ client_id: customerId }, '-created_date', 20),
    ]);
    if (cust.length) {
      setCustomer(cust[0]);
      setNoteText(cust[0].internal_notes || '');
    }
    setAppointments(appts);
    setEstimates(ests);
    setWorkOrders(wos);
    setInvoices(invs);
    setLoading(false);
  };

  const handleSaveNote = async () => {
    await base44.entities.Customer.update(customerId, { internal_notes: noteText });
    setCustomer(c => ({ ...c, internal_notes: noteText }));
    setEditingNote(false);
    toast.success('Note saved');
  };

  const handleCreateEstimate = async () => {
    const estNum = Math.floor(Math.random() * 9000) + 1000;
    const fullAddr = [customer.service_address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ');
    const est = await base44.entities.Estimate.create({
      estimate_number: estNum,
      client_id: customer.id,
      client_name: customer.display_name || `${customer.first_name} ${customer.last_name}`,
      client_email: customer.email || '',
      client_phone: customer.phone || '',
      client_address: fullAddr,
      status: 'draft',
      groups: [],
    });
    // Update local state so button switches to "Open Estimate" immediately
    setEstimates(prev => [est, ...prev]);
    navigate(`/estimate-editor?id=${est.id}`);
  };

  const handleCreateAppointment = () => {
    navigate(`/appointments?customer_id=${customerId}&customer_name=${encodeURIComponent(customer.display_name || `${customer.first_name} ${customer.last_name}`)}`);
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!customer) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Customer not found</p>
        <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
      </div>
    </div>
  );

  const displayName = customer.display_name || `${customer.first_name} ${customer.last_name}`;
  const fullAddress = [customer.service_address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ');
  const TypeIcon = TYPE_ICONS[customer.customer_type] || Home;
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const pendingRevenue = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total || 0), 0);
  const latestEstimate = estimates[0];
  const latestWorkOrder = workOrders[0];

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'appointments', label: `Appointments (${appointments.length})` },
    { id: 'estimates', label: `Estimates (${estimates.length})` },
    { id: 'work_orders', label: `Work Orders (${workOrders.length})` },
    { id: 'invoices', label: `Invoices (${invoices.length})` },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/customers')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
              {(customer.first_name?.[0] || '?').toUpperCase()}{(customer.last_name?.[0] || '').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">{displayName}</h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${TYPE_COLORS[customer.customer_type] || TYPE_COLORS.residential}`}>
                  <TypeIcon className="w-2.5 h-2.5" />{customer.customer_type}
                </span>
                {customer.do_not_service && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle className="w-2.5 h-2.5" />Do Not Service
                  </span>
                )}
              </div>
              {customer.company_name && <p className="text-xs text-slate-400">{customer.company_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCreateAppointment}>
              <Calendar className="w-3.5 h-3.5 mr-1.5" />Schedule
            </Button>
            {estimates.length > 0 ? (
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => navigate(`/estimate-editor?id=${estimates[0].id}`)}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />Open Estimate
              </Button>
            ) : (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={handleCreateEstimate}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Create Estimate
              </Button>
            )}
            <button onClick={() => navigate(`/customers?edit=${customerId}`)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <Pencil className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR — contact info */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Contact */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contact</p>
              <div className="space-y-2">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{customer.email}
                  </a>
                )}
              </div>
            </div>

            {/* Address */}
            {fullAddress && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Service Address</p>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{fullAddress}</span>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Financials</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Collected</span>
                  <span className="font-bold text-green-600">${totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Pending</span>
                  <span className="font-semibold text-orange-600">${pendingRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Jobs</span>
                  <span className="font-semibold text-slate-700">{workOrders.length}</span>
                </div>
              </div>
            </div>

            {/* Quick notes */}
            {customer.notes && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Customer Notes</p>
                <p className="text-xs text-slate-600 leading-relaxed">{customer.notes}</p>
              </div>
            )}

            <div className="text-[10px] text-slate-300 pt-2 border-t border-slate-100">
              Customer since {customer.created_date ? format(new Date(customer.created_date), 'MMM yyyy') : '—'}
            </div>
          </div>
        </div>

        {/* RIGHT — tabs + content */}
        <div className="flex-1 overflow-auto flex flex-col">

          {/* TAB BAR */}
          <div className="bg-white border-b border-slate-200 px-6 flex-shrink-0">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  {/* Quick action cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Appointments', value: appointments.length, icon: Calendar, color: 'text-blue-600 bg-blue-50', onClick: () => setActiveTab('appointments') },
                      { label: 'Estimates', value: estimates.length, icon: FileText, color: 'text-orange-600 bg-orange-50', onClick: () => setActiveTab('estimates') },
                      { label: 'Work Orders', value: workOrders.length, icon: ClipboardList, color: 'text-purple-600 bg-purple-50', onClick: () => setActiveTab('work_orders') },
                      { label: 'Invoices', value: invoices.length, icon: Receipt, color: 'text-green-600 bg-green-50', onClick: () => setActiveTab('invoices') },
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <button key={card.label} onClick={card.onClick}
                          className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:shadow-md hover:border-slate-300 transition-all">
                          <div className={`w-8 h-8 rounded-lg ${card.color.split(' ')[1]} flex items-center justify-center mb-2`}>
                            <Icon className={`w-4 h-4 ${card.color.split(' ')[0]}`} />
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                          <p className="text-xs text-slate-500">{card.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Recent activity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Latest appointment */}
                    {appointments[0] && (
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Latest Appointment</p>
                          <StatusBadge status={appointments[0].status} />
                        </div>
                        <p className="font-semibold text-sm text-slate-800">{appointments[0].title || appointments[0].service_type}</p>
                        <p className="text-xs text-slate-500 mt-1">{appointments[0].appointment_date} {appointments[0].start_time && `· ${appointments[0].start_time}`}</p>
                        {appointments[0].assigned_worker_name && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" />{appointments[0].assigned_worker_name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Latest estimate */}
                    {latestEstimate && (
                      <button className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:shadow-md transition-all w-full"
                        onClick={() => navigate(`/estimate-editor?id=${latestEstimate.id}`)}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Latest Estimate</p>
                          <StatusBadge status={latestEstimate.status} />
                        </div>
                        <p className="font-semibold text-sm text-slate-800">#{latestEstimate.estimate_number}</p>
                        <p className="text-lg font-bold text-primary">${(latestEstimate.total || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          Open in editor <ChevronRight className="w-3 h-3" />
                        </p>
                      </button>
                    )}

                    {/* Latest work order */}
                    {latestWorkOrder && (
                      <button className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:shadow-md transition-all w-full"
                        onClick={() => navigate(`/work-order-detail?id=${latestWorkOrder.id}`)}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Latest Work Order</p>
                          <StatusBadge status={latestWorkOrder.status} />
                        </div>
                        <p className="font-semibold text-sm text-slate-800">WO#{latestWorkOrder.work_order_number}</p>
                        <p className="text-sm text-slate-600">{latestWorkOrder.title}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          View details <ChevronRight className="w-3 h-3" />
                        </p>
                      </button>
                    )}

                    {/* Latest invoice */}
                    {invoices[0] && (
                      <button className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:shadow-md transition-all w-full"
                        onClick={() => navigate(`/invoice-detail?id=${invoices[0].id}`)}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Latest Invoice</p>
                          <StatusBadge status={invoices[0].status} />
                        </div>
                        <p className="font-semibold text-sm text-slate-800">INV#{invoices[0].invoice_number}</p>
                        <p className="text-lg font-bold text-slate-900">${(invoices[0].total || 0).toLocaleString()}</p>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* APPOINTMENTS */}
              {activeTab === 'appointments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
                    <Button size="sm" onClick={handleCreateAppointment}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Schedule
                    </Button>
                  </div>
                  {appointments.length === 0 ? (
                    <EmptyState icon={Calendar} message="No appointments yet" action={{ label: 'Schedule Appointment', onClick: handleCreateAppointment }} />
                  ) : appointments.map(a => (
                    <div key={a.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-slate-800">{a.title || a.service_type || 'Appointment'}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{a.appointment_date} {a.start_time && `· ${a.start_time}`}</p>
                        {a.assigned_worker_name && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><User className="w-3 h-3" />{a.assigned_worker_name}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  ))}
                </div>
              )}

              {/* ESTIMATES */}
              {activeTab === 'estimates' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{estimates.length} estimate{estimates.length !== 1 ? 's' : ''}</p>
                    <Button size="sm" onClick={handleCreateEstimate}>
                      <Plus className="w-3.5 h-3.5 mr-1" />New Estimate
                    </Button>
                  </div>
                  {estimates.length === 0 ? (
                    <EmptyState icon={FileText} message="No estimates yet" action={{ label: 'Create Estimate', onClick: handleCreateEstimate }} />
                  ) : estimates.map(e => (
                    <button key={e.id} className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 hover:shadow-sm hover:border-primary/30 transition-all text-left"
                      onClick={() => navigate(`/estimate-editor?id=${e.id}`)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-slate-800">#{e.estimate_number}</p>
                          <StatusBadge status={e.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{e.title || 'No title'} · ${(e.total || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{e.created_date ? format(new Date(e.created_date), 'MMM d, yyyy') : ''}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* WORK ORDERS */}
              {activeTab === 'work_orders' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}</p>
                  </div>
                  {workOrders.length === 0 ? (
                    <EmptyState icon={ClipboardList} message="No work orders yet" note="Work orders are created from approved estimates" />
                  ) : workOrders.map(w => (
                    <button key={w.id} className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-all text-left"
                      onClick={() => navigate(`/work-order-detail?id=${w.id}`)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-slate-800">WO#{w.work_order_number}</p>
                          <StatusBadge status={w.status} />
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{w.title}</p>
                        {w.assigned_worker_name && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><User className="w-3 h-3" />{w.assigned_worker_name}</p>}
                      </div>
                      <p className="text-sm font-bold text-primary">${(w.total || 0).toLocaleString()}</p>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* INVOICES */}
              {activeTab === 'invoices' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
                  </div>
                  {invoices.length === 0 ? (
                    <EmptyState icon={Receipt} message="No invoices yet" note="Invoices are created from completed work orders" />
                  ) : invoices.map(inv => (
                    <button key={inv.id} className="w-full bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-all text-left"
                      onClick={() => navigate(`/invoice-detail?id=${inv.id}`)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-slate-800">INV#{inv.invoice_number}</p>
                          <StatusBadge status={inv.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{inv.due_date && `Due: ${inv.due_date}`}</p>
                      </div>
                      <p className={`text-sm font-bold ${inv.status === 'paid' ? 'text-green-600' : 'text-slate-900'}`}>
                        ${(inv.total || 0).toLocaleString()}
                      </p>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {customer.notes && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Customer Notes (visible to client)</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{customer.notes}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Internal Notes</p>
                      {!editingNote && (
                        <button onClick={() => setEditingNote(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Pencil className="w-3 h-3" />Edit
                        </button>
                      )}
                    </div>
                    {editingNote ? (
                      <div className="space-y-2">
                        <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={5} className="text-sm resize-none" placeholder="Internal team notes..." />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => { setEditingNote(false); setNoteText(customer.internal_notes || ''); }}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveNote}>Save Note</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 leading-relaxed">{noteText || <span className="text-slate-400 italic">No internal notes yet. Click edit to add.</span>}</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message, note, action }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center">
      <Icon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">{message}</p>
      {note && <p className="text-xs text-slate-400 mt-1">{note}</p>}
      {action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          <Plus className="w-3.5 h-3.5 mr-1" />{action.label}
        </Button>
      )}
    </div>
  );
}