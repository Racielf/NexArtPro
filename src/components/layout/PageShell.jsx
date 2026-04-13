import React from 'react';

/**
 * PageShell — Standard content wrapper for authenticated internal pages.
 *
 * Provides consistent padding, max-width, and vertical rhythm.
 * Use inside the AppLayout main area.
 *
 * Props:
 * - children: ReactNode
 * - className: string — optional extra classes on the scroll container
 * - innerClassName: string — optional extra classes on the inner content area
 */
export default function PageShell({ children, className = '', innerClassName = '' }) {
  return (
    <div className={`flex flex-col h-full overflow-y-auto ${className}`}>
      <div className={`flex-1 p-6 space-y-5 max-w-screen-xl mx-auto w-full ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}
