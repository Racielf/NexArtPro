import React from 'react';
import { Wrench } from 'lucide-react';
import { STAT_COLORS } from './dashboardFormat';
import { Card } from './DashboardPrimitives';
import DonutStat from './DonutStat';

const STAGES = [
  { key: 'scheduled',   label: 'Scheduled',   color: 'info' },
  { key: 'on_the_way',  label: 'On My Way',   color: 'orange' },
  { key: 'in_progress', label: 'In Progress', color: 'purple' },
  { key: 'completed',   label: 'Completed',   color: 'success' },
];

export default function JobPipelineCard({ workOrders = [], loading }) {
  const counts = {
    scheduled:   workOrders.filter(w => w.status === 'scheduled').length,
    on_the_way:  workOrders.filter(w => w.status === 'on_the_way').length,
    in_progress: workOrders.filter(w => w.status === 'in_progress').length,
    completed:   workOrders.filter(w => w.status === 'completed').length,
  };
  const total = STAGES.reduce((s, stage) => s + counts[stage.key], 0);
  const data = STAGES.map(stage => ({ label: stage.label, value: counts[stage.key], color: STAT_COLORS[stage.color].icon }));

  return (
    <Card title="Job Pipeline" icon={Wrench} link="/work-orders" linkLabel="Ver →" className="h-full">
      <div className="p-4 flex items-center h-full">
        <DonutStat data={data} centerValue={total} centerLabel="Jobs" loading={loading} />
      </div>
    </Card>
  );
}
