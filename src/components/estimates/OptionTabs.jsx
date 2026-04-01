import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OptionTabs({ options, activeOption, onOptionChange, onAddOption }) {
  return (
    <div className="flex items-center border-b border-border">
      <h1 className="text-xl font-semibold text-foreground pr-8">Estimate</h1>
      
      <div className="flex items-center">
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => onOptionChange(option.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeOption === option.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            Option #{index + 1}
          </button>
        ))}
        
        <button
          onClick={onAddOption}
          className="px-4 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Add option
        </button>
      </div>
    </div>
  );
}