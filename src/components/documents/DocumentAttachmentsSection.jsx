/**
 * DocumentAttachmentsSection — Renders client-safe attachments inside the final document.
 *
 * Uses inline styles only (consistent with PDF/document rendering templates).
 * ONLY receives pre-filtered client attachments from the viewModel.
 * Never renders internal attachments — filtering happens upstream in buildEstimateDocumentViewModel.
 *
 * Props:
 *   attachments  — array of { id, file_name, file_url }
 *   font         — font family string
 *   sectionLabelStyle — shared section label style object from the template
 *   accentColor  — optional accent color (defaults to slate)
 *   containerStyle — optional wrapper style overrides
 */

const FILE_ICONS = {
  pdf: { label: 'PDF', bg: '#fef2f2', border: '#fecaca', color: '#ef4444' },
  doc: { label: 'DOC', bg: '#eff6ff', border: '#bfdbfe', color: '#3b82f6' },
  docx: { label: 'DOC', bg: '#eff6ff', border: '#bfdbfe', color: '#3b82f6' },
  xls: { label: 'XLS', bg: '#f0fdf4', border: '#bbf7d0', color: '#22c55e' },
  xlsx: { label: 'XLS', bg: '#f0fdf4', border: '#bbf7d0', color: '#22c55e' },
  jpg: { label: 'IMG', bg: '#faf5ff', border: '#e9d5ff', color: '#a855f7' },
  jpeg: { label: 'IMG', bg: '#faf5ff', border: '#e9d5ff', color: '#a855f7' },
  png: { label: 'IMG', bg: '#faf5ff', border: '#e9d5ff', color: '#a855f7' },
};

function getFileStyle(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || { label: 'FILE', bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
}

export default function DocumentAttachmentsSection({
  attachments = [],
  font = "'Inter', Arial, sans-serif",
  sectionLabelStyle = {},
  accentColor = '#334155',
  containerStyle = {},
}) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div style={{ ...containerStyle }}>
      <div style={sectionLabelStyle}>Included Documents</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {attachments.map((att, idx) => {
          const style = getFileStyle(att.file_name);
          return (
            <a
              key={att.id || idx}
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${style.border}`,
                background: style.bg,
                textDecoration: 'none',
                fontFamily: font,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 4,
                background: 'white', border: `1px solid ${style.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: style.color, letterSpacing: '0.02em' }}>
                  {style.label}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: '#1e293b',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {att.file_name || 'Document'}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                  Click to view or download
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}