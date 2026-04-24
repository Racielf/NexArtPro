import React, { useState, useEffect } from 'react';
import { runPriceBookIntelligence } from '@/agent/agent';
import PriceBookSuggestionsPanel from './PriceBookSuggestionsPanel';
import { loadPriceBook, loadServices } from '@/lib/servicePersistence';

export default function PriceBookSection() {
  const [entries, setEntries] = useState([]);
  const [services, setServices] = useState([]);
  const [brainResult, setBrainResult] = useState(null);

  useEffect(() => {
    loadPriceBook().then(setEntries).catch(() => {});
    loadServices().then(setServices).catch(() => {});
  }, []);

  const runBrain = async () => {
    const result = await runPriceBookIntelligence(entries, services);
    setBrainResult(result);
  };

  return (
    <div>

      <button onClick={runBrain} className="mb-4 px-4 py-2 bg-black text-white rounded">
        Analyze Price Book
      </button>

      {brainResult?.suggestionQueue?.length > 0 && (
        <PriceBookSuggestionsPanel
          suggestions={brainResult.suggestionQueue}
          services={services}
          onApplied={async () => {
            const refreshed = await loadPriceBook();
            setEntries(refreshed);
          }}
        />
      )}

      {/* original UI continues unchanged below */}
    </div>
  );
}