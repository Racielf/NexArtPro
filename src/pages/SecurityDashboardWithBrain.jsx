import React, { useEffect, useState } from 'react';
import { nexartClient } from '@/api/nexartClient';
import securityBrain from '@/brain/modules/securityBrain';
import SecurityDashboard from './SecurityDashboard';
import { Brain, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

const LEVEL_STYLE = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-red-200 bg-red-50 text-red-800',
  unknown: 'border-slate-200 bg-slate-50 text-slate-700',
};

function SecurityBrainInsights() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      try {
        const [securityLogs, auditLogs] = await Promise.all([
          nexartClient.entities.AuthSecurityLog.list('-created_date', 500).catch(() => []),
          nexartClient.entities.AuditLog.list('-performed_at', 500).catch(() => []),
        ]);

        const brainResult = await securityBrain({
          entity: { securityLogs },
          related: { auditLogs },
          context: { page: 'SecurityDashboard' },
        });

        if (mounted) setResult(brainResult);
      } catch (err) {
        console.warn('[Security Brain] analysis failed:', err?.message || err);
        if (mounted) setResult(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-400">
          <Brain className="w-4 h-4 animate-pulse" />
          Security Brain analyzing recent events…
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4" />
          Security Brain unavailable — dashboard remains read-only.
        </div>
      </div>
    );
  }

  const style = LEVEL_STYLE[result.level] || LEVEL_STYLE.unknown;
  const activeRisks = (result.risks || []).filter(r => r.status !== 'pass');
  const topChecks = activeRisks.slice(0, 3);
  const suggestions = result.decision?.suggestedActions?.length
    ? result.decision.suggestedActions
    : result.suggestions || [];

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className={`rounded-xl border px-4 py-3 ${style}`}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
                {result.level === 'healthy' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold">Security Brain Insights</p>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/70 border border-current/10">
                    Score {result.score} · {result.level}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-90">
                  {result.decision?.nextAction || 'Security events analyzed. No immediate recommendation.'}
                </p>
              </div>
            </div>

            <div className="lg:text-right text-xs opacity-80">
              <p>{result.meta?.securityLogCount || 0} security events · {result.meta?.auditLogCount || 0} audit entries</p>
              {result.meta?.analyzedAt && <p>Analyzed {new Date(result.meta.analyzedAt).toLocaleString()}</p>}
            </div>
          </div>

          {(topChecks.length > 0 || suggestions.length > 0) && (
            <div className="mt-3 grid md:grid-cols-2 gap-3">
              {topChecks.length > 0 && (
                <div className="rounded-lg bg-white/60 border border-current/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Active Risks</p>
                  <div className="space-y-1">
                    {topChecks.map(check => (
                      <p key={check.id} className="text-xs">
                        <span className="font-semibold">{check.label}:</span> {check.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="rounded-lg bg-white/60 border border-current/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Suggested Actions</p>
                  <div className="space-y-1">
                    {suggestions.slice(0, 3).map((action, index) => (
                      <p key={`${action}-${index}`} className="text-xs">• {action}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboardWithBrain() {
  return (
    <>
      <SecurityBrainInsights />
      <SecurityDashboard />
    </>
  );
}
