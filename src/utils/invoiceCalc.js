// Centralized estimate/invoice calculation utilities.

export const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;

export const calcLineTotal = (item) => {
  const qty = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unit_price) || 0;
  const discount = parseFloat(item.discount) || 0;
  const subtotal = qty * unitPrice;
  return round2(Math.max(0, subtotal - discount));
};

export const calcDocumentTotals = (lineItems = [], globalTaxRate = 0) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  lineItems.forEach(item => {
    const lineTotal = calcLineTotal(item);

    if (item.item_type === "discount") {
      discountTotal += lineTotal;
    } else {
      subtotal += lineTotal;
      if (item.taxable) {
        const rate = parseFloat(item.tax_rate) || parseFloat(globalTaxRate) || 0;
        taxTotal += (lineTotal * rate) / 100;
      }
    }
  });

  const total = Math.max(0, subtotal - discountTotal + taxTotal);

  return {
    subtotal: round2(subtotal),
    discount_total: round2(discountTotal),
    tax_total: round2(taxTotal),
    total: round2(total),
  };
};

export const calcBalanceDue = (total, amountPaid) => {
  return round2(Math.max(0, parseFloat(total || 0) - parseFloat(amountPaid || 0)));
};

export const formatCurrency = (n) => {
  return "$" + Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const generatePublicToken = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export const deriveInvoiceStatus = (invoice) => {
  if (["void","refunded"].includes(invoice.status)) return invoice.status;
  const balanceDue = calcBalanceDue(invoice.total, invoice.amount_paid);
  if (balanceDue <= 0 && invoice.total > 0) return "paid";
  if ((invoice.amount_paid || 0) > 0 && balanceDue > 0) return "partially_paid";
  if (invoice.due_date && new Date(invoice.due_date) < new Date() && balanceDue > 0 && invoice.status !== "draft") return "overdue";
  return invoice.status;
};