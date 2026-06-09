import React from 'react';
import FlexibleDocDates from './FlexibleDocDates';

/**
 * FlexibleDocClientProject — Layout-driven client + project info block.
 *
 * Modes (from layout.clientProject):
 *   "grid"    — 2 equal columns, no borders
 *   "cards"   — 2 bordered card boxes
 *   "stacked" — client on top, project below (single column)
 *
 * Props:
 *   layout      — from getTemplateLayout()
 *   client      — { name, address, email, phone }
 *   project     — { title, startDate, endDate, hasProjectDates, assignedTo }
 *   meta        — { today }
 *   showProjectDates — boolean
 */
export default function FlexibleDocClientProject({ layout, client, project, meta, showProjectDates = true }) {
  const { clientProject, accentColor, font, dates: dateMode } = layout;
  const padding = '24px 44px';

  const label = { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 };

  const ClientBlock = () => (
    <div>
      <div style={label}>Bill To</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 6 }}>{client.name}</div>
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.75 }}>
        {client.address && <div>{client.address}</div>}
        {client.email && <div>{client.email}</div>}
        {client.phone && <div>{client.phone}</div>}
      </div>
    </div>
  );

  const ProjectBlock = () => (
    <div>
      <div style={label}>Project Details</div>
      {project.title && (
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 10 }}>{project.title}</div>
      )}
      {showProjectDates && project.hasProjectDates && (
        <FlexibleDocDates
          mode={dateMode}
          docDate={null}
          startDate={project.startDate}
          endDate={project.endDate}
          accentColor={accentColor}
          font={font}
        />
      )}
      {project.assignedTo && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 2 }}>Assigned To</div>
          <div style={{ color: '#334155', fontSize: 12 }}>{project.assignedTo}</div>
        </div>
      )}
      {!project.title && !project.hasProjectDates && !project.assignedTo && (
        <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No project details</div>
      )}
    </div>
  );

  // ── Grid mode ──────────────────────────────────────
  if (clientProject === 'grid') {
    return (
      <div style={{ fontFamily: font, display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding, borderRight: '1px solid #e2e8f0' }}>
          <ClientBlock />
        </div>
        <div style={{ padding }}>
          <ProjectBlock />
        </div>
      </div>
    );
  }

  // ── Cards mode ─────────────────────────────────────
  if (clientProject === 'cards') {
    const card = {
      padding: '20px 22px',
      background: '#ffffff',
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
    };
    return (
      <div style={{ fontFamily: font, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '24px 44px' }}>
        <div style={card}><ClientBlock /></div>
        <div style={card}><ProjectBlock /></div>
      </div>
    );
  }

  // ── Stacked mode ───────────────────────────────────
  if (clientProject === 'stacked') {
    return (
      <div style={{ fontFamily: font, padding }}>
        <div style={{ marginBottom: 20 }}><ClientBlock /></div>
        <ProjectBlock />
      </div>
    );
  }

  // Fallback → grid
  return (
    <div style={{ fontFamily: font, display: 'grid', gridTemplateColumns: '1fr 1fr', padding }}>
      <div><ClientBlock /></div>
      <div><ProjectBlock /></div>
    </div>
  );
}