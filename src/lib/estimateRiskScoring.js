/**
 * Estimate Risk & Complexity Scoring
 * 
 * Internal-only system that evaluates project risk and suggests contingency.
 * Does NOT modify document, pricing, or totals.
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
    discountType = 'percent',
  } = estimate || {};

  const { grossMarginPct = 0 } = totals || {};

  // ─── INPUTS ───────────────────────────────────────────────────────────

  const groupCount = (groups || []).length;
  const totalItems = (groups || []).reduce((sum, g) => sum + (g.items || []).length, 0);
  const hasMaterials = (estimate?.materials || []).length > 0;
  const totalAmount = parseFloat(total) || 0;
  const hasDiscount = discountValue > 0;
  const hasContingency = contingencyType !== 'none' && contingencyValue > 0;

  // Missing scope context
  const hasScope = scopeSummary && scopeSummary.trim().length > 20;
  const hasAssumptions = assumptions && assumptions.trim().length > 20;
  const hasInclusions = includedScopeBullets && includedScopeBullets.trim().length > 20;

  // ─── COMPLEXITY SCORE (0–100) ─────────────────────────────────────────

  let complexityScore = 20; // Base: 20 for any estimate

  // Items contribute to complexity
  if (totalItems >= 5) complexityScore += 15;
  else if (totalItems >= 3) complexityScore += 10;
  else complexityScore += 5;

  // Multiple groups increase complexity
  if (groupCount >= 3) complexityScore += 15;
  else if (groupCount >= 2) complexityScore += 10;

  // Materials add complexity
  if (hasMaterials) complexityScore += 10;

  // Large jobs are more complex
  if (totalAmount >= 25000) complexityScore += 15;
  else if (totalAmount >= 10000) complexityScore += 10;
  else if (totalAmount >= 5000) complexityScore += 5;

  // Missing scope documentation increases complexity
  if (!hasScope) complexityScore += 10;
  if (!hasAssumptions) complexityScore += 8;
  if (!hasInclusions) complexityScore += 5;

  complexityScore = Math.min(100, complexityScore);

  // ─── RISK SCORE (0–100) ───────────────────────────────────────────────

  let riskScore = 15; // Base: 15 for any estimate

  // Complexity drives risk
  riskScore += Math.min(25, complexityScore * 0.25);

  // Missing documentation is high risk
  if (!hasScope) riskScore += 12;
  if (!hasAssumptions) riskScore += 10;
  if (!hasInclusions) riskScore += 8;

  // No contingency on complex/high-value job is risky
  if (!hasContingency && complexityScore > 50) riskScore += 15;

  // Discount without contingency on high-margin job is risky
  if (hasDiscount && !hasContingency && grossMarginPct < 25) riskScore += 10;

  // Large jobs without contingency
  if (!hasContingency && totalAmount >= 15000) riskScore += 12;

  // Low margins (< 20%) increase risk even with contingency
  if (grossMarginPct < 20) riskScore += 10;

  riskScore = Math.min(100, riskScore);

  // ─── RISK LEVEL ───────────────────────────────────────────────────────

  let riskLevel = 'low';
  if (riskScore >= 65) riskLevel = 'high';
  else if (riskScore >= 40) riskLevel = 'medium';

  // ─── SUGGESTED CONTINGENCY ────────────────────────────────────────────

  let suggestedContingencyPercent = 0;

  if (riskLevel === 'high') {
    suggestedContingencyPercent = 15;
  } else if (riskLevel === 'medium') {
    suggestedContingencyPercent = 10;
  } else {
    suggestedContingencyPercent = 5;
  }

  // ─── WARNINGS ─────────────────────────────────────────────────────────

  const warnings = [];

  if (riskLevel === 'high' && !hasContingency) {
    warnings.push('Estimated alto riesgo sin contingencia.');
  }

  if (!hasScope) {
    warnings.push('Agregar un resumen de alcance para documentación.');
  }

  if (!hasAssumptions) {
    warnings.push('Especificar supuestos del proyecto.');
  }

  if (grossMarginPct < 20 && grossMarginPct > 0) {
    warnings.push(`Margen bajo (${grossMarginPct.toFixed(1)}%) — considerar riesgo.`);
  }

  if (hasDiscount && !hasContingency && grossMarginPct < 30) {
    warnings.push('Descuento + bajo margen sin contingencia: alto riesgo.');
  }

  return {
    complexityScore: Math.round(complexityScore),
    riskScore: Math.round(riskScore),
    riskLevel,
    suggestedContingencyPercent: Math.round(suggestedContingencyPercent),
    warnings,
  };
}