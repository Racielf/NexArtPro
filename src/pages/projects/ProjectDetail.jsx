import React from 'react';
import { useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-semibold text-foreground">Project Detail</h1>
      <p className="text-muted-foreground mt-2">
        Project <span className="font-mono text-sm">{id}</span> — under development.
      </p>
    </div>
  );
}
