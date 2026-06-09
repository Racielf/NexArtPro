/**
 * salesDecisionEngine.js — Deterministic sales decision orchestration
 *
 * Combines CRM context, proposal state, pricing strategy, and historical patterns
 * into actionable commercial recommendations.
 *
 * Pure computation — no API calls, no side effects.
 * Returns structured decision guidance for sales users.
 */

/**
 * analyzePricingStrategy(proposal, proposalDetails, crmStats, historicalProposals)
 *
 * Evaluates pricing readiness and recommends strategic approach
 */
function analyzePricingStrategy(proposal, proposalDetails = {}, crmStats = {}, historicalProposals = []) {
  const recommendations = [];
  const closed = historicalProposals.filter(p => p.close_outcome);
  const lost = closed.filter(p => p.close_outcome === 'lost');
  const lostToPrice = lost.filter(p => p.lost_reason === 'price_too_high');

  // Signal 1: Price sensitivity pattern
  if (lostToPrice.length >= 2) {
    recommendations.push({
      type: 'pricing_sensitivity',
      title: 'Price-Sensitive Client Pattern',
      reason: `${lostToPrice.length} recent proposals lost due to price objection.`,
      action: 'Consider phased delivery, flexible terms, or tiered pricing options to reduce price perception',
      confidence: 'high'
    });
  }

  // Signal 2: Pricing options presence
  const hasPricingOptions = proposalDetails.pricingOptions && proposalDetails.pricingOptions.length >= 2;
  if (!hasPricingOptions && closed.length >= 3) {
    const wonWithOptions = closed.filter(p => p.close_outcome === 'won' && p.selected_pricing_option_id);
    if (wonWithOptions.length / closed.length > 0.4) {
      recommendations.push({
        type: 'pricing_strategy',
        title: 'Use Tiered Pricing Options',
        reason: `${Math.round((wonWithOptions.length / closed.length) * 100)}% of your won deals use multiple pricing tiers.`,
        action: 'Add 2-3 pricing options to anchor client choice and increase win rate',
        confidence: 'medium'
      });
    }
  }

  // Signal 3: Presentation mode alignment
  if (hasPricingOptions && (proposalDetails.presentation_mode === 'detailed' || !proposalDetails.presentation_mode)) {
    recommendations.push({
      type: 'presentation_mode',
      title: 'Simplify Presentation for Pricing Options',
      reason: 'Multiple pricing options deserve a clean, focused presentation.',
      action: 'Switch to "Pricing Options Only" mode to reduce complexity and speed decision-making',
      confidence: 'medium'
    });
  }

  return recommendations;
}

/**
 * analyzeFollowUpStrategy(proposal, crmStats, historicalProposals)
 *
 * Recommends follow-up timing and intensity based on client history
 */
function analyzeFollowUpStrategy(proposal, crmStats = {}, historicalProposals = []) {
  const recommendations = [];
  const closed = historicalProposals.filter(p => p.close_outcome);
  const won = closed.filter(p => p.close_outcome === 'won');

  // Signal 1: Early follow-up on sent proposals
  if (proposal.status === 'sent' && proposal.sent_at && !proposal.viewed_at) {
    const daysSinceSent = Math.floor((Date.now() - new Date(proposal.sent_at).getTime()) / 86400000);
    if (daysSinceSent >= 2 && daysSinceSent < 7) {
      recommendations.push({
        type: 'early_followup',
        title: 'Critical Window: Follow Up Now',
        reason: `Proposal not viewed after ${daysSinceSent} days — best conversion window is 48-72 hours.`,
        action: 'Send personalized follow-up email or call client directly',
        confidence: 'high'
      });
    }
  }

  // Signal 2: Multi-touch follow-up pattern
  if (won.length >= 2) {
    const avgFollowUps = won.reduce((s, p) => s + (p.follow_up_count || 0), 0) / won.length;
    if (avgFollowUps >= 1.5) {
      recommendations.push({
        type: 'followup_intensity',
        title: 'Plan Multiple Follow-ups',
        reason: `Your won deals average ${avgFollowUps.toFixed(1)} follow-up touches.`,
        action: 'Schedule 2-3 strategic follow-ups at 3-day, 7-day, and 14-day intervals',
        confidence: 'medium'
      });
    }
  }

  // Signal 3: Client-specific follow-up velocity
  if (crmStats && crmStats.totalProposals > 0) {
    const winRate = (crmStats.wonProposals || 0) / crmStats.totalProposals;
    if (winRate > 0.5) {
      recommendations.push({
        type: 'client_velocity',
        title: 'Accelerate Follow-up for High-Win Client',
        reason: `This client has ${Math.round(winRate * 100)}% historical win rate — they're typically ready to decide.`,
        action: 'Use shorter follow-up intervals (2-3 days) and direct decision-making language',
        confidence: 'medium'
      });
    }
  }

  return recommendations;
}

/**
 * analyzeScopeStrategy(proposal, proposalDetails, historicalProposals)
 *
 * Evaluates scope clarity and recommends risk mitigation
 */
