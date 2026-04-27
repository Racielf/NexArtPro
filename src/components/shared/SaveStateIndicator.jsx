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

function StateCard({ icon: Icon, title, subtitle, className }) {
  return (
    <span className={`inline-flex min-h-[46px] items-center gap-3 rounded-2xl px-5 py-2 text-sm font-bold leading-tight shadow-none ${className}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex flex-col items-start leading-tight">
        <span>{title}</span>
        {subtitle && <span>{subtitle}</span>}
      </span>
    </span>
  );
}

export default function SaveStateIndicator({ saving, savedAt, dirty, error }) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => forceRender(n => n + 1), 15000);
    return () => clearInterval(t);
  }, [savedAt]);

  if (error) {
    return <StateCard icon={AlertCircle} title="Save failed" subtitle="Retrying" className="border border-red-200 bg-red-50 text-red-700" />;
  }

  if (saving) {
    return <StateCard icon={Loader2} title="Saving" className="border border-slate-200 bg-slate-50 text-slate-600" />;
  }

  if (dirty) {
    return <StateCard icon={Save} title="Unsaved" subtitle="changes" className="border border-amber-200 bg-amber-50 text-amber-700" />;
  }

  if (savedAt) {
    return <StateCard icon={Check} title="Guardado" subtitle={`hace ${timeAgo(savedAt)}`} className="border-0 bg-emerald-50/80 text-emerald-700" />;
  }

  return null;
}
