import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, ToggleLeft, ToggleRight, Phone, Mail, MapPin, Calendar, DollarSign, ShieldCheck, AlertTriangle, FileText, StickyNote, Briefcase } from 'lucide-react';
import WorkerDocuments from './WorkerDocuments';
import WorkerNotes from './WorkerNotes';
import WorkerFormModal from './WorkerFormModal';
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

export default function WorkerProfile({ worker, onBack, onUpdated }) {
  const [showEdit, setShowEdit] = useState(false);

  const handleToggleActive = async () => {
    await base44.entities.Worker.update(worker.id, { active: !worker.active });
    toast.success(worker.active ? 'Worker deactivated' : 'Worker activated');
    onUpdated();
  };

  const isExpired = (d) => d && new Date(d) < new Date();
  const isExpiringSoon = (d) => {
    if (!d) return false;
    const days = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days < 30;
  };

  const fmt = (d) => d ? format(new Date(d), 'MMM d, yyyy') : '—';

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
            ${worker.active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
            {worker.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{worker.full_name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${worker.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {worker.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[worker.worker_type] || 'bg-slate-100 text-slate-600'}`}>
                {worker.worker_type || 'employee'}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[worker.role] || 'bg-slate-100 text-slate-600'}`}>
                {worker.role}
              </span>
              <span className="text-xs text-slate-400">{TRADE_LABELS[worker.trade] || worker.trade}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleActive}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            {worker.active
              ? <><ToggleRight className="w-4 h-4 text-green-500" />Deactivate</>
              : <><ToggleLeft className="w-4 h-4 text-slate-400" />Activate</>}
          </button>
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1" />Edit
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Contact Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {worker.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${worker.phone}`} className="text-sm text-primary hover:underline">{worker.phone}</a>
                </div>
              )}
              {worker.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${worker.email}`} className="text-sm text-primary hover:underline">{worker.email}</a>
                </div>
              )}
              {worker.address && (
                <div className="flex items-start gap-2 col-span-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <span className="text-sm text-slate-700">{worker.address}</span>
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

          {/* HR Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">HR & Compliance</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Hire Date</p>
                <p className="text-sm font-medium text-slate-800">{fmt(worker.hire_date)}</p>
              </div>
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
                    {isExpiringSoon(worker.insurance_expiry) && !isExpired(worker.insurance_expiry) && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Soon</span>}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <WorkerDocuments worker={worker} />
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <WorkerNotes worker={worker} />
          </div>
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