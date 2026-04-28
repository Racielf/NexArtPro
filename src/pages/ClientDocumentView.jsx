/**
 * ClientDocumentView — RETIRED
 *
 * This route (/client-document) has been retired.
 * The document_token lookup strategy was never deployed — no entity
 * stores a document_token field, so this page always returned "not found".
 *
 * Authoritative public document routes:
 *   Proposals  → /proposal-view?id=<proposalId>
 *   Estimates  → /client-estimate?token=<publicShareToken>
 *
 * This file is kept as a safety net in case an old link is clicked.
 * It renders a clear redirect guide rather than a broken "not found" error.
 */
import React from 'react';
import { Link } from 'lucide-react';

export default function ClientDocumentView() {
  const urlParams = new URLSearchParams(window.location.search);
  const id    = urlParams.get('id');
  const type  = urlParams.get('type');  // optional hint

  // Best-effort redirect: if caller passed ?type=proposal&id=xxx, send them there
  if (id && type === 'proposal') {
    window.location.replace(`/proposal-view?id=${id}`);
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Link className="w-5 h-5 text-slate-400" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">Link Not Found</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          This document link is outdated. Please ask your service provider to resend the document.
        </p>
      </div>
    </div>
  );
}
