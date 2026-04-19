import React, { useState, useEffect } from 'react';
import { getLatestTransmission, listTransmissions } from '@/lib/estimateTransmission';
import { getTransmissionStatus, formatTransmissionTime } from '@/lib/transmissionStatus';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * TransmissionPanel — Minimal transmission status for estimate.
 * Shows latest transmission + history list.
 * Placed in estimate detail/preview screens.
 */
export default function TransmissionPanel({ estimateId }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!estimateId) return;
    loadTransmissions();
  }, [estimateId]);

  const loadTransmissions = async () => {
    setLoading(true);
    const latestTx = await getLatestTransmission(estimateId);
    setLatest(latestTx);

    if (latestTx) {
      const historyTx = await listTransmissions(estimateId, 10);
      setHistory(historyTx);
    }
    setLoading(false);
  };

  if (loading || !latest) return null;

  const status = getTransmissionStatus(latest);
  if (!status) return null;

  const Icon = status.icon;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Header / Latest Transmission */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${status.bg} border-b ${expanded ? 'border-b-slate-200' : ''}`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${status.color}`} />
          <div className="text-left">
            <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {latest.recipient_email} • {formatTransmissionTime(latest.sent_at)}
            </p>
          </div>
        </div>
        {history.length > 1 && (
          expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Transmission Details */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="grid grid-cols-2 gap-3 text-xs">
          {latest.sent_at && (
            <div>
              <p className="text-slate-500">Sent</p>
              <p className="text-slate-700 font-medium">{formatTransmissionTime(latest.sent_at)}</p>
            </div>
          )}
          {latest.delivered_at && (
            <div>
              <p className="text-slate-500">Delivered</p>
              <p className="text-slate-700 font-medium">{formatTransmissionTime(latest.delivered_at)}</p>
            </div>
          )}
          {latest.opened_at && (
            <div>
              <p className="text-slate-500">Opened</p>
              <p className="text-slate-700 font-medium">{formatTransmissionTime(latest.opened_at)}</p>
            </div>
          )}
          {latest.clicked_at && (
            <div>
              <p className="text-slate-500">Clicked</p>
              <p className="text-slate-700 font-medium">{formatTransmissionTime(latest.clicked_at)}</p>
            </div>
          )}
          {latest.bounced_at && (
            <div>
              <p className="text-slate-500">Bounced</p>
              <p className="text-slate-700 font-medium">{formatTransmissionTime(latest.bounced_at)}</p>
            </div>
          )}
          {latest.error_message && (
            <div className="col-span-2">
              <p className="text-slate-500">Error</p>
              <p className="text-red-600 font-medium text-[11px]">{latest.error_message}</p>
            </div>
          )}
        </div>
      </div>

      {/* History List (if expanded and more than 1) */}
      {expanded && history.length > 1 && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">History</p>
          </div>
          <div className="divide-y divide-slate-100">
            {history.slice(1, 6).map((tx, idx) => {
              const txStatus = getTransmissionStatus(tx);
              const TxIcon = txStatus?.icon;
              return (
                <div key={idx} className="px-4 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-2">
                    {TxIcon && <TxIcon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${txStatus.color}`} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700">
                        <span className="font-medium">{txStatus?.label}</span>
                        {' '}→ {tx.recipient_email}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatTransmissionTime(tx.sent_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}