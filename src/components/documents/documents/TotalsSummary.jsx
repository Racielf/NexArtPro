import { formatCurrency } from "@/utils/invoiceCalc";

export default function TotalsSummary({ totals, amountPaid = 0, balanceDue, label = "Total" }) {
  const showBalance = balanceDue !== undefined && balanceDue !== null;
  return (
    <div className="bg-white rounded-2xl nx-shadow border border-nx-border px-6 py-4">
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-nx-muted">Subtotal</span><span className="font-medium text-nx-text">{formatCurrency(totals.subtotal)}</span></div>
          {totals.discount_total > 0 && <div className="flex justify-between text-sm"><span className="text-nx-muted">Discount</span><span className="text-nx-success">-{formatCurrency(totals.discount_total)}</span></div>}
          {totals.tax_total > 0 && <div className="flex justify-between text-sm"><span className="text-nx-muted">Tax</span><span className="font-medium text-nx-text">{formatCurrency(totals.tax_total)}</span></div>}
          <div className="flex justify-between border-t border-nx-border pt-2">
            <span className="font-jakarta font-bold text-nx-text">{label}</span>
            <span className="font-jakarta font-bold text-xl text-nx-text">{formatCurrency(totals.total)}</span>
          </div>
          {amountPaid > 0 && <div className="flex justify-between text-sm text-nx-success"><span>Amount Paid</span><span>-{formatCurrency(amountPaid)}</span></div>}
          {showBalance && balanceDue > 0 && (
            <div className="flex justify-between border-t border-nx-border pt-2">
              <span className="font-semibold text-nx-error">Balance Due</span>
              <span className="font-jakarta font-bold text-lg text-nx-error">{formatCurrency(balanceDue)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}