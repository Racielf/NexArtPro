import React from 'react';
import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/projectsApi';
import { nexartClient } from '@/api/nexartClient';

const TABS = [
  { label: 'Overview',      path: '' },
  { label: 'Financials',    path: 'financials' },
  { label: 'Investors',     path: 'investors' },
  { label: 'Capital',       path: 'capital' },
  { label: 'Flip Analysis', path: 'flip-analysis' },
];

const EMPTY_PROJECT = {
  id:             null,
  project_number: '--',
  name:           'Project',
  address:        '',
  status:         'planning',
  responsible:    '',
  purchase_date:  null,
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: project = EMPTY_PROJECT, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const rows = await nexartClient.entities.Project.filter({ id }, '-created_at', 1);
      return rows[0] ?? EMPTY_PROJECT;
    },
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(id),
  });

  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const statusColor = STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 border-b bg-background">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 text-muted-foreground"
          onClick={() => navigate('/projects')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Projects
        </Button>

        <div className="flex items-start gap-3 mb-4">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
          ) : (
            <Building2 className="w-6 h-6 text-muted-foreground mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold truncate">{project.name}</h1>
              {!isLoading && <Badge className={statusColor}>{statusLabel}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
            {project.address && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                {project.address}
              </div>
            )}
          </div>
        </div>

        <nav className="flex gap-1">
          {TABS.map(({ label, path }) => {
            const to = path ? `/projects/${id}/${path}` : `/projects/${id}`;
            return (
              <NavLink
                key={path}
                to={to}
                end={path === ''}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Outlet context={{ project, isLoadingProject: isLoading }} />
      </div>
    </div>
  );
}
