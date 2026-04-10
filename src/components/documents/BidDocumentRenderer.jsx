import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import { tb, tList, tReplace } from '@/lib/documentTranslations';
import { COLORS, FONT, SPACE, S } from './pdf/PDFStyles';
import PDFHeader from './pdf/PDFHeader';
import PDFSectionBlock from './pdf/PDFSectionBlock';
import PDFInfoGrid, { InfoRow } from './pdf/PDFInfoGrid';
import PDFLineItemsTable from './pdf/PDFLineItemsTable';
import PDFTotalsBlock from './pdf/PDFTotalsBlock';
import PDFSignatureBlock from './pdf/PDFSignatureBlock';
import PDFFooter from './pdf/PDFFooter';

/**
 * BidDocumentRenderer — Technical/commercial BID
 *
 * Design: More compact, structured, technical layout.
 * Project info grid, alternates table, clear inclusions/exclusions,
 * tighter spacing, darker accent.
 *
 * Uses shared PDF layout components for visual consistency.
 * CRITICAL: Never exposes book_price, unit_cost, margin.
 */

const formatDate = (d, lang) => {
  if (!d) return null;
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  return new Date(d + 'T12:00:00').toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function BidDocumentRenderer({ estimate, options = {}, lang: langProp }) {
  if (!estimate) return null;

  const lang = langProp || estimate?.document_language || 'en';
  const T = (key) => tb('bid', key, lang);
  const primaryLang = lang === 'bilingual' ? 'en' : lang;
  const bilingualEs = lang === 'bilingual';

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

  const SECTION_COLOR = COLORS.bid.sectionAccent;
  const esTitle = (key) => bilingualEs ? tb('bid', key, 'es') : null;

  return (
    <div style={{ fontFamily: FONT.family, fontSize: FONT.size.md, lineHeight: FONT.lineHeight.normal, background: COLORS.white, color: COLORS.text.primary, minWidth: 640 }}>

      {/* ═══ 1. HEADER ═══ */}
      <PDFHeader
        docLabel={T('docLabel')}
        number={estimate.estimate_number}
        date={today}
        expDate={expDate}
        variant="bid"
      />

      {/* ═══ 2. PROJECT INFORMATION ═══ */}
      <PDFSectionBlock title={T('projectInformation')} titleEs={esTitle('projectInformation')} accent={SECTION_COLOR} noBorder style={{ padding: `${SPACE['2xl']}px ${SPACE.page}px 0` }}>
        <PDFInfoGrid
          variant="bid"
          leftTitle={T('ownerClient')}
          leftContent={
            <div>
              <div style={{ fontWeight: FONT.weight.bold, fontSize: FONT.size.lg + 1, color: COLORS.text.primary, marginBottom: 4 }}>{estimate.client_name}</div>
              {estimate.client_address && <div style={{ color: COLORS.text.secondary, fontSize: FONT.size.base, marginBottom: 2 }}>{estimate.client_address}</div>}
              {estimate.client_email && <div style={{ color: COLORS.text.muted, fontSize: FONT.size.sm }}>{estimate.client_email}</div>}
              {estimate.client_phone && <div style={{ color: COLORS.text.muted, fontSize: FONT.size.sm }}>{estimate.client_phone}</div>}
            </div>
          }
          rightTitle={T('references')}
          rightContent={
            <div>
              <InfoRow label={T('jobNumber')} value={estimate.job_number} />
              <InfoRow label={T('planReference')} value={estimate.plan_reference} />
              {startDate && <InfoRow label={T('startDate')} value={startDate} />}
              {endDate && <InfoRow label={T('completion')} value={endDate} />}
              {estimate.assigned_to && <InfoRow label={T('projectLead')} value={estimate.assigned_to} />}
            </div>
          }
        />
      </PDFSectionBlock>

      <div style={{ padding: `0 ${SPACE.page}px` }}>

        {/* ═══ 3. SCOPE OF WORK ═══ */}
        <PDFSectionBlock title={T('scopeOfWork')} titleEs={esTitle('scopeOfWork')} accent={SECTION_COLOR} spacing="tight" style={{ paddingTop: SPACE['2xl'] }}>
          {estimate.title && <div style={{ fontWeight: FONT.weight.bold, fontSize: FONT.size.lg, color: COLORS.text.primary, marginBottom: SPACE.sm }}>{estimate.title}</div>}
          {estimate.notes
            ? <p style={S.body}>{estimate.notes}</p>
            : <p style={{ ...S.body, color: COLORS.text.faint, fontStyle: 'italic' }}>{T('scopeDefault')}</p>
          }
        </PDFSectionBlock>

        {/* ═══ 4. BASE BID ═══ */}
        {opts.showBreakdown && baseGroups.length > 0 && (
          <PDFSectionBlock title={T('baseBid')} titleEs={esTitle('baseBid')} accent={SECTION_COLOR} spacing="tight">
            <p style={{ ...S.body, marginBottom: SPACE.md }}>{T('baseBidIntro')}</p>
            <PDFLineItemsTable groups={baseGroups} showPrices={opts.showPrices} lang={primaryLang} variant="bid" />
          </PDFSectionBlock>
        )}

        {/* ═══ 5. ALTERNATES / OPTIONS ═══ */}
        {opts.showBreakdown && alternateGroups.length > 0 && (
          <PDFSectionBlock title={T('alternatesOptions')} titleEs={esTitle('alternatesOptions')} accent={SECTION_COLOR} spacing="tight">
            <p style={{ ...S.body, marginBottom: SPACE.md }}>{T('alternatesIntro')}</p>
            <PDFLineItemsTable groups={alternateGroups} showPrices={opts.showPrices} lang={primaryLang} variant="bid" />
          </PDFSectionBlock>
        )}

        {/* ═══ 6. INCLUSIONS ═══ */}
        <PDFSectionBlock title={T('inclusions')} titleEs={esTitle('inclusions')} accent={SECTION_COLOR} spacing="tight">
          {estimate.payment_terms ? (
            <p style={S.body}>{estimate.payment_terms}</p>
          ) : (
            <div style={{ fontSize: FONT.size.base, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed }}>
              <p style={{ margin: '0 0 6px 0' }}>{T('inclusionsIntroDefault')}</p>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: FONT.lineHeight.loose }}>
                {tList('bid', 'inclusionsItemsDefault', lang).map((item, i) => <li key={i} style={{ marginBottom: 2 }}>{item}</li>)}
              </ul>
            </div>
          )}
        </PDFSectionBlock>

        {/* ═══ 7. EXCLUSIONS ═══ */}
        <PDFSectionBlock title={T('exclusions')} titleEs={esTitle('exclusions')} accent={SECTION_COLOR} spacing="tight">
          {estimate.exclusions ? (
            <p style={S.body}>{estimate.exclusions}</p>
          ) : (
            <div style={{ fontSize: FONT.size.base, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed }}>
              <p style={{ margin: '0 0 6px 0' }}>{T('exclusionsIntroDefault')}</p>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: FONT.lineHeight.loose }}>
                {tList('bid', 'exclusionsItemsDefault', lang).map((item, i) => <li key={i} style={{ marginBottom: 2 }}>{item}</li>)}
              </ul>
            </div>
          )}
        </PDFSectionBlock>

        {/* ═══ 8. CLARIFICATIONS ═══ */}
        <PDFSectionBlock title={T('clarifications')} titleEs={esTitle('clarifications')} accent={SECTION_COLOR} spacing="tight">
          {estimate.warranty_terms ? (
            <p style={S.body}>{estimate.warranty_terms}</p>
          ) : (
            <div style={{ fontSize: FONT.size.base, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed }}>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: FONT.lineHeight.loose }}>
                {tList('bid', 'clarificationsItemsDefault', lang).map((item, i) => <li key={i} style={{ marginBottom: 2 }}>{item}</li>)}
              </ul>
            </div>
          )}
        </PDFSectionBlock>

        {/* ═══ 9. COMMERCIAL TERMS ═══ */}
        {opts.showTerms && (
          <PDFSectionBlock title={T('commercialTerms')} titleEs={esTitle('commercialTerms')} accent={SECTION_COLOR} spacing="tight">
            {/* Bid summary */}
            {opts.showPrices && (
              <div style={{ marginBottom: SPACE.xl }}>
                <div style={S.subHeading}>{T('bidSummary')}</div>
                <PDFTotalsBlock
                  estimate={estimate}
                  total={total}
                  depositPct={depositPct}
                  depositAmount={depositAmount}
                  remaining={remaining}
                  showDeposit={depositPct > 0}
                  lang={primaryLang}
                  variant="bid"
                />
              </div>
            )}

            {/* Payment Terms */}
            <div style={{ marginBottom: SPACE.lg }}>
              <div style={S.subHeading}>{T('paymentTerms')}</div>
              {estimate.payment_terms ? (
                <p style={S.body}>{estimate.payment_terms}</p>
              ) : (
                <p style={S.body}>
                  {depositPct > 0
                    ? tReplace(T('paymentWithDeposit'), { pct: depositPct, amt: fmtAmt(depositAmount), rem: fmtAmt(remaining) })
                    : T('paymentDefault')
                  }
                </p>
              )}
            </div>

            {/* Bid Validity */}
            <div style={{ marginBottom: SPACE.lg }}>
              <div style={S.subHeading}>{T('bidValidity')}</div>
              <p style={S.body}>
                {estimate.expiration_date
                  ? tReplace(T('validityWithDate'), { date: expDate })
                  : T('validityDefault')
                }
              </p>
            </div>

            {/* Additional Terms */}
            {estimate.legal_terms && (
              <div>
                <div style={S.subHeading}>{T('additionalTerms')}</div>
                <p style={S.body}>{estimate.legal_terms}</p>
              </div>
            )}
          </PDFSectionBlock>
        )}

        {/* ═══ 10. ACCEPTANCE / AUTHORIZATION ═══ */}
        {opts.showSignatures && (
          <PDFSectionBlock title={T('acceptanceAuth')} titleEs={esTitle('acceptanceAuth')} accent={SECTION_COLOR}>
            <div style={{ ...S.card(COLORS.bg.card, COLORS.border.medium), marginBottom: SPACE.xl }}>
              <p style={{ fontSize: FONT.size.sm + 0.5, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed, margin: 0 }}>
                {T('acceptanceBody')}
              </p>
            </div>
            <PDFSignatureBlock
              variant="bid"
              dateLabel={T('date')}
              signatures={[
                { title: T('contractor'), sub: appConfig.company.name, extra: appConfig.company.license ? `License: ${appConfig.company.license}` : null },
                { title: T('ownerAuthRep'), sub: estimate.client_name || 'Client' },
              ]}
            />
          </PDFSectionBlock>
        )}
      </div>

      {/* ═══ FOOTER ═══ */}
      <PDFFooter date={today} variant="bid" />
    </div>
  );
}