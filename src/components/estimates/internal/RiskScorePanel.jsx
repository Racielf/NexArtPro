/**
 * RiskScorePanel — Internal Risk & Complexity Insights
 * 
 * Non-invasive panel that displays:
 * - Complexity score
 * - Risk level
 * - Suggested contingency
 * - Warnings for user awareness
 * 
 * Does NOT modify document, pricing, or totals.
 * Internal-only, never shown in preview or to client.
 */

import React from 'react';
import { AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';

export default function RiskScorePanel({ riskData }) {
  if (!riskData) return null;

  const { complexityScore, riskScore, riskLevel, suggestedContingencyPercent, warnings } = riskData;

  // Color scheme for risk level
  const levelConfig = {
    low: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      icon: 'text-emerald-600',
      label: 'Bajo riesgo'
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      icon: 'text-amber-600',
      label: 'Riesgo medio'
    },
    high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      icon: 'text-red-600',
      label: 'Alto riesgo'
    }
  };

  const config = levelConfig[riskLevel] || levelConfig.low;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${config.icon}`} />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            🔒 Análisis de Riesgo
          </span>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {/* Complexity Score */}
        <div className="bg-white/60 rounded-lg px-2 py-1.5 border border-slate-100">
          <p className="text-slate-400 font-semibold mb-0.5">Complejidad</p>
          <p className={`text-base font-bold ${config.text}`}>{complexityScore}</p>
          <p className="text-slate-400 text-[9px] mt-0.5">sobre 100</p>
        </div>

        {/* Risk Score */}
        <div className="bg-white/60 rounded-lg px-2 py-1.5 border border-slate-100">
          <p className="text-slate-400 font-semibold mb-0.5">Riesgo</p>
          <p className={`text-base font-bold ${config.text}`}>{riskScore}</p>
          <p className="text-slate-400 text-[9px] mt-0.5">sobre 100</p>
        </div>

        {/* Suggested Contingency */}
        <div className="bg-white/60 rounded-lg px-2 py-1.5 border border-slate-100">
          <p className="text-slate-400 font-semibold mb-0.5">Contingencia</p>
          <p className={`text-base font-bold ${config.text}`}>{suggestedContingencyPercent}%</p>
          <p className="text-slate-400 text-[9px] mt-0.5">sugerida</p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200/50">
          {warnings.map((warning, idx) => (
            <div key={idx} className="flex gap-2 items-start text-[10px]">
              <AlertTriangle className={`w-3 h-3 flex-shrink-0 mt-0.5 ${config.icon}`} />
              <p className={config.text}>{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      <p className="text-[9px] text-slate-400 italic pt-1">
        Este análisis es interno. No afecta el documento del cliente.
      </p>
    </div>
  );
}