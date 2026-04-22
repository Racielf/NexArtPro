/**
 * AgentTestRunnerPanel
 * Admin-only read-only UI to run the agent test harness via backend function.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import { FlaskConical, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function AgentTestRunnerPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke('agentTestRunner', {});
      const data = res?.data;
      if (data?.error && !data?.results?.length) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err?.message || 'Failed to run agent tests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsSection
      title="Agent Test Runner"
      description="Execute the internal agent rule harness server-side and verify all test cases pass."
    >
      <SettingsCard>
        <div className="px-5 py-5 space-y-5">
          {/* Run button */}
          <div className="flex items-center gap-4">
            <button
              onClick={run}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FlaskConical className="w-4 h-4" />
              }
              {loading ? 'Running…' : 'Run Agent Tests'}
            </button>

            {/* Summary badge */}
            {result && !loading && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                result.passed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {result.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <XCircle className="w-3.5 h-3.5" />
                }
                {result.passed ? 'All tests passed' : 'Some tests failed'}
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="font-semibold">Error: </span>{error}
            </div>
          )}

          {/* Results table */}
          {result?.results?.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Expected</th>
                    <th className="px-4 py-3">Actual</th>
                    <th className="px-4 py-3 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={r.name} className={`border-b border-slate-100 last:border-0 ${r.passed ? '' : 'bg-red-50/40'}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono">{r.expected}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-mono ${
                          r.passed ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'
                        }`}>{r.actual}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.passed
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                          : <XCircle className="w-4 h-4 text-red-500 inline" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}