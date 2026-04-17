import React from 'react';
import { DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1','#14b8a6','#f43f5e'];

function buildMonthlyData(invoices) {
  const map = {};
  invoices.forEach(inv => {
    if (inv.status !== 'paid') return;
    const dateStr = inv.paid_at || inv.updated_date || '';
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
    map[key] = (map[key] || 0) + (inv.total || 0);
  });
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
    result.push({ month: MONTH_LABELS[d.getMonth()], revenue: map[key] || 0 });
  }
  return result;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{label}</p>
      <p className="text-emerald-400 font-bold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export default function RevenueBreakdownCard({ invoices = [], loading }) {
  const data = buildMonthlyData(invoices);
  const maxVal = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-700">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">Ingresos — 6 Meses</span>
        </div>
        <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Facturas Pagadas</span>
      </div>

      <div className="px-2 pt-2 pb-1">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-slate-300 text-xs">Cargando…</div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={22}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#cbd5e1' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="revenue" radius={[4,4,0,0]}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.revenue === maxVal ? '#10b981' : '#3b82f6'} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}