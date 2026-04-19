/**
 * proposalReminders.js — Centralized reminder classification for Proposals.
 *
 * Categories:
 *   - overdue_follow_up      : next_follow_up_at is in the past
 *   - stale_sent_not_viewed  : sent >= STALE_DAYS ago, never viewed
 *   - stale_viewed_no_response: viewed >= STALE_DAYS ago, no response
 *   - follow_up_today        : next_follow_up_at is today
 *
 * Pure functions — no React, no API calls.
 * Reuses STALE_DAYS from nextActionLogic for consistency.
 */

import { STALE_DAYS, daysSince } from '@/lib/nextActionLogic';

const ACTIVE_PROPOSAL_STATUSES = ['sent', 'pending_adjustment', 'review_needed'];

/**
 * Classify a single proposal into a reminder category.
 * Returns one of the category keys above, or null if no reminder needed.
 */
export function classifyProposalReminder(proposal) {
  const { status, next_follow_up_at, sent_at, viewed_at, last_viewed_at } = proposal;

  // Only surface reminders for active proposals
  if (!ACTIVE_PROPOSAL_STATUSES.includes(status)) return null;

  const viewedAt = last_viewed_at || viewed_at;
  const hasViewed = !!viewedAt;

  // 1. Overdue scheduled follow-up
  if (next_follow_up_at && new Date(next_follow_up_at) < new Date()) {
    return 'overdue_follow_up';
  }

  // 2. Follow-up scheduled today
  if (next_follow_up_at) {
    const today = new Date();
    const fu = new Date(next_follow_up_at);
    const sameDay = fu.getFullYear() === today.getFullYear() &&
                    fu.getMonth() === today.getMonth() &&
                    fu.getDate() === today.getDate();
    if (sameDay) return 'follow_up_today';
  }

  // 3. Viewed but no response for >= STALE_DAYS
  if (hasViewed) {
    const d = daysSince(viewedAt);
    if (d !== null && d >= STALE_DAYS) return 'stale_viewed_no_response';
    return null; // viewed recently — no reminder yet
  }

  // 4. Sent but never viewed for >= STALE_DAYS
  if (sent_at) {
    const d = daysSince(sent_at);
    if (d !== null && d >= STALE_DAYS) return 'stale_sent_not_viewed';
  }

  return null;
}

/**
 * Compute summary counts and grouped arrays from a list of proposals.
 * Returns:
 * {
 *   overdue_follow_up: [],
 *   follow_up_today: [],
 *   stale_sent_not_viewed: [],
 *   stale_viewed_no_response: [],
 *   total: number,
 * }
 */
export function computeProposalReminders(proposals) {
  const result = {
    overdue_follow_up: [],
    follow_up_today: [],
    stale_sent_not_viewed: [],
    stale_viewed_no_response: [],
  };

  (proposals || []).forEach(p => {
    const cat = classifyProposalReminder(p);
    if (cat && result[cat]) result[cat].push(p);
  });

  result.total =
    result.overdue_follow_up.length +
    result.follow_up_today.length +
    result.stale_sent_not_viewed.length +
    result.stale_viewed_no_response.length;

  return result;
}