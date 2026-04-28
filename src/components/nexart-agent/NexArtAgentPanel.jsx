import React from 'react';
import { runSystemBrainV2 } from '@/brain/system/systemBrain';

export default function NexArtAgentPanel() {
  const [state, setState] = React.useState({ loading: true, data: null, error: '' });

  React.useEffect(() => {
    let mounted = true;

    async function loadAgent() {
      try {
        const data = await runSystemBrainV2({ modules: [], context: {} });
        if (mounted) setState({ loading: false, data, error: '' });
      } catch (err) {
        if (mounted) setState({ loading: false, data: null, error: err?.message || 'Agent unavailable' });
      }
    }

    loadAgent();
    return () => { mounted = false; };
  }, []);

  if (state.loading) return <div className="p-4 border rounded-xl bg-white">Loading NexArt Agent...</div>;
  if (state.error) return <div className="p-4 border rounded-xl bg-white text-red-600">{state.error}</div>;

  const { modeSummary, approvalSummary, prioritySummary } = state.data || {};

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="p-4 border rounded-xl bg-white">
        <h3 className="font-semibold mb-2">Agent Mode</h3>
        <p>Analyze: {String(modeSummary?.canAnalyze)}</p>
        <p>Suggest: {String(modeSummary?.canSuggest)}</p>
        <p>Execute: {String(modeSummary?.canExecute)}</p>
      </div>

      <div className="p-4 border rounded-xl bg-white">
        <h3 className="font-semibold mb-2">Approval</h3>
        <p>{approvalSummary?.reason || 'No actions pending'}</p>
      </div>

      <div className="p-4 border rounded-xl bg-white">
        <h3 className="font-semibold mb-2">Priority</h3>
        <p>{prioritySummary?.currentPriority || 'monitoring'}</p>
      </div>
    </div>
  );
}
