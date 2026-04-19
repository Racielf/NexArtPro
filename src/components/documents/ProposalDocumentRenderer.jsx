import React from 'react';
import { APP_CONFIG as appConfig } from '@/lib/appConfig';
import useCompanyConfig from '@/hooks/useCompanyConfig';
import PaymentMethodsSection from './PaymentMethodsSection';
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
 *
 * ═══ PRESENTATION MODES ═══
 * presentation_mode controls what pricing/scope is shown to client:
 *
 *   detailed (default):
 *     ✓ Show "Your Investment" block in header
 *     ✓ Show full line-item breakdown
 *     ✓ Show investment summary section
 *     ✓ Show pricing options if configured
 *
 *   grouped:
 *     ✓ Show "Your Investment" block in header
 *     ✓ Show group totals only (commercial buckets from categories)
 *     ✓ Show investment summary section
 *     ✓ Show pricing options if configured
 *
 *   lump_sum:
 *     ✓ Show "Your Investment" block in header
 *     ✗ Hide scope/breakdown details
 *     ✓ Show total only in investment summary
 *     ✓ Show pricing options if configured
 *
 *   options_only:
 *     ✗ Hide "Your Investment" block in header
 *     ✗ Hide scope/breakdown/group details entirely
 *     ✗ Hide investment summary section
 *     ✓ Show pricing options only (required)
 *     Narrative sections (cover, inclusions, exclusions, timeline, terms, CTA) remain visible.
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
  const presentationMode = estimate.presentation_mode || 'detailed';

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

      {/* ═══ HEADER ═══ */}
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

        {/* ═══ CLIENT / PROJECT INFO ═══ */}
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
                {opts.showPrices && presentationMode !== 'options_only' && (
                  <div style={{ background: COLORS.bg.subtle, padding: `${SPACE.lg}px`, borderRadius: 8, marginTop: estimate.title ? SPACE.sm : 0 }}>
                    <div style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.bold, color: COLORS.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>{T('yourInvestment')}</div>
                    <div style={{ fontSize: FONT.size['4xl'], fontWeight: FONT.weight.extrabold, color: ACCENT, lineHeight: 1 }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>
            }
          />
        </PDFSectionBlock>

        {/* ══════════════════════════════════════
            SECTION 1 — COVER NOTE
        ══════════════════════════════════════ */}
        <PDFSectionBlock title={T('coverNote')} titleEs={esTitle('coverNote')} accent={ACCENT}>
          <div style={S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder)}>
            <p style={{ fontSize: FONT.size.md, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed, margin: 0 }}>
              {T('coverGreeting')} <strong>{estimate.client_name}</strong>,
            </p>
            <p style={{ ...S.body, marginTop: SPACE.md }}>{T('coverBody1')}</p>
            <p style={{ ...S.body, marginTop: SPACE.md }}>{T('coverBody2')}</p>
          </div>
        </PDFSectionBlock>

        {/* ══════════════════════════════════════
            SECTION 2 — EXECUTIVE SUMMARY
            Source: proposal_details.scopeOfWork → estimate.notes (via mapper)
        ══════════════════════════════════════ */}
        {estimate.notes && (
          <PDFSectionBlock title={T('executiveSummary')} titleEs={esTitle('executiveSummary')} accent={ACCENT}>
            <div style={S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder)}>
              <p style={{ ...S.body, margin: 0, whiteSpace: 'pre-wrap' }}>{estimate.notes}</p>
            </div>
          </PDFSectionBlock>
        )}

        {/* ══════════════════════════════════════
            SECTION 3 — SCOPE OF WORK (services)
            Source: estimate.groups / line items
            Adapted by presentation_mode: detailed, grouped, lump_sum
            (options_only hides this entirely — pricing options only)
         ══════════════════════════════════════ */}
         {opts.showBreakdown && mainGroups.length > 0 && ['detailed', 'grouped'].includes(presentationMode) && (
           <PDFSectionBlock title={T('scopeOfWork')} titleEs={esTitle('scopeOfWork')} accent={ACCENT}>
             <p style={{ ...S.body, marginBottom: SPACE.md }}>{T('servicesIntro')}</p>
             {presentationMode === 'detailed' ? (
               <PDFLineItemsTable groups={mainGroups} showPrices={opts.showPrices} accent={ACCENT} lang={primaryLang} variant="proposal" />
             ) : (
               /* grouped: show group totals only, no line items */
               <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
                 {mainGroups.map((group, idx) => {
                   const subtotal = group.items?.reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0) || 0;
                   return (
                     <div key={group.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACE.md}px 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                       <span style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
                         {group.name || `Group ${idx + 1}`}
                       </span>
                       {opts.showPrices && (
                         <span style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.bold, color: ACCENT }}>
                           ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </span>
                       )}
                     </div>
                   );
                 })}
               </div>
             )}
           </PDFSectionBlock>
         )}

        {/* ══════════════════════════════════════
            SECTION 4 — WHAT'S INCLUDED
            Source: proposal_details.inclusions → estimate.payment_terms (via mapper)
        ══════════════════════════════════════ */}
        <PDFSectionBlock title={T('whatsIncluded')} titleEs={esTitle('whatsIncluded')} accent={ACCENT}>
          <div style={S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder)}>
            {estimate.payment_terms ? (
              (() => {
                // Strip the "What's Included:\n" prefix injected by the mapper
                const raw = estimate.payment_terms;
                const prefix = "What's Included:\n";
                const text = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
                return (
                  <div>
                    <div style={{ fontWeight: FONT.weight.semibold, color: COLORS.text.secondary, marginBottom: 8, fontSize: FONT.size.base }}>
                      {T('whatsIncludedTitle')}
                    </div>
                    <p style={{ ...S.body, margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
                  </div>
                );
              })()
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

        {/* ══════════════════════════════════════
            SECTION 5 — WHAT'S NOT INCLUDED (exclusions)
            Source: proposal_details.exclusions → estimate.exclusions (via mapper)
        ══════════════════════════════════════ */}
        {estimate.exclusions && (
          <PDFSectionBlock title={T('whatsNotIncludedTitle')} titleEs={esTitle('whatsNotIncludedTitle')} accent={ACCENT}>
            <div style={S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder)}>
              <p style={{ ...S.body, margin: 0, whiteSpace: 'pre-wrap' }}>{estimate.exclusions}</p>
            </div>
          </PDFSectionBlock>
        )}

        {/* ══════════════════════════════════════
            SECTION 6 — PROJECT TIMELINE
            Source: proposal_details.timeline → estimate.project_start_date (via mapper)
        ══════════════════════════════════════ */}
        <PDFSectionBlock title={T('scheduleTimeline')} titleEs={esTitle('scheduleTimeline')} accent={ACCENT}>
          {estimate.project_start_date ? (
            <div style={S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder)}>
              <div style={{ fontWeight: FONT.weight.semibold, color: COLORS.text.muted, fontSize: FONT.size.xs, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: SPACE.sm }}>
                {T('estimatedStart')}
              </div>
              <p style={{ ...S.body, margin: 0, whiteSpace: 'pre-wrap', color: COLORS.text.primary }}>{estimate.project_start_date}</p>
            </div>
          ) : (
            <p style={{ ...S.body, color: COLORS.text.faint, fontStyle: 'italic' }}>{T('scheduleDefault')}</p>
          )}
        </PDFSectionBlock>

        {/* ══════════════════════════════════════
            SECTION 6b — OPTIONAL ADD-ONS
        ══════════════════════════════════════ */}
        {opts.showBreakdown && addOnGroups.length > 0 && (
          <PDFSectionBlock title={T('optionalAddOns')} titleEs={esTitle('optionalAddOns')} accent={ACCENT}>
            <p style={{ ...S.body, marginBottom: SPACE.md }}>{T('addOnsIntro')}</p>
            <PDFLineItemsTable groups={addOnGroups} showPrices={opts.showPrices} accent={ACCENT} lang={primaryLang} variant="proposal" />
          </PDFSectionBlock>
        )}

        {/* ══════════════════════════════════════
            SECTION 7a — INVESTMENT OPTIONS (price anchoring)
            Conditional: only renders when pricingOptions[] has items
            Note: shows regardless of presentation_mode (always client-facing when present)
        ══════════════════════════════════════ */}
        {opts.showPrices && estimate.pricing_options?.length > 0 && (
          <PDFSectionBlock title={T('investmentOptions')} titleEs={esTitle('investmentOptions')} accent={ACCENT}>
            <p style={{ ...S.body, marginBottom: SPACE.lg, color: COLORS.text.muted }}>{T('investmentOptionsIntro')}</p>
            <div style={{ display: 'flex', gap: SPACE.lg, flexWrap: 'wrap' }}>
              {estimate.pricing_options.map((opt, idx) => {
                const isHighlighted = !!opt.badge;
                const includedLines = opt.itemsIncluded ? opt.itemsIncluded.split('\n').filter(Boolean) : [];
                const excludedLines = opt.itemsExcluded ? opt.itemsExcluded.split('\n').filter(Boolean) : [];
                return (
                  <div key={opt.id || idx} style={{
                    flex: '1 1 200px',
                    minWidth: 180,
                    border: `2px solid ${isHighlighted ? ACCENT : COLORS.border.medium}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: COLORS.white,
                    position: 'relative',
                  }}>
                    {/* Badge */}
                    {opt.badge && (
                      <div style={{
                        background: ACCENT,
                        color: COLORS.white,
                        fontSize: FONT.size.xs,
                        fontWeight: FONT.weight.bold,
                        textAlign: 'center',
                        padding: `${SPACE.xs}px ${SPACE.md}px`,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}>
                        {opt.badge}
                      </div>
                    )}
                    <div style={{ padding: `${SPACE.lg}px ${SPACE.xl}px` }}>
                      {/* Title */}
                      <div style={{ fontWeight: FONT.weight.extrabold, fontSize: FONT.size.xl, color: COLORS.text.primary, marginBottom: SPACE.xs }}>
                        {opt.title || `Option ${idx + 1}`}
                      </div>
                      {/* Price */}
                      {opt.price != null && opt.price !== '' && (
                        <div style={{ fontSize: FONT.size['3xl'], fontWeight: FONT.weight.black, color: ACCENT, lineHeight: 1.1, marginBottom: SPACE.sm }}>
                          ${parseFloat(opt.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      {/* Description */}
                      {opt.description && (
                        <p style={{ ...S.bodySmall, marginBottom: SPACE.md, color: COLORS.text.muted }}>
                          {opt.description}
                        </p>
                      )}
                      {/* Divider */}
                      {(includedLines.length > 0 || excludedLines.length > 0) && (
                        <div style={{ borderTop: `1px solid ${COLORS.border.light}`, margin: `${SPACE.sm}px 0 ${SPACE.md}px` }} />
                      )}
                      {/* Included */}
                      {includedLines.length > 0 && (
                        <div style={{ marginBottom: SPACE.sm }}>
                          <div style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.bold, color: COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: SPACE.xs }}>
                            {T('included')}
                          </div>
                          {includedLines.map((line, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.xs, marginBottom: 3 }}>
                              <span style={{ color: '#10b981', fontWeight: FONT.weight.bold, fontSize: FONT.size.sm, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                              <span style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, lineHeight: 1.5 }}>{line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Excluded */}
                      {excludedLines.length > 0 && (
                        <div>
                          <div style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.bold, color: COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: SPACE.xs }}>
                            {T('notIncluded')}
                          </div>
                          {excludedLines.map((line, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.xs, marginBottom: 3 }}>
                              <span style={{ color: '#94a3b8', fontSize: FONT.size.sm, lineHeight: 1.4, flexShrink: 0 }}>✗</span>
                              <span style={{ fontSize: FONT.size.sm, color: COLORS.text.faint, lineHeight: 1.5 }}>{line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </PDFSectionBlock>
        )}

        {/* ══════════════════════════════════════
            SECTION 7 — PRICING SUMMARY
            Skipped if presentation_mode === 'options_only'
        ══════════════════════════════════════ */}
        {opts.showPrices && presentationMode !== 'options_only' && (
          <PDFSectionBlock title={T('investmentSummary')} titleEs={esTitle('investmentSummary')} accent={ACCENT}>
            {presentationMode === 'lump_sum' ? (
              /* Lump sum: only show total, no breakdown */
              <div style={{ ...S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder) }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.bold, color: COLORS.text.muted, textTransform: 'uppercase', marginBottom: SPACE.md }}>{T('totalInvestment')}</div>
                  <div style={{ fontSize: FONT.size['4xl'], fontWeight: FONT.weight.extrabold, color: ACCENT, lineHeight: 1 }}>
                    ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ) : (
              /* detailed/grouped: full breakdown */
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
            )}
          </PDFSectionBlock>
        )}

        {/* ══════════════════════════════════════
            SECTION 8 — TERMS & CONDITIONS
        ══════════════════════════════════════ */}
        {opts.showTerms && (
          <PDFSectionBlock title={T('terms')} titleEs={esTitle('terms')} accent={ACCENT}>
            {estimate.payment_terms && !estimate.payment_terms.startsWith("What's Included:") && (
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

        {/* ═══ PAYMENT METHODS ═══ */}
        {cc.payment_methods && cc.payment_methods.trim() && (
          <PDFSectionBlock title="Payment Methods" accent={ACCENT}>
            <PaymentMethodsSection
              paymentMethods={cc.payment_methods}
              sectionLabelStyle={{ display: 'none' }}
              textStyle={{ fontSize: FONT.size.base, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed }}
              containerStyle={{}}
            />
          </PDFSectionBlock>
        )}

        {/* ══════════════════════════════════════
            CALL TO ACTION — closing message
        ══════════════════════════════════════ */}
        <PDFSectionBlock title={T('callToAction')} titleEs={esTitle('callToAction')} accent={ACCENT}>
          <div style={{
            ...S.card(COLORS.proposal.cardBg, COLORS.proposal.cardBorder),
            borderLeft: `4px solid ${ACCENT}`,
          }}>
            <p style={{ fontSize: FONT.size.md, color: COLORS.text.secondary, lineHeight: FONT.lineHeight.relaxed, margin: 0 }}>
              {T('callToActionBody')}
            </p>
          </div>
        </PDFSectionBlock>

        {/* ══════════════════════════════════════
            ACCEPTANCE / SIGNATURE
        ══════════════════════════════════════ */}
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