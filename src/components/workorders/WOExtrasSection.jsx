import React, { useState } from 'react';

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
  // Local state for expense management
  const [localExpenses, setLocalExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ category: 'materials', description: '', amount: '', quantity: 1 });

  const allItems = (workOrder?.groups || []).flatMap(g => g.items || []);
  const totalHours = calcHours(workOrder?.arrival_time, workOrder?.departure_time);

  // Combine passed expenses + local expenses
  const allExpenses = [...expenses, ...localExpenses];
  const expTotal = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Expense categories
  const EXPENSE_CATEGORIES = {
    labor: { label: 'Labor', color: '#3b82f6' },
    materials: { label: 'Materials', color: '#10b981' },
    transport: { label: 'Transport', color: '#f59e0b' },
    food: { label: 'Food', color: '#ec4899' },
    misc: { label: 'Misc', color: '#8b5cf6' },
  };

  // Calculate totals by category
  const expensesByCategory = Object.keys(EXPENSE_CATEGORIES).reduce((acc, cat) => {
    acc[cat] = allExpenses.filter(e => (e.category || 'materials') === cat);
    return acc;
  }, {});

  const categoryTotals = Object.keys(EXPENSE_CATEGORIES).reduce((acc, cat) => {
    acc[cat] = expensesByCategory[cat].reduce((sum, e) => sum + (e.amount || 0), 0);
    return acc;
  }, {});

  // Add new expense handler
  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    const expense = {
      id: `local-${Date.now()}`,
      category: newExpense.category,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      quantity: newExpense.quantity || 1,
    };
    setLocalExpenses([...localExpenses, expense]);
    setNewExpense({ category: 'materials', description: '', amount: '', quantity: 1 });
  };

  // Remove expense handler
  const handleRemoveExpense = (id) => {
    setLocalExpenses(localExpenses.filter(e => e.id !== id));
  };

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

      {/* Expenses */}
      <SectionBox title="Work Order Expenses">
        {/* Add Expense Form */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Category</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              >
                {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Description</label>
              <input
                type="text"
                placeholder="e.g., Gas, Paint, Lunch"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Qty</label>
              <input
                type="number"
                value={newExpense.quantity}
                onChange={(e) => setNewExpense({ ...newExpense, quantity: parseInt(e.target.value) || 1 })}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }}
              />
            </div>
            <button
              onClick={handleAddExpense}
              style={{
                padding: '6px 12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Expenses by Category */}
        {allExpenses.length > 0 ? (
          <>
            {Object.entries(EXPENSE_CATEGORIES).map(([catKey, catConfig]) => {
              const catExpenses = expensesByCategory[catKey];
              if (catExpenses.length === 0) return null;

              return (
                <div key={catKey} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: catConfig.color,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    paddingBottom: 4,
                    borderBottom: `2px solid ${catConfig.color}`,
                  }}>
                    {catConfig.label}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                    <tbody>
                      {catExpenses.map(exp => (
                        <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', fontSize: 12, flex: 1 }}>{exp.description}</td>
                          {exp.quantity > 1 && (
                            <td style={{ padding: '8px 12px', fontSize: 11, color: '#64748b', textAlign: 'right', minWidth: 50 }}>
                              x{exp.quantity}
                            </td>
                          )}
                          <td style={{ padding: '8px 0', fontSize: 12, textAlign: 'right', fontWeight: 600, minWidth: 80 }}>
                            ${(exp.amount || 0).toFixed(2)}
                          </td>
                          {localExpenses.find(e => e.id === exp.id) && (
                            <td style={{ padding: '8px 0', textAlign: 'right' }}>
                              <button
                                onClick={() => handleRemoveExpense(exp.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingBottom: 12,
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: catConfig.color }}>
                      Subtotal: ${categoryTotals[catKey].toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Cost Summary */}
            <div style={{
              background: '#f0f9ff',
              border: `2px solid #0ea5e9`,
              borderRadius: 8,
              padding: 16,
              marginTop: 16,
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
                marginBottom: 12,
                letterSpacing: 0.5,
              }}>
                Work Order Cost Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, config]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>{config.label}:</span>
                    <span style={{ fontWeight: 600, color: config.color }}>
                      ${categoryTotals[key].toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                borderTop: '2px solid #0ea5e9',
                paddingTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Total Cost:</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#0ea5e9' }}>
                  ${expTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>No expenses recorded yet.</p>
        )}
      </SectionBox>

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