import React from 'react';
import { Calendar, Navigation2, CheckSquare, Send, ThumbsUp, Copy } from 'lucide-react';

const steps = [
  { id: 'scheduled', label: 'Schedule', icon: Calendar },
  { id: 'omw', label: 'OMW', icon: Navigation2 },
  { id: 'completed', label: 'Finish', icon: CheckSquare },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'approved', label: 'Approval', icon: ThumbsUp },
  { id: 'converted', label: 'Copy to Job', icon: Copy },
];

const statusOrder = ['scheduled', 'omw', 'completed', 'sent', 'approved', 'converted'];

// Map estimate statuses to stepper
const statusMap = {
  draft: 2,       // after Finish (visited site)
  sent: 3,
  approved: 4,
  declined: 3,
  converted: 5,
};

export default function EstimateStatusStepper({ status }) {
  const currentIdx = statusMap[status] ?? 2;

  return (
    <div className="flex items-center">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                isDone ? 'bg-primary border-primary' :
                isActive ? 'bg-white border-primary ring-2 ring-primary/20' :
                'bg-white border-slate-200'
              }`}>
                <Icon className={`w-4 h-4 ${isDone ? 'text-white' : isActive ? 'text-primary' : 'text-slate-300'}`} />
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                isActive ? 'text-primary' : isDone ? 'text-slate-600' : 'text-slate-300'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 mb-4 ${idx < currentIdx ? 'bg-primary' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}