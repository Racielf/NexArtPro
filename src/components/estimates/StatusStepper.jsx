import React from 'react';
import { Calendar, Truck, Square, Send, CheckCircle, Copy } from 'lucide-react';

const steps = [
  { id: 'schedule', label: 'SCHEDULE', icon: Calendar },
  { id: 'omw', label: 'OMW', icon: Truck },
  { id: 'finish', label: 'FINISH', icon: Square },
  { id: 'send', label: 'SEND', sublabel: 'Sent to customer', icon: Send },
  { id: 'approval', label: 'APPROVAL', sublabel: 'Awaiting Approval', icon: CheckCircle },
  { id: 'copy', label: 'COPY TO JOB', icon: Copy },
];

export default function StatusStepper({ currentStep = 'approval' }) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-between w-full max-w-3xl">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index <= currentIndex;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex flex-col items-center relative">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div 
                className={`absolute top-5 left-1/2 w-full h-0.5 ${
                  index < currentIndex ? 'bg-primary' : 'bg-border'
                }`}
                style={{ width: 'calc(100% + 2rem)', marginLeft: '1.5rem' }}
              />
            )}
            
            {/* Icon container */}
            <div 
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                isCurrent 
                  ? 'bg-primary border-primary text-white' 
                  : isActive 
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-border text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            
            {/* Labels */}
            <span className={`mt-2 text-xs font-medium ${
              isActive ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.label}
            </span>
            {step.sublabel && (
              <span className="text-[10px] text-muted-foreground">
                {step.sublabel}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}