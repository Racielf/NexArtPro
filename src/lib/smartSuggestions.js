/**
 * smartSuggestions.js — Rule-based suggestion engine for proposal guidance.
 *
 * Analyzes current proposal context against known patterns from analytics data.
 * Pure computation — no API calls, no side effects.
 *
 * Returns array of actionable suggestions:
 *   [
 *     { type: 'pricing', priority: 'high', message: '...', context: '...' },
 *     { type: 'followup', priority: 'medium', message: '...', context: '...' },
 *     ...
 *   ]
 */

/**
 * Analyzes a proposal and historical analytics to generate smart suggestions.
 *
 * @param {Object} proposal — Current proposal record
 * @param {Object} proposalDetails — Proposal details (scope, inclusions, etc.)
 * @param {Array} historicalProposals — Closed proposals for pattern analysis (optional)
 * @returns {Array} Array of suggestion objects
 */
export function generateSmartSuggestions(proposal, proposalDetails = {}, historicalProposals = []) {
  if (!proposal) return [];

  const suggestions = [];
  const closed = historicalProposals.filter(p => p.close_outcome);
  const won = closed.filter(p => p.close_outcome === 'won');
  const lost = closed.filter(p => p.close_outcome === 'lost');

  // ────────────────────────────────────────────────────────────────
  // RULE 1: Pricing Strategy Guidance
  // ────────────────────────────────────────────────────────────────

  // Rule 1a: If no pricing options and historical data shows they help
  if (
    (!proposalDetails.pricingOptions || proposalDetails.pricingOptions.length === 0) &&
    won.length >= 3
  ) {
    const wonWithOptions = won.filter(p => p.selected_pricing_option_id);
    const winRateWithOptions = wonWithOptions.length > 0 ? (wonWithOptions.length / won.length) * 100 : 0;

    if (winRateWithOptions > 40) {
      suggestions.push({
        type: 'pricing',
        priority: 'high',
        message: 'Consider adding 2-3 pricing options to this proposal',
        context: `Historical data: ${Math.round(winRateWithOptions)}% of your wins use tiered pricing`,
      });
    }
  }

  // Rule 1b: If pricing options exist, confirm presentation mode
  if (proposalDetails.pricingOptions && proposalDetails.pricingOptions.length >= 2) {
    const mode = proposalDetails.presentation_mode || 'detailed';
    if (mode === 'detailed') {
      suggestions.push({
        type: 'pricing',
        priority: 'medium',
        message: 'Use "Pricing Options Only" presentation mode to focus client on price anchoring',
        context: `Current mode: ${mode}. Options-only view simplifies client decision.`,
      });
    }
  }

  // Rule 1c: Pricing simplification for lump sum projects
  if (lost.length >= 2) {
    const lumpSumLosses = lost.filter(p => p.lost_reason === 'price_too_high');
    if (lumpSumLosses.length >= 2) {
      suggestions.push({
        type: 'pricing',
        priority: 'medium',
        message: 'Price sensitivity detected: consider lump-sum pricing to reduce perceived cost',
        context: `${lumpSumLosses.length} recent losses cited "price too high"`,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // RULE 2: Follow-up Timing and Strategy
  // ────────────────────────────────────────────────────────────────

  // Rule 2a: Early follow-up signal for sent proposals
  if (proposal.status === 'sent' && proposal.sent_at && !proposal.viewed_at) {
    const daysSinceSent = Math.floor((Date.now() - new Date(proposal.sent_at).getTime()) / 86400000);
    if (daysSinceSent >= 2 && daysSinceSent < 5) {
      suggestions.push({
        type: 'followup',
        priority: 'high',
        message: 'Follow up now: client hasn\'t opened yet (sent 2+ days ago)',
        context: `Best conversion timing: follow up within 48-72 hours of send.`,
      });
    }
  }

  // Rule 2b: Follow-up effectiveness pattern
  if (won.length >= 2) {
    const avgFollowUps = won.reduce((s, p) => s + (p.follow_up_count || 0), 0) / won.length;
    const followUpWonCount = won.filter(p => (p.follow_up_count || 0) > 0).length;

    if (avgFollowUps >= 1 && followUpWonCount > (won.length * 0.5)) {
      suggestions.push({
        type: 'followup',
        priority: 'medium',
        message: 'Plan multiple follow-ups: your won deals average 2+ touch points',
        context: `${Math.round((followUpWonCount / won.length) * 100)}% of wins had ≥1 follow-up`,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // RULE 3: Scope & Clarity
  // ────────────────────────────────────────────────────────────────

  // Rule 3a: Missing critical scope documentation
  if (!proposalDetails.scopeOfWork || proposalDetails.scopeOfWork.trim().length < 50) {
    suggestions.push({
      type: 'scope',
      priority: 'high',
      message: 'Scope of work is too brief — add detail to reduce client confusion',
      context: 'Clear scope reduces "no response" and "scope mismatch" objections.',
    });
  }

  // Rule 3b: Missing inclusions/exclusions clarity
  if (
    (!proposalDetails.inclusions || proposalDetails.inclusions.trim().length < 20) &&
    (!proposalDetails.exclusions || proposalDetails.exclusions.trim().length < 20)
  ) {
    suggestions.push({
      type: 'scope',
      priority: 'medium',
      message: 'Define what's included and excluded to prevent misalignment',
      context: 'Clear boundaries improve client confidence and reduce disputes.',
    });
  }

  // Rule 3c: Scope mismatch pattern
  if (lost.length >= 2) {
    const scopeMismatchLosses = lost.filter(p => p.lost_reason === 'scope_mismatch');
    if (scopeMismatchLosses.length >= 1) {
      suggestions.push({
        type: 'scope',
        priority: 'medium',
        message: 'Recent loss due to scope mismatch: strengthen your inclusions/exclusions',
        context: `${scopeMismatchLosses.length} loss(es) from scope confusion — this is preventable.`,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // RULE 4: Timeline & Urgency
  // ────────────────────────────────────────────────────────────────

  // Rule 4a: No timeline documented
  if (!proposalDetails.timeline || proposalDetails.timeline.trim().length < 10) {
    suggestions.push({
      type: 'timeline',
      priority: 'medium',
      message: 'Add project timeline to reduce client uncertainty',
      context: 'Timeline clarity builds confidence in execution.',
    });
  }

  // ────────────────────────────────────────────────────────────────
  // RULE 5: Competitive Strategy
  // ────────────────────────────────────────────────────────────────

  // Rule 5a: Competitor loss pattern
  if (lost.length >= 3) {
    const competitorLosses = lost.filter(p => p.lost_reason === 'chose_competitor');
    const competitorPct = (competitorLosses.length / lost.length) * 100;

    if (competitorPct >= 40) {
      suggestions.push({
        type: 'strategy',
        priority: 'high',
        message: 'Competitive pressure detected: emphasize unique value proposition',
        context: `${Math.round(competitorPct)}% of losses are to competitors — differentiate.`,
      });
    }
  }

  // Rule 5b: Budget/affordability issues
  if (lost.length >= 2) {
    const budgetLosses = lost.filter(p => p.lost_reason === 'no_budget' || p.lost_reason === 'price_too_high');
    if (budgetLosses.length >= 2) {
      suggestions.push({
        type: 'strategy',
        priority: 'medium',
        message: 'Budget objections are common: consider flexible payment terms or phased delivery',
        context: `${budgetLosses.length} recent losses due to affordability concerns`,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // RULE 6: Expiration & Urgency
  // ────────────────────────────────────────────────────────────────

  // Rule 6a: No expiration set
  if (!proposal.expiration_date) {
    suggestions.push({
      type: 'urgency',
      priority: 'low',
      message: 'Add expiration date to create sense of urgency',
      context: 'Time-limited offers increase conversion rates.',
    });
  }

  // Rule 6b: Expiration too far away
  if (proposal.expiration_date) {
    const expiresIn = Math.floor(
      (new Date(proposal.expiration_date).getTime() - Date.now()) / 86400000
    );
    if (expiresIn > 30) {
      suggestions.push({
        type: 'urgency',
        priority: 'low',
        message: 'Consider shorter expiration window to drive faster decisions',
        context: `Current expiration: ${expiresIn} days. Best practice: 7-14 days.`,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Sort by priority and return
  // ────────────────────────────────────────────────────────────────

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

/**
 * Filter suggestions by type for targeted display.
 * @param {Array} suggestions — Output from generateSmartSuggestions
 * @param {string} type — e.g., 'pricing', 'followup', 'scope', 'strategy'
 * @returns {Array}
 */
export function filterSuggestions(suggestions, type) {
  return suggestions.filter(s => s.type === type);
}

/**
 * Get highest priority suggestions (for compact display).
 * @param {Array} suggestions
 * @param {number} limit — Max count (default 3)
 * @returns {Array}
 */
export function getTopSuggestions(suggestions, limit = 3) {
  return suggestions.slice(0, limit);
}