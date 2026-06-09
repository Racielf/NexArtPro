import React from 'react';
import { CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function SendReviewBanners({ sentSuccess, sentError, recipientEmail, clientLink, docLabel }) {
  return (
    <>
      {sentSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-3 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-900">{docLabel} sent successfully!</p>
            <p className="text-xs text-green-700 mt-1">Sent to: <span className="font-medium">{recipientEmail}</span></p>
            <div className="mt-2 flex items-center gap-2 bg-white rounded-md border border-green-200 px-3 py-1.5">
              <span className="text-xs text-slate-600 truncate">Client link: {clientLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(clientLink); toast.success('Link copied!'); }}
                className="p-1 hover:bg-green-50 rounded text-green-600 flex-shrink-0"
                title="Copy link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {sentError && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Send failed</p>
            <p className="text-xs text-red-700 mt-0.5">{sentError}</p>
          </div>
        </div>
      )}
    </>
  );
}