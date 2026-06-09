import React, { useState, useEffect } from 'react';
import { nexartClient } from '@/api/nexartClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Pencil, ToggleLeft, ToggleRight, Phone, Mail, MapPin,
  Calendar, DollarSign, ShieldCheck, AlertTriangle, Briefcase,
  ClipboardList, FileText, StickyNote, User
} from 'lucide-react';
import WorkerDocuments from './WorkerDocuments';
import WorkerNotes from './WorkerNotes';
import WorkerFormModal from './WorkerFormModal';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';

const TRADE_LABELS = {
  electrician: '⚡ Electrician', plumber: '🔧 Plumber', carpenter: '🪚 Carpenter',
  painter: '🖌️ Painter', hvac: '❄️ HVAC', general: '🔨 General',
  supervisor: '👷 Supervisor', other: '🔩 Other',
};
const TYPE_COLORS = {
  employee: 'bg-blue-100 text-blue-700',
  subcontractor: 'bg-purple-100 text-purple-700',
  agent: 'bg-teal-100 text-teal-700',
};
const ROLE_COLORS = {
  technician: 'bg-sky-100 text-sky-700',
  lead: 'bg-violet-100 text-violet-700',
  supervisor: 'bg-amber-100 text-amber-700',
  subcontractor: 'bg-slate-100 text-slate-600',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'notes', label: 'Notes' },
];

