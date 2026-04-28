import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

const VARIANTS = {
  signing: {
    shell: 'mt-2 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]',
    inner: 'px-5 py-5',
    logoWrap: 'mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm',
    note: 'This brand mark is shown only in the secure signing experience and final signing credits.',
  },
  document: {
    shell: 'rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-[0_20px_60px_-34px_rgba(15,23,42,0.28)]',
    inner: 'px-6 py-6',
    logoWrap: 'mt-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm',
    note: 'This mark closes the shared signing document and mirrors the secure signing experience.',
  },
};

export default function SignatureBrandCredit({ logoUrl, variant = 'signing' }) {
  if (!logoUrl) return null;

  const style = VARIANTS[variant] || VARIANTS.signing;

  return (
    <section className={style.shell}>
      <div className={style.inner}>
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Signature Credits</span>
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        </div>

        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-slate-900">Verified signing identity</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{style.note}</p>
        </div>

        <div className={style.logoWrap}>
          <div className="flex items-center justify-center">
            <img src={logoUrl} alt="Signature brand" className="max-h-11 w-auto object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
}
