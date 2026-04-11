import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import useCompanyConfig from '@/hooks/useCompanyConfig';
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
 * ProposalDocumentRenderer — Client-friendly PROPOSAL
 *
 * Design: More whitespace, softer sections, highlighted intro,
 * clean pricing table, strong total block, warm accent (violet).
 *
 * Uses shared PDF layout components for visual consistency.
 * CRITICAL: Never exposes book_price, unit_cost, margin.
 */

const ACCENT = COLORS.proposal.accent;

const formatDate = (d, lang) => {
  if (!d) return null;
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  return new Date(d + 'T12:00:00').toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function ProposalDocumentRenderer({ estimate, options = {}, lang: langProp }) {
  const cc = useCompanyConfig();
  if (!estimate) return null;

  const lang = langProp || estimate?.document_language || 'en';
  const T = (key) => tb('proposal', key, lang);
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
      ? [{ id: 'legacy', name: null, items: estimate.line_items.map(li => ({ id: li.id, service_name: li.name || li.service_name || '', description: li.description || '', quantity: li.quantity || 1, unit: li.unit || 'ea', unit_price: li.unit_price || 0, line_total: li.total_price || li.line_total || 0 })) }]
      : [];

  const isAddOn = (g) => /^(alternate|option|add.?on)/i.test(g.name || '');
  const mainGroups = allGroups.filter(g => !isAddOn(g));
  const addOnGroups = allGroups.filter(g => isAddOn(g));

  const total = estimate.total || 0;
  const depositPct = estimate.deposit_percent || 0;
  const depositAmount = estimate.deposit_amount || (total * depositPct / 100);
  const remaining = total - depositAmount;

  // Bilingual helpers
  const esTitle = (key) => bilingualEs ? tb('proposal', key, 'es') : null;

  return (
    <div style={{ fontFamily: FONT.family, fontSize: FONT.size.md, lineHeight: FONT.lineHeight.normal, background: COLORS.white, color: COLORS.text.primary, minWidth: 640 }}>

      {/* ═══ 1. HEADER ═══ */}
      <PDFHeader
        docLabel={T('docLabel')}
        number={estimate.estimate_number}
        date={today}
        expDate={expDate}
        variant="proposal"
        accent={ACCENT}
        logoUrl={cc.logo_url}
      />

      <div style={{ padding: `0 ${SPACE.page}px` }}>

        {/* ═══ 2. CLIENT / PROJECT INFO ═══ */}
        <PDFSectionBlock title={T('clientProjectInfo')} titleEs={esTitle('clientProjectInfo')} accent={ACCENT} noBorder style={{ paddingTop: SPACE['2xl'] }}>
          <PDFInfoGrid
            variant="proposal"
            leftTitle={T('preparedFor')}
            leftContent={
              <div>
                <div style={{ fontWeight: FONT.weight.bold, fontSize: FONT.size.lg + 1, color: COLORS.text.primary, marginBottom: 4 }}>{estimate.client_name}</div>
                {estimate.client_address && <div style={{ color: COLORS.text.muted, fontSize: FONT.size.base, marginBottom: 2 }}>{estimate.client_address}</div>}
                {estimate.client_email && <div style={{ color: COLORS.text.faint, fontSize: FONT.size.sm }}>{estimate.client_email}</div>}
                {estimate.client_phone && <div style={{ color: COLORS.text.faint, fontSize: FONT.size.sm }}>{estimate.client_phone}</div>}
              </div>
            }
            rightTitle={T('project')}
            rightContent={
              <div>
                {estimate.title && (
                  <div style={{ fontWeight: FONT.weight.bold, fontSize: FONT.size.lg, color: COLORS.text.primary, marginBottom: SPACE.sm }}>{estimate.title}</div>
                )}
                {opts.showPrices && (
                  <div style={{ background: COLORS.bg.subtle, padding: `${SPACE.lg}px`, borderRadius: 8, marginTop: estimate.title ? SPACE.sm : 0 }}>
                    <div style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.bold, color: COLORS.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>{T('yourInvestment')}</div>
                    <div style={{ fontSize: FONT.size['4xl'], fontWeight: FONT.weight.extrabold, color: ACCENT, lineHeight: 1 }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>
            }
          />
        </PDFSectionBlock>

        {/* ═══ 3. COVER NOTE ═══ */}
        <PDFSectionBlock title={T('coverNote')} titleEs={esTitle('coverNote')} accent={ACCENT}>
          <div style={S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder)}>
            <p style={{ fontSize: FONT.size.md, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed, margin: 0 }}>
              {T('coverGreeting')} <strong>{estimate.client_name}</strong>,
            </p>
            <p style={{ ...S.body, marginTop: SPACE.md }}>{T('coverBody1')}</p>
            <p style={{ ...S.body, marginTop: SPACE.md }}>{T('coverBody2')}</p>
          </div>
        </PDFSectionBlock>

        {/* ═══ 4. PROJECT SUMMARY ═══ */}
        {(estimate.title || estimate.notes) && (
          <PDFSectionBlock title={T('projectSummary')} titleEs={esTitle('projectSummary')} accent={ACCENT}>
            {estimate.title && <div style={{ fontWeight: FONT.weight.semibold, fontSize: FONT.size.lg, color: COLORS.text.primary, marginBottom: SPACE.sm }}>{estimate.title}</div>}
            {estimate.notes
              ? <p style={S.body}>{estimate.notes}</p>
              : <p style={{ ...S.body, color: COLORS.text.faint, fontStyle: 'italic' }}>{T('projectSummaryDefault')}</p>
            }
          </PDFSectionBlock>
        )}

        {/* ═══ 5. SERVICES INCLUDED ═══ */}
        {opts.showBreakdown && mainGroups.length > 0 && (
          <PDFSectionBlock title={T('servicesIncluded')} titleEs={esTitle('servicesIncluded')} accent={ACCENT}>
            <p style={{ ...S.body, marginBottom: SPACE.md }}>{T('servicesIntro')}</p>
            <PDFLineItemsTable groups={mainGroups} showPrices={opts.showPrices} accent={ACCENT} lang={primaryLang} variant="proposal" />
          </PDFSectionBlock>
        )}

        {/* ═══ 6. WHAT'S INCLUDED ═══ */}
        <PDFSectionBlock title={T('whatsIncluded')} titleEs={esTitle('whatsIncluded')} accent={ACCENT}>
          <div style={S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder)}>
            {estimate.payment_terms ? (
              <p style={S.body}>{estimate.payment_terms}</p>
            ) : (
              <div style={{ fontSize: FONT.size.base, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed }}>
                <div style={{ fontWeight: FONT.weight.semibold, color: COLORS.text.secondary, marginBottom: 6 }}>{T('whatsIncludedTitle')}</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: FONT.lineHeight.loose }}>
                  {tList('proposal', 'whatsIncludedItems', lang).map((item, i) => <li key={i} style={{ marginBottom: 3 }}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        </PDFSectionBlock>

        {/* ═══ 7. OPTIONAL ADD-ONS ═══ */}
        {opts.showBreakdown && addOnGroups.length > 0 && (
          <PDFSectionBlock title={T('optionalAddOns')} titleEs={esTitle('optionalAddOns')} accent={ACCENT}>
            <p style={{ ...S.body, marginBottom: SPACE.md }}>{T('addOnsIntro')}</p>
            <PDFLineItemsTable groups={addOnGroups} showPrices={opts.showPrices} accent={ACCENT} lang={primaryLang} variant="proposal" />
          </PDFSectionBlock>
        )}

        {/* ═══ 8. SCHEDULE / TIMELINE ═══ */}
        <PDFSectionBlock title={T('scheduleTimeline')} titleEs={esTitle('scheduleTimeline')} accent={ACCENT}>
          {(startDate || endDate) ? (
            <div style={{ display: 'flex', gap: SPACE.xl }}>
              {startDate && (
                <div style={{ ...S.card(COLORS.bg.card, COLORS.border.medium), flex: 1 }}>
                  <div style={S.tinyLabel}>{T('estimatedStart')}</div>
                  <div style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>{startDate}</div>
                </div>
              )}
              {endDate && (
                <div style={{ ...S.card(COLORS.bg.card, COLORS.border.medium), flex: 1 }}>
                  <div style={S.tinyLabel}>{T('estimatedCompletion')}</div>
                  <div style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>{endDate}</div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ ...S.body, color: COLORS.text.faint, fontStyle: 'italic' }}>{T('scheduleDefault')}</p>
          )}
        </PDFSectionBlock>

        {/* ═══ INVESTMENT SUMMARY ═══ */}
        {opts.showPrices && (
          <PDFSectionBlock title={T('investmentSummary')} titleEs={esTitle('investmentSummary')} accent={ACCENT}>
            <PDFTotalsBlock
              estimate={estimate}
              total={total}
              depositPct={depositPct}
              depositAmount={depositAmount}
              remaining={remaining}
              showDeposit={depositPct > 0}
              accent={ACCENT}
              lang={primaryLang}
              variant="proposal"
            />
          </PDFSectionBlock>
        )}

        {/* ═══ 9. TERMS ═══ */}
        {opts.showTerms && (
          <PDFSectionBlock title={T('terms')} titleEs={esTitle('terms')} accent={ACCENT}>
            {estimate.exclusions && (
              <div style={{ marginBottom: SPACE.lg }}>
                <div style={S.subHeading}>{T('whatsNotIncluded')}</div>
                <p style={S.body}>{estimate.exclusions}</p>
              </div>
            )}
            {estimate.payment_terms && (
              <div style={{ marginBottom: SPACE.lg }}>
                <div style={S.subHeading}>{T('paymentTerms')}</div>
                <p style={S.body}>{estimate.payment_terms}</p>
              </div>
            )}
            <div style={{ marginBottom: SPACE.lg }}>
              <div style={S.subHeading}>{T('warranty')}</div>
              <p style={S.body}>{estimate.warranty_terms || T('warrantyDefault')}</p>
            </div>
            <div>
              <div style={S.subHeading}>{T('termsConditions')}</div>
              <p style={S.body}>{estimate.legal_terms || (estimate.expiration_date ? T('termsValidPeriod') : T('termsDefault'))}</p>
            </div>
          </PDFSectionBlock>
        )}

        {/* ═══ 10. ACCEPTANCE ═══ */}
        {opts.showSignatures && (
          <PDFSectionBlock title={T('acceptance')} titleEs={esTitle('acceptance')} accent={ACCENT}>
            <div style={{ ...S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder), marginBottom: SPACE.xl }}>
              <p style={{ fontSize: FONT.size.sm + 0.5, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed, margin: 0 }}>
                {tReplace(T('acceptanceBody'), { company: appConfig.company.name })}
              </p>
            </div>
            <PDFSignatureBlock
              variant="proposal"
              accent={ACCENT}
              dateLabel={T('date')}
              signatures={[
                { title: T('authorizedRep'), sub: appConfig.company.name },
                { title: T('clientSignature'), sub: estimate.client_name || 'Client' },
              ]}
            />
          </PDFSectionBlock>
        )}
      </div>

      {/* ═══ FOOTER ═══ */}
      <PDFFooter date={today} accent={ACCENT} variant="proposal" />
    </div>
  );
}