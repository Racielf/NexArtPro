import { ALLOWED_EVENT_TYPES } from '../src/lib/pricingAuditService';

describe('audit event taxonomy contract', () => {
  test('uses the exact allowed event types', () => {
    expect(ALLOWED_EVENT_TYPES).toEqual([
      'field_change',
      'loss_override',
      'zero_profit_confirmation',
      'send_after_override'
    ]);
  });
});