/**
 * Tests for lib/lineItemNormalizer.js
 *
 * Run manually via: paste into browser console or use a test runner.
 * Each test returns { pass: boolean, name: string, detail?: string }
 */
import { normalizeLineItem, normalizeGroups, resolveAndNormalizeGroups } from '../lib/lineItemNormalizer';

function assert(condition, name, detail) {
  if (!condition) console.error(`❌ FAIL: ${name}`, detail);
  else console.log(`✅ PASS: ${name}`);
  return { pass: !!condition, name, detail };
}

// ─── 1. Catalog service selection ────────────────────────────────────────────
(function testCatalogService() {
  const item = normalizeLineItem({
    id: 'abc123',
    service_id: '69dad1cadae7e5b59a27685c',
    service_name: 'Drywall Install per sqft',
    category: 'Drywall',
    unit: 'SQFT',
    unit_price: 3.0,
    unit_cost: 0.95,
    book_price: 2.5,
    quantity: 100,
  });

  assert(item.service_id === '69dad1cadae7e5b59a27685c', 'catalog: service_id persists');
  assert(item.service_name === 'Drywall Install per sqft', 'catalog: service_name persists');
  assert(item.category === 'Drywall', 'catalog: category persists');
  assert(item.line_total === 300, 'catalog: line_total = qty * unit_price');
  assert(item.unit_cost === 0.95, 'catalog: unit_cost persists');
  assert(item.book_price === 2.5, 'catalog: book_price persists');
})();

// ─── 2. Custom service (no service_id) ──────────────────────────────────────
(function testCustomService() {
  const item = normalizeLineItem({
    service_name: 'Custom cleaning',
    unit_price: 50,
    quantity: 2,
  });

  assert(item.service_id === null, 'custom: service_id is null');
  assert(item.service_name === 'Custom cleaning', 'custom: name preserved');
  assert(item.category === 'Misc', 'custom: default category');
  assert(item.unit === 'ea', 'custom: default unit');
  assert(item.line_total === 100, 'custom: line_total correct');
  assert(typeof item.id === 'string' && item.id.length > 0, 'custom: auto-generated id');
})();

// ─── 3. Reload estimate with service_id ─────────────────────────────────────
(function testReloadWithServiceId() {
  // Simulate data as it comes back from DB
  const saved = {
    id: 'item1',
    service_id: 'svc_abc',
    service_name: 'Paint Interior',
    category: 'Paint',
    unit: 'SQFT',
    unit_price: 2.25,
    unit_cost: 0.65,
    book_price: 2.05,
    quantity: 500,
    line_total: 1125,
    taxable: true,
  };
  const item = normalizeLineItem(saved);

  assert(item.service_id === 'svc_abc', 'reload: service_id intact');
  assert(item.line_total === 1125, 'reload: stored line_total preserved');
  assert(item.id === 'item1', 'reload: id preserved');
})();

// ─── 4. Legacy estimate without service_id ──────────────────────────────────
(function testLegacyEstimate() {
  const legacy = {
    id: 'old1',
    name: 'Old Service Name',
    total_price: 750,
    quantity: 5,
    unit_price: 150,
  };
  const item = normalizeLineItem(legacy);

  assert(item.service_id === null, 'legacy: no service_id → null');
  assert(item.service_name === 'Old Service Name', 'legacy: name alias resolved');
  assert(item.category === 'Misc', 'legacy: default category');
  assert(item.line_total === 750, 'legacy: total_price alias used');
})();

// ─── 5. NaN and negative guards ─────────────────────────────────────────────
(function testNaNGuards() {
  const bad = {
    service_name: 'Test',
    quantity: 'abc',
    unit_price: NaN,
    unit_cost: undefined,
    book_price: -5,
    line_total: 'not a number',
  };
  const item = normalizeLineItem(bad);

  assert(item.quantity === 1, 'NaN guard: bad quantity → 1');
  assert(item.unit_price === 0, 'NaN guard: NaN price → 0');
  assert(item.unit_cost === 0, 'NaN guard: undefined cost → 0');
  assert(item.book_price === 0, 'NaN guard: negative book_price → 0');
  assert(item.line_total === 0, 'NaN guard: bad line_total → recalc (1*0=0)');
  assert(!isNaN(item.quantity), 'NaN guard: quantity is not NaN');
  assert(!isNaN(item.unit_price), 'NaN guard: unit_price is not NaN');
})();

// ─── 6. Empty / missing service_name ────────────────────────────────────────
(function testEmptyServiceName() {
  const item1 = normalizeLineItem({});
  assert(item1.service_name === '(unnamed)', 'empty: no name → (unnamed)');

  const item2 = normalizeLineItem({ service_name: '' });
  assert(item2.service_name === '(unnamed)', 'empty: blank name → (unnamed)');

  const item3 = normalizeLineItem({ name: '' });
  assert(item3.service_name === '(unnamed)', 'empty: blank legacy name → (unnamed)');
})();

// ─── 7. service_id type validation ──────────────────────────────────────────
(function testServiceIdValidation() {
  assert(normalizeLineItem({ service_id: 123 }).service_id === null, 'sid: number → null');
  assert(normalizeLineItem({ service_id: true }).service_id === null, 'sid: boolean → null');
  assert(normalizeLineItem({ service_id: '' }).service_id === null, 'sid: empty string → null');
  assert(normalizeLineItem({ service_id: 'valid_id' }).service_id === 'valid_id', 'sid: valid string → preserved');
})();

// ─── 8. resolveAndNormalizeGroups — groups path ─────────────────────────────
(function testGroupsPath() {
  const est = {
    groups: [{
      id: 'g1', name: 'Demo', collapsed: false,
      items: [{ name: 'Demo Item', quantity: 2, unit_price: 10 }],
    }],
  };
  const result = resolveAndNormalizeGroups(est);
  assert(result.length === 1, 'groups path: 1 group');
  assert(result[0].items[0].service_name === 'Demo Item', 'groups path: name resolved');
  assert(result[0].items[0].line_total === 20, 'groups path: total calculated');
})();

// ─── 9. resolveAndNormalizeGroups — legacy line_items path ──────────────────
(function testLegacyPath() {
  const est = {
    line_items: [
      { name: 'Legacy A', quantity: 1, unit_price: 100, total_price: 100 },
      { name: 'Legacy B', quantity: 3, unit_price: 50 },
    ],
  };
  const result = resolveAndNormalizeGroups(est);
  assert(result.length === 1, 'legacy path: 1 default group');
  assert(result[0].name === 'General', 'legacy path: group name = General');
  assert(result[0].items.length === 2, 'legacy path: 2 items');
  assert(result[0].items[1].line_total === 150, 'legacy path: item B total correct');
})();

// ─── 10. resolveAndNormalizeGroups — empty estimate ─────────────────────────
(function testEmptyEstimate() {
  assert(resolveAndNormalizeGroups({}).length === 0, 'empty: no groups');
  assert(resolveAndNormalizeGroups(null).length === 0, 'null: no groups');
  assert(resolveAndNormalizeGroups(undefined).length === 0, 'undefined: no groups');
})();

console.log('\\n✅ All line-item-normalizer tests completed.');