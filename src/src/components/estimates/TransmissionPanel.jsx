import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getLatestTransmission, listTransmissions } from '@/lib/estimateTransmission';
import { getTransmissionStatus, formatTransmissionTime } from '@/lib/transmissionStatus';
import { generateSignedPdfUrl } from '@/lib/estimateDocumentAccess';
import { ChevronDown, ChevronUp, CheckCircle2, ExternalLink, FileSignature, XCircle } from 'lucide-react';

/**
 * TransmissionPanel — Minimal transmission + client decision status for estimate.
 * Shows latest email transmission and, when available, client signature/decline details.
 */
export default function TransmissionPanel({ estimateId }) {
  const [latest, setLatest] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openingSignedPdf, setOpeningSignedPdf] = useState(false);

  useEffect(() => {
    if (!estimateId) return;
    loadPanelData();
  }, [estimateId]);

  const loadPanelData = async () => {
    setLoading(true);
    const [latestTx, estimateRows] = await Promise.all([
      getLatestTransmission(estimateId),
      base44.entities.Estimate.filter({ id: estimateId }).catch(() => []),
    ]);

    setLatest(latestTx);
    setEstimate(estimateRows?.[0] || null);

    if (latestTx) {
      const historyTx = await listTransmissions(estimateId, 10);
      setHistory(historyTx);
    }
    setLoading(false);
  };

  const openSignedDocument = async () => {
    if (!estimate?.final_signed_pdf_url) return;
    setOpeningSignedPdf(true);
    try {
      const url = await generateSignedPdfUrl(estimate.final_signed_pdf_url);
      if (url) window.open(url, '_blank', 'noreferrer');
    } finally {
      setOpeningSignedPdf(false);
    }
  };

  if (loading) return null;

  const isSigned = ['approved', 'signed', 'converted'].includes(estimate?.status) || !!estimate?.signed_at;
  const isDeclined = estimate?.status === 'declined' || !!estimate?.declined_at;

  return (
    <div className="space-y-2">
      {isSigned && (
        <div className="border border-emerald-200 rounded-lg overflow-hidden bg-emerald-50">
          <div className="px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Signed / Approved</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {estimate?.signature_name || estimate?.accepted_by || 'Client'}
                {estimate?.signed_at ? ` • ${formatTransmissionTime(estimate.signed_at)}` : ''}
              </p>
              {estimate?.terms_accepted && (
                <p className="text-[11px] text-emerald-700 mt-1">Terms accepted electronically.</p>
              )}
              {estimate?.converted_work_order_id && (
                <p className="text-[11px] text-emerald-700 mt-1">Converted to Work Order.</p>
              )}
            </div>
            {estimate?.final_signed_pdf_url && (
              <button
                type="button"
                onClick={openSignedDocument}
                disabled={openingSignedPdf}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              >
                <FileSignature className="w-3 h-3" />
                {openingSignedPdf ? 'Opening…' : 'Signed PDF'}
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {isDeclined && (
        <div className="border border-red-200 rounded-lg overflow-hidden bg-red-50">
          <div className="px-4 py-3 flex items-start gap-3">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Declined</p>
              <p className="text-xs text-red-700 mt-0.5">
                {estimate?.declined_at ? formatTransmissionTime(estimate.declined_at) : 'Client declined this estimate.'}
              </p>
              {estimate?.declined_reason && (
                <p className="text-[11px] text-red-700 mt-1 line-clamp-3">{estimate.declined_reason}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {latest && <TransmissionHistory latest={latest} history={history} expanded={expanded} setExpanded={setExpanded} />}
    </div>
  );
}

function TransmissionHistory({ latest, history, expanded, setExpanded }) {
  const status = getTransmissionStatus(latest);
  if (!status) return null;

  const Icon = status.icon;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
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
