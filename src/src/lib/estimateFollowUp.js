/**
 * estimateFollowUp.js
 *
 * Minimal follow-up decision layer for sent estimates.
 * Pure helpers only — no UI and no side effects.
 *
 * Scope:
 * - Calculate next action
 * - Calculate urgency
 * - Prepare Mark Contacted payload
 *
 * Does not modify estimate totals, document rendering, sending, approval,
 * conversion, or client portal behavior.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysSince(value, now = new Date()) {
  const d = parseDate(value);
  if (!d) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY));
}

export function formatFollowUpAge(value, now = new Date()) {
  const days = daysSince(value, now);
  if (days === null) return 'Never';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function isFollowUpCandidate(estimate) {
  return ['sent', 'viewed', 'changes_requested'].includes(estimate?.status);
}

export function getEstimateFollowUpState(estimate, { now = new Date() } = {}) {
  const status = estimate?.status || 'draft';
  const sentDays = daysSince(estimate?.sent_at, now);
  const viewedDays = daysSince(estimate?.viewed_at, now);
  const contactedDays = daysSince(estimate?.last_contacted_at || estimate?.sent_at, now);
  const followUpCount = Number(estimate?.follow_up_count || 0);

  if (status === 'approved' || status === 'converted') {
    return {
      active: false,
      urgency: 'closed',
      label: 'Closed',
      nextAction: status === 'converted' ? 'Already converted' : 'Approved — convert when ready',
      due: 'Done',
      lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
      followUpCount,
    };
  }

  if (status === 'declined') {
    return {
      active: false,
      urgency: 'closed',
      label: 'Lost',
      nextAction: 'Declined — no follow-up due',
      due: 'Closed',
      lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
      followUpCount,
    };
  }

  if (status === 'changes_requested') {
    return {
      active: true,
      urgency: 'critical',
      label: 'Changes requested',
      nextAction: 'Respond to requested changes',
      due: 'Now',
      lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
      followUpCount,
    };
  }

  if (status === 'viewed') {
    if (viewedDays !== null && viewedDays >= 2) {
      return {
        active: true,
        urgency: 'urgent',
        label: 'Viewed, not approved',
        nextAction: 'Call or send reminder',
        due: 'Today',
        lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
        followUpCount,
      };
    }

    return {
      active: true,
      urgency: 'normal',
      label: 'Viewed',
      nextAction: 'Wait for client response',
      due: 'Soon',
      lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
      followUpCount,
    };
  }

  if (status === 'sent') {
    if (sentDays !== null && sentDays >= 5) {
      return {
        active: true,
        urgency: 'urgent',
        label: 'No response',
        nextAction: 'Send follow-up reminder',
        due: 'Today',
        lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
        followUpCount,
      };
    }

    if (sentDays !== null && sentDays >= 2) {
      return {
        active: true,
        urgency: 'watch',
        label: 'Pending',
        nextAction: 'Follow up if no response',
        due: 'Soon',
        lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
        followUpCount,
      };
    }

    return {
      active: true,
      urgency: 'normal',
      label: 'Recently sent',
      nextAction: 'Wait for client to view',
      due: 'Not due',
      lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
      followUpCount,
    };
  }

  return {
    active: false,
    urgency: 'none',
    label: 'Not sent',
    nextAction: 'No follow-up yet',
    due: '—',
    lastContactedLabel: formatFollowUpAge(estimate?.last_contacted_at || estimate?.sent_at, now),
    followUpCount,
  };
}

export function buildMarkContactedPayload(estimate, now = new Date()) {
  return {
    last_contacted_at: now.toISOString(),
    follow_up_count: Number(estimate?.follow_up_count || 0) + 1,
    updated_by: 'Admin',
  };
}

export function getFollowUpBadgeClasses(urgency) {
  if (urgency === 'critical') return 'bg-red-50 border-red-200 text-red-700';
  if (urgency === 'urgent') return 'bg-amber-50 border-amber-200 text-amber-700';
  if (urgency === 'watch') return 'bg-blue-50 border-blue-200 text-blue-700';
  if (urgency === 'closed') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (urgency === 'normal') return 'bg-slate-50 border-slate-200 text-slate-600';
  return 'bg-slate-50 border-slate-100 text-slate-400';
}
