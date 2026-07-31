const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const STAT_COLORS = {
  accent:  { icon: '#b07f1d', bg: 'rgba(176,127,29,0.12)' },
  success: { icon: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  danger:  { icon: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  info:    { icon: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  purple:  { icon: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  orange:  { icon: '#df6b2a', bg: 'rgba(223,107,42,0.12)' },
};

export function formatMoney(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `$${Math.round(v).toLocaleString()}`;
}

export function buildMonthlyRevenue(invoices = []) {
  const map = {};
  invoices.forEach(inv => {
    if (inv.status !== 'paid') return;
    const d = new Date(inv.paid_at || inv.updated_date || '');
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    map[key] = (map[key] || 0) + (inv.total || 0);
  });
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: MONTH_LABELS[d.getMonth()], revenue: map[`${d.getFullYear()}-${d.getMonth()}`] || 0 };
  });
}
