/**
 * Pricing Validation Tests
 *
 * Validates that validateEstimatePricing correctly classifies
 * loss, zero-profit, and positive-margin items.
 */
import { validateEstimatePricing } from '../src/lib/pricingValidation';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEstimate(items) {
  return {
    groups: [{
      id: 'g1',
      name: 'Test',
      items: items.map((item, i) => ({
        id: `item-${i}`,
        service_name: item.name || `Item ${i}`,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        unit: 'ea',
        line_total: (item.quantity ?? 1) * item.unit_price,
      })),
    }],
  };
}

// ── Loss Pricing ───────────────────────────────────────────────────────────────

describe('Loss pricing (unit_price < unit_cost)', () => {
  test('single loss item → canProceed=false, lossItems populated', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 50, unit_cost: 80 },
    ]));
    expect(result.canProceed).toBe(false);
    expect(result.lossItems).toHaveLength(1);
    expect(result.lossItems[0].unit_price).toBe(50);
    expect(result.lossItems[0].unit_cost).toBe(80);
    expect(result.lossItems[0].loss_per_unit).toBe(30);
  });

  test('multiple loss items → all captured', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 10, unit_cost: 20 },
      { unit_price: 5, unit_cost: 15 },
    ]));
    expect(result.canProceed).toBe(false);
    expect(result.lossItems).toHaveLength(2);
  });

  test('loss item mixed with normal → still blocked', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 100, unit_cost: 50 },
      { unit_price: 10, unit_cost: 20 },
    ]));
    expect(result.canProceed).toBe(false);
    expect(result.lossItems).toHaveLength(1);
  });

  test('requiresConfirmation is false when loss items exist', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 10, unit_cost: 20 },
    ]));
    expect(result.requiresConfirmation).toBe(false);
  });
});

// ── Zero-Profit Pricing ────────────────────────────────────────────────────────

describe('Zero-profit pricing (unit_price == unit_cost)', () => {
  test('exact match → zeroProfitItems populated, canProceed=true', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 50, unit_cost: 50 },
    ]));
    expect(result.canProceed).toBe(true);
    expect(result.zeroProfitItems).toHaveLength(1);
    expect(result.requiresConfirmation).toBe(true);
  });

  test('within $0.01 tolerance → treated as zero-profit', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 50.005, unit_cost: 50 },
    ]));
    expect(result.canProceed).toBe(true);
    expect(result.zeroProfitItems).toHaveLength(1);
  });

  test('zero-profit is NOT treated as loss', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 100, unit_cost: 100 },
    ]));
    expect(result.lossItems).toHaveLength(0);
    expect(result.zeroProfitItems).toHaveLength(1);
  });
});

// ── Positive Margin ────────────────────────────────────────────────────────────

describe('Positive margin (unit_price > unit_cost)', () => {
  test('normal pricing → canProceed=true, no issues', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 100, unit_cost: 60 },
    ]));
    expect(result.canProceed).toBe(true);
    expect(result.lossItems).toHaveLength(0);
    expect(result.zeroProfitItems).toHaveLength(0);
    expect(result.requiresConfirmation).toBe(false);
  });

  test('items with no cost data → skipped (no flags)', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 100, unit_cost: 0 },
    ]));
    expect(result.canProceed).toBe(true);
    expect(result.lossItems).toHaveLength(0);
    expect(result.zeroProfitItems).toHaveLength(0);
  });

  test('items with no price → skipped', () => {
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 0, unit_cost: 50 },
    ]));
    expect(result.canProceed).toBe(true);
    expect(result.lossItems).toHaveLength(0);
  });
});

// ── Edge Cases ─────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('empty estimate → no issues', () => {
    const result = validateEstimatePricing({ groups: [] });
    expect(result.canProceed).toBe(true);
    expect(result.lossItems).toHaveLength(0);
    expect(result.zeroProfitItems).toHaveLength(0);
  });

  test('null estimate → no issues', () => {
    const result = validateEstimatePricing(null);
    expect(result.canProceed).toBe(true);
  });

  test('book_price is never used in validation', () => {
    // Even if book_price makes this look like a "loss", only unit_price vs unit_cost matters
    const result = validateEstimatePricing(makeEstimate([
      { unit_price: 100, unit_cost: 60, book_price: 200 },
    ]));
    expect(result.canProceed).toBe(true);
    expect(result.lossItems).toHaveLength(0);
  });
});