import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProjectCard from '@/components/projects/ProjectCard';
import { nexartClient } from '@/api/nexartClient';

export default function Projects() {
  const navigate = useNavigate();

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => nexartClient.entities.Project.list('-created_at', 200),
    staleTime: 1000 * 60 * 2,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Flip projects, capital contributions, and investor returns.</p>
        </div>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive py-8 text-center">Failed to load projects.</p>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground max-w-xs">
            No projects yet. Create your first flip project to start tracking capital and returns.
          </p>
          <Button className="mt-4" onClick={() => navigate('/projects/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}
