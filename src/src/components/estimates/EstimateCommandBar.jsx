import React from 'react';
import { BrainCircuit, CheckCircle2, ChevronDown, Eye, Send, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import EstimateTemplateSelector from '@/components/estimates/EstimateTemplateSelector';
import SaveStateIndicator from '@/components/shared/SaveStateIndicator';
import ConvertToWorkOrderButton from '@/components/workorders/ConvertToWorkOrderButton';
import ConvertToInvoiceButton from '@/components/estimates/ConvertToInvoiceButton';

function getInitials(name) {
  if (!name) return 'YG';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function CommandDivider() {
  return <div className="hidden h-14 w-px shrink-0 bg-slate-200 lg:block" />;
}

function StatusCard({ children, className = '', onClick, disabled, title }) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-[54px] shrink-0 items-center justify-center gap-3 rounded-2xl px-4 py-2 text-sm font-bold leading-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0' : ''
      } ${className}`}
    >
      {children}
    </Component>
  );
}

export default function EstimateCommandBar({
  estimate,
  statusBadge,
  saving,
  savedAt,
  dirty,
  saveError,
  brainButton,
  healthLoading,
  onTemplateChange,
  onOpenBrain,
  onRunHealthCheck,
  onOpenPreview,
  onOpenSendReview,
  onCancel,
  onConverted,
}) {
  const clientName = estimate?.client_name || 'New Estimate';
  const initials = getInitials(clientName);

  return (
    <header className="shrink-0 px-4 pt-4">
      <div className="rounded-[1.35rem] border border-slate-200 bg-white/95 px-4 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-5">
          <div className="flex min-w-0 items-center justify-between gap-4 xl:justify-start">
            <div className="flex min-w-0 items-center gap-4 xl:min-w-[320px]">
              <div className="relative shrink-0">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700 text-lg font-black tracking-tight text-white shadow-[0_10px_24px_rgba(79,70,229,0.30)] ring-1 ring-white/60">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-extrabold tracking-[-0.02em] text-slate-950">{clientName}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${statusBadge?.cls || 'bg-slate-100 text-slate-600'}`}>
                  <Send className="h-3.5 w-3.5" />
                  {statusBadge?.label || 'Draft'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 xl:hidden">
              <PrimaryAction estimate={estimate} onOpenSendReview={onOpenSendReview} onConverted={onConverted} />
              <CloseButton onCancel={onCancel} />
            </div>
          </div>

          <CommandDivider />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:flex xl:min-w-0 xl:flex-1 xl:items-center xl:justify-end xl:gap-3">
            <div className="col-span-2 sm:col-span-1">
              <EstimateTemplateSelector
                currentTemplate={estimate?.document_config?.template || 'clean'}
                onTemplateChange={onTemplateChange}
              />
            </div>

            <StatusCard
              onClick={onOpenBrain}
              title={brainButton?.title}
              className={brainButton?.cls || 'border border-emerald-100 bg-emerald-50 text-emerald-700'}
            >
              <BrainCircuit className="h-5 w-5 shrink-0" />
              <span>IA OK</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${brainButton?.badgeCls || 'bg-emerald-600 text-white'}`}>{brainButton?.badge || 0}</span>
            </StatusCard>

            <SaveStateIndicator saving={saving} savedAt={savedAt} dirty={dirty} error={saveError} />

            <StatusCard
              onClick={onRunHealthCheck}
              disabled={healthLoading}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              {healthLoading ? <CheckCircle2 className="h-5 w-5 animate-pulse" /> : <ShieldCheck className="h-5 w-5" />}
              <span className="flex flex-col items-start">
                <span>Salud</span>
                <span className="text-xs text-blue-700/90">{healthLoading ? 'Revisando' : 'Optima'}</span>
              </span>
            </StatusCard>

            <StatusCard onClick={onOpenPreview} className="bg-violet-50 text-violet-700 hover:bg-violet-100">
              <Eye className="h-5 w-5" />
              <span className="flex flex-col items-start">
                <span>Vista cliente</span>
                <span className="text-xs text-violet-700/90">Abrir</span>
              </span>
            </StatusCard>
          </div>

          <div className="hidden shrink-0 items-center gap-3 xl:flex">
            <PrimaryAction estimate={estimate} onOpenSendReview={onOpenSendReview} onConverted={onConverted} />
            <CloseButton onCancel={onCancel} />
          </div>
        </div>
      </div>
    </header>
  );
}

function PrimaryAction({ estimate, onOpenSendReview, onConverted }) {
  return (
    <div className="flex shrink-0 items-stretch overflow-hidden rounded-2xl shadow-[0_14px_28px_rgba(30,27,75,0.22)]">
      <Button
        onClick={onOpenSendReview}
        className="h-14 rounded-none rounded-l-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-950 px-5 text-sm font-extrabold text-white hover:from-indigo-900 hover:to-blue-900"
      >
        <Send className="mr-2 h-5 w-5" />
        Revisar y Enviar
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-14 rounded-none rounded-r-2xl border-l border-white/15 bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-950 px-3 text-white hover:from-indigo-900 hover:to-blue-900">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <ConvertToWorkOrderButton estimate={estimate} onConverted={onConverted} asDropdownItem />
          <ConvertToInvoiceButton estimate={estimate} onConverted={onConverted} asDropdownItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CloseButton({ onCancel }) {
  return (
    <button
      type="button"
      onClick={onCancel}
      className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      aria-label="Close editor"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
