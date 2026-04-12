/**
 * SaveStateIndicator — Lightweight save-state badge for document editors.
 *
 * Props:
 *   saving    — boolean, true while a persist operation is in-flight
 *   savedAt   — Date|number|null, timestamp of last successful save
 *   dirty     — boolean, true if there are unsaved local changes
 *   error     — boolean, true if last save failed
 */
import { Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

function timeAgo(ts) {
  if (!ts) return '';
  const sec = Math.round((Date.now() - (typeof ts === 'number' ? ts : ts.getTime())) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}

export default function SaveStateIndicator({ saving, savedAt, dirty, error }) {
  const [, forceRender] = useState(0);

  // Re-render every 15s to keep "saved Xm ago" fresh
  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => forceRender(n => n + 1), 15000);
    return () => clearInterval(t);
  }, [savedAt]);

  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Save failed · retrying…
      </span>
    );
  }

  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (dirty) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <Save className="w-3 h-3" />
        Unsaved changes
      </span>
    );
  }

  if (savedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <Check className="w-3 h-3" />
        Saved {timeAgo(savedAt)}
      </span>
    );
  }

  return null;
}