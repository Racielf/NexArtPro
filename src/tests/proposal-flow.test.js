/**
 * Proposal Flow Integration Tests
 *
 * Mirrors estimate-flow tests but uses the proposal adapter
 * to verify proposals use the same pricing/RBAC pipeline.
 */
import { validateEstimatePricing } from '../src/lib/pricingValidation';
import { canSendDocument, ROLES } from '../src/lib/pricingPermissions';
import { mapItemsToGroups } from '../src/components/proposals/ProposalEstimateGroupsAdapter';

function makeProposalItems(items) {
  return items.map((item, i) => ({
    id: `pi-${i}`,
    service_name: `Service ${i}`,
    quantity: item.quantity ?? 1,
    unit_price: item.unit_price,
    unit_cost: item.unit_cost,
    unit: 'ea',
    line_total: (item.quantity ?? 1) * item.unit_price,
  }));
}

function validateProposal(items) {
  const groups = mapItemsToGroups(makeProposalItems(items));
  return validateEstimatePricing({ groups });
}

// ── Proposal: Loss Pricing Flow ────────────────────────────────────────────────

describe('Proposal — loss pricing flow', () => {
  const pv = validateProposal([{ unit_price: 20, unit_cost: 40 }]);

  test('adapter correctly passes items for validation', () => {
    expect(pv.canProceed).toBe(false);
    expect(pv.lossItems).toHaveLength(1);
  });

  test('sales blocked from sending', () => {
    const gate = canSendDocument(ROLES.SALES, pv);
    expect(gate.allowed).toBe(false);
  });

  test('manager gets override flow', () => {
    const gate = canSendDocument(ROLES.MANAGER, pv);
    expect(gate.requiresOverride).toBe(true);
  });
});

// ── Proposal: Zero-Profit Flow ─────────────────────────────────────────────────

describe('Proposal — zero-profit flow', () => {
  const pv = validateProposal([{ unit_price: 50, unit_cost: 50 }]);

  test('detected as zero-profit, not loss', () => {
    expect(pv.canProceed).toBe(true);
    expect(pv.zeroProfitItems).toHaveLength(1);
    expect(pv.lossItems).toHaveLength(0);
  });

  test('all roles get confirmation', () => {
    [ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN].forEach(role => {
      const gate = canSendDocument(role, pv);
      expect(gate.requiresConfirm).toBe(true);
      expect(gate.requiresOverride).toBe(false);
    });
  });
});

// ── Proposal: Normal Flow ──────────────────────────────────────────────────────

describe('Proposal — normal pricing flow', () => {
  const pv = validateProposal([{ unit_price: 200, unit_cost: 100 }]);

  test('no issues detected', () => {
    expect(pv.canProceed).toBe(true);
    expect(pv.lossItems).toHaveLength(0);
    expect(pv.zeroProfitItems).toHaveLength(0);
  });

  test('all roles proceed freely', () => {
    [ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN].forEach(role => {
      const gate = canSendDocument(role, pv);
      expect(gate.allowed).toBe(true);
      expect(gate.requiresConfirm).toBe(false);
      expect(gate.requiresOverride).toBe(false);
    });
  });
});

// ── Proposal adapter preserves unit_cost ───────────────────────────────────────

describe('Proposal adapter preserves cost data', () => {
  test('unit_cost passes through mapItemsToGroups', () => {
    const items = makeProposalItems([{ unit_price: 80, unit_cost: 90 }]);
    const groups = mapItemsToGroups(items);
    expect(groups[0].items[0].unit_cost).toBe(90);
    expect(groups[0].items[0].unit_price).toBe(80);
  });
});

// ── No margin-based flow ───────────────────────────────────────────────────────

describe('Proposal — no margin-based restrictions', () => {
  test('thin margin proposal → no restrictions', () => {
    const pv = validateProposal([{ unit_price: 101, unit_cost: 100 }]);
    expect(pv.canProceed).toBe(true);
    expect(pv.requiresConfirmation).toBe(false);

    const gate = canSendDocument(ROLES.SALES, pv);
    expect(gate.allowed).toBe(true);
  });
});