/**
 * invoiceCollectionTimeline.js
 *
 * Pure helpers for collection action timeline tracking.
 * No API calls — only data structure manipulation.
 */

/**
 * Build normalized timeline event object
 */
export function buildTimelineEvent(type, actor, note = '', meta = {}) {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    actor,
    created_at: new Date().toISOString(),
    ...(note && { note }),
    ...(Object.keys(meta).length > 0 && { meta }),
  };
}

/**
 * Append event to timeline array
 * Returns new timeline array (immutable)
 */
export function appendCollectionTimelineEvent(invoice = {}, event) {
  const timeline = invoice.collection_timeline || [];
  return [...timeline, event];
}

/**
 * Get sorted timeline (newest first)
 */
export function getCollectionTimeline(invoice = {}) {
  const timeline = invoice.collection_timeline || [];
  return [...timeline].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Get latest event of optional type filter
 */
export function getLatestCollectionEvent(invoice = {}, type = null) {
  const timeline = getCollectionTimeline(invoice);
  if (type) {
    return timeline.find(e => e.type === type) || null;
  }
  return timeline.length > 0 ? timeline[0] : null;
}

/**
 * Get days since last collection action
 */
export function getDaysSinceLastCollectionAction(invoice = {}) {
  const lastEvent = getLatestCollectionEvent(invoice);
  if (!lastEvent) return null;

  const eventDate = new Date(lastEvent.created_at);
  const now = new Date();
  const diffMs = now - eventDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Build summary of latest collection activity
 */
export function getCollectionActivitySummary(invoice = {}) {
  const lastEvent = getLatestCollectionEvent(invoice);
  if (!lastEvent) return null;

  const daysSince = getDaysSinceLastCollectionAction(invoice);
  const timeLabel = daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`;

  return {
    lastAction: lastEvent.type,
    lastActor: lastEvent.actor,
    lastNote: lastEvent.note || null,
    daysSince,
    timeLabel,
    timestamp: lastEvent.created_at,
  };
}

/**
 * Count events by type
 */
export function countTimelineEventsByType(invoice = {}) {
  const timeline = invoice.collection_timeline || [];
  const counts = {};

  timeline.forEach(event => {
    counts[event.type] = (counts[event.type] || 0) + 1;
  });

  return counts;
}

/**
 * Get all actors who performed actions
 */
export function getCollectionActors(invoice = {}) {
  const timeline = invoice.collection_timeline || [];
  const actors = new Set();

  timeline.forEach(event => {
    if (event.actor) actors.add(event.actor);
  });

  return Array.from(actors);
}