export default function WorkerProfile({ worker, onBack, onUpdated }) {
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    if (activeTab === 'assignments') loadAssignments();
  }, [activeTab, worker.id]);

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    const wos = await nexartClient.entities.WorkOrder.filter({ assigned_worker_id: worker.id }, '-created_date', 20);
    setAssignments(wos);
    setLoadingAssignments(false);
  };

  const handleToggleActive = async () => {
    await nexartClient.entities.Worker.update(worker.id, { active: !worker.active });
    toast.success(worker.active !== false ? 'Worker deactivated' : 'Worker activated');
    onUpdated();
  };

  const isExpired = (d) => d && new Date(d) < new Date();
  const isExpiringSoon = (d) => {
    if (!d) return false;
    const days = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days < 30;
  };
  const fmt = (d) => d ? format(new Date(d), 'MMM d, yyyy') : '—';

  const isActive = worker.active !== false;
  const fullAddress = [worker.address, worker.city, worker.state, worker.zip].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
            {worker.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{worker.full_name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[worker.worker_type] || 'bg-slate-100 text-slate-600'}`}>
                {worker.worker_type || 'employee'}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[worker.role] || 'bg-slate-100 text-slate-600'}`}>
                {worker.role}
              </span>
              <span className="text-xs text-slate-400">{TRADE_LABELS[worker.trade] || worker.trade}</span>
            </div>
            {worker.company_name && <p className="text-xs text-slate-400 mt-0.5">{worker.company_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleActive}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            {isActive
              ? <><ToggleRight className="w-4 h-4 text-green-500" />Deactivate</>
              : <><ToggleLeft className="w-4 h-4 text-slate-400" />Activate</>}
          </button>
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1" />Edit
          </Button>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="bg-white border-b border-slate-200 px-6 flex-shrink-0">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              {/* Contact */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {worker.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${worker.phone}`} className="text-sm text-primary hover:underline">{worker.phone}</a>
                    </div>
                  )}
                  {worker.alternate_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-300" />
                      <a href={`tel:${worker.alternate_phone}`} className="text-sm text-primary hover:underline">{worker.alternate_phone} <span className="text-slate-400 text-xs">(alt)</span></a>
                    </div>
                  )}
                  {worker.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${worker.email}`} className="text-sm text-primary hover:underline">{worker.email}</a>
                    </div>
                  )}
                  {fullAddress && (
                    <div className="flex items-start gap-2 col-span-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="text-sm text-slate-700">{fullAddress}</span>
                    </div>
                  )}
                  {worker.emergency_contact && (
                    <div className="col-span-2 bg-red-50 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-600 mb-0.5">Emergency Contact</p>
                      <p className="text-sm text-slate-700">{worker.emergency_contact}
                        {worker.emergency_phone && <span className="text-slate-400 ml-2">{worker.emergency_phone}</span>}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* HR & Compliance */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">HR & Compliance</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {worker.start_date && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Start Date</p>
                      <p className="text-sm font-medium text-slate-800">{fmt(worker.start_date)}</p>
                    </div>
                  )}
                  {worker.hire_date && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Hire Date</p>
                      <p className="text-sm font-medium text-slate-800">{fmt(worker.hire_date)}</p>
                    </div>
                  )}
                  {worker.end_date && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />End Date</p>
                      <p className="text-sm font-medium text-slate-800">{fmt(worker.end_date)}</p>
                    </div>
                  )}
                  {worker.hourly_rate && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><DollarSign className="w-3 h-3" />Hourly Rate</p>
                      <p className="text-sm font-medium text-slate-800">${worker.hourly_rate}/hr</p>
                    </div>
                  )}
                  {worker.license_number && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Briefcase className="w-3 h-3" />License #</p>
                      <p className="text-sm font-medium text-slate-800">{worker.license_number}</p>
                    </div>
                  )}
                  {worker.license_expiry && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                        {isExpired(worker.license_expiry) ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <ShieldCheck className="w-3 h-3" />}
                        License Expiry
                      </p>
                      <p className={`text-sm font-medium ${isExpired(worker.license_expiry) ? 'text-red-600' : isExpiringSoon(worker.license_expiry) ? 'text-amber-600' : 'text-slate-800'}`}>
                        {fmt(worker.license_expiry)}
                        {isExpired(worker.license_expiry) && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">EXPIRED</span>}
                        {isExpiringSoon(worker.license_expiry) && !isExpired(worker.license_expiry) && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Soon</span>}
                      </p>
                    </div>
                  )}
                  {worker.insurance_expiry && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                        {isExpired(worker.insurance_expiry) ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <ShieldCheck className="w-3 h-3" />}
                        Insurance Expiry
                      </p>
                      <p className={`text-sm font-medium ${isExpired(worker.insurance_expiry) ? 'text-red-600' : isExpiringSoon(worker.insurance_expiry) ? 'text-amber-600' : 'text-slate-800'}`}>
                        {fmt(worker.insurance_expiry)}
                        {isExpired(worker.insurance_expiry) && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">EXPIRED</span>}
                        {isExpiringSoon(worker.insurance_expiry) && !isExpired(worker.insurance_expiti) && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Soon</span>}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes on overview */}
              {(worker.notes || worker.internal_notes) && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Notes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {worker.notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1">Team Notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{worker.notes}</p>
                      </div>
                    )}
                    {worker.internal_notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1">Internal Notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{worker.internal_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <WorkerDocuments worker={worker} />
            </div>
          )}

          {/* ── ASSIGNMENTS ── */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Work orders assigned to {worker.full_name}</p>
              {loadingAssignments ? (
                <div className="text-center py-8 text-slate-400">Loading assignments...</div>
              ) : assignments.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center">
                  <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No work orders assigned yet</p>
                </div>
              ) : (
                assignments.map(wo => (
                  <div key={wo.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800">WO#{wo.work_order_number}</span>
                        <StatusBadge status={wo.status} />
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{wo.title}</p>
                      <p className="text-xs text-slate-400">{wo.client_name}{wo.scheduled_date ? ` · ${wo.scheduled_date}` : ''}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">${(wo.total || 0).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Static notes from worker record */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Worker Notes (from profile)</h3>
                  <button onClick={() => setShowEdit(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Team Notes</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{worker.notes || <span className="italic text-slate-400">No notes</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Internal Notes (admin only)</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{worker.internal_notes || <span className="italic text-slate-400">No internal notes</span>}</p>
                  </div>
                </div>
              </div>

              {/* Activity notes (WorkerNote records) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <WorkerNotes worker={worker} />
              </div>
            </div>
          )}

        </div>
      </div>

      <WorkerFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        worker={worker}
        onSaved={onUpdated}
      />
    </div>
  );
}