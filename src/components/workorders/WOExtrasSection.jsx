import React from 'react';

function calcHours(arrival, departure) {
  if (!arrival || !departure) return null;
  const [ah, am] = arrival.split(':').map(Number);
  const [dh, dm] = departure.split(':').map(Number);
  const total = (dh * 60 + dm) - (ah * 60 + am);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

const SectionBox = ({ title, children }) => (
  <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px', marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
      {title}
    </div>
    {children}
  </div>
);

const PhotoRow = ({ label, items }) => {
  if (!items.length) return null;
  const isImg = (url) => /\.(jpg|jpeg|png|gif|webp)/i.test(url || '');
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(p =>
          isImg(p.photo_url) ? (
            <img key={p.id} src={p.photo_url} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
          ) : null
        )}
      </div>
    </div>
  );
};

export default function WOExtrasSection({ workOrder, expenses = [], photos = [], taskStatuses = {} }) {
  const allItems = (workOrder?.groups || []).flatMap(g => g.items || []);
  const totalHours = calcHours(workOrder?.arrival_time, workOrder?.departure_time);
  const expTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const beforePhotos = photos.filter(p => p.phase === 'before');
  const duringPhotos = photos.filter(p => p.phase === 'during');
  const afterPhotos = photos.filter(p => p.phase === 'after');

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>
      {/* Task Checklist */}
      {allItems.length > 0 && (
        <SectionBox title="Task Checklist">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Task</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, i) => {
                const key = item.id || item.service_name || String(i);
                const isDone = taskStatuses?.[key]?.status === 'done';
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>
                      <span style={{ marginRight: 6 }}>{isDone ? '✅' : '☐'}</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.service_name}</span>
                      {item.description && (
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <span style={{
                        background: isDone ? '#dcfce7' : '#f1f5f9',
                        color: isDone ? '#166534' : '#64748b',
                        padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      }}>
                        {isDone ? 'Done' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionBox>
      )}

      {/* Time on Site */}
      {(workOrder?.arrival_time || workOrder?.departure_time) && (
        <SectionBox title="Time on Site">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {workOrder?.arrival_time && (
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Arrival</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{workOrder.arrival_time}</div>
              </div>
            )}
            {workOrder?.departure_time && (
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Departure</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{workOrder.departure_time}</div>
              </div>
            )}
            {totalHours && (
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Total Hours</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>{totalHours}</div>
              </div>
            )}
          </div>
        </SectionBox>
      )}

      {/* Work Summary */}
      {workOrder?.work_summary && (
        <SectionBox title="Work Summary">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.6, fontSize: 13 }}>
            {workOrder.work_summary}
          </p>
        </SectionBox>
      )}

      {/* Issues Found */}
      {workOrder?.issues_found && (
        <SectionBox title="Issues Found">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#b45309', lineHeight: 1.6, fontSize: 13 }}>
            {workOrder.issues_found}
          </p>
        </SectionBox>
      )}

      {/* Materials & Expenses */}
      {expenses.length > 0 && (
        <SectionBox title="Materials & Expenses">
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Description</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Vendor</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Method</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{e.description}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{e.vendor || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{e.payment_method}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>${(e.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={3} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>Total Expenses</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, textAlign: 'right', color: '#2563eb', borderTop: '1px solid #e2e8f0' }}>${expTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </SectionBox>
      )}

      {/* Project Photos */}
      {photos.length > 0 && (
        <SectionBox title="Project Photos">
          <PhotoRow label="Before" items={beforePhotos} />
          <PhotoRow label="During" items={duringPhotos} />
          <PhotoRow label="After" items={afterPhotos} />
        </SectionBox>
      )}
    </div>
  );
}