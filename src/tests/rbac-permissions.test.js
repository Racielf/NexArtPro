/**
 * RBAC Permission Tests
 *
 * Validates that RBAC only gates loss pricing.
 * Zero-profit and positive margin are NOT role-gated.
 */
import { canSendDocument, canApproveDocument, ROLES } from '../src/lib/pricingPermissions';

// ── Helpers ────────────────────────────────────────────────────────────────────

const LOSS_RESULT = {
  canProceed: false,
  lossItems: [{ name: 'Item', unit_price: 10, unit_cost: 20, loss_per_unit: 10, quantity: 1 }],
  zeroProfitItems: [],
  requiresConfirmation: false,
};

const ZERO_PROFIT_RESULT = {
  canProceed: true,
  lossItems: [],
  zeroProfitItems: [{ name: 'Item', unit_price: 50, unit_cost: 50, quantity: 1 }],
  requiresConfirmation: true,
};

const NORMAL_RESULT = {
  canProceed: true,
  lossItems: [],
  zeroProfitItems: [],
  requiresConfirmation: false,
};

// ── Loss Pricing RBAC ──────────────────────────────────────────────────────────

describe('Loss pricing RBAC', () => {
  test('sales CANNOT override loss pricing', () => {
    const gate = canSendDocument(ROLES.SALES, LOSS_RESULT);
    expect(gate.allowed).toBe(false);
    expect(gate.requiresOverride).toBe(false);
    expect(gate.blockedReason).toBeTruthy();
  });

  test('manager CAN override loss pricing', () => {
    const gate = canSendDocument(ROLES.MANAGER, LOSS_RESULT);
    expect(gate.allowed).toBe(true);
    expect(gate.requiresOverride).toBe(true);
    expect(gate.requiresConfirm).toBe(false);
  });

  test('admin CAN override loss pricing', () => {
    const gate = canSendDocument(ROLES.ADMIN, LOSS_RESULT);
    expect(gate.allowed).toBe(true);
    expect(gate.requiresOverride).toBe(true);
    expect(gate.requiresConfirm).toBe(false);
  });

  test('approve uses same rules as send', () => {
    const sendGate = canSendDocument(ROLES.SALES, LOSS_RESULT);
    const approveGate = canApproveDocument(ROLES.SALES, LOSS_RESULT);
    expect(sendGate).toEqual(approveGate);
  });
});

// ── Zero-Profit is NOT role-gated ──────────────────────────────────────────────

describe('Zero-profit is NOT role-gated', () => {
  test.each([ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN])(
    '%s gets confirmation (not blocked, not override)',
    (role) => {
      const gate = canSendDocument(role, ZERO_PROFIT_RESULT);
      expect(gate.allowed).toBe(true);
      expect(gate.requiresConfirm).toBe(true);
      expect(gate.requiresOverride).toBe(false);
      expect(gate.blockedReason).toBeNull();
    }
  );
});

// ── Normal Pricing ─────────────────────────────────────────────────────────────

describe('Normal pricing — no restrictions', () => {
  test.each([ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN])(
    '%s can proceed without confirmation or override',
    (role) => {
      const gate = canSendDocument(role, NORMAL_RESULT);
      expect(gate.allowed).toBe(true);
      expect(gate.requiresConfirm).toBe(false);
      expect(gate.requiresOverride).toBe(false);
      expect(gate.blockedReason).toBeNull();
    }
  );
});

// ── Edge Cases ─────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('null pricingResult → allowed', () => {
    const gate = canSendDocument(ROLES.SALES, null);
    expect(gate.allowed).toBe(true);
  });

  test('empty pricing result → allowed', () => {
    const gate = canSendDocument(ROLES.SALES, { lossItems: [], zeroProfitItems: [] });
    expect(gate.allowed).toBe(true);
  });
});