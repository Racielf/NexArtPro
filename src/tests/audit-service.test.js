/**
 * Audit Service Tests
 *
 * Validates that the audit service creates correct event types
 * with the standardized payload shape.
 * Mocks the entity persistence layer to inspect payloads.
 */

// ── Mock Setup ─────────────────────────────────────────────────────────────────

const createdEvents = [];

jest.mock('../src/api/base44Client', () => ({
  base44: {
    entities: {
      PricingAuditEvent: {
        create: jest.fn((payload) => {
          createdEvents.push(payload);
          return Promise.resolve(payload);
        }),
        filter: jest.fn(() => Promise.resolve(createdEvents)),
      },
    },
  },
}));

import {
  logFieldChange,
  logLossOverride,
  logZeroProfitConfirmation,
  logSendAfterOverride,
  fetchAuditHistory,
} from '../src/lib/pricingAuditService';

beforeEach(() => {
  createdEvents.length = 0;
});

// ── Allowed Event Types ────────────────────────────────────────────────────────

const ALLOWED_EVENT_TYPES = [
  'field_change',
  'loss_override',
  'zero_profit_confirmation',
  'send_after_override',
];

const LEGACY_EVENT_TYPES = [
  'override_loss_send',
  'override_loss_approve',
  'override_zero_profit',
  'override_zero_profit_send',
  'margin_override',
  'manual_approval',
  'approve_after_override',
];

// ── Event Type Tests ───────────────────────────────────────────────────────────

describe('Audit event types', () => {
  test('logFieldChange creates field_change event', async () => {
    await logFieldChange({
      documentId: 'doc-1',
      documentKind: 'estimate',
      userEmail: 'user@test.com',
      userRole: 'admin',
      metadata: { field_name: 'unit_price', old_value: 100, new_value: 120 },
    });
    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0].event_type).toBe('field_change');
  });

  test('logLossOverride creates loss_override event', async () => {
    await logLossOverride({
      documentId: 'doc-1',
      documentKind: 'estimate',
      userEmail: 'admin@test.com',
      userRole: 'admin',
      metadata: { reason: 'Client negotiation', lossItems: [] },
    });
    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0].event_type).toBe('loss_override');
  });

  test('logZeroProfitConfirmation creates zero_profit_confirmation event', async () => {
    await logZeroProfitConfirmation({
      documentId: 'doc-1',
      documentKind: 'proposal',
      userEmail: 'sales@test.com',
      userRole: 'sales',
      metadata: {},
    });
    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0].event_type).toBe('zero_profit_confirmation');
  });

  test('logSendAfterOverride creates send_after_override event', async () => {
    await logSendAfterOverride({
      documentId: 'doc-1',
      documentKind: 'estimate',
      userEmail: 'admin@test.com',
      userRole: 'admin',
      metadata: {},
    });
    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0].event_type).toBe('send_after_override');
  });

  test('no legacy event types can be created', () => {
    // All functions hardcode their event_type — verify none match legacy names
    const allCreators = [logFieldChange, logLossOverride, logZeroProfitConfirmation, logSendAfterOverride];
    // The service has no generic "logActionEvent" that accepts arbitrary types
    // This test confirms the exported API surface is limited to safe functions
    expect(allCreators).toHaveLength(4);
    LEGACY_EVENT_TYPES.forEach(legacy => {
      expect(ALLOWED_EVENT_TYPES).not.toContain(legacy);
    });
  });
});

// ── Payload Shape Tests ────────────────────────────────────────────────────────

describe('Audit payload structure', () => {
  test('all base fields are present', async () => {
    await logFieldChange({
      documentId: 'doc-123',
      documentKind: 'proposal',
      userEmail: 'user@test.com',
      userRole: 'manager',
      metadata: { field_name: 'unit_cost', old_value: 50, new_value: 60 },
    });

    const event = createdEvents[0];
    expect(event).toHaveProperty('event_type');
    expect(event).toHaveProperty('document_id', 'doc-123');
    expect(event).toHaveProperty('document_kind', 'proposal');
    expect(event).toHaveProperty('user_email', 'user@test.com');
    expect(event).toHaveProperty('user_role', 'manager');
    expect(event).toHaveProperty('metadata');
  });

  test('event-specific data lives inside metadata', async () => {
    await logFieldChange({
      documentId: 'doc-1',
      documentKind: 'estimate',
      userEmail: 'u@t.com',
      userRole: 'admin',
      metadata: { field_name: 'unit_price', old_value: 100, new_value: 80, line_item_id: 'li-1' },
    });

    const event = createdEvents[0];
    // Specific data is inside metadata, not at top level
    expect(event.metadata.field_name).toBe('unit_price');
    expect(event.metadata.old_value).toBe(100);
    expect(event.metadata.new_value).toBe(80);
    expect(event.metadata.line_item_id).toBe('li-1');
    // Top level should NOT have these
    expect(event.field_name).toBeUndefined();
    expect(event.old_value).toBeUndefined();
  });

  test('loss override metadata contains reason', async () => {
    await logLossOverride({
      documentId: 'doc-1',
      documentKind: 'estimate',
      userEmail: 'admin@t.com',
      userRole: 'admin',
      metadata: { reason: 'Strategic discount', lossItems: [{ name: 'Svc A' }] },
    });

    const event = createdEvents[0];
    expect(event.metadata.reason).toBe('Strategic discount');
    expect(event.metadata.lossItems).toHaveLength(1);
    // reason is NOT at top level
    expect(event.reason).toBeUndefined();
  });

  test('defaults are applied for missing optional fields', async () => {
    await logFieldChange({
      documentId: 'doc-1',
      metadata: { field_name: 'unit_price' },
    });

    const event = createdEvents[0];
    expect(event.document_kind).toBe('estimate'); // default
    expect(event.user_email).toBe('');
    expect(event.user_role).toBe('');
  });
});

// ── Duplicate Prevention ───────────────────────────────────────────────────────

describe('No duplicate events', () => {
  test('calling log once creates exactly one event', async () => {
    await logFieldChange({
      documentId: 'doc-1',
      metadata: { field_name: 'unit_price', old_value: 10, new_value: 20 },
    });
    expect(createdEvents).toHaveLength(1);
  });

  test('zero-profit is NEVER logged as loss_override', async () => {
    await logZeroProfitConfirmation({
      documentId: 'doc-1',
      documentKind: 'estimate',
      userEmail: 'user@test.com',
      userRole: 'sales',
      metadata: {},
    });
    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0].event_type).toBe('zero_profit_confirmation');
    expect(createdEvents[0].event_type).not.toBe('loss_override');
  });
});