/**
 * Field Change Audit Tests
 *
 * Validates that field_change events are correctly logged
 * with proper metadata and no duplicates.
 */

const createdEvents = [];

jest.mock('../src/api/base44Client', () => ({
  base44: {
    entities: {
      PricingAuditEvent: {
        create: jest.fn((payload) => {
          createdEvents.push(payload);
          return Promise.resolve(payload);
        }),
      },
    },
  },
}));

import { logFieldChange } from '../src/lib/pricingAuditService';

beforeEach(() => {
  createdEvents.length = 0;
});

// ── Field Change Logging ───────────────────────────────────────────────────────

describe('Field change event creation', () => {
  test('unit_price change creates field_change event', async () => {
    await logFieldChange({
      documentId: 'est-1',
      documentKind: 'estimate',
      userEmail: 'admin@test.com',
      userRole: 'admin',
      metadata: {
        field_name: 'unit_price',
        old_value: 100,
        new_value: 120,
        line_item_id: 'li-1',
        line_item_name: 'Painting',
      },
    });

    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0].event_type).toBe('field_change');
    expect(createdEvents[0].metadata.field_name).toBe('unit_price');
    expect(createdEvents[0].metadata.old_value).toBe(100);
    expect(createdEvents[0].metadata.new_value).toBe(120);
  });

  test('unit_cost change creates field_change event', async () => {
    await logFieldChange({
      documentId: 'est-1',
      documentKind: 'bid',
      userEmail: 'mgr@test.com',
      userRole: 'manager',
      metadata: {
        field_name: 'unit_cost',
        old_value: 50,
        new_value: 60,
        line_item_id: 'li-2',
        line_item_name: 'Drywall',
      },
    });

    expect(createdEvents).toHaveLength(1);
    expect(createdEvents[0].metadata.field_name).toBe('unit_cost');
  });
});

// ── No Duplicate Events ────────────────────────────────────────────────────────

describe('No duplicate field_change events', () => {
  test('single call creates exactly one event', async () => {
    await logFieldChange({
      documentId: 'est-1',
      metadata: { field_name: 'unit_price', old_value: 10, new_value: 20 },
    });
    expect(createdEvents).toHaveLength(1);
  });

  test('caller must check value changed (service does not filter)', async () => {
    // The service always creates — caller is responsible for checking delta >= $0.01
    // This confirms the service does NOT add its own dedup logic
    await logFieldChange({
      documentId: 'est-1',
      metadata: { field_name: 'unit_price', old_value: 100, new_value: 100 },
    });
    // Event IS created — caller is expected to not call if no change
    expect(createdEvents).toHaveLength(1);
  });
});

// ── Metadata Structure ─────────────────────────────────────────────────────────

describe('Field change metadata structure', () => {
  test('line_item_id and line_item_name are in metadata', async () => {
    await logFieldChange({
      documentId: 'est-1',
      metadata: {
        field_name: 'unit_price',
        old_value: 50,
        new_value: 70,
        line_item_id: 'li-5',
        line_item_name: 'Electrical',
        margin_at_event: 35.2,
        total_at_event: 5000,
      },
    });

    const m = createdEvents[0].metadata;
    expect(m.line_item_id).toBe('li-5');
    expect(m.line_item_name).toBe('Electrical');
    expect(m.margin_at_event).toBe(35.2);
    expect(m.total_at_event).toBe(5000);
  });

  test('no event-specific data at top level', async () => {
    await logFieldChange({
      documentId: 'est-1',
      metadata: { field_name: 'unit_price', old_value: 1, new_value: 2 },
    });

    const event = createdEvents[0];
    expect(event.field_name).toBeUndefined();
    expect(event.old_value).toBeUndefined();
    expect(event.new_value).toBeUndefined();
    expect(event.line_item_id).toBeUndefined();
  });
});