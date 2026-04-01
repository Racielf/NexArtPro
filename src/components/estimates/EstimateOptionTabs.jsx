import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function EstimateOptionTabs() {
  const [tabs, setTabs] = useState(['Option #1']);
  const [active, setActive] = useState(0);

  const addTab = () => {
    const next = `Option #${tabs.length + 1}`;
    setTabs([...tabs, next]);
    setActive(tabs.length);
  };

  return (
    <div className="flex items-center gap-0 border-b border-transparent -mb-px">
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => setActive(idx)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === idx
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab}
        </button>
      ))}
      <button
        onClick={addTab}
        className="flex items-center gap-1 px-3 py-2.5 text-sm text-slate-400 hover:text-primary transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add option
      </button>
    </div>
  );
}