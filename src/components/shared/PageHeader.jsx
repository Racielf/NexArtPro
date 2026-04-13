import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * PageHeader — Shared page-level header for internal authenticated pages.
 *
 * Props (all optional except title):
 * - title: string
 * - subtitle: string — context text shown below title
 * - eyebrow: string — small uppercase label above title
 * - actionLabel: string — primary CTA label
 * - onAction: fn — primary CTA handler
 * - disabled: bool — disables primary action
 * - actions: ReactNode — custom actions slot (overrides actionLabel/onAction)
 * - children: ReactNode — legacy custom actions slot
 */
export default function PageHeader({ title, subtitle, eyebrow, actionLabel, onAction, disabled, actions, children }) {
  const hasActions = actions || children || (actionLabel && onAction);
  return (
    <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-border">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{eyebrow}</p>
        )}
        <h1 className="text-[18px] font-bold text-foreground leading-tight tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {hasActions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions || children}
          {!actions && !children && actionLabel && onAction && (
            <Button size="sm" onClick={onAction} disabled={disabled} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
