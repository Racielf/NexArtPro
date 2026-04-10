/**
 * Estimate Flow Integration Tests
 *
 * Validates the end-to-end decision flow for estimates:
 * pricing validation → RBAC gate → correct UI flow triggered.
 */
import { validateEstimatePricing } from '../src/lib/pricingValidation';
import { canSendDocument, ROLES } from '../src/lib/pricingPermissions';

function makeEstimate(items) {
  return {
    groups: [{
      id: 'g1', name: 'Test',
      items: items.map((item, i) => ({
        id: `item-${i}`,
        service_name: `Item ${i}`,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        unit: 'ea',
        line_total: (item.quantity ?? 1) * item.unit_price,
      })),
    }],
  };
}

// ── Estimate: Loss Pricing Flow ────────────────────────────────────────────────

describe('Estimate — loss pricing flow', () => {
  const estimate = makeEstimate([{ unit_price: 30, unit_cost: 50 }]);
  const pv = validateEstimatePricing(estimate);

  test('validation detects loss', () => {
    expect(pv.canProceed).toBe(false);
    expect(pv.lossItems).toHaveLength(1);
  });

  test('sales → blocked, no override modal', () => {
    const gate = canSendDocument(ROLES.SALES, pv);
    expect(gate.allowed).toBe(false);
    expect(gate.requiresOverride).toBe(false);
  });

  test('manager → override modal triggered', () => {
    const gate = canSendDocument(ROLES.MANAGER, pv);
    expect(gate.allowed).toBe(true);
    expect(gate.requiresOverride).toBe(true);
    expect(gate.requiresConfirm).toBe(false);
  });

  test('admin → override modal triggered', () => {
    const gate = canSendDocument(ROLES.ADMIN, pv);
    expect(gate.requiresOverride).toBe(true);
  });
});

// ── Estimate: Zero-Profit Flow ─────────────────────────────────────────────────

describe('Estimate — zero-profit flow', () => {
  const estimate = makeEstimate([{ unit_price: 75, unit_cost: 75 }]);
  const pv = validateEstimatePricing(estimate);

  test('validation detects zero-profit (not loss)', () => {
    expect(pv.canProceed).toBe(true);
    expect(pv.lossItems).toHaveLength(0);
    expect(pv.zeroProfitItems).toHaveLength(1);
    expect(pv.requiresConfirmation).toBe(true);
  });

  test('all roles get confirmation (not override)', () => {
    [ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN].forEach(role => {
      const gate = canSendDocument(role, pv);
      expect(gate.allowed).toBe(true);
      expect(gate.requiresConfirm).toBe(true);
      expect(gate.requiresOverride).toBe(false);
    });
  });
});

// ── Estimate: Normal Flow ──────────────────────────────────────────────────────

describe('Estimate — normal pricing flow', () => {
  const estimate = makeEstimate([{ unit_price: 100, unit_cost: 60 }]);
  const pv = validateEstimatePricing(estimate);

  test('validation passes cleanly', () => {
    expect(pv.canProceed).toBe(true);
    expect(pv.lossItems).toHaveLength(0);
    expect(pv.zeroProfitItems).toHaveLength(0);
    expect(pv.requiresConfirmation).toBe(false);
  });

  test('all roles proceed without any modal', () => {
    [ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN].forEach(role => {
      const gate = canSendDocument(role, pv);
      expect(gate.allowed).toBe(true);
      expect(gate.requiresConfirm).toBe(false);
      expect(gate.requiresOverride).toBe(false);
    });
  });
});

// ── No margin-based flow ───────────────────────────────────────────────────────

describe('Estimate — no margin-based restrictions', () => {
  test('low margin (5%) with positive pricing → no restrictions', () => {
    const estimate = makeEstimate([{ unit_price: 105, unit_cost: 100 }]);
    const pv = validateEstimatePricing(estimate);
    expect(pv.canProceed).toBe(true);
    expect(pv.requiresConfirmation).toBe(false);

    const gate = canSendDocument(ROLES.SALES, pv);
    expect(gate.allowed).toBe(true);
    expect(gate.requiresOverride).toBe(false);
    expect(gate.requiresConfirm).toBe(false);
  });
});