import React from 'react';
import { Calendar, Navigation2, CheckSquare, Send, ThumbsUp, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  { id: 'schedule', label: 'Schedule', icon: Calendar, link: true },
  { id: 'omw', label: 'OMW', icon: Navigation2 },
  { id: 'finish', label: 'Finish', icon: CheckSquare },
  { id: 'sent', label: 'Send', icon: Send },
  { id: 'approved', label: 'Approval', icon: ThumbsUp },
  { id: 'converted', label: 'Copy to Job', icon: Copy },
];

const statusToIdx = {
  draft: 0,
  sent: 3,
  approved: 4,
  declined: 3,
  converted: 5,
};

export default function EstimateStatusStepper({ status, estimate }) {
  const currentIdx = statusToIdx[status] ?? 0;

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;

        const circle = (
          <div className="flex flex-col items-center gap-1" style={{ minWidth: 70 }}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
              isDone
                ? 'bg-primary border-primary'
                : isActive
                ? 'bg-primary border-primary'
                : 'bg-white border-slate-300'
            }`}>
              <Icon className={`w-4.5 h-4.5 ${isDone || isActive ? 'text-white' : 'text-slate-400'}`} style={{ width: 18, height: 18 }} />
            </div>
            <span className={`text-xs font-semibold whitespace-nowrap ${
              isActive ? 'text-primary' : isDone ? 'text-slate-700' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
            {isActive && step.id === 'finish' && (
              <span className="text-xs text-slate-400 -mt-0.5 whitespace-nowrap" style={{ fontSize: 10 }}>
                Sent to customer
              </span>
            )}
            {isActive && step.id === 'approved' && (
              <span className="text-xs text-orange-500 -mt-0.5 whitespace-nowrap font-medium" style={{ fontSize: 10 }}>
                Awaiting Approval
              </span>
            )}
          </div>
        );

        return (
          <div key={step.id} className="flex items-center">
            {step.id === 'schedule' && estimate?.id ? (
              <Link to={`/schedule-estimate?id=${estimate.id}`} className="hover:opacity-80 transition-opacity">
                {circle}
              </Link>
            ) : circle}
            {idx < steps.length - 1 && (
              <div className={`h-0.5 mb-5 transition-colors`} style={{ width: 32, background: idx < currentIdx ? 'hsl(var(--primary))' : '#e2e8f0' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}