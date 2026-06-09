import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { isAdmin } from '@/lib/roleUtils';
import { loadPriceBook, loadServices } from '@/lib/servicePersistence';
import estimateCatalogPricingBrain from '@/brain/modules/estimateCatalogPricingBrain';
import { AlertTriangle, BrainCircuit, DollarSign, X } from 'lucide-react';

const POLL_MS = 60000;
const DISMISS_KEY = 'global_money_brain_dismissed_until';

function shouldSuppressDismissed() {
  try {
    const until = sessionStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch (err) {
    return false;
  }
}

function dismissFor(minutes = 20) {
  try {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now() + minutes * 60 * 1000));
  } catch (err) {
    // no-op
  }
}

function isRelevantEstimate(estimate) {
  if (!estimate) return false;
  if (estimate.deleted_at) return false;
  if (!Array.isArray(estimate.groups) || estimate.groups.length === 0) return false;
  const status = String(estimate.status || 'draft');
  return ['draft', 'sent', 'viewed', 'changes_requested', 'scheduled'].includes(status);
}

export default function GlobalMoneyBrainBanner() {
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [hidden, setHidden] = useState(false);
  const admin = isAdmin();

  useEffect(() => {
    if (!admin) return;

    let mounted = true;

    const load = async () => {
      if (shouldSuppressDismissed()) {
        if (mounted) setAlert(null);
        return;
      }

      try {
        const [estimates, priceBookEntries, services] = await Promise.all([
          base44.entities.Estimate.list('-updated_date', 25).catch(() => []),
          loadPriceBook().catch(() => []),
          loadServices().catch(() => []),
        ]);

        const candidates = (estimates || []).filter(isRelevantEstimate).slice(0, 10);
        const results = [];

        for (const estimate of candidates) {
          const insight = await estimateCatalogPricingBrain({
            groups: estimate.groups || [],
            priceBookEntries,
            services,
          });

          if (insight?.level === 'critical' || insight?.level === 'warning') {
            results.push({ estimate, insight });
          }
        }

        if (!mounted) return;

        if (results.length === 0) {
          setAlert(null);
          return;
        }

        const sorted = results.sort((a, b) => {
          const rank = { critical: 2, warning: 1, healthy: 0 };
          return (rank[b.insight.level] || 0) - (rank[a.insight.level] || 0) || (b.insight.flaggedItems?.length || 0) - (a.insight.flaggedItems?.length || 0);
        });

        const top = sorted[0];
        const criticalCount = sorted.filter(r => r.insight.level === 'critical').length;
        const flaggedTotal = sorted.reduce((sum, r) => sum + (r.insight.flaggedItems?.length || 0), 0);

        setAlert({
          level: criticalCount > 0 ? 'critical' : 'warning',
          count: sorted.length,
          criticalCount,
          flaggedTotal,
          estimateId: top.estimate.id,
          estimateNumber: top.estimate.estimate_number,
          clientName: top.estimate.client_name || 'Unknown client',
          summary: top.insight.summary,
          nextAction: top.insight.nextAction,
        });
      } catch (err) {
        console.warn('[GlobalMoneyBrainBanner] Failed to analyze estimates:', err?.message || err);
        if (mounted) setAlert(null);
      }
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [admin]);

  if (!admin || hidden || !alert) return null;

  const isCritical = alert.level === 'critical';

  return (
    <div className={`${isCritical ? 'bg-violet-700' : 'bg-blue-600'} text-white px-5 py-2.5 border-b border-black/10`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
          {isCritical ? <AlertTriangle className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate">
              Money Brain: {isCritical ? 'Critical pricing risk' : 'Pricing review recommended'}
            </p>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
              {alert.count} estimate{alert.count === 1 ? '' : 's'} · {alert.flaggedTotal} item{alert.flaggedTotal === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-white/85 truncate">
            Estimate #{alert.estimateNumber || '—'} · {alert.clientName}: {alert.summary || alert.nextAction}
          </p>
        </div>

        <button
          onClick={() => navigate(`/estimate-editor?id=${alert.estimateId}`)}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-white text-slate-900 hover:bg-white/90 rounded-lg px-3 py-1.5 transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" />
          Review Estimate
        </button>

        <button
          onClick={() => {
            dismissFor(20);
            setHidden(true);
          }}
          className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors flex-shrink-0"
          title="Dismiss for 20 minutes"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
