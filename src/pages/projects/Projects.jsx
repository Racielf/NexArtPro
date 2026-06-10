import React from 'react';
import { Building2 } from 'lucide-react';

export default function Projects() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        Investor Hub — under development. This module will manage flip projects, capital contributions, and investor returns.
      </p>
    </div>
  );
}
