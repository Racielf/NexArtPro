import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_COLORS, formatCurrency } from '@/lib/projectsApi';

export default function ProjectCard({ project }) {
  const navigate = useNavigate();

  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const statusColor = STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-semibold text-sm leading-tight">{project.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
          </div>
        </div>
        <Badge className={statusColor}>{statusLabel}</Badge>
      </CardHeader>

      <CardContent className="space-y-1 pt-0">
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
            ARV: <span className="font-medium text-foreground">{formatCurrency(project.arv)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
