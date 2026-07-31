import React from 'react';
import { STAT_COLORS } from './dashboardFormat';

export default function NxtStat({ icon: Icon, value, label, change, changeType = 'muted', color = 'accent', loading }) {
  const c = STAT_COLORS[color] ?? STAT_COLORS.accent;
  return (
    <div className="nxt-stat-card" style={{ '--nxt-stat-color': c.icon, '--nxt-stat-bg': c.bg }}>
      <div className="nxt-stat-icon">
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <p className="nxt-stat-value">{loading ? <span className="text-[18px] text-muted-foreground/30">—</span> : value}</p>
      <p className="nxt-stat-label">{label}</p>
      {change && <p className={`nxt-stat-change ${changeType}`}>{change}</p>}
    </div>
  );
}
