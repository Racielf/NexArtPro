import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import SharedLineItemsTable from './SharedLineItemsTable';
import SharedFinancialSummary from './SharedFinancialSummary';
import { tb, tList, tReplace } from '@/lib/documentTranslations';

/**
 * BidDocumentRenderer — Technical/commercial BID presentation
 * Supports EN, ES, BILINGUAL rendering via `lang` prop.
 *
 * Section order:
 *  1. Header  2. Project Information  3. Scope of Work  4. Base Bid
 *  5. Alternates/Options  6. Inclusions  7. Exclusions  8. Clarifications
 *  9. Commercial Terms  10. Acceptance/Authorization
 */

const formatDate = (d, lang) => {
  if (!d) return null;
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  return new Date(d + 'T12:00:00').toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
};

const S = {
  sectionLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#475569', marginBottom: 10, marginTop: 0 },
  sectionBlock: { marginBottom: 24 },
  bodyText: { fontSize: 12, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 },
  refRow: { display: 'flex', gap: 12, marginBottom: 6, fontSize: 12 },
  refLabel: { color: '#94a3b8', fontWeight: 600, minWidth: 120 },
  refValue: { color: '#0f172a', fontWeight: 500 },
  tinyLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 },
};

function SectionTitle({ enKey, lang }) {
  const text = tb('bid', enKey, lang);
  if (lang !== 'bilingual') {
    return <div style={S.sectionLabel}>{text}</div>;
  }
  const [en, es] = text.split('\n');
  return (
    <div style={{ ...S.sectionLabel, lineHeight: 1.6 }}>
      {en}
      {es && <span style={{ display: 'block', fontSize: 9, color: '#64748b', fontWeight: 600, marginTop: 1 }}>{es}</span>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return value ? (
    <div style={S.refRow}>
      <span style={S.refLabel}>{label}</span>
      <span style={S.refValue}>{value}</span>
    </div>
  ) : null;
}

export default function BidDocumentRenderer({ estimate, options = {}, lang: langProp }) {
  if (!estimate) return null;

  const lang = langProp || estimate?.document_language || 'en';
  const T = (key) => tb('bid', key, lang);
  const primaryLang = lang === 'bilingual' ? 'en' : lang;

  const opts = {
    showPrices: options.showPrices !== false,
    showBreakdown: options.showBreakdown !== false,
    showTerms: options.showTerms !== false,
    showSignatures: options.showSignatures !== false,
    hideInternalNotes: options.hideInternalNotes !== false,
  };

  const today = formatDate(new Date().toISOString().split('T')[0], primaryLang);
  const expDate = formatDate(estimate.expiration_date, primaryLang);
  const startDate = formatDate(estimate.project_start_date, primaryLang);
  const endDate = formatDate(estimate.project_end_date, primaryLang);

  const allGroups = estimate.groups?.length
    ? estimate.groups
    : estimate.line_items?.length
      ? [{ id: 'legacy', name: 'Base Bid', items: estimate.line_items.map(li => ({ id: li.id, service_name: li.name || li.service_name || '', description: li.description || '', quantity: li.quantity || 1, unit: li.unit || 'ea', unit_price: li.unit_price || 0, line_total: li.total_price || li.line_total || 0 })) }]
      : [];

  const isAlternate = (g) => /^(alternate|option|add.?on)/i.test(g.name || '');
  const baseGroups = allGroups.filter(g => !isAlternate(g));
  const alternateGroups = allGroups.filter(g => isAlternate(g));

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = estimate.deposit_amount || (total * depositPct / 100);
  const remaining = total - depositAmount;

  const fmtAmt = (n) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div style={{ fontFamily: "'Inter', Arial, sans-serif", fontSize: 13, lineHeight: 1.55, background: 'white', color: '#0f172a', minWidth: 640 }}>

      {/* ═══════ 1. HEADER ═══════ */}
      <div style={{ background: '#0f172a', padding: '32px 48px 26px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, background: '#1e293b', borderRadius: 10, border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 40 40" width="26" height="26" fill="none">
                  <path d="M8 28L20 12L32 28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 28V22H25V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>{appConfig.company.name}</div>
                <div style={{ color: '#64748b', fontSize: 10 }}>{appConfig.company.tagline}</div>
              </div>
            </div>
            <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.8 }}>
              {appConfig.company.address}<br />{appConfig.company.email} · {appConfig.company.phone}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', marginBottom: 4 }}>{T('docLabel')}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1 }}>#{estimate.estimate_number || '—'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{today}</div>
            {expDate && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{T('validUntil')}: {expDate}</div>}
          </div>
        </div>
      </div>

      {/* ═══════ 2. PROJECT INFORMATION ═══════ */}
      <div style={{ padding: '28px 48px', borderBottom: '1px solid #e2e8f0' }}>
        <SectionTitle enKey="projectInformation" lang={lang} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div style={S.tinyLabel}>{T('ownerClient')}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{estimate.client_name}</div>
            {estimate.client_address && <div style={{ color: '#475569', fontSize: 12, marginBottom: 2 }}>{estimate.client_address}</div>}
            {estimate.client_email && <div style={{ color: '#64748b', fontSize: 11 }}>{estimate.client_email}</div>}
            {estimate.client_phone && <div style={{ color: '#64748b', fontSize: 11 }}>{estimate.client_phone}</div>}
          </div>
          <div>
            <div style={S.tinyLabel}>{T('references')}</div>
            <InfoRow label={T('jobNumber')} value={estimate.job_number} />
            <InfoRow label={T('planReference')} value={estimate.plan_reference} />
            {startDate && <InfoRow label={T('startDate')} value={startDate} />}
            {endDate && <InfoRow label={T('completion')} value={endDate} />}
            {estimate.assigned_to && <InfoRow label={T('projectLead')} value={estimate.assigned_to} />}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px' }}>

        {/* ═══════ 3. SCOPE OF WORK ═══════ */}
        <div style={{ ...S.sectionBlock, paddingTop: 24 }}>
          <SectionTitle enKey="scopeOfWork" lang={lang} />
          {estimate.title && <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>{estimate.title}</div>}
          {estimate.notes ? (
            <p style={S.bodyText}>{estimate.notes}</p>
          ) : (
            <p style={{ ...S.bodyText, color: '#94a3b8', fontStyle: 'italic' }}>
              {T('scopeDefault')}
            </p>
          )}
        </div>

        {/* ═══════ 4. BASE BID ═══════ */}
        {opts.showBreakdown && baseGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="baseBid" lang={lang} />
            <p style={{ ...S.bodyText, marginBottom: 12 }}>{T('baseBidIntro')}</p>
            <SharedLineItemsTable groups={baseGroups} showPrices={opts.showPrices} lang={primaryLang} />
          </div>
        )}

        {/* ═══════ 5. ALTERNATES / OPTIONS ═══════ */}
        {opts.showBreakdown && alternateGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="alternatesOptions" lang={lang} />
            <p style={{ ...S.bodyText, marginBottom: 12 }}>{T('alternatesIntro')}</p>
            <SharedLineItemsTable groups={alternateGroups} showPrices={opts.showPrices} lang={primaryLang} />
          </div>
        )}

        {/* ═══════ 6. INCLUSIONS ═══════ */}
        <div style={S.sectionBlock}>
          <SectionTitle enKey="inclusions" lang={lang} />
          {estimate.payment_terms ? (
            <p style={S.bodyText}>{estimate.payment_terms}</p>
          ) : (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 6px 0' }}>{T('inclusionsIntroDefault')}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {tList('bid', 'inclusionsItemsDefault', lang).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ═══════ 7. EXCLUSIONS ═══════ */}
        <div style={S.sectionBlock}>
          <SectionTitle enKey="exclusions" lang={lang} />
          {estimate.exclusions ? (
            <p style={S.bodyText}>{estimate.exclusions}</p>
          ) : (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 6px 0' }}>{T('exclusionsIntroDefault')}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {tList('bid', 'exclusionsItemsDefault', lang).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ═══════ 8. CLARIFICATIONS ═══════ */}
        <div style={S.sectionBlock}>
          <SectionTitle enKey="clarifications" lang={lang} />
          {estimate.warranty_terms ? (
            <p style={S.bodyText}>{estimate.warranty_terms}</p>
          ) : (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {tList('bid', 'clarificationsItemsDefault', lang).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ═══════ 9. COMMERCIAL TERMS ═══════ */}
        {opts.showTerms && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="commercialTerms" lang={lang} />

            {opts.showPrices && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>{T('bidSummary')}</div>
                <SharedFinancialSummary
                  estimate={estimate}
                  total={total}
                  depositPct={depositPct}
                  depositAmount={depositAmount}
                  remaining={remaining}
                  showDeposit={depositPct > 0}
                  lang={primaryLang}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>{T('paymentTerms')}</div>
              {estimate.payment_terms ? (
                <p style={S.bodyText}>{estimate.payment_terms}</p>
              ) : (
                <p style={S.bodyText}>
                  {depositPct > 0
                    ? tReplace(T('paymentWithDeposit'), { pct: depositPct, amt: fmtAmt(depositAmount), rem: fmtAmt(remaining) })
                    : T('paymentDefault')
                  }
                </p>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>{T('bidValidity')}</div>
              <p style={S.bodyText}>
                {estimate.expiration_date
                  ? tReplace(T('validityWithDate'), { date: expDate })
                  : T('validityDefault')
                }
              </p>
            </div>

            {estimate.legal_terms && (
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>{T('additionalTerms')}</div>
                <p style={S.bodyText}>{estimate.legal_terms}</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ 10. ACCEPTANCE / AUTHORIZATION ═══════ */}
        {opts.showSignatures && (
          <div style={{ ...S.sectionBlock, paddingTop: 8 }}>
            <SectionTitle enKey="acceptanceAuth" lang={lang} />
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <p style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.65, margin: 0 }}>
                {T('acceptanceBody')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 12 }}>
              {[
                { title: T('contractor'), sub: appConfig.company.name, license: appConfig.company.license ? `License: ${appConfig.company.license}` : null },
                { title: T('ownerAuthRep'), sub: estimate.client_name || 'Client' },
              ].map((sig, i) => (
                <div key={i}>
                  <div style={{ height: 48, borderBottom: '2px solid #0f172a', marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{sig.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sig.sub}</div>
                  {sig.license && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{sig.license}</div>}
                  <div style={{ marginTop: 14, height: 24, borderBottom: '1px solid #cbd5e1' }} />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{T('date')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <div style={{ textAlign: 'center', padding: '14px 48px', borderTop: '1px solid #e2e8f0', marginTop: 8 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '0.06em' }}>
          {appConfig.company.name} · {appConfig.company.address} · {appConfig.company.license ? `License ${appConfig.company.license} · ` : ''}{today}
        </div>
      </div>
    </div>
  );
}