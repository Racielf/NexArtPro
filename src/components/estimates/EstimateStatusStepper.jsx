import React from 'react';
import { Calendar, Navigation, CheckSquare, Send, ThumbsUp, Copy } from 'lucide-react';

const steps = [
  { id: 'scheduled', label: 'Schedule', icon: Calendar },
  { id: 'omw', label: 'OMW', icon: Navigation },
  { id: 'completed', label: 'Finish', icon: CheckSquare },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'approved', label: 'Approval', icon: ThumbsUp },
  { id: 'converted', label: 'Copy to Job', icon: Copy },
];

const statusOrder = ['scheduled', 'omw', 'completed', 'sent', 'approved', 'converted'];

export default function EstimateStatusStepper({ status }) {
  const currentIdx = statusOrder.indexOf(status);

  return (
    <div className="flex items-center justify-between max-w-2xl">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isDone
                  ? 'bg-primary border-primary'
                  : isActive
                  ? 'bg-primary border-primary'
                  : 'bg-white border-slate-300'
              }`}>
                <Icon className={`w-3.5 h-3.5 ${isDone || isActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                isActive ? 'text-primary' : isDone ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-10 h-0.5 mx-1 mb-4 ${idx < currentIdx ? 'bg-primary' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}