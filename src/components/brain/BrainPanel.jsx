import React from 'react';
import { runSystemBrainV2 } from '@/brain/system/systemBrain';

export default function BrainPanel() {
  const [state, setState] = React.useState({ loading: true, data: null, error: '' });

  React.useEffect(() => {
    let mounted = true;

    async function loadBrain() {
      try {
        const data = await runSystemBrainV2({ modules: [], context: {} });
        if (mounted) setState({ loading: false, data, error: '' });
      } catch (err) {
        if (mounted) setState({ loading: false, data: null, error: err?.message || 'Brain unavailable' });
      }
    }

    loadBrain();
    return () => { mounted = false; };
  }, []);

  if (state.loading) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">Loading Brain status...</div>;
  }

  if (state.error) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-red-600">{state.error}</div>;
  }

  const { modeSummary, approvalSummary, prioritySummary, meta } = state.data || {};

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Mode Summary</p>
        <p className="mt-2 text-sm text-slate-700">Can analyze: {String(modeSummary?.canAnalyze)}</p>
        <p className="text-sm text-slate-700">Can suggest: {String(modeSummary?.canSuggest)}</p>
        <p className="text-sm text-slate-700">Can execute: {String(modeSummary?.canExecute)}</p>
        <p className="mt-2 text-xs text-slate-500">{modeSummary?.reason}</p>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Approval Summary</p>
        <p className="mt-2 text-sm text-slate-700">Evaluated: {String(approvalSummary?.evaluated)}</p>
        <p className="mt-2 text-xs text-slate-500">{approvalSummary?.reason || 'No action pending.'}</p>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Priority Summary</p>
        <p className="mt-2 text-sm font-semibold text-slate-800">{prioritySummary?.currentPriority || 'monitoring'}</p>
        <p className="mt-2 text-xs text-slate-500">{prioritySummary?.reason}</p>
        <p className="mt-2 text-[11px] text-slate-400">Analyzed: {meta?.analyzedAt ? new Date(meta.analyzedAt).toLocaleString() : 'n/a'}</p>
      </section>
    </div>
  );
}
