import React, { useState } from 'react';
import { Eye, EyeOff, Send, Paperclip, ChevronDown, ChevronUp, Lock, FileText } from 'lucide-react';
import { getTemplateOptions } from '@/lib/estimateTemplates';

function SectionAccordion({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer group">
      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

const VISIBILITY_LABELS = {
  businessLogo: 'Business logo',
  businessName: 'Business name',
  businessAddress: 'Business address',
  estimateNumber: 'Estimate #',
  estimateName: 'Estimate name',
  estimateMessage: 'Estimate summary / message',
  customerName: 'Customer display name',
  estimateDate: 'Estimate date',
  expirationDate: 'Expiration date',
  serviceDate: 'Service date',
  technicianName: 'Technician name',
  services: 'Services',
  prices: 'Prices & totals',
  materialsSection: 'Materials section',
};

export default function SendReviewSidePanel({
  currentTemplate,
  onTemplateChange,
  recipientEmail,
  onRecipientEmailChange,
  subject,
  onSubjectChange,
  message,
  onMessageChange,
  visibility,
  onVisibilityChange,
  attachments = [],
  estimateNumber,
}) {
  const setVis = (key, val) => onVisibilityChange({ ...visibility, [key]: val });

  return (
    <div className="w-[300px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">

      {/* LAYOUT - TEMPLATE SELECTOR */}
      <SectionAccordion title="Layout" icon={<Eye className="w-3.5 h-3.5" />}>
        <p className="text-xs text-slate-400 mb-3">Select document template</p>
        <div className="space-y-2">
          {getTemplateOptions().map(template => (
            <button
              key={template.value}
              onClick={() => onTemplateChange(template.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                currentTemplate === template.value
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="text-left flex-1 min-w-0">
                <p className={`text-xs font-semibold ${currentTemplate === template.value ? 'text-primary' : 'text-slate-800'}`}>
                  {template.label}
                </p>
                <p className="text-[11px] text-slate-400">{template.description}</p>
              </div>
              {currentTemplate === template.value && (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </SectionAccordion>

      {/* DETAILS (email) */}
      <SectionAccordion title="Details" icon={<Send className="w-3.5 h-3.5" />}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1 font-medium">To</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => onRecipientEmailChange(e.target.value)}
              placeholder="client@email.com"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1 font-medium">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => onSubjectChange(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1 font-medium">Message</label>
            <textarea
              value={message}
              onChange={e => onMessageChange(e.target.value)}
              rows={4}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>
      </SectionAccordion>

      {/* ATTACHMENTS */}
      <SectionAccordion title="Attachments" icon={<Paperclip className="w-3.5 h-3.5" />} defaultOpen={true}>
        {/* Auto-generated PDF */}
        <div className="flex items-center gap-2 py-1 mb-2">
          <div className="w-7 h-7 bg-red-50 border border-red-200 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-red-500">PDF</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700">estimate-{estimateNumber}.pdf</p>
            <p className="text-[10px] text-slate-400">Auto-generated · via secure link</p>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[9px] font-semibold text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Client
          </span>
        </div>

        {/* Client-sendable attachments */}
        {(() => {
          const allAtts = Array.isArray(attachments) ? attachments : [];
          const clientAtts = allAtts.filter(a => a.intent === 'send_to_client');
          const internalAtts = allAtts.filter(a => a.intent !== 'send_to_client');
          return (
            <>
              {clientAtts.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Included with email ({clientAtts.length})</p>
                  {clientAtts.map(att => (
                    <div key={att.id} className="flex items-center gap-2 py-1">
                      <div className="w-7 h-7 bg-blue-50 border border-blue-200 rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{att.file_name || 'file'}</p>
                        <p className="text-[10px] text-slate-400">Download link in email</p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[9px] font-semibold text-blue-700">
                        <Send className="w-2.5 h-2.5" />Client
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {internalAtts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Internal only ({internalAtts.length}) — not sent</p>
                  {internalAtts.map(att => (
                    <div key={att.id} className="flex items-center gap-2 py-1 opacity-60">
                      <div className="w-7 h-7 bg-slate-50 border border-slate-200 rounded flex items-center justify-center flex-shrink-0">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500 truncate flex-1">{att.file_name || 'file'}</p>
                    </div>
                  ))}
                </div>
              )}
              {allAtts.length === 0 && (
                <p className="text-[11px] text-slate-400 py-1">No extra attachments. Upload files in the editor sidebar.</p>
              )}
            </>
          );
        })()}
      </SectionAccordion>

      {/* VISIBILITY */}
      <SectionAccordion title="Visibility" icon={<EyeOff className="w-3.5 h-3.5" />} defaultOpen={true}>
        <p className="text-[11px] text-slate-400 mb-2">Choose what appears in the document</p>
        <div className="space-y-0.5">
          {Object.entries(VISIBILITY_LABELS).map(([key, label]) => (
            <ToggleRow
              key={key}
              label={label}
              checked={visibility[key]}
              onChange={val => setVis(key, val)}
            />
          ))}
        </div>
      </SectionAccordion>

    </div>
  );
}