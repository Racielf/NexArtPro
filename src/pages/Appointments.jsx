import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar, List, CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { logComm, logCommFailed } from '@/lib/commTracking';

import ApptSummaryCards from '@/components/appointments/ApptSummaryCards';
import ApptFilters from '@/components/appointments/ApptFilters';
import ApptListRow from '@/components/appointments/ApptListRow';
import ApptDetailPanel from '@/components/appointments/ApptDetailPanel';
import ApptFormModal from '@/components/appointments/ApptFormModal';

const defaultFilters = { search: '', status: 'all', dateRange: 'all', assignedTo: '' };

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [appts, custs, ws] = await Promise.all([
      base44.entities.Appointment.list('-appointment_date'),
      base44.entities.Customer.list('-created_date'),
      base44.entities.Worker.filter({ active: true }),
    ]);
    setAppointments(appts);
    setCustomers(custs);
    setWorkers(ws);
    setLoading(false);
  };

  const applyFilters = (list) => {
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    return list.filter(a => {
      const q = filters.search.toLowerCase();
      if (q && ![a.customer_display_name, a.service_address, a.customer_phone, a.service_type, a.title, a.description]
        .filter(Boolean).some(f => f.toLowerCase().includes(q))) return false;
      if (filters.status !== 'all' && a.status !== filters.status) return false;
      if (filters.dateRange === 'today' && a.appointment_date !== today) return false;
      if (filters.dateRange === 'week' && (a.appointment_date < today || a.appointment_date > weekEnd)) return false;
      if (filters.dateRange === 'upcoming' && a.appointment_date < today) return false;
      if (filters.dateRange === 'past' && a.appointment_date >= today) return false;
      if (filters.assignedTo && !a.assigned_worker_name?.toLowerCase().includes(filters.assignedTo.toLowerCase())) return false;
      return true;
    });
  };

  const filtered = applyFilters(appointments);

  useEffect(() => {
    if (selected) {
      const refreshed = appointments.find(a => a.id === selected.id);
      setSelected(refreshed || null);
    }
  }, [appointments]);

  const handleSave = async (form) => {
    if (!form.customer_display_name || !form.appointment_date) {
      toast.error('Customer name and date are required');
      return;
    }
    let saved;
    const user = await base44.auth.me();
    if (editing) {
      await base44.entities.Appointment.update(editing.id, form);
      saved = { ...editing, ...form };
      toast.success('Appointment updated');
      // If worker changed, log the assignment
      if (form.assigned_worker_id && form.assigned_worker_id !== editing.assigned_worker_id) {
        await base44.entities.JobAssignment.create({
          work_order_id: editing.id,
          work_order_number: editing.id,
          worker_id: form.assigned_worker_id,
          worker_name: form.assigned_worker_name,
          client_name: form.customer_display_name,
          title: form.title || 'Appointment',
          scheduled_date: form.appointment_date || '',
          action: editing.assigned_worker_id ? 'reassigned' : 'assigned',
          assigned_by: user?.full_name || user?.email || 'Admin',
          previous_worker_name: editing.assigned_worker_name || null,
        });
      }
    } else {
      saved = await base44.entities.Appointment.create(form);
      toast.success('Appointment created');
      // Log assignment if worker was selected
      if (form.assigned_worker_id) {
        await base44.entities.JobAssignment.create({
          work_order_id: saved.id,
          work_order_number: saved.id,
          worker_id: form.assigned_worker_id,
          worker_name: form.assigned_worker_name,
          client_name: form.customer_display_name,
          title: form.title || 'Appointment',
          scheduled_date: form.appointment_date || '',
          action: 'assigned',
          assigned_by: user?.full_name || user?.email || 'Admin',
        });
      }
      if (form.notify_customer && form.customer_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: form.customer_email,
            subject: 'Appointment Scheduled',
            body: `Hi ${form.customer_display_name},\n\nYour appointment has been scheduled!\nDate: ${form.appointment_date}\nTime: ${form.start_time || ''}\nLocation: ${form.service_address || ''}\n\nSee you then!`,
          });
          await logComm({
            event_type: 'appointment_created',
            client_id: form.customer_id,
            client_name: form.customer_display_name,
            client_email: form.customer_email,
            appointment_id: saved.id,
            subject: 'Appointment Scheduled',
            preview: `${form.appointment_date} at ${form.start_time}`,
          });
        } catch {
          await logCommFailed({
            event_type: 'appointment_created',
            client_name: form.customer_display_name,
            client_email: form.customer_email,
            appointment_id: saved.id,
            subject: 'Appointment Scheduled',
          });
        }
      }
    }
    setShowForm(false);
    setEditing(null);
    await loadData();
  };

  const handleStatusChange = async (id, newStatus) => {
    const now = new Date().toISOString();
    const extra = {};
    if (newStatus === 'on_the_way') extra.omw_started_at = now;
    if (newStatus === 'arrived') extra.arrived_at = now;
    if (newStatus === 'visit_completed') extra.completed_at = now;
    await base44.entities.Appointment.update(id, { status: newStatus, ...extra });
    toast.success(`Status: ${newStatus.replace(/_/g, ' ')}`);
    await loadData();
  };

  const openEdit = (appt) => { setEditing(appt); setShowForm(true); };

  const today = new Date().toISOString().split('T')[0];
  const todayAppts = filtered.filter(a => a.appointment_date === today);
  const upcomingAppts = filtered.filter(a => a.appointment_date > today);
  const pastAppts = filtered.filter(a => a.appointment_date < today);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Appointments</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage all visits, inspections, and on-site appointments</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {['today', 'week', 'all'].map(range => (
                <button
                  key={range}
                  onClick={() => setFilters(f => ({ ...f, dateRange: range }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filters.dateRange === range ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {range === 'all' ? 'All' : range === 'today' ? 'Today' : 'This Week'}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('agenda')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'agenda' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-8 text-xs"
              onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="w-3.5 h-3.5" />New Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0">
        <ApptSummaryCards appointments={appointments} />
      </div>

      {/* FILTERS */}
      <div className="px-6 pb-3 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5">
          <ApptFilters filters={filters} onChange={setFilters} onClear={() => setFilters(defaultFilters)} />
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden gap-0 px-6 pb-6">

        {/* List */}
        <div className="flex flex-col bg-white rounded-l-xl border border-slate-200 overflow-hidden flex-1">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <span className="text-xs font-semibold text-slate-500">
              {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
            </span>
            <button onClick={loadData} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Calendar className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No appointments found</p>
                <p className="text-xs text-slate-300 mt-1">Adjust filters or create a new appointment</p>
                <Button size="sm" className="mt-4 text-xs" onClick={() => { setEditing(null); setShowForm(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" />New Appointment
                </Button>
              </div>
            ) : viewMode === 'list' ? (
              <div>
                {filtered.map(appt => (
                  <ApptListRow key={appt.id} appt={appt} isSelected={selected?.id === appt.id}
                    onClick={() => setSelected(selected?.id === appt.id ? null : appt)} />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayAppts.length > 0 && (
                  <div>
                    <div className="sticky top-0 px-4 py-2 bg-blue-50 border-b border-blue-100 z-10">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Today · {today}</span>
                    </div>
                    {todayAppts.map(appt => <ApptListRow key={appt.id} appt={appt} isSelected={selected?.id === appt.id} onClick={() => setSelected(selected?.id === appt.id ? null : appt)} />)}
                  </div>
                )}
                {upcomingAppts.length > 0 && (
                  <div>
                    <div className="sticky top-0 px-4 py-2 bg-slate-50 border-b border-slate-200 z-10">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Upcoming</span>
                    </div>
                    {upcomingAppts.map(appt => <ApptListRow key={appt.id} appt={appt} isSelected={selected?.id === appt.id} onClick={() => setSelected(selected?.id === appt.id ? null : appt)} />)}
                  </div>
                )}
                {pastAppts.length > 0 && (
                  <div>
                    <div className="sticky top-0 px-4 py-2 bg-slate-50 border-b border-slate-200 z-10">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Past</span>
                    </div>
                    {pastAppts.map(appt => <ApptListRow key={appt.id} appt={appt} isSelected={selected?.id === appt.id} onClick={() => setSelected(selected?.id === appt.id ? null : appt)} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 xl:w-80 flex-shrink-0 bg-white border border-l-0 border-slate-200 rounded-r-xl overflow-hidden">
            <ApptDetailPanel
              appt={selected}
              onClose={() => setSelected(null)}
              onEdit={() => openEdit(selected)}
              onStatusChange={handleStatusChange}
              onRefresh={loadData}
            />
          </div>
        )}
      </div>

      <ApptFormModal
        open={showForm}
        onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}
        editing={editing}
        customers={customers}
        workers={workers}
        onSave={handleSave}
      />
    </div>
  );
}