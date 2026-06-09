/**
 * Price Discipline Utilities — INTERNAL ONLY
 * Never used in renderers, PDF, or client-facing views.
 */

/**
 * Flatten all items from grouped structure.
 */
export function flattenItems(groups = []) {
  return groups.flatMap(g => g.items || []);
}

/**
 * Calculate price discipline metrics for a list of line items.
 *
 * @param {Array} items - line items with { book_price, unit_price, quantity }
 * @returns {{ bookTotal, actualTotal, varianceAmount, variancePercent, hasBookData }}
 */
export function calculatePriceDiscipline(items = []) {
  let bookTotal = 0;
  let actualTotal = 0;
  let hasBookData = false;

  items.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const bookPrice = parseFloat(item.book_price) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;

    if (bookPrice > 0) hasBookData = true;

    bookTotal += bookPrice * qty;
    actualTotal += unitPrice * qty;
  });

  const varianceAmount = actualTotal - bookTotal;
  const variancePercent = bookTotal > 0 ? varianceAmount / bookTotal : 0;

  return { bookTotal, actualTotal, varianceAmount, variancePercent, hasBookData };
}