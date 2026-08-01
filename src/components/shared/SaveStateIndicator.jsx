import { Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

function timeAgo(ts, language) {
  if (!ts) return '';
  const sec = Math.round((Date.now() - (typeof ts === 'number' ? ts : ts.getTime())) / 1000);
  if (sec < 5) return language === 'es' ? 'ahora' : 'now';
  if (sec < 60) return language === 'es' ? `hace ${sec}s` : `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return language === 'es' ? `hace ${min}m` : `${min}m ago`;
  return language === 'es' ? `hace ${Math.round(min / 60)}h` : `${Math.round(min / 60)}h ago`;
}

function StateCard({ icon: Icon, title, subtitle, className, compact }) {
  return (
    <span className={`inline-flex items-center font-bold leading-tight shadow-none ${compact ? 'h-9 gap-2 rounded-full px-3 text-xs' : 'min-h-[46px] gap-3 rounded-2xl px-5 py-2 text-sm'} ${className}`}>
      <Icon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} shrink-0`} />
      <span className={`flex items-start leading-tight ${compact ? 'flex-row gap-1' : 'flex-col'}`}>
        <span>{title}</span>
        {subtitle && <span className={compact ? 'font-medium opacity-70' : ''}>{compact ? `· ${subtitle}` : subtitle}</span>}
      </span>
    </span>
  );
}

export default function SaveStateIndicator({ saving, savedAt, dirty, error, compact = false }) {
  const { language, t } = useLanguage();
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => forceRender(n => n + 1), 15000);
    return () => clearInterval(t);
  }, [savedAt]);

  if (error) {
    return <StateCard compact={compact} icon={AlertCircle} title={t('common.saveFailed')} subtitle={t('common.retrying')} className="border border-red-200 bg-red-50 text-red-700" />;
  }

  if (saving) {
    return <StateCard compact={compact} icon={Loader2} title={t('common.saving')} className="border border-slate-200 bg-slate-50 text-slate-600" />;
  }

  if (dirty) {
    return <StateCard compact={compact} icon={Save} title={t('common.unsaved')} className="border border-amber-200 bg-amber-50 text-amber-700" />;
  }

  if (savedAt) {
    return <StateCard compact={compact} icon={Check} title={t('common.saved')} subtitle={timeAgo(savedAt, language)} className="border border-emerald-100 bg-emerald-50/70 text-emerald-700" />;
  }

  return null;
}
