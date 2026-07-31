import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Card } from './DashboardPrimitives';

export default function ApprovalGaugeCard({ rate = 0, sentCount = 0, approvedCount = 0, loading }) {
  const color = rate >= 50 ? '#16a34a' : rate >= 25 ? '#df6b2a' : '#dc2626';
  const data = [{ value: rate, fill: color }];
  const totalConsidered = sentCount + approvedCount;

  return (
    <Card title="Tasa de Aprobación" icon={CheckCircle2} link="/estimates" linkLabel="Ver →" className="h-full">
      <div className="p-4 flex flex-col items-center justify-center h-full gap-1">
        <div className="relative" style={{ width: 130, height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart data={data} startAngle={90} endAngle={-270} innerRadius="72%" outerRadius="100%" barSize={14} cx="50%" cy="50%">
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={8} isAnimationActive={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-display text-2xl font-black leading-none" style={{ color }}>
              {loading ? '—' : `${rate}%`}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          {loading ? 'Cargando…' : `${approvedCount} aprobado${approvedCount === 1 ? '' : 's'} de ${totalConsidered} enviado${totalConsidered === 1 ? '' : 's'}`}
        </p>
      </div>
    </Card>
  );
}
