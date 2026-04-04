import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar, List, CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { logComm, logCommFailed } from '@/lib/commTracking';

import ApptSummaryCards from '@/components/appointments/ApptSummaryCards';
import ApptFilters from '@/components/appointments/ApptFilters';
import ApptListRow from '@/components/appointments/ApptListRow';
import ApptDetailPanel from '@/components/appointments/ApptDetailPanel';
import ApptFormModal from '@/components/appointments/ApptFormModal';

const defaultFilters = { search: '', status: 'all', dateRange: 'all', assignedTo: '' };

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState('list'); // list | day

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [appts, cls] = await Promise.all([
      base44.entities.Appointment.list('-scheduled_date'),
      base44.entities.Client.list('-created_date'),
    ]);
    setAppointments(appts);
    setClients(cls);
    setLoading(false);
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const applyFilters = (list) => {
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    return list.filter(a => {
      const q = filters.search.toLowerCase();
      if (q && ![a.client_name, a.client_address, a.client_phone, a.service_type, a.title, a.description]
        .filter(Boolean).some(f => f.toLowerCase().includes(q))) return false;

      if (filters.status !== 'all' && a.status !== filters.status) return false;

      if (filters.dateRange === 'today' && a.scheduled_date !== today) return false;
      if (filters.dateRange === 'week' && (a.scheduled_date < today || a.scheduled_date > weekEnd)) return false;
      if (filters.dateRange === 'upcoming' && a.scheduled_date < today) return false;
      if (filters.dateRange === 'past' && a.scheduled_date >= today) return false;

      if (filters.assignedTo && !a.assigned_to?.toLowerCase().includes(filters.assignedTo.toLowerCase())) return false;

      return true;
    });
  };

  const filtered = applyFilters(appointments);

  // Keep selected in sync after reload
  useEffect(() => {
    if (selected) {
      const refreshed = appointments.find(a => a.id === selected.id);
      setSelected(refreshed || null);
    }
  }, [appointments]);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (form, openCustomer = false) => {
    if (!form.client_name || !form.scheduled_date) {
      toast.error('Customer name and date are required');
      return;
    }

    let saved;
    if (editing) {
      await base44.entities.Appointment.update(editing.id, form);
      saved = { ...editing, ...form };
      toast.success('Appointment updated');
    } else {
      saved = await base44.entities.Appointment.create(form);
      toast.success('Appointment created');

      if (form.notify_customer && form.client_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: form.client_email,
            subject: 'Appointment Scheduled',
            body: `Hi ${form.client_name},\n\nYour appointment has been scheduled!\nDate: ${form.scheduled_date}\nTime: ${form.scheduled_time || ''}\nLocation: ${form.client_address || ''}\n\nSee you then!`,
          });
          await logComm({
            event_type: 'appointment_created',
            client_id: form.client_id,
            client_name: form.client_name,
            client_email: form.client_email,
            appointment_id: saved.id,
            subject: 'Appointment Scheduled',
            preview: `${form.scheduled_date} at ${form.scheduled_time}`,
          });
        } catch {
          await logCommFailed({
            event_type: 'appointment_created',
            client_name: form.client_name,
            client_email: form.client_email,
            appointment_id: saved.id,
            subject: 'Appointment Scheduled',
          });
        }
      }
    }

    setShowForm(false);
    setEditing(null);
    await loadData();

    if (openCustomer && form.client_id) {
      window.location.href = '/clients';
    }
  };

  // ─── Status change ────────────────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    await base44.entities.Appointment.update(id, { status: newStatus });
    toast.success(`Marked as ${newStatus.replace(/_/g, ' ')}`);
    loadData();
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────
  const openEdit = (appt) => {
    setEditing(appt);
    setShowForm(true);
  };

  // ─── Day view grouping ────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = filtered.filter(a => a.scheduled_date === today);
  const upcomingAppts = filtered.filter(a => a.scheduled_date > today);
  const pastAppts = filtered.filter(a => a.scheduled_date < today);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Appointments</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage all visits, inspections, and on-site appointments</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggles */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setFilters(f => ({ ...f, dateRange: 'today' }))}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filters.dateRange === 'today' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Today
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dateRange: 'week' }))}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filters.dateRange === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                This Week
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dateRange: 'all' }))}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filters.dateRange === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All
              </button>
            </div>

            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'day' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="Day agenda"
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-8 text-xs"
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="w-3.5 h-3.5" />New Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0">
        <ApptSummaryCards appointments={appointments} />
      </div>

      {/* ── FILTERS ── */}
      <div className="px-6 pb-3 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5">
          <ApptFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(defaultFilters)}
          />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden gap-0 px-6 pb-6">

        {/* List panel */}
        <div className={`flex flex-col bg-white rounded-l-xl border border-slate-200 overflow-hidden transition-all ${selected ? 'flex-1' : 'flex-1'}`}>

          {/* List header */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <span className="text-xs font-semibold text-slate-500">
              {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
            </span>
            <button onClick={loadData} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Calendar className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No appointments found</p>
                <p className="text-xs text-slate-300 mt-1">Try adjusting your filters or create a new appointment</p>
                <Button size="sm" className="mt-4 text-xs" onClick={() => { setEditing(null); setShowForm(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" />New Appointment
                </Button>
              </div>
            ) : viewMode === 'list' ? (
              <div>
                {filtered.map(appt => (
                  <ApptListRow
                    key={appt.id}
                    appt={appt}
                    isSelected={selected?.id === appt.id}
                    onClick={() => setSelected(selected?.id === appt.id ? null : appt)}
                  />
                ))}
              </div>
            ) : (
              /* Day agenda view */
              <div className="divide-y divide-slate-100">
                {todayAppts.length > 0 && (
                  <div>
                    <div className="sticky top-0 px-4 py-2 bg-blue-50 border-b border-blue-100 z-10">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Today · {today}</span>
                    </div>
                    {todayAppts.map(appt => (
                      <ApptListRow key={appt.id} appt={appt} isSelected={selected?.id === appt.id}
                        onClick={() => setSelected(selected?.id === appt.id ? null : appt)} />
                    ))}
                  </div>
                )}
                {upcomingAppts.length > 0 && (
                  <div>
                    <div className="sticky top-0 px-4 py-2 bg-slate-50 border-b border-slate-200 z-10">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Upcoming</span>
                    </div>
                    {upcomingAppts.map(appt => (
                      <ApptListRow key={appt.id} appt={appt} isSelected={selected?.id === appt.id}
                        onClick={() => setSelected(selected?.id === appt.id ? null : appt)} />
                    ))}
                  </div>
                )}
                {pastAppts.length > 0 && (
                  <div>
                    <div className="sticky top-0 px-4 py-2 bg-slate-50 border-b border-slate-200 z-10">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Past</span>
                    </div>
                    {pastAppts.map(appt => (
                      <ApptListRow key={appt.id} appt={appt} isSelected={selected?.id === appt.id}
                        onClick={() => setSelected(selected?.id === appt.id ? null : appt)} />
                    ))}
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
            />
          </div>
        )}
      </div>

      {/* Form modal */}
      <ApptFormModal
        open={showForm}
        onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}
        editing={editing}
        clients={clients}
        onSave={handleSave}
      />
    </div>
  );
}