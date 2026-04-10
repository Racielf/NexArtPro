import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import SharedLineItemsTable from './SharedLineItemsTable';
import SharedFinancialSummary from './SharedFinancialSummary';
import { tb, tList, tReplace } from '@/lib/documentTranslations';

/**
 * ProposalDocumentRenderer — Client-friendly PROPOSAL presentation
 * Supports EN, ES, BILINGUAL rendering via `lang` prop.
 *
 * Section order:
 *  1. Header  2. Client/Project Info  3. Intro/Cover Note  4. Project Summary
 *  5. Services Included  6. What's Included  7. Optional Add-ons
 *  8. Schedule/Timeline  9. Terms  10. Acceptance
 */

const formatDate = (d, lang) => {
  if (!d) return null;
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  return new Date(d + 'T12:00:00').toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
};

const ACCENT = '#7c3aed';

const S = {
  sectionLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT, marginBottom: 10, marginTop: 0 },
  sectionBlock: { marginBottom: 28 },
  bodyText: { fontSize: 12, color: '#475569', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 },
  cardBg: { background: '#faf5ff', border: `1px solid ${ACCENT}20`, borderRadius: 8, padding: '16px 20px' },
  subtleCard: { background: '#f9fafb', padding: '14px 20px', borderRadius: 8, border: '1px solid #e5e7eb' },
  tinyLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 6 },
  bilingualSub: { fontSize: 10, color: '#9ca3af', fontStyle: 'italic', marginTop: 2 },
};

// Bilingual section title renderer
function SectionTitle({ enKey, lang }) {
  const text = tb('proposal', enKey, lang);
  if (lang !== 'bilingual') {
    return <div style={S.sectionLabel}>{text}</div>;
  }
  const [en, es] = text.split('\n');
  return (
    <div style={{ ...S.sectionLabel, lineHeight: 1.6 }}>
      {en}
      {es && <span style={{ display: 'block', fontSize: 9, color: '#a78bfa', fontWeight: 600, marginTop: 1 }}>{es}</span>}
    </div>
  );
}

