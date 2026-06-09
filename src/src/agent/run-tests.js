/**
 * agent/run-tests.js
 * Minimal test harness for the agent module.
 * Runs the 3 manual payloads in sequence and validates result.type.
 *
 * Usage (browser console or any async context):
 *   import { runAgentTests } from './agent/run-tests.js';
 *   const report = await runAgentTests();
 *   console.table(report.results);
 */

import { runAgent, manualTestOk, manualTestWarn, manualTestPatch } from './agent.js';

const CASES = [
  { name: 'manualTestOk',    payload: manualTestOk,    expected: 'none'  },
  { name: 'manualTestWarn',  payload: manualTestWarn,  expected: 'warn'  },
  { name: 'manualTestPatch', payload: manualTestPatch, expected: 'patch' },
];

/**
 * runAgentTests()
 * Executes all test cases sequentially and returns a structured report.
 * Never throws — failed cases are marked passed: false.
 *
 * @returns {Promise<{ passed: boolean, results: Array }>}
 */
export async function runAgentTests() {
  const results = [];

  for (const { name, payload, expected } of CASES) {
    let actual = null;
    let error  = null;

    try {
      const result = await runAgent(payload);
      actual = result?.type ?? null;
    } catch (err) {
      error  = err?.message ?? String(err);
      actual = null;
    }

    const passed = actual === expected;

    results.push({ name, expected, actual, passed, error: error ?? undefined });

    const icon = passed ? '✅' : '❌';
    console.log(`${icon} [${name}] expected="${expected}" actual="${actual ?? 'ERROR'}"${error ? ` error="${error}"` : ''}`);
  }

  const allPassed = results.every(r => r.passed);

  console.log('');
  console.log(`── Agent Test Report ── ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.table(results.map(({ name, expected, actual, passed }) => ({ name, expected, actual, passed })));

  return { passed: allPassed, results };
}