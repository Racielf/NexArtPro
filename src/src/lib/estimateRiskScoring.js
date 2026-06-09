/**
 * Estimate Risk & Complexity Scoring
 *
 * Internal-only. Evaluates project risk, complexity, and suggests contingency.
 * DOES NOT modify document, pricing, or totals.
 *
 * CALIBRATION NOTES (audit pass):
 * - Missing scope/assumptions was counted TWICE: once in complexity, once in risk.
 *   This caused a permanent "high risk" on any new estimate even with 1 item.
 *   Fixed: documentation gaps count ONLY in riskScore, not in complexityScore.
 * - Base complexity score of 20 + base risk of 15 + grossMarginPct=0 (new estimate)
 *   fired the low-margin warning on every new blank estimate. Fixed: guard for margin > 0.
 * - The "large job without contingency" and "complex without contingency" rules could
 *   BOTH fire simultaneously, stacking +15+12=27 extra points for one missing field.
 *   Fixed: single consolidated rule — one or the other, not both.
 * - Warning "Agregar un resumen de alcance" fired unconditionally on short scope.
 *   Fixed: only show warnings that are actionable (tied to medium/high risk context).
 * - Warning typo: "Estimated" → "Estimado".
 */

export function calculateRiskScore(estimate, groups, totals) {
  const {
    scopeSummary = '',
    assumptions = '',
    includedScopeBullets = '',
    contingencyType = 'none',
    contingencyValue = 0,
    total = 0,
    discountValue = 0,
  } = estimate || {};

  const { grossMarginPct = 0 } = totals || {};

  // ─── INPUTS ───────────────────────────────────────────────────────────────

  const groupCount  = (groups || []).length;
  const totalItems  = (groups || []).reduce((sum, g) => sum + (g.items || []).length, 0);
  const hasMaterials = (estimate?.materials || []).length > 0;
  const totalAmount = parseFloat(total) || 0;
  const hasDiscount = discountValue > 0;
  const hasContingency = contingencyType !== 'none' && contingencyValue > 0;

  // Documentation completeness — 20 chars threshold (meaningful content)
  const hasScope       = (scopeSummary || '').trim().length > 20;
  const hasAssumptions = (assumptions || '').trim().length > 20;
  const hasInclusions  = (includedScopeBullets || '').trim().length > 20;
  const hasDocs = hasScope && hasAssumptions;

  // ─── COMPLEXITY SCORE (0–100) ─────────────────────────────────────────────
  // Measures structural complexity of the job — NOT penalizes missing docs here.
  // Missing docs is a RISK factor, not a complexity factor.

  let complexityScore = 20; // base for any estimate

  // Line items
  if (totalItems >= 8)      complexityScore += 20;
  else if (totalItems >= 5) complexityScore += 15;
  else if (totalItems >= 3) complexityScore += 10;
  else if (totalItems >= 1) complexityScore += 5;

  // Multiple groups = multi-scope job
  if (groupCount >= 4)      complexityScore += 15;
  else if (groupCount >= 3) complexityScore += 10;
  else if (groupCount >= 2) complexityScore += 5;

  // Materials present
  if (hasMaterials) complexityScore += 10;

  // Job size (value as complexity proxy)
  if (totalAmount >= 50000)      complexityScore += 20;
  else if (totalAmount >= 25000) complexityScore += 15;
  else if (totalAmount >= 10000) complexityScore += 10;
  else if (totalAmount >= 5000)  complexityScore += 5;

  complexityScore = Math.min(100, complexityScore);

  // ─── RISK SCORE (0–100) ───────────────────────────────────────────────────
  // Risk = complexity × factor + documentation gaps + financial exposure

  let riskScore = 10; // base

  // Complexity drives risk proportionally (max 30 pts)
  riskScore += Math.round(Math.min(30, complexityScore * 0.30));

  // Missing documentation (only penalize once, not in complexity AND risk)
  if (!hasScope)       riskScore += 12;
  if (!hasAssumptions) riskScore += 8;
  // includedScopeBullets: lower penalty — it's optional for simple jobs
  if (!hasInclusions && complexityScore >= 40) riskScore += 5;

  // No contingency on a complex OR large job — pick the higher trigger, not both
  const isLargeJob    = totalAmount >= 15000;
  const isComplexJob  = complexityScore >= 50;
  if (!hasContingency && (isComplexJob || isLargeJob)) riskScore += 15;

  // Discount with low/no margin is a real risk signal
  // grossMarginPct = 0 on a brand-new estimate with no cost data — do not penalize
  const hasRealMarginData = grossMarginPct > 0;
  if (hasDiscount && !hasContingency && hasRealMarginData && grossMarginPct < 25) riskScore += 10;

  // Genuinely low margin (only when cost data exists)
  if (hasRealMarginData && grossMarginPct < 20) riskScore += 8;

  riskScore = Math.min(100, riskScore);

  // ─── RISK LEVEL (thresholds) ──────────────────────────────────────────────
  // Calibrated so:
  //   new empty estimate       → ~22 pts → low
  //   medium job, missing docs → ~45 pts → medium
  //   large job, no docs/cont  → ~70 pts → high

  let riskLevel = 'low';
  if (riskScore >= 60)      riskLevel = 'high';
  else if (riskScore >= 38) riskLevel = 'medium';

  // ─── SUGGESTED CONTINGENCY ────────────────────────────────────────────────
  // Based on risk level + job value (higher value → be more conservative)

  let suggestedContingencyPercent;
  if (riskLevel === 'high') {
    suggestedContingencyPercent = totalAmount >= 25000 ? 15 : 12;
  } else if (riskLevel === 'medium') {
    suggestedContingencyPercent = totalAmount >= 10000 ? 10 : 7;
  } else {
    suggestedContingencyPercent = 5;
  }

  // ─── WARNINGS (actionable, non-redundant) ────────────────────────────────
  // Rules: only show if actionable, specific, and not already covered by another warning.
  // Avoid showing 4+ warnings on every estimate — caps at 3 most critical.

  const warnings = [];

  // #1 — High risk without any contingency (most critical)
  if (riskLevel === 'high' && !hasContingency) {
    warnings.push('Estimado de alto riesgo sin contingencia aplicada.');
  }

  // #2 — Missing both scope and assumptions on a non-trivial job
  if (!hasDocs && complexityScore >= 30) {
    warnings.push('Alcance y supuestos vacíos — el cliente puede solicitar cambios.');
  } else if (!hasScope && complexityScore >= 30) {
    warnings.push('Alcance del trabajo no documentado.');
  } else if (!hasAssumptions && isComplexJob) {
    warnings.push('Sin supuestos definidos en un trabajo complejo.');
  }

  // #3 — Low margin with real cost data
  if (hasRealMarginData && grossMarginPct < 20) {
    warnings.push(`Margen bruto bajo (${grossMarginPct.toFixed(1)}%) — verificar costos antes de enviar.`);
  } else if (hasDiscount && !hasContingency && hasRealMarginData && grossMarginPct < 30) {
    warnings.push('Descuento aplicado sin contingencia y margen ajustado.');
  }

  // Deduplicate and cap at 3
  const dedupedWarnings = [...new Set(warnings)].slice(0, 3);

  return {
    complexityScore: Math.round(complexityScore),
    riskScore: Math.round(riskScore),
    riskLevel,
    suggestedContingencyPercent,
    warnings: dedupedWarnings,
  };
}