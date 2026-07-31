import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function DonutStat({ data = [], size = 110, centerValue, centerLabel, loading }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const chartData = total > 0 ? data : [{ label: 'Sin datos', value: 1, color: '#e2e8f0' }];

  return (
    <div className="flex items-center gap-4 w-full">
      <div style={{ width: size, height: size }} className="relative flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={total > 0 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display text-xl font-black text-slate-800 leading-none">{loading ? '—' : centerValue}</span>
          {centerLabel && <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{centerLabel}</span>}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-slate-500 truncate flex-1">{d.label}</span>
            <span className="font-bold text-slate-700 tabular-nums">{loading ? '—' : d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
