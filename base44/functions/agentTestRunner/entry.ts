/**
 * functions/agentTestRunner.js
 * Server-side agent test runner (Deno).
 * Validates the same contract as src/agent/run-tests.js without importing frontend code.
 *
 * Invoke via:
 *   base44.functions.invoke('agentTestRunner', {})
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── MINIMAL DIFF RULES (portable subset of src/agent/config.js DIFF_RULES) ──
// Only the 3 rules needed to validate the 3 test cases.
// No LLM call — local regex only. No frontend imports.

const DIFF_RULES = [
  {
    id: 'patch_back_to_clients_label',
    type: 'patch',
    EXEMPT: [/Clients\.jsx?$/, /ClientPortal/, /ClientEstimateView/, /ClientFormModal/, /ClientDocuments/],
    validate({ filePath, diff }) {
      if (this.EXEMPT.some(re => re.test(filePath))) return { valid: true };
      const found = diff.includes('"Back to Clients"') || diff.includes("'Back to Clients'");
      if (!found) return { valid: true };
      return { valid: false, type: 'patch' };
    },
  },
  {
    id: 'mixed_client_customer_ids',
    type: 'warn',
    validate({ filePath, diff }) {
      const hasClientId   = /client_id\s*[:=]/.test(diff);
      const hasCustomerId = /customer_id\s*[:=]/.test(diff);
      if (!(hasClientId && hasCustomerId)) return { valid: true };
      return { valid: false, type: 'warn' };
    },
  },
];

function runDiffRules({ filePath, diff }) {
  for (const rule of DIFF_RULES) {
    try {
      const result = rule.validate({ filePath, diff });
      if (result && !result.valid) return result.type;
    } catch { /* skip malformed rule */ }
  }
  return 'none';
}

// ── TEST CASES (mirror of src/agent/agent.js manual payloads) ────────────────

const CASES = [
  {
    name: 'manualTestOk',
    expected: 'none',
    filePath: 'src/components/estimates/EstimateSidebarCustomer.jsx',
    diff: `
-  const displayName = customer.display_name;
+  const displayName = customer.display_name || 'Unknown';
    `,
  },
  {
    name: 'manualTestWarn',
    expected: 'warn',
    filePath: 'src/components/estimates/EstimateNewForm.jsx',
    diff: `
+  const record = {
+    client_id: selectedClient.id,
+    customer_id: selectedCustomer.id,
+    title: form.title,
+  };
+  await base44.entities.Estimate.create(record);
    `,
  },
  {
    name: 'manualTestPatch',
    expected: 'patch',
    filePath: 'src/components/estimates/EstimateHeader.jsx',
    diff: `
-  <button>Back to Estimates</button>
+  <button>Back to Clients</button>
    `,
  },
];

// ── HANDLER ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = CASES.map(({ name, expected, filePath, diff }) => {
      const actual = runDiffRules({ filePath, diff });
      return { name, expected, actual, passed: actual === expected };
    });

    const passed = results.every(r => r.passed);
    return Response.json({ passed, results });

  } catch (error) {
    return Response.json({ passed: false, results: [], error: error.message }, { status: 500 });
  }
});