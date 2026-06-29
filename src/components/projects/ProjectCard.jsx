import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_COLORS, formatCurrency } from '@/lib/projectsApi';

export default function ProjectCard({ project }) {
  const navigate = useNavigate();

  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const statusColor = STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <div
      className="nexart-item-card"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
          </div>
        </div>
        <Badge className={`${statusColor} shrink-0`}>{statusLabel}</Badge>
      </div>

      <div className="space-y-1">
        {project.address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{project.address}</span>
          </div>
        )}
        {project.purchase_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{new Date(project.purchase_date).toLocaleDateString()}</span>
          </div>
        )}
        {project.arv != null && (
          <p className="text-xs text-muted-foreground">
            ARV: <span className="font-semibold text-foreground">{formatCurrency(project.arv)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