export default function ProposalDocumentRenderer({ estimate, options = {}, lang: langProp }) {
  if (!estimate) return null;

  const lang = langProp || estimate?.document_language || 'en';
  const T = (key) => tb('proposal', key, lang);
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
      ? [{ id: 'legacy', name: null, items: estimate.line_items.map(li => ({ id: li.id, service_name: li.name || li.service_name || '', description: li.description || '', quantity: li.quantity || 1, unit: li.unit || 'ea', unit_price: li.unit_price || 0, line_total: li.total_price || li.line_total || 0 })) }]
      : [];

  const isAddOn = (g) => /^(alternate|option|add.?on)/i.test(g.name || '');
  const mainGroups = allGroups.filter(g => !isAddOn(g));
  const addOnGroups = allGroups.filter(g => isAddOn(g));

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = estimate.deposit_amount || (total * depositPct / 100);
  const remaining = total - depositAmount;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 13, lineHeight: 1.6, background: 'white', color: '#1f2937', minWidth: 640 }}>

      {/* ═══════ 1. HEADER ═══════ */}
      <div style={{ padding: '40px 48px 28px', borderBottom: `4px solid ${ACCENT}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.5px', marginBottom: 2 }}>{appConfig.company.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>{appConfig.company.tagline}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.8 }}>
              {appConfig.company.address}<br />{appConfig.company.email} · {appConfig.company.phone}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: ACCENT, marginBottom: 4 }}>{T('docLabel')}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1 }}>#{estimate.estimate_number || '—'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{today}</div>
            {expDate && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{T('validUntil')}: {expDate}</div>}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px' }}>

        {/* ═══════ 2. CLIENT / PROJECT INFO ═══════ */}
        <div style={{ ...S.sectionBlock, paddingTop: 28 }}>
          <SectionTitle enKey="clientProjectInfo" lang={lang} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <div style={S.tinyLabel}>{T('preparedFor')}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 4 }}>{estimate.client_name}</div>
              {estimate.client_address && <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>{estimate.client_address}</div>}
              {estimate.client_email && <div style={{ color: '#9ca3af', fontSize: 11 }}>{estimate.client_email}</div>}
              {estimate.client_phone && <div style={{ color: '#9ca3af', fontSize: 11 }}>{estimate.client_phone}</div>}
            </div>
            <div>
              {estimate.title && (
                <>
                  <div style={S.tinyLabel}>{T('project')}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 8 }}>{estimate.title}</div>
                </>
              )}
              {opts.showPrices && (
                <div style={{ background: '#f3f4f6', padding: '14px 16px', borderRadius: 8, marginTop: estimate.title ? 8 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>{T('yourInvestment')}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ 3. INTRO / COVER NOTE ═══════ */}
        <div style={S.sectionBlock}>
          <SectionTitle enKey="coverNote" lang={lang} />
          <div style={S.cardBg}>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>
              {T('coverGreeting')} <strong>{estimate.client_name}</strong>,
            </p>
            <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.75, margin: '10px 0 0 0' }}>
              {T('coverBody1')}
            </p>
            <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.75, margin: '10px 0 0 0' }}>
              {T('coverBody2')}
            </p>
          </div>
        </div>

        {/* ═══════ 4. PROJECT SUMMARY ═══════ */}
        {(estimate.title || estimate.notes) && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="projectSummary" lang={lang} />
            {estimate.title && (
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111', marginBottom: 8 }}>{estimate.title}</div>
            )}
            {estimate.notes ? (
              <p style={S.bodyText}>{estimate.notes}</p>
            ) : (
              <p style={{ ...S.bodyText, color: '#9ca3af', fontStyle: 'italic' }}>
                {T('projectSummaryDefault')}
              </p>
            )}
          </div>
        )}

        {/* ═══════ 5. SERVICES INCLUDED ═══════ */}
        {opts.showBreakdown && mainGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="servicesIncluded" lang={lang} />
            <p style={{ ...S.bodyText, marginBottom: 12 }}>{T('servicesIntro')}</p>
            <SharedLineItemsTable groups={mainGroups} showPrices={opts.showPrices} accent={ACCENT} lang={primaryLang} />
          </div>
        )}

        {/* ═══════ 6. WHAT'S INCLUDED ═══════ */}
        <div style={S.sectionBlock}>
          <SectionTitle enKey="whatsIncluded" lang={lang} />
          <div style={S.cardBg}>
            {estimate.payment_terms ? (
              <p style={S.bodyText}>{estimate.payment_terms}</p>
            ) : (
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
                <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>{T('whatsIncludedTitle')}</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {tList('proposal', 'whatsIncludedItems', lang).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ 7. OPTIONAL ADD-ONS ═══════ */}
        {opts.showBreakdown && addOnGroups.length > 0 && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="optionalAddOns" lang={lang} />
            <p style={{ ...S.bodyText, marginBottom: 12 }}>{T('addOnsIntro')}</p>
            <SharedLineItemsTable groups={addOnGroups} showPrices={opts.showPrices} accent={ACCENT} lang={primaryLang} />
          </div>
        )}

        {/* ═══════ 8. SCHEDULE / TIMELINE ═══════ */}
        <div style={S.sectionBlock}>
          <SectionTitle enKey="scheduleTimeline" lang={lang} />
          {(startDate || endDate) ? (
            <div style={{ display: 'flex', gap: 20 }}>
              {startDate && (
                <div style={{ ...S.subtleCard, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>{T('estimatedStart')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{startDate}</div>
                </div>
              )}
              {endDate && (
                <div style={{ ...S.subtleCard, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>{T('estimatedCompletion')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{endDate}</div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ ...S.bodyText, color: '#9ca3af', fontStyle: 'italic' }}>
              {T('scheduleDefault')}
            </p>
          )}
        </div>

        {/* ═══════ INVESTMENT SUMMARY ═══════ */}
        {opts.showPrices && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="investmentSummary" lang={lang} />
            <SharedFinancialSummary
              estimate={estimate}
              total={total}
              depositPct={depositPct}
              depositAmount={depositAmount}
              remaining={remaining}
              showDeposit={depositPct > 0}
              accent={ACCENT}
              lang={primaryLang}
            />
          </div>
        )}

        {/* ═══════ 9. TERMS ═══════ */}
        {opts.showTerms && (
          <div style={S.sectionBlock}>
            <SectionTitle enKey="terms" lang={lang} />

            {estimate.exclusions && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{T('whatsNotIncluded')}</div>
                <p style={S.bodyText}>{estimate.exclusions}</p>
              </div>
            )}

            {estimate.payment_terms && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{T('paymentTerms')}</div>
                <p style={S.bodyText}>{estimate.payment_terms}</p>
              </div>
            )}

            {estimate.warranty_terms ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{T('warranty')}</div>
                <p style={S.bodyText}>{estimate.warranty_terms}</p>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{T('warranty')}</div>
                <p style={S.bodyText}>{T('warrantyDefault')}</p>
              </div>
            )}

            {estimate.legal_terms ? (
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{T('termsConditions')}</div>
                <p style={S.bodyText}>{estimate.legal_terms}</p>
              </div>
            ) : (
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{T('termsConditions')}</div>
                <p style={S.bodyText}>{estimate.expiration_date ? T('termsValidPeriod') : T('termsDefault')}</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ 10. ACCEPTANCE ═══════ */}
        {opts.showSignatures && (
          <div style={{ ...S.sectionBlock, paddingTop: 4 }}>
            <SectionTitle enKey="acceptance" lang={lang} />
            <div style={{ ...S.cardBg, marginBottom: 20 }}>
              <p style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.65, margin: 0 }}>
                {tReplace(T('acceptanceBody'), { company: appConfig.company.name })}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
              {[
                { title: T('authorizedRep'), sub: appConfig.company.name },
                { title: T('clientSignature'), sub: estimate.client_name || 'Client' },
              ].map((sig, i) => (
                <div key={i}>
                  <div style={{ height: 48, borderBottom: `2px solid ${ACCENT}`, marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>{sig.title}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{sig.sub}</div>
                  <div style={{ marginTop: 14, height: 24, borderBottom: '1px solid #d1d5db' }} />
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{T('date')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <div style={{ textAlign: 'center', padding: '14px 48px', borderTop: `2px solid ${ACCENT}`, marginTop: 8 }}>
        <div style={{ fontSize: 9, color: '#9ca3af' }}>
          {appConfig.company.name} · {appConfig.company.address} · {today}
        </div>
      </div>
    </div>
  );
}