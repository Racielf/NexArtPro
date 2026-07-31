import React from 'react';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney, buildMonthlyRevenue } from './dashboardFormat';
import { Card } from './DashboardPrimitives';

const RevTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white text-slate-800 text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg border border-slate-200">
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="text-emerald-600 font-bold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export default function RevenueTrendCard({ invoices = [], loading, monthRevenue = 0 }) {
  const data = buildMonthlyRevenue(invoices);
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const prevMonthRevenue = data.length >= 2 ? data[data.length - 2].revenue : 0;
  const trendPct = prevMonthRevenue > 0 ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : null;
  const trendUp = trendPct !== null && trendPct >= 0;

  return (
    <Card title="Ingresos — 6 Meses" icon={TrendingUp} link="/invoices" linkLabel="Ver todas" className="h-full">
      <div className="px-4 pt-3 pb-2 flex flex-col h-full gap-2">
        <div className="flex items-end gap-2">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Este Mes</span>
            <span className="font-display text-3xl font-bold text-emerald-600 tabular-nums leading-none">{loading ? '—' : formatMoney(monthRevenue)}</span>
          </div>
          {!loading && trendPct !== null && (
            <span className={`text-[11px] font-bold mb-0.5 px-1.5 py-0.5 rounded-md ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {trendUp ? '▲' : '▼'} {Math.abs(trendPct)}%
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          {loading
            ? <div className="flex items-center justify-center h-full text-[11px] text-slate-400">Cargando…</div>
            : <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 32, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: '#cbd5e1' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`} />
                  <Tooltip content={<RevTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={(props) => {
                    const { cx, cy, value } = props;
                    if (value !== maxVal) return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#10b981" fillOpacity={0.5} stroke="white" strokeWidth={1} />;
                    return (
                      <g key={props.key}>
                        <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="white" strokeWidth={2} />
                        <text x={cx + 8} y={cy - 6} fontSize={9} fontWeight={700} fill="#10b981">${(value / 1000).toFixed(1)}k</text>
                      </g>
                    );
                  }} />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>
      </div>
    </Card>
  );
}
