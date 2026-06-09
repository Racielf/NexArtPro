/**
 * usePriceAuditLog — Internal-only price change tracker.
 *
 * Records changes to unit_price or unit_cost triggered by user actions (onBlur / explicit calls).
 * NOT driven by useEffect. No backend writes. Never exposed to client documents.
 *
 * Usage:
 *   const { addLog, priceLog } = usePriceAuditLog();
 *   // On blur of unit_price input:
 *   addLog({ item, field: 'unit_price', oldValue: prev, newValue: next });
 */
import { useState, useCallback, useRef } from 'react';
import { getNegotiationMeta } from '@/lib/estimateEngine';

/**
 * logChange — central pure function that builds a log entry.
 * Guards against: same value, invalid numbers, division by zero.
 */
function buildLogEntry({ item, field, oldValue, newValue, user = 'admin' }) {
  const oldNum = parseFloat(oldValue) || 0;
  const newNum = parseFloat(newValue) || 0;

  // Skip if value didn't actually change
  if (Math.abs(newNum - oldNum) < 0.001) return null;

  const cost  = parseFloat(item.unit_cost)  || 0;
  const price = parseFloat(item.unit_price) || 0;

  // Margin before: use current item state (before the change)
  const metaBefore = field === 'unit_price'
    ? getNegotiationMeta(cost, oldNum)
    : getNegotiationMeta(oldNum, price);

  // Margin after: apply the new value
  const metaAfter = field === 'unit_price'
    ? getNegotiationMeta(cost, newNum)
    : getNegotiationMeta(newNum, price);  // cost changed

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user,
    item_id:   item.id,
    item_name: item.service_name || '(unnamed)',
    field,
    old_value: oldNum,
    new_value: newNum,
    delta:     parseFloat((newNum - oldNum).toFixed(4)),
    margin_before: metaBefore.margin,
    margin_after:  metaAfter.margin,
    status_before: metaBefore.status,
    status_after:  metaAfter.status,
  };
}

export function usePriceAuditLog() {
  const [priceLog, setPriceLog] = useState([]);

  /**
   * addLog({ item, field, oldValue, newValue, user? })
   * Call this on onBlur of unit_price / unit_cost inputs, or after auto-adjustments.
   */
  const addLog = useCallback(({ item, field, oldValue, newValue, user }) => {
    const entry = buildLogEntry({ item, field, oldValue, newValue, user });
    if (!entry) return; // no change — skip
    setPriceLog(prev => [entry, ...prev]); // prepend = descending order
  }, []);

  const clearLog = useCallback(() => setPriceLog([]), []);

  return { priceLog, addLog, clearLog };
}