function analyzeScopeStrategy(proposal, proposalDetails = {}, historicalProposals = []) {
  const recommendations = [];
  const closed = historicalProposals.filter(p => p.close_outcome);
  const lost = closed.filter(p => p.close_outcome === 'lost');
  const scopeMismatchLosses = lost.filter(p => p.lost_reason === 'scope_mismatch');

  // Signal 1: Scope mismatch pattern
  if (scopeMismatchLosses.length >= 1) {
    recommendations.push({
      type: 'scope_clarity',
      title: 'Strengthen Scope Documentation',
      reason: `${scopeMismatchLosses.length} previous loss(es) due to scope confusion — this is preventable.`,
      action: 'Expand "Inclusions & Exclusions" to eliminate ambiguity before sending',
      confidence: 'high'
    });
  }

  // Signal 2: Missing scope detail
  if (!proposalDetails.scopeOfWork || proposalDetails.scopeOfWork.trim().length < 50) {
    recommendations.push({
      type: 'scope_detail',
      title: 'Scope of Work Too Brief',
      reason: 'Vague scope increases client questions and delays decisions.',
      action: 'Expand scope description to 100+ characters with specific deliverables',
      confidence: 'medium'
    });
  }

  // Signal 3: Missing inclusions/exclusions clarity
  if (
    (!proposalDetails.inclusions || proposalDetails.inclusions.trim().length < 30) &&
    (!proposalDetails.exclusions || proposalDetails.exclusions.trim().length < 30)
  ) {
    recommendations.push({
      type: 'inclusions_exclusions',
      title: 'Define What\'s Included & Excluded',
      reason: 'Clear boundaries prevent misalignment and post-project disputes.',
      action: 'Add specific inclusions and exclusions to set expectations',
      confidence: 'medium'
    });
  }

  return recommendations;
}

/**
 * analyzeCompetitivePositioning(proposal, crmStats, historicalProposals)
 *
 * Evaluates competitive pressure and recommends differentiation strategy
 */
function analyzeCompetitivePositioning(proposal, crmStats = {}, historicalProposals = []) {
  const recommendations = [];
  const closed = historicalProposals.filter(p => p.close_outcome);
  const lost = closed.filter(p => p.close_outcome === 'lost');

  // Signal 1: High competitor loss rate
  const competitorLosses = lost.filter(p => p.lost_reason === 'chose_competitor');
  if (competitorLosses.length >= 2) {
    const competitorPct = (competitorLosses.length / lost.length) * 100;
    if (competitorPct >= 40) {
      recommendations.push({
        type: 'competitive_threat',
        title: 'Competitive Pressure Detected',
        reason: `${Math.round(competitorPct)}% of losses are to competitors.`,
        action: 'Emphasize unique value: proprietary process, certifications, guarantees, or case studies',
        confidence: 'high'
      });
    }
  }

  // Signal 2: Repeat customer advantage
  if (crmStats && crmStats.totalProposals > 1) {
    recommendations.push({
      type: 'repeat_customer',
      title: 'Leverage Existing Relationship',
      reason: `This is a repeat customer — they already trust your work.`,
      action: 'Reference past successful projects and skip detailed qualification steps',
      confidence: 'medium'
    });
  }

  return recommendations;
}

/**
 * runSalesDecisionEngine(proposal, proposalDetails, crmStats, historicalProposals)
 *
 * Main orchestration function that combines all analysis streams
 * Returns: { primaryRecommendation, secondaryRecommendations, confidence, signals }
 */
export function runSalesDecisionEngine(proposal, proposalDetails = {}, crmStats = {}, historicalProposals = []) {
  if (!proposal) return null;

  // Run all analysis streams in parallel
  const pricingRecs = analyzePricingStrategy(proposal, proposalDetails, crmStats, historicalProposals);
  const followUpRecs = analyzeFollowUpStrategy(proposal, crmStats, historicalProposals);
  const scopeRecs = analyzeScopeStrategy(proposal, proposalDetails, historicalProposals);
  const competitiveRecs = analyzeCompetitivePositioning(proposal, crmStats, historicalProposals);

  // Combine all recommendations
  const allRecs = [...pricingRecs, ...followUpRecs, ...scopeRecs, ...competitiveRecs];

  // Primary: highest confidence, highest urgency (early followup > others)
  const urgent = allRecs.filter(r => r.type === 'early_followup');
  const highConfidence = allRecs.filter(r => r.confidence === 'high' && r.type !== 'early_followup');

  const primaryRecommendation = urgent.length > 0 
    ? urgent[0]
    : highConfidence.length > 0
    ? highConfidence[0]
    : allRecs.length > 0
    ? allRecs[0]
    : null;

  // Secondary: next 2-3 highest value recommendations
  const secondary = allRecs.filter(r => r !== primaryRecommendation).slice(0, 2);

  // Overall confidence: based on number of supporting signals
  const confidence = allRecs.length >= 3 ? 'high' : allRecs.length >= 1 ? 'medium' : 'low';

  // Signals: group by type for debugging/transparency
  const signalMap = {};
  allRecs.forEach(r => {
    if (!signalMap[r.type]) signalMap[r.type] = [];
    signalMap[r.type].push(r);
  });

  return {
    primaryRecommendation,
    secondaryRecommendations: secondary,
    allRecommendations: allRecs,
    confidence,
    signals: signalMap,
    totalSignals: allRecs.length,
  };
}

/**
 * Summarize decision engine output for UI display
 * Returns: brief human-readable summary of primary recommendation
 */
export function summarizeDecision(decision) {
  if (!decision?.primaryRecommendation) return null;

  const { primaryRecommendation, confidence } = decision;
  return {
    title: primaryRecommendation.title,
    summary: `${primaryRecommendation.action} (${confidence} confidence)`,
    detail: primaryRecommendation.reason,
    actionType: primaryRecommendation.type,
  };
}